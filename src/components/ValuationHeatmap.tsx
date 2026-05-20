"use client";

import { useEffect, useState } from "react";
import type { Quote } from "@/lib/types";

interface Holding {
  ticker: string;
  cusip: string;
  exchange: string;
  putCall?: "Put" | "Call";
  weight: number;
}

export interface FundamentalRow {
  ticker: string;
  yahooSymbol: string;
  currentPrice: number;
  fiveYearLow: number;
  fiveYearHigh: number;
  fiveYearMedian: number;
  fiveYearPctile: number;
  samples: number;
  fetchedAt: string;
  trailingPE?: number;
  forwardPE?: number;
  epsTrailingTwelveMonths?: number;
  epsForward?: number;
}

export interface FundamentalsSnapshot {
  generatedAt: string;
  source: string;
  tickerCount: number;
  tickers: Record<string, FundamentalRow>;
}

interface Props {
  holdings: Holding[];
  quotes: Record<string, Quote>;
  secidFor: (h: Holding) => string;
  fundamentals?: FundamentalsSnapshot | null;
}

/**
 * Tier from PE ratio (forward preferred, trailing fallback).
 * Thresholds reflect a quality-growth portfolio where 25x earnings
 * is reasonable fair value for a moat business:
 *   < 15  → CHEAP  (deep discount, cyclical trough, or value territory)
 *   15-25 → FAIR   (reasonable for stable compounders)
 *   25-40 → FULL   (priced for solid growth, limited margin of safety)
 *   > 40  → RICH   (requires very high growth to justify)
 */
function tierForPE(pe: number): { tier: 1 | 2 | 3 | 4; label: string } {
  if (pe < 15) return { tier: 1, label: "CHEAP" };
  if (pe < 25) return { tier: 2, label: "FAIR" };
  if (pe < 40) return { tier: 3, label: "FULL" };
  return { tier: 4, label: "RICH" };
}

/** Fallback when no PE is available: use 5Y price percentile. */
function tierForPercentile(pct: number): { tier: 1 | 2 | 3 | 4; label: string } {
  if (pct < 25) return { tier: 1, label: "CHEAP" };
  if (pct < 50) return { tier: 2, label: "FAIR" };
  if (pct < 75) return { tier: 3, label: "FULL" };
  return { tier: 4, label: "RICH" };
}

/** Fallback when no fundamentals snapshot: use live quote PE. */
function tierForLivePe(pe?: number): { tier: 1 | 2 | 3 | 4; label: string } {
  if (pe == null || pe <= 0) return { tier: 2, label: "—" };
  return tierForPE(pe);
}

