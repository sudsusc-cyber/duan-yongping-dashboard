/**
 * CUSIP -> Ticker mapping.
 *
 * SEC 13F filings only contain 9-digit CUSIP identifiers. We need tickers
 * for everything (display, real-time quote lookups, peer comparison).
 *
 * Two-layer lookup:
 *  1. Hand-curated map (this file). Authoritative — overrides auto-resolved.
 *     Useful for share-class disambiguation (GOOGL vs GOOG) and Chinese names.
 *  2. Auto-resolved cache at `data/cusip-resolved.json`, populated by
 *     OpenFIGI from `scripts/fetch-13f.ts` post-processing. New 13F filings
 *     that bring in tickers nobody added by hand get resolved automatically;
 *     the cache means we only hit OpenFIGI once per CUSIP.
 *
 * To extend by hand: add a `[cusip]: { ... }` row below.
 * To trigger auto-resolve: let `scripts/fetch-13f.ts` run — it'll pick up
 *   anything unresolved after the hand-map lookup.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";

export interface TickerMeta {
  ticker: string;
  exchange: "NASDAQ" | "NYSE" | "ARCA" | "OTHER";
  nameEn: string;
  nameZh?: string;
  /** "A" / "C" / "B" share class disambiguation (e.g. GOOGL vs. GOOG) */
  classNote?: string;
}

/**
 * H&H International (CIK 0001759760) historical CUSIP universe.
 *
 * Sources cross-checked: SEC 13F filings, OpenFIGI, NASDAQ.
 * Updated to cover every name H&H has filed since 2018.
 */
export const CUSIP_TICKER_MAP: Record<string, TickerMeta> = {
  "037833100": { ticker: "AAPL",  exchange: "NASDAQ", nameEn: "Apple Inc.",                      nameZh: "苹果公司" },
  "084670702": { ticker: "BRK.B", exchange: "NYSE",   nameEn: "Berkshire Hathaway Inc. Class B", nameZh: "伯克希尔 B", classNote: "B" },
  "02079K305": { ticker: "GOOGL", exchange: "NASDAQ", nameEn: "Alphabet Inc. Class A",            nameZh: "谷歌 A",     classNote: "A" },
  "02079K107": { ticker: "GOOG",  exchange: "NASDAQ", nameEn: "Alphabet Inc. Class C",            nameZh: "谷歌 C",     classNote: "C" },
  "722304102": { ticker: "PDD",   exchange: "NASDAQ", nameEn: "PDD Holdings Inc. (Sponsored ADS)", nameZh: "拼多多" },
  "722304101": { ticker: "PDD",   exchange: "NASDAQ", nameEn: "PDD Holdings Inc.",                  nameZh: "拼多多" },
  "67066G104": { ticker: "NVDA",  exchange: "NASDAQ", nameEn: "NVIDIA Corp.",                     nameZh: "英伟达" },
  "01609W102": { ticker: "BABA",  exchange: "NYSE",   nameEn: "Alibaba Group Holding Ltd. (ADR)", nameZh: "阿里巴巴" },
  "674599105": { ticker: "OXY",   exchange: "NYSE",   nameEn: "Occidental Petroleum Corp.",       nameZh: "西方石油" },
  "594918104": { ticker: "MSFT",  exchange: "NASDAQ", nameEn: "Microsoft Corp.",                  nameZh: "微软" },
  "874039100": { ticker: "TSM",   exchange: "NYSE",   nameEn: "Taiwan Semiconductor Mfg. (ADR)",  nameZh: "台积电 ADR" },
  "60770K107": { ticker: "MRNA",  exchange: "NASDAQ", nameEn: "Moderna Inc.",                     nameZh: "Moderna" },
  "06051GHF9": { ticker: "BAC",   exchange: "NYSE",   nameEn: "Bank of America Corp.",            nameZh: "美国银行" },
  "06051GFW0": { ticker: "BAC",   exchange: "NYSE",   nameEn: "Bank of America Corp.",            nameZh: "美国银行" },
  "88160R101": { ticker: "TSLA",  exchange: "NASDAQ", nameEn: "Tesla Inc.",                       nameZh: "特斯拉" },
  "30303M102": { ticker: "META",  exchange: "NASDAQ", nameEn: "Meta Platforms Inc.",              nameZh: "Meta" },
  "G3934T103": { ticker: "FXI",   exchange: "ARCA",   nameEn: "iShares China Large-Cap ETF",      nameZh: "中国大盘 ETF" },
  "464287622": { ticker: "IVV",   exchange: "ARCA",   nameEn: "iShares Core S&P 500 ETF" },
  "78462F103": { ticker: "SPY",   exchange: "ARCA",   nameEn: "SPDR S&P 500 ETF Trust" },
  "00206R102": { ticker: "T",     exchange: "NYSE",   nameEn: "AT&T Inc.",                        nameZh: "AT&T" },
  "00724F101": { ticker: "ADBE",  exchange: "NASDAQ", nameEn: "Adobe Inc.",                       nameZh: "Adobe" },
  "254687106": { ticker: "DIS",   exchange: "NYSE",   nameEn: "Walt Disney Co.",                  nameZh: "迪士尼" },
  "N07059210": { ticker: "ASML",  exchange: "NASDAQ", nameEn: "ASML Holding N.V. (NY Registry)",  nameZh: "阿斯麦" },
  "21873S108": { ticker: "CRWV",  exchange: "NASDAQ", nameEn: "CoreWeave Inc. Class A",            nameZh: "CoreWeave", classNote: "A" },
  "G25457105": { ticker: "CRDO",  exchange: "NASDAQ", nameEn: "Credo Technology Group Holding",   nameZh: "Credo" },
  "88023B103": { ticker: "TEM",   exchange: "NASDAQ", nameEn: "Tempus AI Inc. Class A",            nameZh: "Tempus AI", classNote: "A" },

  // 2026Q1 new initiations
  "91324P102": { ticker: "UNH",   exchange: "NYSE",   nameEn: "UnitedHealth Group Inc.",          nameZh: "联合健康" },
  "69608A108": { ticker: "PLTR",  exchange: "NASDAQ", nameEn: "Palantir Technologies Inc. Class A", nameZh: "Palantir", classNote: "A" },
  "871607107": { ticker: "SNPS",  exchange: "NASDAQ", nameEn: "Synopsys Inc.",                    nameZh: "Synopsys" },
  "22788C105": { ticker: "CRWD",  exchange: "NASDAQ", nameEn: "CrowdStrike Holdings Inc. Class A", nameZh: "CrowdStrike", classNote: "A" },
  "833445109": { ticker: "SNOW",  exchange: "NYSE",   nameEn: "Snowflake Inc. Class A",            nameZh: "Snowflake",   classNote: "A" },
  "172573107": { ticker: "CRCL",  exchange: "NYSE",   nameEn: "Circle Internet Group Inc.",       nameZh: "Circle" },
  "457642205": { ticker: "INOD",  exchange: "NASDAQ", nameEn: "Innodata Inc.",                    nameZh: "Innodata" },
  // Add more as filings reveal new CUSIPs.
};

