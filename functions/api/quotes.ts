/**
 * Cloudflare Pages Function · GET /api/quotes?secids=105.AAPL,116.00700,...
 *
 * Replaces src/app/api/quotes/route.ts (deleted to allow `output: 'export'`).
 * This file is compiled to a Worker by Cloudflare Pages — it does NOT share
 * imports with the Next.js src/ tree, so the eastmoney logic is inlined.
 *
 * Caching strategy:
 *  - Server-side per-secid Map cache + in-flight dedup (the original
 *    src/lib/eastmoney.ts approach) does NOT survive across Worker
 *    invocations. Different PoPs / different cold starts each get fresh state.
 *  - Instead we set `Cache-Control: s-maxage=2, public` on the response,
 *    which lets Cloudflare's edge cache absorb the 1Hz polling at the PoP
 *    layer. Same effective behaviour from the user's perspective.
 *  - Eastmoney itself is hit once per ~2s per PoP per secid combination.
 *
 * Caveat tested at deploy time: push2.eastmoney.com may rate-limit or block
 * Cloudflare-Workers source IPs (which differ from CN home IPs the dev
 * server uses). If smoke test reveals upstream 403/429, fallbacks are:
 *   1. Move polling client-side via JSONP (eastmoney supports `cb=callback`)
 *   2. Proxy through a CN-resident edge (cn.gcorelabs etc.)
 *   3. Switch to a paid market data API (Tiingo / EOD)
 */

interface RawData {
  f43?: number; f44?: number; f45?: number; f46?: number; f60?: number;
  f86?: number; f116?: number; f152?: number;
  f164?: number; f167?: number; f169?: number; f170?: number;
}

interface Quote {
  secid: string;
  ticker: string;
  exchange: number;
  price: number;
  prevClose: number;
  open?: number;
  high?: number;
  low?: number;
  changeAbs: number;
  changePct: number;
  pe?: number;
  pb?: number;
  marketCap?: number;
  timestamp?: number;
  fetchedAt: string;
}

const BASE = "https://push2.eastmoney.com/api/qt";
const FIELDS = "f43,f44,f45,f46,f60,f86,f116,f152,f164,f167,f169,f170";
const HEADERS: HeadersInit = {
  "User-Agent": "Mozilla/5.0 (compatible; DuanDashboard/0.1)",
  Referer: "https://quote.eastmoney.com/",
  Accept: "application/json, text/plain, */*",
};
const MAX_BATCH = 50;

/** Per-market price storage divisor (US/HK store at 4 decimals, CN at 2). */
function priceDivisor(exchange: number): number {
  if (exchange === 0 || exchange === 1) return 100; // CN: SZSE / SSE
  return 1000;                                       // US, HK, etc.
}

function rawNum(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "-" || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

async function fetchOne(secid: string): Promise<Quote | null> {
  const [exStr, ticker] = secid.split(".");
  if (!exStr || !ticker) return null;
  const exchange = Number(exStr);
  if (!Number.isFinite(exchange)) return null;

  // Drop the cache buster — at edge, identical URLs let the runtime/CDN
  // collapse concurrent requests for the same secid.
  const url = `${BASE}/stock/get?secid=${encodeURIComponent(secid)}&fields=${FIELDS}`;

  const res = await fetch(url, {
    headers: HEADERS,
    cf: { cacheTtl: 2, cacheEverything: true },
    signal: AbortSignal.timeout(5_000),
  } as RequestInit & { cf?: Record<string, unknown> });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json = (await res.json()) as { rc?: number; data?: RawData | null };
  if (json.rc !== 0 || !json.data) return null;

  const d = json.data;
  const div = priceDivisor(exchange);
  const price = rawNum(d.f43);
  if (price === undefined) return null;

  return {
    secid,
    ticker,
    exchange,
    price: price / div,
    prevClose: (rawNum(d.f60) ?? 0) / div,
    open:  d.f46 != null ? rawNum(d.f46)! / div : undefined,
    high:  d.f44 != null ? rawNum(d.f44)! / div : undefined,
    low:   d.f45 != null ? rawNum(d.f45)! / div : undefined,
    changeAbs: (rawNum(d.f169) ?? 0) / div,
    changePct: (rawNum(d.f170) ?? 0) / 100,
    pe:    d.f164 != null ? rawNum(d.f164)! / 100 : undefined,
    pb:    d.f167 != null ? rawNum(d.f167)! / 100 : undefined,
    marketCap: rawNum(d.f116),
    timestamp: rawNum(d.f86),
    fetchedAt: new Date().toISOString(),
  };
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      // PoP edge cache for 2s — covers 1Hz polling bursts.
      "cache-control": "public, s-maxage=2, max-age=0",
      ...(init.headers as Record<string, string> | undefined),
    },
  });
}

export async function onRequestGet(context: { request: Request }): Promise<Response> {
  const { request } = context;
  const url = new URL(request.url);

  const raw = url.searchParams.get("secids") ?? "";
  const secids = raw.split(",").map((s) => s.trim()).filter(Boolean);

  if (secids.length === 0) {
    return jsonResponse(
      { error: "missing 'secids' query param", example: "?secids=105.AAPL,116.00700" },
      { status: 400 },
    );
  }
  if (secids.length > MAX_BATCH) {
    return jsonResponse(
      { error: `too many secids (max ${MAX_BATCH}, got ${secids.length})` },
      { status: 400 },
    );
  }

  try {
    const unique = [...new Set(secids)];
    const settled = await Promise.all(
      unique.map((s) =>
        fetchOne(s).catch((err) => {
          console.warn(`[quotes/CF] ${s}: ${err instanceof Error ? err.message : err}`);
          return null;
        }),
      ),
    );

    const quotes: Record<string, Quote> = {};
    for (let i = 0; i < unique.length; i++) {
      const q = settled[i];
      if (q) quotes[unique[i]] = q;
    }
    const missing = secids.filter((s) => !(s in quotes));

    return jsonResponse({
      quotes,
      count: Object.keys(quotes).length,
      requested: secids.length,
      missing,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return jsonResponse({ error: `upstream fetch failed: ${msg}` }, { status: 502 });
  }
}
