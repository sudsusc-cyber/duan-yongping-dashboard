/**
 * Shared types for the dashboard.
 *
 * Note: 13F snapshot types live in scripts/lib/parse-13f-xml.ts and
 * are duplicated lightly here for client-side imports without pulling
 * fast-xml-parser into the bundle.
 */

// ─────────────────────────────────────────────── Quote (real-time)

export interface Quote {
  /** "<exchange>.<symbol>" — the canonical Eastmoney secid we fetched with */
  secid: string;
  /** symbol (e.g. AAPL, 00700, 600519) */
  ticker: string;
  /** Eastmoney market code: 0=SZSE, 1=SSE, 105=NASDAQ, 106=NYSE, 116=HKEX */
  exchange: number;
  /** issuer name as Eastmoney returns it (often Chinese for HK/CN) */
  name?: string;

  /** last price in native currency */
  price: number;
  /** previous close */
  prevClose: number;
  open?: number;
  high?: number;
  low?: number;

  /** absolute change vs prev close (price units) */
  changeAbs: number;
  /** percentage change (e.g. 1.24 for +1.24%) */
  changePct: number;

  pe?: number;
  pb?: number;
  /** market cap in local currency, raw integer (no scaling) */
  marketCap?: number;

  // ── US extended-hours (盘前/盘后) — present only for US equities, sourced
  //    from Yahoo v8 chart (includePrePost). Absent for HK/CN and when the
  //    enrichment fetch fails (the base regular quote is unaffected).
  /** trading session at fetch time, US only */
  session?: "pre" | "regular" | "post" | "closed";
  /** latest pre/post-market price (only set when session is pre or post) */
  extPrice?: number;
  /** extended-hours change vs the most recent regular close (price units) */
  extChangeAbs?: number;
  /** extended-hours change vs the most recent regular close (percent) */
  extChangePct?: number;
  /** ISO time of the latest extended-hours print */
  extTime?: string;

  /** Eastmoney's reported timestamp (unix seconds) */
  timestamp?: number;
  /** ISO string at the moment the server fetched it */
  fetchedAt: string;
}

export interface QuotesResponse {
  quotes: Record<string, Quote>;
  count: number;
  fetchedAt: string;
  errors?: Record<string, string>;
}

// ─────────────────────────────────────────────── 13F lightweight DTO

export interface Holding13FLite {
  cusip: string;
  ticker: string;
  exchange: string;
  nameZh?: string;
  nameEn: string;
  classNote?: string;
  value: number;
  shares: number;
  weight: number;
  putCall?: "Put" | "Call";
}

export type ActionKind = "NEW" | "ADD" | "REDUCE" | "CLOSED" | "HOLD";

export interface Holding13FQuotation extends Holding13FLite {
  /** quote at the time the 13F was filed (price-as-of report date is approximate) */
  /** action vs previous quarter */
  action: ActionKind;
  pctChange: number;
  /** quarters held (consecutive non-zero presence) */
  qtrsHeld: number;
}

// ─────────────────────────────────────────────── manual holdings

export interface ManualHolding {
  ticker: string;
  exchange: string;
  secid: string;
  nameZh?: string;
  nameEn: string;
  estimated: boolean;
  estimatedSizeHint?: string;
  sourceLabel: string;
  sourceUrl: string;
  notes?: string;
}

export interface ManualMarketFile {
  marketLabel: string;
  marketLabelZh: string;
  disclaimer: string;
  lastUpdated: string;
  currency: string;
  holdings: ManualHolding[];
}

// ─────────────────────────────────────────────── statements

export interface XueqiuQuote {
  date: string;
  source: string;
  url: string;
  content: string;
  tags: string[];
}

export interface StatementsFile {
  ticker: string;
  nameZh?: string;
  nameEn?: string;
  lastUpdated: string;
  note?: string;
  quotes: XueqiuQuote[];
}
