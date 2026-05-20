/**
 * OpenFIGI batch CUSIP → (ticker, exchange, name) resolver.
 *
 * Free tier (no API key): 25 jobs/minute, 100 jobs/request. Authenticated tier
 * allows 250/minute — we don't bother since 13F filings rarely add more than
 * 5-10 new CUSIPs per quarter.
 *
 * Strategy:
 *   - Each batch hits POST /v3/mapping with up to 100 {idType, idValue} jobs.
 *   - Per CUSIP we get back an array of records (one per venue listing). We
 *     pick the canonical US composite for ticker/name, and infer NYSE/NASDAQ/
 *     ARCA from any venue-specific record.
 *   - Between batches we sleep 3s to stay well under the unauth rate limit.
 *
 * Reference: https://www.openfigi.com/api
 */

type Exchange = "NASDAQ" | "NYSE" | "ARCA" | "OTHER";

export interface ResolvedMeta {
  ticker: string;
  exchange: Exchange;
  name: string;
}

interface FigiRecord {
  ticker?: string;
  name?: string;
  exchCode?: string;
  marketSector?: string;
  securityType?: string;
}

interface FigiResponseEntry {
  data?: FigiRecord[];
  error?: string;
  warning?: string;
}

// OpenFIGI returns every venue a security trades on. For US equities a typical
// response includes the primary listing (NASDAQ or NYSE) plus secondary venues
// (NYSE Arca, BATS, IEX, etc.). We need the *primary* listing for display, so
// rank candidates instead of taking the first match.
//
// Priority tiers (higher = primary):
//   NASDAQ Global Select / Global / Capital → UQ, UW, UV, UR
//   NYSE                                      → UN
//   NYSE ARCA / NYSE American                 → UP, UA  (always secondary
//                                                       for the household
//                                                       names H&H holds)
const EXCHANGE_TIERS: Array<{ codes: string[]; exchange: Exchange; rank: number }> = [
  { codes: ["UQ", "UW", "UV", "UR"], exchange: "NASDAQ", rank: 3 },
  { codes: ["UN"],                    exchange: "NYSE",   rank: 2 },
  { codes: ["UP", "UA"],              exchange: "ARCA",   rank: 1 },
];

function bestExchange(records: FigiRecord[]): Exchange {
  let best: { exchange: Exchange; rank: number } | null = null;
  for (const r of records) {
    if (!r.exchCode) continue;
    for (const tier of EXCHANGE_TIERS) {
      if (tier.codes.includes(r.exchCode)) {
        if (!best || tier.rank > best.rank) {
          best = { exchange: tier.exchange, rank: tier.rank };
        }
      }
    }
  }
  return best?.exchange ?? "NASDAQ";
}

const SLEEP_MS = 3_000;
const BATCH_SIZE = 100;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Resolve a list of CUSIPs via OpenFIGI. CUSIPs that don't return a US-equity
 * record are simply absent from the result map.
 */
export async function resolveCusipsViaOpenFigi(
  cusips: string[],
): Promise<Map<string, ResolvedMeta>> {
  const out = new Map<string, ResolvedMeta>();
  const unique = [...new Set(cusips.map((c) => c.toUpperCase().trim()))];
  if (unique.length === 0) return out;

  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    const batch = unique.slice(i, i + BATCH_SIZE);
    const body = batch.map((cusip) => ({ idType: "ID_CUSIP", idValue: cusip }));

    let json: FigiResponseEntry[];
    try {
      const res = await fetch("https://api.openfigi.com/v3/mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) {
        console.warn(`[openfigi] HTTP ${res.status} on batch starting ${batch[0]}`);
        if (i + BATCH_SIZE < unique.length) await sleep(SLEEP_MS);
        continue;
      }
      json = (await res.json()) as FigiResponseEntry[];
    } catch (err) {
      console.warn(`[openfigi] fetch failed: ${err instanceof Error ? err.message : err}`);
      if (i + BATCH_SIZE < unique.length) await sleep(SLEEP_MS);
      continue;
    }

    for (let j = 0; j < batch.length; j++) {
      const cusip = batch[j];
      const entry = json[j];
      if (!entry?.data || entry.data.length === 0) {
        if (entry?.error) console.warn(`[openfigi] ${cusip}: ${entry.error}`);
        continue;
      }
      const equity = entry.data.filter((r) => r.marketSector === "Equity");
      if (equity.length === 0) continue;

      const composite = equity.find((r) => r.exchCode === "US") ?? equity[0];
      const ticker = composite.ticker;
      if (!ticker) continue;

      out.set(cusip, {
        ticker,
        exchange: bestExchange(equity),
        name: composite.name ?? ticker,
      });
    }

    if (i + BATCH_SIZE < unique.length) await sleep(SLEEP_MS);
  }

  return out;
}
