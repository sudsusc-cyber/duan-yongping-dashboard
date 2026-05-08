import { promises as fs } from "node:fs";
import { resolve } from "node:path";
import DashboardRoot from "@/components/DashboardRoot";

async function loadJson<T>(rel: string): Promise<T> {
  const text = await fs.readFile(resolve(process.cwd(), rel), "utf8");
  return JSON.parse(text) as T;
}

const dedupeKey = (h: { cusip: string; putCall?: string }) =>
  `${h.cusip}|${h.putCall ?? ""}`;

/** For each holding in the latest quarter, count consecutive newest-first quarters
 *  in which the same (cusip, putCall) appears. */
function computeQtrsHeld(
  quartersNewestFirst: Array<{ holdings: Array<{ cusip: string; putCall?: string }> }>,
): Record<string, number> {
  if (quartersNewestFirst.length === 0) return {};
  const out: Record<string, number> = {};
  const latest = quartersNewestFirst[0];
  for (const h of latest.holdings) {
    const key = dedupeKey(h);
    let count = 0;
    for (const q of quartersNewestFirst) {
      const present = q.holdings.some((x) => dedupeKey(x) === key);
      if (!present) break;
      count++;
    }
    out[key] = count;
  }
  return out;
}

/** Load every statements file referenced in _index.json into a ticker→file map.
 *  Missing files are skipped (logged) rather than failing the whole page. */
async function loadAllStatements(): Promise<Record<string, any>> {
  const idx = await loadJson<{ tickers: Record<string, string> }>(
    "data/statements/_index.json",
  );
  const entries = await Promise.all(
    Object.entries(idx.tickers).map(async ([ticker, file]) => {
      try {
        const data = await loadJson<any>(`data/statements/${file}`);
        return [ticker, data] as const;
      } catch (e) {
        console.warn(`statements: skipping ${ticker} (${file}):`, e);
        return null;
      }
    }),
  );
  return Object.fromEntries(entries.filter((x): x is readonly [string, any] => x != null));
}

export default async function Home() {
  const [
    q4_2025,
    q3_2025,
    q2_2025,
    q1_2025,
    q4_2024,
    delta,
    hk,
    cn,
    statements,
    peerOverlap,
    fundamentals,
  ] = await Promise.all([
    loadJson<any>("data/13f-history/2025Q4.json"),
    loadJson<any>("data/13f-history/2025Q3.json"),
    loadJson<any>("data/13f-history/2025Q2.json"),
    loadJson<any>("data/13f-history/2025Q1.json"),
    loadJson<any>("data/13f-history/2024Q4.json"),
    loadJson<any>("data/13f-deltas/2025Q4-vs-2025Q3.json"),
    loadJson<any>("data/manual/hk-holdings.json"),
    loadJson<any>("data/manual/cn-holdings.json"),
    loadAllStatements(),
    loadJson<any>("data/peers/overlap.json").catch(() => null),
    loadJson<any>("data/fundamentals/snapshot.json").catch(() => null),
  ]);

  const qtrsHeld = computeQtrsHeld([q4_2025, q3_2025, q2_2025, q1_2025, q4_2024]);
  const closedRecords = (delta.records as any[]).filter(
    (r) => r.action.kind === "CLOSED",
  );

  return (
    <DashboardRoot
      latest={q4_2025}
      delta={delta}
      hk={hk}
      cn={cn}
      qtrsHeld={qtrsHeld}
      closedRecords={closedRecords}
      statements={statements}
      peerOverlap={peerOverlap}
      fundamentals={fundamentals}
    />
  );
}
