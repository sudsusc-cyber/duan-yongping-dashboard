/**
 * Cloudflare Pages Function · GET /api/quotes?secids=105.AAPL,116.00700,...
 *
 * Mirrors src/lib/eastmoney.ts (v3 — Tencent qt.gtimg.cn). Eastmoney's push2
 * endpoint started returning empty data in 2026 and was eventually blocked at
 * TLS for many client IPs (CF Worker source IPs included). Tencent qt.gtimg.cn
 * is the new primary source: no key, supports US/HK/CN tickers, response is
 * ASCII numeric fields delimited by `~` (Chinese-name field is gb18030 but we
 * never decode it).
 *
 * secid → Tencent query token:
 *   105.AAPL    → usAAPL
 *   106.BRK_B   → usBRK.B
 *   116.00700   → hk00700
 *   1.600519    → sh600519
 *   0.000333    → sz000333
 */

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
  // US extended-hours (盘前/盘后), layered on from Yahoo. See fetchExtendedOne.
  session?: "pre" | "regular" | "post" | "closed";
  extPrice?: number;
  extChangeAbs?: number;
  extChangePct?: number;
  extTime?: string;
  fetchedAt: string;
}

const MAX_BATCH = 50;
const HEADERS: HeadersInit = {
  "User-Agent": "Mozilla/5.0 (compatible; DuanDashboard/0.1)",
  Referer: "https://finance.qq.com/",
  Accept: "*/*",
};

function secidToTencent(secid: string): string | null {
  const dot = secid.indexOf(".");
  if (dot < 0) return null;
  const exStr = secid.slice(0, dot);
  const ticker = secid.slice(dot + 1).replace(/_/g, ".");
  if (!ticker) return null;
  switch (Number(exStr)) {
    case 105: case 106: return `us${ticker}`;
    case 116: return `hk${ticker}`;
    case 1:   return `sh${ticker}`;
    case 0:   return `sz${ticker}`;
    default:  return null;
  }
}

