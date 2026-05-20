/**
 * Quote client (server-side).
 *
 * History:
 *   v1 — push2.eastmoney.com /ulist.np/get → started returning rc:102 in 2026
 *   v2 — push2.eastmoney.com /stock/get   → blocked at TLS for many client IPs
 *   v3 — qt.gtimg.cn (Tencent) — CURRENT.
 *
 * The `secid` interface is unchanged so callers don't need to know about the
 * source switch. Internally we map secid → Tencent query token:
 *   105.AAPL    → usAAPL
 *   106.BRK_B   → usBRK.B   (underscore is our internal escape; restored to .)
 *   116.00700   → hk00700
 *   1.600519    → sh600519
 *   0.000333    → sz000333
 *
 * Tencent response shape (e.g. for usAAPL):
 *   v_usAAPL="200~苹果~AAPL.OQ~300.11~298.97~298.18~...~1.14~0.38~301.15~298.09~...";
 *
 * Field indices we read (uniform across us/hk/cn):
 *   [1]  name (Chinese; gb18030 in source — may decode as mojibake here, ignored)
 *   [3]  last price
 *   [4]  prev close
 *   [5]  open
 *   [30] timestamp (skipped)
 *   [31] absolute change
 *   [32] percent change (literal, e.g. 0.38 means +0.38%)
 *   [33] day high
 *   [34] day low
 *   [39] PE  (when present; varies by market)
 *
 * Tencent's response is gb18030-encoded. We never decode it — all the numeric
 * fields are ASCII inside the `~`-delimited record, and we don't surface the
 * Chinese name field. This sidesteps Cloudflare Workers not having a gb18030
 * TextDecoder.
 */

import type { Quote } from "./types";

const CACHE_TTL_MS = 2500;
const QUOTE_CACHE = new Map<string, { quote: Quote; expiresAt: number }>();
const PENDING = new Map<string, Promise<Quote | null>>();

const HEADERS: HeadersInit = {
  "User-Agent": "Mozilla/5.0 (compatible; DuanDashboard/0.1)",
  Referer: "https://finance.qq.com/",
  Accept: "*/*",
};

/** Map an internal secid to a Tencent query token. */
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
  const cached = QUOTE_CACHE.get(secid);
  if (cached && cached.expiresAt > Date.now()) return cached.quote;

  const inflight = PENDING.get(secid);
  if (inflight) return inflight;

  const promise = fetchOneFresh(secid).finally(() => PENDING.delete(secid));
  PENDING.set(secid, promise);
  return promise;
}

async function fetchOneFresh(secid: string): Promise<Quote | null> {
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
    cache: "no-store",
    signal: AbortSignal.timeout(5_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();

  // No such symbol: v_pv_none_match="1";
  if (text.includes("v_pv_none_match")) return null;

  // Format: v_<query>="<data>";
  const m = text.match(/="([^"]+)"/);
  if (!m) return null;
  const parts = m[1].split("~");
  if (parts.length < 34) return null;

  const price = numOrUndef(parts[3]);
  if (price === undefined || price === 0) return null;

  const quote: Quote = {
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

  QUOTE_CACHE.set(secid, { quote, expiresAt: Date.now() + CACHE_TTL_MS });
  return quote;
}

/**
 * Fan out per-symbol fetches in parallel. Failures are silently absent from
 * the result map (caller can detect via `secids.filter(s => !map.has(s))`).
 */
export async function fetchQuotes(secids: string[]): Promise<Map<string, Quote>> {
  const out = new Map<string, Quote>();
  if (secids.length === 0) return out;

  const unique = [...new Set(secids.map((s) => s.trim()).filter(Boolean))];

  const results = await Promise.all(
    unique.map((s) =>
      fetchOne(s).catch((err) => {
        console.warn(`[quote] ${s}: ${err instanceof Error ? err.message : err}`);
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

/** Build an internal secid from (exchange-name, ticker). */
export function makeSecid(
  exchange: "NASDAQ" | "NYSE" | "ARCA" | "HKEX" | "SSE" | "SZSE",
  ticker: string,
): string {
  const code: Record<string, number> = {
    NASDAQ: 105,
    NYSE: 106,
    ARCA: 106,
    HKEX: 116,
    SSE: 1,
    SZSE: 0,
  };
  return `${code[exchange]}.${ticker}`;
}
