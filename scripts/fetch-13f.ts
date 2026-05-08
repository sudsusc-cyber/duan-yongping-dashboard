#!/usr/bin/env tsx
/**
 * Phase 1.1 main script: pull H&H International 13F filings from SEC EDGAR,
 * parse them, and write per-quarter snapshots to data/13f-history/<quarter>.json.
 *
 * Setup:
 *   1. cp .env.example .env.local
 *   2. Edit .env.local — replace placeholder SEC_USER_AGENT with real contact email
 *
 * Run:
 *   npm run fetch:13f                  # latest 5 quarters
 *   npx tsx scripts/fetch-13f.ts --limit 12 --force
 *   npx tsx scripts/fetch-13f.ts --cik 0001067983   # Berkshire, for peer pulls later
 *
 * Flags:
 *   --limit N    fetch only the N most recent reports (default 5)
 *   --cik <id>   override CIK (default 0001759760 = H&H)
 *   --force      re-download even if local snapshot exists
 */

import "./lib/load-env";

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

import { listFilings, fetchInfoTableXml, type FilingEntry } from "./lib/edgar";
import {
  parse13FInfoTable,
  valueScaleForFilingDate,
  type RawInfoTableRow,
} from "./lib/parse-13f-xml";
import { resolveCusip } from "./lib/cusip-ticker-map";

const DEFAULT_CIK = "0001759760"; // H&H International Investment, LLC

// ─────────────────────────────────────────────────── arg parsing

interface CliArgs {
  limit: number;
  cik: string;
  force: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { limit: 5, cik: DEFAULT_CIK, force: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--limit") args.limit = Number(argv[++i]);
    else if (a === "--cik") args.cik = argv[++i];
    else if (a === "--force") args.force = true;
  }
  return args;
}

// ─────────────────────────────────────────────────── helpers

function quarterTagFromReportDate(reportDate: string): string {
  const [yStr, mStr] = reportDate.split("-");
  const m = parseInt(mStr, 10);
  const q = m <= 3 ? 1 : m <= 6 ? 2 : m <= 9 ? 3 : 4;
  return `${yStr}Q${q}`;
}

// ─────────────────────────────────────────────────── output schema

interface Holding13F {
  cusip: string;
  ticker: string;
  exchange: string;
  nameOfIssuer: string;
  nameEn: string;
  nameZh?: string;
  classNote?: string;
  titleOfClass: string;
  value: number;          // USD (post-2023 literal; pre-2023 already scaled by parser)
  shares: number;
  shareType: "SH" | "PRN";
  putCall?: "Put" | "Call";
  weight: number;         // % of totalValue
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

function buildQuarterRecord(input: {
  filerCik: string;
  filerName: string;
  filing: FilingEntry;
  rawRows: RawInfoTableRow[];
}): Quarter13F {
  const { filerCik, filerName, filing, rawRows } = input;
  const totalValue = rawRows.reduce((sum, r) => sum + r.value, 0);

  const holdings: Holding13F[] = rawRows
    .map((row) => {
      const r = resolveCusip(row.cusip, row.nameOfIssuer);
      return {
        cusip: r.cusip,
        ticker: r.ticker,
        exchange: r.exchange,
        nameOfIssuer: row.nameOfIssuer,
        nameEn: r.nameEn,
        nameZh: r.nameZh,
        classNote: r.classNote,
        titleOfClass: row.titleOfClass,
        value: row.value,
        shares: row.shares,
        shareType: row.shareType,
        putCall: row.putCall,
        weight: totalValue > 0 ? (row.value / totalValue) * 100 : 0,
        unresolvedCusip: !r.resolved,
      };
    })
    .sort((a, b) => b.value - a.value);

  return {
    filerCik,
    filerName,
    reportDate: filing.reportDate,
    filingDate: filing.filingDate,
    accessionNumber: filing.accessionNumber,
    form: filing.form,
    totalValue,
    totalPositions: holdings.length,
    putCallPositions: holdings.filter((h) => h.putCall).length,
    unresolvedCount: holdings.filter((h) => h.unresolvedCusip).length,
    generatedAt: new Date().toISOString(),
    holdings,
  };
}

// ─────────────────────────────────────────────────── main

async function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log(
    `[fetch-13f] CIK=${args.cik}  limit=${args.limit}  force=${args.force}`,
  );
  console.log(`[fetch-13f] UA="${process.env.SEC_USER_AGENT}"`);