function numOrUndef(v: string | undefined): number | undefined {
  if (v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

async function fetchOne(secid: string): Promise<Quote | null> {
  const dot = secid.indexOf(".");
  if (dot < 0) return null;
  const exchange = Number(secid.slice(0, dot));
  const ticker = secid.slice(dot + 1);
  if (!Number.isFinite(exchange)) return null;

  const tq = secidToTencent(secid);
  if (!tq) return null;

  const url = `https://qt.gtimg.cn/q=${tq}`;
  const res = await fetch(url, {
    headers: HEADERS,
    cf: { cacheTtl: 2, cacheEverything: true },
    signal: AbortSignal.timeout(5_000),
  } as RequestInit & { cf?: Record<string, unknown> });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();

  if (text.includes("v_pv_none_match")) return null;
  const m = text.match(/="([^"]+)"/);
  if (!m) return null;
  const parts = m[1].split("~");
  if (parts.length < 34) return null;

  const price = numOrUndef(parts[3]);
  if (price === undefined || price === 0) return null;

  return {
    secid,
    ticker,
    exchange,
    price,
    prevClose: numOrUndef(parts[4]) ?? 0,
    open: numOrUndef(parts[5]),
    high: numOrUndef(parts[33]),
    low: numOrUndef(parts[34]),
    changeAbs: numOrUndef(parts[31]) ?? 0,
    changePct: numOrUndef(parts[32]) ?? 0,
    pe: numOrUndef(parts[39]),
    fetchedAt: new Date().toISOString(),
  };
}

// ───────────────────────────────── US extended-hours (盘前/盘后) ──────────────
// Mirrors src/lib/extended.ts. Tencent only carries the regular session, so
// pre/post-market prices for US equities come from Yahoo's key-free v8 chart
// (includePrePost). Edge-cached 12s via the cf option to dedup the 1Hz polling.

interface ExtendedInfo {
  session: "pre" | "regular" | "post" | "closed";
  extPrice?: number;
  extChangeAbs?: number;
  extChangePct?: number;
  extTime?: string;
}

interface YahooChart {
  chart?: {
    result?: Array<{
      meta?: {
        marketState?: string;
        regularMarketPrice?: number;
        chartPreviousClose?: number;
        previousClose?: number;
      };
      timestamp?: number[];
      indicators?: { quote?: Array<{ close?: Array<number | null> }> };
    }>;
  };
}

/** secid → Yahoo symbol, US equities only (105 NASDAQ / 106 NYSE·ARCA). */
function secidToYahoo(secid: string): string | null {
  const dot = secid.indexOf(".");
  if (dot < 0) return null;
  const ex = Number(secid.slice(0, dot));
  if (ex !== 105 && ex !== 106) return null;
  const ticker = secid.slice(dot + 1).replace(/_/g, "."); // BRK_B → BRK.B
  if (!ticker) return null;
  return ticker.replace(/\./g, "-"); // BRK.B → BRK-B
}

function classifyState(state: string): ExtendedInfo["session"] {
  const s = state.toUpperCase();
  if (s.startsWith("PRE")) return "pre";
  if (s.startsWith("POST")) return "post";
  if (s === "REGULAR") return "regular";
  return "closed";
}

/** Number coercion that treats null (Yahoo's gap bars) as missing, not 0. */
function yNum(v: number | null | undefined): number | undefined {
  if (typeof v !== "number" || !Number.isFinite(v)) return undefined;
  return v;
}

async function fetchExtendedOne(secid: string): Promise<ExtendedInfo | null> {
  const ysym = secidToYahoo(secid);
  if (!ysym) return null;

  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ysym)}` +
    `?range=1d&interval=1m&includePrePost=true`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; DuanDashboard/0.1)",
      Accept: "application/json",
    },
    cf: { cacheTtl: 12, cacheEverything: true },
    signal: AbortSignal.timeout(6_000),
  } as RequestInit & { cf?: Record<string, unknown> });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as YahooChart;

  const r = data?.chart?.result?.[0];
  if (!r || !r.meta) return null;
  const meta = r.meta;

  const session = classifyState(String(meta.marketState ?? ""));
  const baseline =
    yNum(meta.regularMarketPrice) ??
    yNum(meta.chartPreviousClose) ??
    yNum(meta.previousClose);

  const ts = r.timestamp ?? [];
  const closes = r.indicators?.quote?.[0]?.close ?? [];
  let extPrice: number | undefined;
  let extEpoch: number | undefined;
  for (let i = closes.length - 1; i >= 0; i--) {
    const c = yNum(closes[i]);
    if (c !== undefined) {
      extPrice = c;
      extEpoch = ts[i];
      break;
    }
  }
  if (extPrice === undefined) extPrice = yNum(meta.regularMarketPrice);

  let extChangeAbs: number | undefined;
  let extChangePct: number | undefined;
  if (extPrice !== undefined && baseline !== undefined && baseline !== 0) {
    extChangeAbs = extPrice - baseline;
    extChangePct = (extChangeAbs / baseline) * 100;
  }

  return {
    session,
    extPrice,
    extChangeAbs,
    extChangePct,
    extTime: extEpoch ? new Date(extEpoch * 1000).toISOString() : undefined,
  };
}

async function fetchExtended(secids: string[]): Promise<Map<string, ExtendedInfo>> {
  const out = new Map<string, ExtendedInfo>();
  const us = [...new Set(secids)].filter((s) => secidToYahoo(s) !== null);
  if (us.length === 0) return out;

  const settled = await Promise.all(
    us.map((s) =>
      fetchExtendedOne(s).catch((err) => {
        console.warn(`[ext/CF] ${s}: ${err instanceof Error ? err.message : err}`);
        return null;
      }),
    ),
  );
  for (let i = 0; i < us.length; i++) {
    const info = settled[i];
    if (info) out.set(us[i], info);
  }
  return out;
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
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
    // Regular quotes (all markets) and US pre/post data run concurrently.
    const [settled, extended] = await Promise.all([
      Promise.all(
        unique.map((s) =>
          fetchOne(s).catch((err) => {
            console.warn(`[quotes/CF] ${s}: ${err instanceof Error ? err.message : err}`);
            return null;
          }),
        ),
      ),
      fetchExtended(unique),
    ]);

    const quotes: Record<string, Quote> = {};
    for (let i = 0; i < unique.length; i++) {
      const q = settled[i];
      if (q) quotes[unique[i]] = q;
    }

    // Layer pre/post-market data onto the US quotes we got.
    for (const [secid, info] of extended) {
      const q = quotes[secid];
      if (!q) continue;
      q.session = info.session;
      if (info.session === "pre" || info.session === "post") {
        q.extPrice = info.extPrice;
        q.extChangeAbs = info.extChangeAbs;
        q.extChangePct = info.extChangePct;
        q.extTime = info.extTime;
      }
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
