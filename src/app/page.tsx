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

/**
 * Scan data/13f-history and return the N most-recent quarter files, newest first.
 * Filename convention: <year>Q<n>.json (e.g. 2026Q1.json). Sort lexicographically
 * descending — works because the format is zero-padded year + Q + digit.
 *
 * Returns the parsed JSON of each quarter; throws if nothing on disk.
 */
async function loadRecentQuarters(n: number): Promise<any[]> {
  const dir = resolve(process.cwd(), "data/13f-history");
  const files = (await fs.readdir(dir))
    .filter((f) => /^\d{4}Q[1-4]\.json$/.test(f))
    .sort((a, b) => b.localeCompare(a));
  if (files.length === 0) {
    throw new Error("No 13F history files in data/13f-history/");
  }
  const pick = files.slice(0, n);
  return Promise.all(pick.map((f) => loadJson<any>(`data/13f-history/${f}`)));
}

/**
 * Find the delta file matching <latestQuarterTag>-vs-<prev>.json. We don't need
 * to know prev — there's exactly one delta file per latest quarter on disk.
 */
async function loadLatestDelta(latestTag: string): Promise<any> {
  const dir = resolve(process.cwd(), "data/13f-deltas");
  const files = await fs.readdir(dir);
  const match = files.find((f) => f.startsWith(`${latestTag}-vs-`) && f.endsWith(".json"));
  if (!match) {
    throw new Error(`No delta file found for ${latestTag} in data/13f-deltas/`);
  }
  return loadJson<any>(`data/13f-deltas/${match}`);
}

function quarterTagFromReportDate(reportDate: string): string {
  const [yStr, mStr] = reportDate.split("-");
  const m = parseInt(mStr, 10);
  const q = m <= 3 ? 1 : m <= 6 ? 2 : m <= 9 ? 3 : 4;
  return `${yStr}Q${q}`;
}

export default async function Home() {
  // Auto-discover the 5 newest quarters; latest is index 0.
  const recent = await loadRecentQuarters(5);
  const latest = recent[0];
  const latestTag = quarterTagFromReportDate(latest.reportDate);

  const [delta, hk, cn, statements, peerOverlap, fundamentals] = await Promise.all([
    loadLatestDelta(latestTag),
    loadJson<any>("data/manual/hk-holdings.json"),
    loadJson<any>("data/manual/cn-holdings.json"),
    loadAllStatements(),
    loadJson<any>("data/peers/overlap.json").catch(() => null),
    loadJson<any>("data/fundamentals/snapshot.json").catch(() => null),
  ]);

  const qtrsHeld = computeQtrsHeld(recent);
  const closedRecords = (delta.records as any[]).filter(
    (r) => r.action.kind === "CLOSED",
  );

  return (
    <DashboardRoot
      latest={latest}
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
