"use client";

import { useState, useMemo } from "react";
import { useRealtimeQuotes } from "@/hooks/useRealtimeQuotes";
import { makeSecid } from "@/lib/eastmoney";
import Hero from "./Hero";
import DisclaimerBanner from "./DisclaimerBanner";
import SummaryQuartet from "./SummaryQuartet";
import MarketTabs, { type Market } from "./MarketTabs";
import HoldingsTable from "./HoldingsTable";
import ManualHoldingsList from "./ManualHoldingsList";
import QuarterlyDeltaPanel from "./QuarterlyDeltaPanel";
import ValuationHeatmap from "./ValuationHeatmap";
import DuanQuotesDrawer from "./DuanQuotesDrawer";
import PeerOverlapMatrix from "./PeerOverlapMatrix";
import Footer from "./Footer";
import type { StatementsFile } from "@/lib/types";
import type { FundamentalsSnapshot } from "./ValuationHeatmap";

export interface DashboardProps {
  latest: any;
  delta: any;
  hk: any;
  cn: any;
  qtrsHeld: Record<string, number>;
  closedRecords: any[];
  statements: Record<string, StatementsFile>;
  peerOverlap: any | null;
  fundamentals: FundamentalsSnapshot | null;
}

/**
 * Map a 13F holding to an Eastmoney secid, or "" if unsupported.
 *
 * Caveats:
 *  - BRK.B has a "." in its ticker; eastmoney's secid format expects "106.BRKB"
 *    or sometimes "106.BRK.B" depending on instrument. We special-case it.
 *  - ARCA tickers (ETFs) live behind 106 on eastmoney.
 *  - Unknown / non-equity exchanges return "" so they're absent from quote map.
 */
function secidForUsHolding(h: { exchange: string; ticker: string }): string {
  if (h.ticker === "BRK.B") return "106.BRK_B";
  const ex = h.exchange as "NASDAQ" | "NYSE" | "ARCA";
  if (!["NASDAQ", "NYSE", "ARCA"].includes(ex)) return "";
  return makeSecid(ex, h.ticker);
}

export default function DashboardRoot({
  latest,
  delta,
  hk,
  cn,
  qtrsHeld,
  closedRecords,
  statements,
  peerOverlap,
  fundamentals,
}: DashboardProps) {
  const [market, setMarket] = useState<Market>("US");
  const [activeTicker, setActiveTicker] = useState<string | null>(null);

  const usHoldings = useMemo(
    () => [...latest.holdings].sort((a: any, b: any) => b.value - a.value),
    [latest],
  );

  const allSecids = useMemo(() => {
    const us = usHoldings
      .filter((h: any) => !h.putCall)
      .map(secidForUsHolding)
      .filter(Boolean);
    const hkSec = hk.holdings.map((h: any) => h.secid);
    const cnSec = cn.holdings.map((h: any) => h.secid);
    return [...new Set([...us, ...hkSec, ...cnSec])];
  }, [usHoldings, hk, cn]);

  const { quotes, fetchedAt } = useRealtimeQuotes(allSecids, 1_000);

  // ── Portfolio-level day/day, weighted by 13F filing-date weight.
  // Basis = US 13F equity holdings (excludes Put/Call options, since those
  // are notional-skewed and segment-mixing distorts the composite).
  // Coverage = covered weight / total equity weight, surfaced so a low
  // number (e.g. when BRK.B's secid resolves stale) doesn't read as a
  // confident "−0.04% portfolio".
  const portfolio = useMemo(() => {
    const equity = usHoldings.filter((h: any) => !h.putCall);
    let totalWeight = 0;
    let coveredWeight = 0;
    let weightedChange = 0;
    for (const h of equity) {
      const w = Number(h.weight) || 0;
      totalWeight += w;
      const sec = secidForUsHolding(h);
      const q = sec ? quotes[sec] : undefined;
      if (q && Number.isFinite(q.changePct)) {
        coveredWeight += w;
        weightedChange += w * q.changePct;
      }
    }
    return {
      dPct: coveredWeight > 0 ? weightedChange / coveredWeight : null,
      coverage: totalWeight > 0 ? coveredWeight / totalWeight : 0,
      basis: equity.length,
    };
  }, [usHoldings, quotes]);

  return (
    <>
      <Hero fetchedAt={fetchedAt} latestFiling={latest} />
      <DisclaimerBanner />
      <SummaryQuartet
        latest={latest}
        delta={delta}
        fetchedAt={fetchedAt}
        portfolio={portfolio}
      />
      <MarketTabs
        market={market}
        onChange={setMarket}
        usCount={latest.totalPositions}
        hkCount={hk.holdings.length}
        cnCount={cn.holdings.length}
      />

      {market === "US" && (
        <HoldingsTable
          holdings={usHoldings}
          deltaRecords={delta.records}
          qtrsHeld={qtrsHeld}
          quotes={quotes}
          marketSecidFor={secidForUsHolding}
          closedRecords={closedRecords}
          onSelectTicker={setActiveTicker}
        />
      )}

      {market === "HK" && (
        <ManualHoldingsList
          marketLabelZh={hk.marketLabelZh}
          disclaimer={hk.disclaimer}
          currency={hk.currency}
          holdings={hk.holdings}
          quotes={quotes}
          onSelectTicker={setActiveTicker}
        />
      )}

      {market === "CN" && (
        <ManualHoldingsList
          marketLabelZh={cn.marketLabelZh}
          disclaimer={cn.disclaimer}
          currency={cn.currency}
          holdings={cn.holdings}
          quotes={quotes}
          onSelectTicker={setActiveTicker}
        />
      )}

      {/* These three panels are H&H 13F-US-only; show them only on the US
          tab so HK/CN reference-standard views aren't followed by US data. */}
      {market === "US" && (
        <>
          <QuarterlyDeltaPanel delta={delta} />
          <ValuationHeatmap
            holdings={usHoldings}
            quotes={quotes}
            secidFor={secidForUsHolding}
            fundamentals={fundamentals}
          />
          {peerOverlap && <PeerOverlapMatrix overlap={peerOverlap} />}
        </>
      )}
      <Footer latest={latest} fetchedAt={fetchedAt} />

      <DuanQuotesDrawer
        ticker={activeTicker}
        statements={activeTicker ? statements[activeTicker] ?? null : null}
        onClose={() => setActiveTicker(null)}
      />
    </>
  );
}