  const submissions = await listFilings(args.cik);
  console.log(
    `[fetch-13f] filer="${submissions.name}"  ` +
      `13F filings discovered=${submissions.filings.length}`,
  );

  // Dedupe by reportDate, preferring amended filings (13F-HR/A) and the
  // most recent filingDate among filings of the same kind.
  const byReport = new Map<string, FilingEntry>();
  for (const f of submissions.filings) {
    const existing = byReport.get(f.reportDate);
    if (!existing) {
      byReport.set(f.reportDate, f);
      continue;
    }
    const isAmendment = f.form.endsWith("/A");
    const existingIsAmendment = existing.form.endsWith("/A");
    if (isAmendment && !existingIsAmendment) {
      byReport.set(f.reportDate, f);
    } else if (isAmendment === existingIsAmendment && f.filingDate > existing.filingDate) {
      byReport.set(f.reportDate, f);
    }
  }

  const ordered = [...byReport.values()].sort((a, b) =>
    b.reportDate.localeCompare(a.reportDate),
  );
  const targets = ordered.slice(0, args.limit);

  if (targets.length === 0) {
    console.warn("[fetch-13f] No 13F filings found for this CIK.");
    return;
  }

  const outDir = resolve(process.cwd(), "data/13f-history");
  mkdirSync(outDir, { recursive: true });

  const summary: Array<{
    tag: string;
    positions: number;
    totalUSD: number;
    status: string;
  }> = [];

  for (const filing of targets) {
    const tag = quarterTagFromReportDate(filing.reportDate);
    const outPath = join(outDir, `${tag}.json`);

    if (existsSync(outPath) && !args.force) {
      console.log(
        `[fetch-13f] [skip] ${tag}  already on disk (use --force to refresh)`,
      );
      summary.push({ tag, positions: 0, totalUSD: 0, status: "skip (exists)" });
      continue;
    }

    console.log(
      `[fetch-13f] [pull] ${tag}  filed=${filing.filingDate}  ` +
        `form=${filing.form}  acc=${filing.accessionNumber}`,
    );

    try {
      const { url, xml } = await fetchInfoTableXml(args.cik, filing.accessionNumber);
      const valueScale = valueScaleForFilingDate(filing.filingDate);
      const { rows } = parse13FInfoTable(xml, valueScale);

      const record = buildQuarterRecord({
        filerCik: submissions.cik,
        filerName: submissions.name,
        filing,
        rawRows: rows,
      });

      writeFileSync(outPath, JSON.stringify(record, null, 2), "utf8");
      console.log(
        `[fetch-13f]        rows=${record.totalPositions}  ` +
          `total=$${(record.totalValue / 1e9).toFixed(2)}B  ` +
          `unresolved=${record.unresolvedCount}  src=${url}`,
      );
      summary.push({
        tag,
        positions: record.totalPositions,
        totalUSD: record.totalValue,
        status:
          record.unresolvedCount > 0
            ? `ok (${record.unresolvedCount} unresolved CUSIPs)`
            : "ok",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[fetch-13f] [fail] ${tag}  ${msg}`);
      summary.push({
        tag,
        positions: 0,
        totalUSD: 0,
        status: `error: ${msg.slice(0, 80)}`,
      });
    }
  }

  console.log("\n[fetch-13f] ═════ summary ═════");
  for (const s of summary) {
    const valStr = s.totalUSD ? `$${(s.totalUSD / 1e9).toFixed(2)}B` : "—";
    console.log(
      `  ${s.tag.padEnd(8)}  rows=${String(s.positions).padStart(3)}  ` +
        `${valStr.padStart(10)}   ${s.status}`,
    );
  }
}

main().catch((err) => {
  console.error("[fetch-13f] fatal:", err);
  process.exit(1);
});
