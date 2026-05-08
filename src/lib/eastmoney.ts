/**
 * Eastmoney push2 quote client (server-side).
 *
 * Empirically the batch endpoint `ulist/get` returns rc:102 / data:null in 2026,
 * so we use the per-symbol `stock/get` endpoint and fan-out concurrently.
 *
 * Field reference (Eastmoney internal — verified live 2026-04-30):
 *   f43 = last price        (scale varies by market — see priceDivisor)
 *   f44 = day high          (scale: same as price)
 *   f45 = day low           (scale: same as price)
 *   f46 = day open          (scale: same as price)
 *   f60 = prev close        (scale: same as price)
 *   f86 = timestamp (unix s)
 *  f116 = market cap (raw, local currency)
 *  f152 = display decimals (always 2 for stocks; not the storage scale)
 *  f164 = PE TTM           (scale: /100)
 *  f167 = PB               (scale: /100)
 *  f169 = absolute change  (scale: same as price)
 *  f170 = % change         (scale: /100; e.g. 124 → 1.24%)
 *
 * Price scale by f13 market code:
 *   0   SZSE     /100
 *   1   SSE      /100
 *   105 NASDAQ   /1000
 *   106 NYSE     /1000
 *   116 HKEX     /1000
 *
 * secid format: "<f13>.<f12>"  e.g. "105.AAPL", "116.00700", "1.600519"
 */

import type { Quote } from "./types";

const BASE = "https://push2.eastmoney.com/api/qt";
const FIELDS = "f43,f44,f45,f46,f60,f86,f116,f152,f164,f167,f169,f170";

/**
 * Server-side hot-path cache + in-flight dedup.
 *
 * 1Hz client polling × ~17 stocks fan-out = 17 fetch/sec to Eastmoney, which
 * exhausts the dev-server outbound conn pool and triggers upstream timeouts.
 * Two safeguards combined:
 *
 *  - QUOTE_CACHE: TTL-based cache. Calls within the TTL share the cached quote.
 *  - PENDING:     in-flight dedup. Concurrent calls for the same secid share
 *                 the in-flight promise instead of issuing parallel fetches.
 *
 * 2.5 s TTL × 17 secids ≈ 6.8 upstream fetch/sec — well within tolerance.
 * UI still re-renders every 1 s; the displayed values refresh every ~2.5 s.
 */
const CACHE_TTL_MS = 2500;
const QUOTE_CACHE = new Map<string, { quote: Quote; expiresAt: number }>();
const PENDING = new Map<string, Promise<Quote | null>>();

const HEADERS: HeadersInit = {
  "User-Agent": "Mozilla/5.0 (compatible; DuanDashboard/0.1)",
  Referer: "https://quote.eastmoney.com/",
  Accept: "application/json, text/plain, */*",
};

/** Per-market price storage divisor (US/HK store at 4 decimals, CN at 2). */
function priceDivisor(exchange: number): number {
  if (exchange === 0 || exchange === 1) return 100; // CN: SZSE / SSE
  return 1000;                                       // US, HK, etc.
}

interface RawData {
  f43?: number; f44?: number; f45?: number; f46?: number; f60?: number;
  f86?: number; f116?: number; f152?: number;
  f164?: number; f167?: number; f169?: number; f170?: number;
}

function rawNum(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "-" || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

async function fetchOne(secid: string): Promise<Quote | null> {
  const cached = QUOTE_CACHE.get(secid);
  if (cached && cached.expiresAt > Date.now()) return cached.quote;

  const inflight = PENDING.get(secid);
  if (inflight) return inflight;

  const promise = fetchOneFresh(secid).finally(() => PENDING.delete(secid));
  PENDING.set(secid, promise);
  return promise;
}

async function fetchOneFresh(secid: string): Promise<Quote | null> {
  const [exStr, ticker] = secid.split(".");
  if (!exStr || !ticker) return null;
  const exchange = Number(exStr);
  if (!Number.isFinite(exchange)) return null;

  const url =
    `${BASE}/stock/get?secid=${encodeURIComponent(secid)}` +
    `&fields=${FIELDS}&_=${Date.now()}`;

  const res = await fetch(url, {
    headers: HEADERS,
    cache: "no-store",
    signal: AbortSignal.timeout(5_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as { rc?: number; data?: RawData | null };
  if (json.rc !== 0 || !json.data) return null;

  const d = json.data;
  const div = priceDivisor(exchange);

  const price = rawNum(d.f43);
  if (price === undefined) return null;

  const quote: Quote = {
    secid,
    ticker,
    exchange,
    price: price / div,
    prevClose: (rawNum(d.f60) ?? 0) / div,
    open:   d.f46 != null ? rawNum(d.f46)! / div : undefined,
    high:   d.f44 != null ? rawNum(d.f44)! / div : undefined,
    low:    d.f45 != null ? rawNum(d.f45)! / div : undefined,
    changeAbs: (rawNum(d.f169) ?? 0) / div,
    changePct: (rawNum(d.f170) ?? 0) / 100,
    pe:  d.f164 != null ? rawNum(d.f164)! / 100 : undefined,
    pb:  d.f167 != null ? rawNum(d.f167)! / 100 : undefined,
    marketCap: rawNum(d.f116),
    timestamp: rawNum(d.f86),
    fetchedAt: new Date().toISOString(),
  };

  QUOTE_CACHE.set(secid, { quote, expiresAt: Date.now() + CACHE_TTL_MS });
  return quote;
}

/**
 * Fan out per-symbol fetches in parallel. Failures are silently absent from
 * the result map (caller can detect via `secids.filter(s => !map.has(s))`).
 *
 * Throws nothing — individual failures are caught.
 */
export async function fetchQuotes(secids: string[]): Promise<Map<string, Quote>> {
  const out = new Map<string, Quote>();
  if (secids.length === 0) return out;

  const unique = [...new Set(secids.map((s) => s.trim()).filter(Boolean))];

  const results = await Promise.all(
    unique.map((s) =>
      fetchOne(s).catch((err) => {
        console.warn(`[eastmoney] ${s}: ${err instanceof Error ? err.message : err}`);
        return null;
      }),
    ),
  );

  for (let i = 0; i < unique.length; i++) {
    const q = results[i];
    if (q) out.set(unique[i], q);
  }
  return out;
}

/** Build an Eastmoney secid from (exchange-name, ticker). */
export function makeSecid(
  exchange: "NASDAQ" | "NYSE" | "ARCA" | "HKEX" | "SSE" | "SZSE",
  ticker: string,
): string {
  const code: Record<string, number> = {
    NASDAQ: 105,
    NYSE: 106,
    ARCA: 106, // ARCA tickers go through NYSE secid convention on eastmoney
    HKEX: 116,
    SSE: 1,
    SZSE: 0,
  };
  return `${code[exchange]}.${ticker}`;
}
