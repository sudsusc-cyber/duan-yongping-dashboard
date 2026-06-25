/**
 * US extended-hours (盘前/盘后) enrichment.
 *
 * The primary quote source (Tencent qt.gtimg.cn, see eastmoney.ts) only carries
 * the *regular* session. To surface pre-market (04:00–09:30 ET) and after-hours
 * (16:00–20:00 ET) prices we layer a second, US-only source on top:
 *
 *   Yahoo v8 chart · query1.finance.yahoo.com/v8/finance/chart/<sym>
 *     ?range=1d&interval=1m&includePrePost=true
 *
 * This is the same key-free endpoint the build-time fundamentals script already
 * uses, so it's known-reachable. We read:
 *   meta.marketState        → PRE / REGULAR / POST / POSTPOST / PREPRE / CLOSED
 *   meta.regularMarketPrice → the most recent regular close (our change baseline)
 *   indicators.quote[0].close[] (with includePrePost) → the pre/post bars
 *
 * The latest non-null close in the includePrePost series is the live extended
 * price. Change is computed vs meta.regularMarketPrice, which conveniently is
 * "yesterday's close" during PRE and "today's close" during POST — i.e. the
 * baseline brokers display in both cases.
 *
 * Only US equities (secid exchange 105/106) are fetched; everything else is a
 * no-op. Failures are swallowed — extended data is strictly additive, never a
 * reason to drop a regular quote.
 */

export interface ExtendedInfo {
  session: "pre" | "regular" | "post" | "closed";
  extPrice?: number;
  extChangeAbs?: number;
  extChangePct?: number;
  extTime?: string;
}

// Extended data moves on a slower clock than regular ticks and Yahoo is one
// request per symbol, so cache it longer than the 2.5s regular-quote TTL.
const EXT_TTL_MS = 12_000;
const EXT_CACHE = new Map<string, { info: ExtendedInfo; expiresAt: number }>();
const EXT_PENDING = new Map<string, Promise<ExtendedInfo | null>>();

const YHEADERS: HeadersInit = {
  "User-Agent": "Mozilla/5.0 (compatible; DuanDashboard/0.1)",
  Accept: "application/json",
};

/** secid → Yahoo symbol, US equities only (105 NASDAQ / 106 NYSE·ARCA). */
export function secidToYahoo(secid: string): string | null {
  const dot = secid.indexOf(".");
  if (dot < 0) return null;
  const ex = Number(secid.slice(0, dot));
  if (ex !== 105 && ex !== 106) return null;
  const ticker = secid.slice(dot + 1).replace(/_/g, "."); // BRK_B → BRK.B
  if (!ticker) return null;
  return ticker.replace(/\./g, "-"); // BRK.B → BRK-B (Yahoo convention)
}

function num(v: unknown): number | undefined {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return typeof n === "number" && Number.isFinite(n) ? n : undefined;
}

function classify(state: string): ExtendedInfo["session"] {
  const s = state.toUpperCase();
  if (s.startsWith("PRE")) return "pre";
  if (s.startsWith("POST")) return "post";
  if (s === "REGULAR") return "regular";
  return "closed";
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

async function fetchExtendedOne(secid: string): Promise<ExtendedInfo | null> {
  const cached = EXT_CACHE.get(secid);
  if (cached && cached.expiresAt > Date.now()) return cached.info;

  const inflight = EXT_PENDING.get(secid);
  if (inflight) return inflight;

  const p = fetchExtendedFresh(secid).finally(() => EXT_PENDING.delete(secid));
  EXT_PENDING.set(secid, p);
  return p;
}

async function fetchExtendedFresh(secid: string): Promise<ExtendedInfo | null> {
  const ysym = secidToYahoo(secid);
  if (!ysym) return null;

  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ysym)}` +
    `?range=1d&interval=1m&includePrePost=true`;
  const res = await fetch(url, {
    headers: YHEADERS,
    cache: "no-store",
    signal: AbortSignal.timeout(6_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as YahooChart;

  const r = data?.chart?.result?.[0];
  if (!r || !r.meta) return null;
  const meta = r.meta;

  const session = classify(String(meta.marketState ?? ""));
  const baseline =
    num(meta.regularMarketPrice) ??
    num(meta.chartPreviousClose) ??
    num(meta.previousClose);

  // Latest non-null close across the includePrePost series = live extended price.
  const ts = r.timestamp ?? [];
  const closes = r.indicators?.quote?.[0]?.close ?? [];
  let extPrice: number | undefined;
  let extEpoch: number | undefined;
  for (let i = closes.length - 1; i >= 0; i--) {
    const c = num(closes[i]);
    if (c !== undefined) {
      extPrice = c;
      extEpoch = ts[i];
      break;
    }
  }
  if (extPrice === undefined) extPrice = num(meta.regularMarketPrice);

  let extChangeAbs: number | undefined;
  let extChangePct: number | undefined;
  if (extPrice !== undefined && baseline !== undefined && baseline !== 0) {
    extChangeAbs = extPrice - baseline;
    extChangePct = (extChangeAbs / baseline) * 100;
  }

  const info: ExtendedInfo = {
    session,
    extPrice,
    extChangeAbs,
    extChangePct,
    extTime: extEpoch ? new Date(extEpoch * 1000).toISOString() : undefined,
  };
  EXT_CACHE.set(secid, { info, expiresAt: Date.now() + EXT_TTL_MS });
  return info;
}

/**
 * Fetch extended-hours info for the US secids among `secids` (non-US ignored).
 * Per-symbol failures resolve to absent entries, never throw.
 */
export async function fetchExtended(secids: string[]): Promise<Map<string, ExtendedInfo>> {
  const out = new Map<string, ExtendedInfo>();
  const us = [...new Set(secids)].filter((s) => secidToYahoo(s) !== null);
  if (us.length === 0) return out;

  const results = await Promise.all(
    us.map((s) =>
      fetchExtendedOne(s).catch((err) => {
        console.warn(`[ext] ${s}: ${err instanceof Error ? err.message : err}`);
        return null;
      }),
    ),
  );

  for (let i = 0; i < us.length; i++) {
    const info = results[i];
    if (info) out.set(us[i], info);
  }
  return out;
}
