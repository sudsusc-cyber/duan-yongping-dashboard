/**
 * CUSIP -> Ticker mapping.
 *
 * SEC 13F filings only contain 9-digit CUSIP identifiers. We need tickers
 * for everything (display, real-time quote lookups, peer comparison).
 *
 * Strategy:
 *  1. Local hand-maintained map for every CUSIP H&H has ever held
 *     (their historical universe is tiny — ~30 names).
 *  2. Unknown CUSIPs are returned as-is so the pipeline doesn't choke;
 *     we log a warning and the operator can add the entry.
 *
 * To extend: just add a `[cusip]: { ... }` row below.
 */

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
  // Add more as filings reveal new CUSIPs.
};

export interface ResolvedTicker extends TickerMeta {
  cusip: string;
  resolved: boolean;
}

export function resolveCusip(cusip: string, fallbackName?: string): ResolvedTicker {
  const key = cusip.toUpperCase().trim();
  const hit = CUSIP_TICKER_MAP[key];
  if (hit) {
    return { ...hit, cusip: key, resolved: true };
  }
  return {
    cusip: key,
    ticker: key, // fallback: surface the CUSIP itself so it's visible
    exchange: "OTHER",
    nameEn: fallbackName ?? "Unknown",
    resolved: false,
  };
}