export default function ValuationHeatmap({
  holdings,
  quotes,
  secidFor,
  fundamentals,
}: Props) {
  const cells = holdings
    .filter((h) => !h.putCall)
    .map((h) => {
      const q = quotes[secidFor(h)];
      const f = fundamentals?.tickers[h.ticker];

      // Valuation priority:
      // 1. Yahoo forward PE (analyst consensus, most forward-looking)
      // 2. Yahoo trailing PE (actual last-12-month earnings)
      // 3. Live Tencent PE (real-time but less precise for non-US)
      // 4. 5Y price percentile (last resort — price position, not earnings)
      const fwdPE = f?.forwardPE;
      const ttmPE = f?.trailingPE ?? (q?.pe != null && q.pe > 0 ? q.pe : undefined);
      const activePE = fwdPE ?? ttmPE;
      const t = activePE != null ? tierForPE(activePE)
        : f ? tierForPercentile(f.fiveYearPctile)
        : tierForLivePe(q?.pe);

      return {
        ticker: h.ticker,
        weight: h.weight,
        fwdPE,
        ttmPE,
        pctile: f?.fiveYearPctile,
        fiveYearLow: f?.fiveYearLow,
        fiveYearHigh: f?.fiveYearHigh,
        tier: t.tier,
        label: t.label,
        // Which metric actually drove the tier
        metricLabel: fwdPE != null ? "fwd PE"
          : ttmPE != null ? "ttm PE"
          : f ? "5Y%"
          : "PE",
      };
    })
    .sort((a, b) => a.tier - b.tier || b.weight - a.weight);

  // Detect actual column count so padCount fills exactly one last row,
  // not multiple empty rows (e.g. 3-col mobile with 6-col padding formula).
  const [colCount, setColCount] = useState(6);
  useEffect(() => {
    const update = () =>
      setColCount(window.innerWidth < 640 ? 3 : window.innerWidth < 1024 ? 4 : 6);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const padCount = (colCount - (cells.length % colCount)) % colCount;
  const usingPE = cells.some((c) => c.fwdPE != null || c.ttmPE != null);
  const usingPercentile = !!fundamentals && Object.keys(fundamentals.tickers).length > 0;

  return (
    <section className="max-w-[1280px] mx-auto px-4 sm:px-8 mb-12 sm:mb-16">
      <div className="flex flex-wrap items-baseline gap-3 sm:gap-4 mb-3">
        <span className="h-sc" style={{ fontSize: 12, color: "var(--ink-1)" }}>
          Valuation Heat · {usingPE ? "P/E ratio" : usingPercentile ? "5Y price pctile" : "PE-derived"}
        </span>
        <span
          style={{
            fontFamily: "var(--serif-cn)",
            color: "var(--ink-3)",
            fontSize: 13,
            letterSpacing: "0.42em",
          }}
        >
          估 · 值 · 热 · 力 · 图
        </span>
        <span className="hidden sm:block ml-auto lbl-sm">5Y 低位 · 深绿  /  5Y 高位 · 深红</span>
      </div>
      <div className="lbl-sm mb-4 sm:mb-5" style={{ color: "var(--ink-4)" }}>
        {usingPE
          ? `市盈率分档：<15 · 15–25 · 25–40 · ≥40。优先 Yahoo 远期 PE（分析师一致预期），次选 TTM PE，再次选实时报价 PE。` +
            (fundamentals ? ` 数据截止 ${new Date(fundamentals.generatedAt).toISOString().slice(0, 10)}。` : "")
          : usingPercentile
            ? `当前价在 5 年月线收盘区间中的位置 (Yahoo Finance · ${fundamentals ? new Date(fundamentals.generatedAt).toISOString().slice(0, 10) : "—"})。PE 数据缺失时使用此指标。`
            : "fundamentals/snapshot.json 缺失 — 跑 npm run fetch:fundamentals 后切换为 PE 估值。"}
      </div>

      <div className="heat-grid">
        {cells.map((c) => (
          <div key={c.ticker} className={`heat-cell heat-q${c.tier}`}>
            <div className="lbl-sm">{c.label}</div>
            <div className="tk">{c.ticker}</div>
            <div>
              {c.fwdPE != null ? (
                <>
                  <div className="pe">fwd {c.fwdPE.toFixed(1)}x</div>
                  <div className="pct mt-1">
                    {c.ttmPE != null ? `ttm ${c.ttmPE.toFixed(1)}x` : `wt ${c.weight.toFixed(1)}%`}
                  </div>
                </>
              ) : c.ttmPE != null ? (
                <>
                  <div className="pe">ttm {c.ttmPE.toFixed(1)}x</div>
                  <div className="pct mt-1">wt {c.weight.toFixed(1)}%</div>
                </>
              ) : c.pctile != null ? (
                <>
                  <div className="pe">5Y {c.pctile.toFixed(0)}%</div>
                  <div className="pct mt-1">
                    {c.fiveYearLow != null && c.fiveYearHigh != null
                      ? `$${c.fiveYearLow.toFixed(0)}–${c.fiveYearHigh.toFixed(0)}`
                      : `wt ${c.weight.toFixed(1)}%`}
                  </div>
                </>
              ) : (
                <>
                  <div className="pe">PE —</div>
                  <div className="pct mt-1">wt {c.weight.toFixed(1)}%</div>
                </>
              )}
            </div>
          </div>
        ))}
        {Array.from({ length: padCount }, (_, i) => (
          <div key={`vacant-${i}`} className="heat-cell heat-vacant">
            <div className="lbl-sm" style={{ color: "var(--ink-5)" }}>VACANT</div>
            <div className="tk h-display-it" style={{ color: "var(--ink-5)" }}>…</div>
          </div>
        ))}
      </div>

      <div
        className="mt-6 flex items-center gap-7 h-mono"
        style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.05em" }}
      >
        <span className="flex items-center gap-2">
          <i className="inline-block heat-q1" style={{ width: 14, height: 14 }} />
          PE &lt;15
        </span>
        <span className="flex items-center gap-2">
          <i className="inline-block heat-q2" style={{ width: 14, height: 14 }} />
          PE 15–25
        </span>
        <span className="flex items-center gap-2">
          <i className="inline-block heat-q3" style={{ width: 14, height: 14 }} />
          PE 25–40
        </span>
        <span className="flex items-center gap-2">
          <i className="inline-block heat-q4" style={{ width: 14, height: 14 }} />
          PE ≥40
        </span>
      </div>
    </section>
  );
}
