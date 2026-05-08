#!/usr/bin/env tsx
/**
 * Phase 1.2: compute the per-position delta between two adjacent 13F snapshots
 * and write data/13f-deltas/<currQ>-vs-<prevQ>.json.
 *
 * The dedupe key is (cusip, putCall, shareType) — same CUSIP held as outright
 * shares vs. as a put option vs. as principal-amount debt are *different*
 * positions and must not be merged.
 *
 * Usage:
 *   npm run compute:deltas                        # latest pair
 *   npx tsx scripts/compute-deltas.ts 2025Q4 2025Q3   # explicit
 *   npx tsx scripts/compute-deltas.ts --all       # every adjacent pair on disk
 */

import "./lib/load-env";

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const HISTORY_DIR = resolve(process.cwd(), "data/13f-history");
const OUT_DIR = resolve(process.cwd(), "data/13f-deltas");

// ─────────────────────────────────────────────────── types

type ActionKind = "NEW" | "ADD" | "REDUCE" | "CLOSED" | "HOLD";

interface DeltaAction {
  kind: ActionKind;
  /** signed share delta; positive=add, negative=reduce, full=NEW shares */
  deltaShares: number;
  /** signed dollar delta in USD (current.value - previous.value) */
  deltaValue: number;
  /** % share count change (NEW=100, CLOSED=-100, HOLD=0) */
  pctChange: number;
}

interface Holding13F {
  cusip: string;
  ticker: string;
  exchange: string;
  nameOfIssuer: string;
  nameEn: string;
  nameZh?: string;
  classNote?: string;
  titleOfClass: string;
  value: number;
  shares: number;
  shareType: "SH" | "PRN";
  putCall?: "Put" | "Call";
  weight: number;
  unresolvedCusip: boolean;
}

interface Quarter13F {
  filerCik: string;
  filerName: string;
  reportDate: string;
  filingDate: string;
  accessionNumber: string;
  form: string;
  totalValue: number;
  totalPositions: number;
  putCallPositions: number;
  unresolvedCount: number;
  generatedAt: string;
  holdings: Holding13F[];
}

interface DeltaRecord {
  ticker: string;
  cusip: string;
  putCall?: "Put" | "Call";
  shareType: "SH" | "PRN";
  nameZh?: string;
  nameEn: string;
  current: Holding13F | null;
  previous: Holding13F | null;
  action: DeltaAction;
}

interface QuarterDelta {
  currentTag: string;
  previousTag: string;
  filerCik: string;
  filerName: string;
  current: { reportDate: string; filingDate: string; totalValue: number; positions: number };
  previous: { reportDate: string; filingDate: string; totalValue: number; positions: number };
  records: DeltaRecord[];
  summary: {
    new: string[];
    closed: string[];
    addsTop3: Array<{ ticker: string; deltaShares: number; pctChange: number; deltaValue: number }>;
    reducesTop3: Array<{ ticker: string; deltaShares: number; pctChange: number; deltaValue: number }>;
    counts: { new: number; closed: number; add: number; reduce: number; hold: number };
    totalValueDelta: number;
    totalValuePct: number;
  };
  generatedAt: string;
}

// ─────────────────────────────────────────────────── helpers

function loadQuarter(tag: string): Quarter13F {
  const path = join(HISTORY_DIR, `${tag}.json`);
  return JSON.parse(readFileSync(path, "utf8")) as Quarter13F;
}

function listQuarterTags(): string[] {
  // sort desc by report date encoded in tag (e.g. 2025Q4 > 2025Q3)
  return readdirSync(HISTORY_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(".json", ""))
    .sort((a, b) => b.localeCompare(a));
}

function dedupeKey(h: Pick<Holding13F, "cusip" | "putCall" | "shareType">): string {
  return `${h.cusip}|${h.putCall ?? ""}|${h.shareType}`;
}

const HOLD_THRESHOLD_PCT = 0.5; // |% share-count change| below this is HOLD