export interface ResolvedTicker extends TickerMeta {
  cusip: string;
  resolved: boolean;
}

// ── Auto-resolved cache (data/cusip-resolved.json) ───────────────
//
// Loaded once on demand. The cache holds CUSIPs resolved by OpenFIGI in
// past fetch-13f runs so we don't re-query the same CUSIP every Monday.
let autoResolved: Record<string, TickerMeta> = {};
let autoLoaded = false;

export function loadAutoResolvedFrom(path: string): void {
  autoLoaded = true;
  if (!existsSync(path)) {
    autoResolved = {};
    return;
  }
  try {
    autoResolved = JSON.parse(readFileSync(path, "utf8")) as Record<string, TickerMeta>;
  } catch (err) {
    console.warn(`[cusip-map] could not parse ${path}: ${err instanceof Error ? err.message : err}`);
    autoResolved = {};
  }
}

/** Append new auto-resolved entries and persist to disk. */
export function appendAutoResolvedTo(
  path: string,
  additions: Record<string, TickerMeta>,
): void {
  autoResolved = { ...autoResolved, ...additions };
  // Sort keys for deterministic diffs.
  const sorted = Object.fromEntries(
    Object.entries(autoResolved).sort(([a], [b]) => a.localeCompare(b)),
  );
  writeFileSync(path, JSON.stringify(sorted, null, 2) + "\n", "utf8");
}

export function resolveCusip(cusip: string, fallbackName?: string): ResolvedTicker {
  const key = cusip.toUpperCase().trim();
  const hand = CUSIP_TICKER_MAP[key];
  if (hand) return { ...hand, cusip: key, resolved: true };

  const auto = autoResolved[key];
  if (auto) return { ...auto, cusip: key, resolved: true };

  return {
    cusip: key,
    ticker: key, // fallback: surface the CUSIP itself so it's visible
    exchange: "OTHER",
    nameEn: fallbackName ?? "Unknown",
    resolved: false,
  };
}
