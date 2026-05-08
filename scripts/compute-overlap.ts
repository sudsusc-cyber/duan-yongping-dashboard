#!/usr/bin/env tsx
/**
 * Phase 4 · §4.4 — Compute H&H ∩ Peer overlap by CUSIP.
 *
 * Reads:  data/13f-history/<latest>.json     (H&H, source of truth for ticker resolution)
 *         data/peers/<peer>/<latest>.json    (Berkshire, Pabrai, ...)
 * Writes: data/peers/overlap.json            (consumed by PeerOverlapMatrix.tsx)
 *
 * Run:
 *   npx tsx scripts/compute-overlap.ts
 *
 * Notes:
 *  - Berkshire files multiple sub-accounts under one CIK; same CUSIP appears
 *    on multiple rows. We aggregate (sum value+shares, take max weight as the
 *    rolled-up share of the peer's filing total).
 *  - Pabrai may have zero overlap; that's fine — the UI will show ø.
 *  - Tickers come from H&H's resolved side; if a peer holds something H&H
 *    never has, it just doesn't appear in the intersection (which is what
 *    we want — this surfaces *where Duan agrees with these books*).
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

interface Holding {
  cusip: string;
  ticker: string;
  nameOfIssuer: string;
  nameEn: string;
  nameZh?: string;
  value: number;
  shares: number;
  weight: number;
  putCall?: "Put" | "Call";
  unresolvedCusip: boolean;
}

interface Quarter13F {
  filerCik: string;
  filerName: string;
  reportDate: string;
  filingDate: string;
  totalValue: number;
  totalPositions: number;
  holdings: Holding[];
}

/** Aggregate by CUSIP+putCall: sum value/shares, sum weight (since rows are sub-account splits). */
function aggregateByCusip(holdings: Holding[]): Map<string, Holding> {
  const out = new Map<string, Holding>();
  for (const h of holdings) {
    if (h.putCall) continue; // overlap only on equity, not options
    const existing = out.get(h.cusip);
    if (!existing) {
      out.set(h.cusip, { ...h });
    } else {
      existing.value += h.value;
      existing.shares += h.shares;
      existing.weight += h.weight;
    }
  }
  return out;
}

interface SharedHolding {
  cusip: string;
  ticker: string;
  nameEn: string;
  nameZh?: string;
  hhWeight: number;
  peerWeight: number;
  hhValue: number;
  peerValue: number;
  /** min(hhWeight, peerWeight) — the "true intersection" weight */
  minWeight: number;
}

interface PeerStats {
  name: string;
  cik: string;
  reportDate: string;
  filingDate: string;
  totalValue: number;
  totalPositions: number;
  sharedHoldings: SharedHolding[];
  overlapCount: number;
  overlapHhWeight: number;
  overlapPeerWeight: number;
  overlapMinWeight: number;
}

function computeOverlap(
  hhByCusip: Map<string, Holding>,
  peer: Quarter13F,
): PeerStats {
  const peerByCusip = aggregateByCusip(peer.holdings);
  const shared: SharedHolding[] = [];
  let overlapHhW = 0;
  let overlapPeerW = 0;
  let overlapMinW = 0;

  for (const [cusip, hhHolding] of hhByCusip) {
    const peerHolding = peerByCusip.get(cusip);
    if (!peerHolding) continue;
    const hhW = hhHolding.weight;
    const peerW = peerHolding.weight;
    const minW = Math.min(hhW, peerW);
    shared.push({
      cusip,
      ticker: hhHolding.ticker,
      nameEn: hhHolding.nameEn,
      nameZh: hhHolding.nameZh,
      hhWeight: hhW,
      peerWeight: peerW,
      hhValue: hhHolding.value,
      peerValue: peerHolding.value,
      minWeight: minW,
    });
    overlapHhW += hhW;
    overlapPeerW += peerW;
    overlapMinW += minW;
  }

  shared.sort((a, b) => b.minWeight - a.minWeight);

  return {
    name: peer.filerName,
    cik: peer.filerCik,
    reportDate: peer.reportDate,
    filingDate: peer.filingDate,
    totalValue: peer.totalValue,
    totalPositions: peer.totalPositions,
    sharedHoldings: shared,
    overlapCount: shared.length,
    overlapHhWeight: overlapHhW,
    overlapPeerWeight: overlapPeerW,
    overlapMinWeight: overlapMinW,
  };
}

/** Find the latest <quarter>.json under a peer dir. Returns null if dir missing. */
function loadLatestPeerQuarter(peerDir: string): Quarter13F | null {
  const dir = resolve(process.cwd(), peerDir);
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir).filter((f) => /^\d{4}Q[1-4]\.json$/.test(f));
  if (files.length === 0) return null;
  files.sort().reverse();
  const path = join(dir, files[0]);
  return JSON.parse(readFileSync(path, "utf8")) as Quarter13F;
}

function loadLatestHH(): Quarter13F {
  const dir = resolve(process.cwd(), "data/13f-history");
  const files = readdirSync(dir)
    .filter((f) => /^\d{4}Q[1-4]\.json$/.test(f))
    .sort()
    .reverse();
  if (files.length === 0) throw new Error("No H&H quarters in data/13f-history");
  return JSON.parse(readFileSync(join(dir, files[0]), "utf8")) as Quarter13F;
}

const PEER_DIRS = [
  "data/peers/berkshire",
  "data/peers/lilu",
  "data/peers/pabrai",
] as const;

async function main() {
  const hh = loadLatestHH();
  const hhByCusip = aggregateByCusip(hh.holdings);
  console.log(
    `[overlap] H&H ${hh.reportDate}: ${hhByCusip.size} unique equity CUSIPs (of ${hh.totalPositions} rows)`,
  );

  const peerStats: PeerStats[] = [];
  for (const dir of PEER_DIRS) {
    const peer = loadLatestPeerQuarter(dir);
    if (!peer) {
      console.warn(`[overlap] skip: ${dir} (no snapshot)`);
      continue;
    }
    const stats = computeOverlap(hhByCusip, peer);
    peerStats.push(stats);
    console.log(
      `[overlap] ${stats.name.padEnd(28)}  ` +
        `${stats.totalPositions} pos · $${(stats.totalValue / 1e9).toFixed(1)}B  ` +
        `→ ${stats.overlapCount} shared with H&H · ` +
        `min-Σ ${stats.overlapMinWeight.toFixed(1)}%`,
    );
    for (const s of stats.sharedHoldings) {
      console.log(
        `           · ${s.ticker.padEnd(8)} H&H ${s.hhWeight.toFixed(1)}% / peer ${s.peerWeight.toFixed(1)}%`,
      );
    }
  }

  const out = {
    generatedAt: new Date().toISOString(),
    hhFilerCik: hh.filerCik,
    hhFilerName: hh.filerName,
    hhReportDate: hh.reportDate,
    hhFilingDate: hh.filingDate,
    hhTotalValue: hh.totalValue,
    hhEquityCusipCount: hhByCusip.size,
    peers: peerStats,
  };

  const outPath = resolve(process.cwd(), "data/peers/overlap.json");
  writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");
  console.log(`[overlap] wrote ${outPath}`);
}

main().catch((err) => {
  console.error("[overlap] fatal:", err);
  process.exit(1);
});