function classify(prev: Holding13F | null, curr: Holding13F | null): DeltaAction {
  if (!prev && curr) {
    return { kind: "NEW", deltaShares: curr.shares, deltaValue: curr.value, pctChange: 100 };
  }
  if (prev && !curr) {
    return { kind: "CLOSED", deltaShares: -prev.shares, deltaValue: -prev.value, pctChange: -100 };
  }
  if (prev && curr) {
    const deltaShares = curr.shares - prev.shares;
    const pct = prev.shares > 0 ? (deltaShares / prev.shares) * 100 : 0;
    const deltaValue = curr.value - prev.value;
    if (Math.abs(pct) < HOLD_THRESHOLD_PCT) {
      return { kind: "HOLD", deltaShares, deltaValue, pctChange: pct };
    }
    return {
      kind: deltaShares > 0 ? "ADD" : "REDUCE",
      deltaShares,
      deltaValue,
      pctChange: pct,
    };
  }
  // Should never happen given inputs
  return { kind: "HOLD", deltaShares: 0, deltaValue: 0, pctChange: 0 };
}

function computeDelta(current: Quarter13F, previous: Quarter13F): QuarterDelta {
  const currMap = new Map<string, Holding13F>();
  for (const h of current.holdings) currMap.set(dedupeKey(h), h);

  const prevMap = new Map<string, Holding13F>();
  for (const h of previous.holdings) prevMap.set(dedupeKey(h), h);

  const allKeys = new Set([...currMap.keys(), ...prevMap.keys()]);
  const records: DeltaRecord[] = [];

  for (const key of allKeys) {
    const curr = currMap.get(key) ?? null;
    const prev = prevMap.get(key) ?? null;
    const ref = (curr ?? prev) as Holding13F;
    const action = classify(prev, curr);
    records.push({
      ticker: ref.ticker,
      cusip: ref.cusip,
      putCall: ref.putCall,
      shareType: ref.shareType,
      nameZh: ref.nameZh,
      nameEn: ref.nameEn,
      current: curr,
      previous: prev,
      action,
    });
  }

  // Sort: NEW first, then ADDs by abs(pct desc), then REDUCEs, then HOLDs by curr value desc, then CLOSED last
  const kindOrder: Record<ActionKind, number> = {
    NEW: 0,
    ADD: 1,
    REDUCE: 2,
    HOLD: 3,
    CLOSED: 4,
  };
  records.sort((a, b) => {
    const ko = kindOrder[a.action.kind] - kindOrder[b.action.kind];
    if (ko !== 0) return ko;
    // within same kind: by abs delta value desc
    return Math.abs(b.action.deltaValue) - Math.abs(a.action.deltaValue);
  });

  const news = records.filter((r) => r.action.kind === "NEW");
  const closes = records.filter((r) => r.action.kind === "CLOSED");
  const adds = records
    .filter((r) => r.action.kind === "ADD")
    .sort((a, b) => Math.abs(b.action.deltaValue) - Math.abs(a.action.deltaValue));
  const reduces = records
    .filter((r) => r.action.kind === "REDUCE")
    .sort((a, b) => Math.abs(b.action.deltaValue) - Math.abs(a.action.deltaValue));

  const totalValueDelta = current.totalValue - previous.totalValue;
  const totalValuePct =
    previous.totalValue > 0 ? (totalValueDelta / previous.totalValue) * 100 : 0;

  return {
    currentTag: tagForReportDate(current.reportDate),
    previousTag: tagForReportDate(previous.reportDate),
    filerCik: current.filerCik,
    filerName: current.filerName,
    current: {
      reportDate: current.reportDate,
      filingDate: current.filingDate,
      totalValue: current.totalValue,
      positions: current.totalPositions,
    },
    previous: {
      reportDate: previous.reportDate,
      filingDate: previous.filingDate,
      totalValue: previous.totalValue,
      positions: previous.totalPositions,
    },
    records,
    summary: {
      new: news.map((r) => r.ticker),
      closed: closes.map((r) => r.ticker),
      addsTop3: adds.slice(0, 3).map((r) => ({
        ticker: r.ticker,
        deltaShares: r.action.deltaShares,
        pctChange: r.action.pctChange,
        deltaValue: r.action.deltaValue,
      })),
      reducesTop3: reduces.slice(0, 3).map((r) => ({
        ticker: r.ticker,
        deltaShares: r.action.deltaShares,
        pctChange: r.action.pctChange,
        deltaValue: r.action.deltaValue,
      })),
      counts: {
        new: news.length,
        closed: closes.length,
        add: adds.length,
        reduce: reduces.length,
        hold: records.filter((r) => r.action.kind === "HOLD").length,
      },
      totalValueDelta,
      totalValuePct,
    },
    generatedAt: new Date().toISOString(),
  };
}

