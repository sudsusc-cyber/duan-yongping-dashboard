#!/usr/bin/env tsx
/**
 * Phase 4.5 — pull 5Y monthly close prices from Yahoo Finance for each
 * ticker in the latest H&H 13F, compute the current price's percentile
 * within that 5Y range, and write data/fundamentals/snapshot.json.
 *
 * The dashboard's ValuationHeatmap reads this and tints tickers by
 * "where in the 5Y range is today's price" — a more honest tier than
 * raw PE TTM (which doesn't account for the stock's own history).
 *
 * Why price percentile, not historical PE percentile:
 *   True historical PE needs EPS-on-date X, which needs quarterly earnings
 *   matched to historical quarter-end dates. That's a much heavier ETL.
 *   Price-percentile is a clean proxy for "is today's price near 5Y high
 *   (= relatively expensive) or 5Y low (= relatively cheap)" and Duan-style
 *   reasoning is mostly about "did this drop into a buyable range".
 *
 * Run:
 *   npx tsx scripts/fetch-fundamentals.ts
 */

import "./lib/load-env";

import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { setGlobalDispatcher, Agent, ProxyAgent } from "undici";

// ── Network: same proxy plumbing as edgar.ts (HTTPS_PROXY → undici) ──
const PROXY_URL =
  process.env.HTTPS_PROXY ||
  process.env.https_proxy ||
  process.env.HTTP_PROXY ||
  process.env.http_proxy ||
  "";
setGlobalDispatcher(
  PROXY_URL
    ? new ProxyAgent({ uri: PROXY_URL, connect: { timeout: 30_000 } })
    : new Agent({ connect: { timeout: 30_000, family: 4 } }),
);

const UA = "Mozilla/5.0 (compatible; DuanDashboard/0.1)";
const BASE = "https://query1.finance.yahoo.com/v8/finance/chart";
const REQUEST_GAP_MS = 250; // courtesy gap between Yahoo calls

interface ChartResponse {
  chart: {
    result?: Array<{
      meta: {
        regularMarketPrice?: number;
        fiftyTwoWeekHigh?: number;
        fiftyTwoWeekLow?: number;
        currency?: string;
        symbol?: string;
      };
      timestamp?: number[];
      indicators: {
        quote?: Array<{ close?: Array<number | null> }>;
      };
    }>;
    error?: { code?: string; description?: string } | null;
  };
}

interface FundamentalRow {
  ticker: string;
  yahooSymbol: string;
  currentPrice: number;
  /** lowest monthly close in 5Y window */
  fiveYearLow: number;
  /** highest monthly close in 5Y window */
  fiveYearHigh: number;
  /** median of 5Y monthly closes */
  fiveYearMedian: number;
  /** 0–100: where current sits in 5Y monthly-close distribution */
  fiveYearPctile: number;
  /** number of monthly bars used */
  samples: number;
  fetchedAt: string;
}

/** Map our H&H ticker to Yahoo's symbol convention. */
function yahooSymbol(ticker: string): string {
  // BRK.B → BRK-B on Yahoo. Other dot-tickers unlikely in H&H universe.
  return ticker.replace(/\./g, "-");
}

async function fetchChart(yahooSym: string): Promise<ChartResponse> {
  const url = `${BASE}/${encodeURIComponent(yahooSym)}?range=5y&interval=1mo`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return (await res.json()) as ChartResponse;
}

/** Percentile rank of `value` within `arr` (0-100, linear interpolation). */
function percentile(arr: number[], value: number): number {
  if (arr.length === 0) return 50;
  const sorted = [...arr].sort((a, b) => a - b);
  let below = 0;
  for (const x of sorted) if (x < value) below++;
  let equal = 0;
  for (const x of sorted) if (x === value) equal++;
  // mid-rank (handle ties): below + equal/2
  return ((below + equal / 2) / sorted.length) * 100;
}

async function compute(yahooSym: string, ticker: string): Promise<FundamentalRow | null> {
  const data = await fetchChart(yahooSym);
  const r = data.chart.result?.[0];
  if (!r) {
    const err = data.chart.error;
    throw new Error(`no chart result (${err?.code ?? "unknown"}: ${err?.description ?? ""})`);
  }

  const closes = (r.indicators.quote?.[0]?.close ?? []).filter(
    (v): v is number => v != null && Number.isFinite(v),
  );
  if (closes.length < 12) {
    console.warn(`[fundamentals] ${ticker}: only ${closes.length} monthly closes — skipping`);
    return null;
  }

  const current = r.meta.regularMarketPrice ?? closes[closes.length - 1];
  const sorted = [...closes].sort((a, b) => a - b);

  return {
    ticker,
    yahooSymbol: yahooSym,
    currentPrice: current,
    fiveYearLow: sorted[0],
    fiveYearHigh: sorted[sorted.length - 1],
    fiveYearMedian: sorted[Math.floor(sorted.length / 2)],
    fiveYearPctile: percentile(closes, current),
    samples: closes.length,
    fetchedAt: new Date().toISOString(),
  };
}

async function main() {
  console.log(`[fundamentals] proxy: ${PROXY_URL || "(direct)"}`);

  // Read latest H&H quarter to know which tickers we need.
  const latestPath = resolve(process.cwd(), "data/13f-history/2025Q4.json");
  const latest = JSON.parse(readFileSync(latestPath, "utf8")) as {
    holdings: Array<{ ticker: string; putCall?: string }>;
  };
  const tickers = [
    ...new Set(
      latest.holdings
        .filter((h) => !h.putCall)
        .map((h) => h.ticker),
    ),
  ];
  console.log(`[fundamentals] tickers: ${tickers.join(", ")}`);

  const rows: FundamentalRow[] = [];
  const failures: Array<{ ticker: string; error: string }> = [];

  for (const t of tickers) {
    const sym = yahooSymbol(t);
    process.stdout.write(`  ${t.padEnd(8)} → ${sym.padEnd(8)} `);
    try {
      const row = await compute(sym, t);
      if (row) {
        rows.push(row);
        console.log(
          `now $${row.currentPrice.toFixed(2)} · ` +
            `5Y [${row.fiveYearLow.toFixed(2)}–${row.fiveYearHigh.toFixed(2)}] · ` +
            `pctile ${row.fiveYearPctile.toFixed(0)}%`,
        );
      } else {
        console.log("(insufficient data)");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`✗ ${msg}`);
      failures.push({ ticker: t, error: msg });
    }
    await sleep(REQUEST_GAP_MS);
  }

  const outDir = resolve(process.cwd(), "data/fundamentals");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "snapshot.json");

  const byTicker: Record<string, FundamentalRow> = {};
  for (const r of rows) byTicker[r.ticker] = r;

  writeFileSync(
    outPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        source: "Yahoo Finance · 5Y monthly closes",
        tickerCount: rows.length,
        failures,
        tickers: byTicker,
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(`\n[fundamentals] wrote ${outPath}`);
  console.log(`  ${rows.length} ok · ${failures.length} failed`);
  if (failures.length) {
    for (const f of failures) console.log(`  ✗ ${f.ticker}: ${f.error}`);
  }
}

main().catch((e) => {
  console.error("[fundamentals] fatal:", e);
  process.exit(1);
});