function tagForReportDate(d: string): string {
  const [y, m] = d.split("-");
  const mn = parseInt(m, 10);
  const q = mn <= 3 ? 1 : mn <= 6 ? 2 : mn <= 9 ? 3 : 4;
  return `${y}Q${q}`;
}

function fmtUsd(n: number): string {
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  return `${n.toFixed(0)}`;
}

function fmtShares(n: number): string {
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  return `${n}`;
}

function printSummary(delta: QuarterDelta): void {
  const { currentTag, previousTag, summary } = delta;
  console.log(`\n[deltas] ════ ${currentTag} vs ${previousTag} ════`);
  console.log(
    `[deltas] AUM: $${fmtUsd(delta.previous.totalValue)} → $${fmtUsd(delta.current.totalValue)}  (${
      summary.totalValueDelta >= 0 ? "+" : ""
    }${summary.totalValuePct.toFixed(2)}%)`,
  );
  console.log(
    `[deltas] positions: ${delta.previous.positions} → ${delta.current.positions}   ` +
      `[NEW=${summary.counts.new} ADD=${summary.counts.add} REDUCE=${summary.counts.reduce} ` +
      `HOLD=${summary.counts.hold} CLOSED=${summary.counts.closed}]`,
  );
  if (summary.new.length) console.log(`[deltas] NEW    : ${summary.new.join(", ")}`);
  if (summary.closed.length) console.log(`[deltas] CLOSED : ${summary.closed.join(", ")}`);
  if (summary.addsTop3.length) {
    console.log(`[deltas] adds top:`);
    for (const a of summary.addsTop3) {
      console.log(
        `         ${a.ticker.padEnd(6)} +${fmtShares(a.deltaShares).padStart(8)} sh  ` +
          `${a.pctChange >= 0 ? "+" : ""}${a.pctChange.toFixed(1)}%  ` +
          `Δ$${fmtUsd(a.deltaValue)}`,
      );
    }
  }
  if (summary.reducesTop3.length) {
    console.log(`[deltas] reduces top:`);
    for (const a of summary.reducesTop3) {
      console.log(
        `         ${a.ticker.padEnd(6)} ${fmtShares(a.deltaShares).padStart(8)} sh  ` +
          `${a.pctChange.toFixed(1)}%  ` +
          `Δ$${fmtUsd(a.deltaValue)}`,
      );
    }
  }
}

// ─────────────────────────────────────────────────── main

function processPair(currTag: string, prevTag: string): QuarterDelta {
  const current = loadQuarter(currTag);
  const previous = loadQuarter(prevTag);
  const delta = computeDelta(current, previous);

  mkdirSync(OUT_DIR, { recursive: true });
  const outPath = join(OUT_DIR, `${currTag}-vs-${prevTag}.json`);
  writeFileSync(outPath, JSON.stringify(delta, null, 2), "utf8");

  printSummary(delta);
  console.log(`[deltas]        wrote ${outPath}`);
  return delta;
}

function main() {
  const argv = process.argv.slice(2);
  const tags = listQuarterTags();
  if (tags.length < 2) {
    console.error("[deltas] need at least 2 snapshots in data/13f-history/");
    process.exit(1);
  }

  if (argv[0] === "--all") {
    for (let i = 0; i < tags.length - 1; i++) {
      processPair(tags[i], tags[i + 1]);
    }
    return;
  }

  if (argv.length === 2) {
    processPair(argv[0], argv[1]);
    return;
  }

  // default: latest pair
  processPair(tags[0], tags[1]);
}

main();
