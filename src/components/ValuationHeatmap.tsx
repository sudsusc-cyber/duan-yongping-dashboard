"use client";

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
 * Tier from Yahoo 5Y monthly-close percentile of the *current* price.
 * Lower percentile = price near 5Y low = relatively cheap.
 *   0-25%  → tier 1 (deep green) · CHEAP
 *  25-50%  → tier 2 (light green) · FAIR
 *  50-75%  → tier 3 (light red)   · FULL
 *  75-100% → tier 4 (deep red)    · RICH
 */
function tierForPercentile(pct: number): { tier: 1 | 2 | 3 | 4; label: string } {
  if (pct < 25) return { tier: 1, label: "CHEAP" };
  if (pct < 50) return { tier: 2, label: "FAIR" };
  if (pct < 75) return { tier: 3, label: "FULL" };
  return { tier: 4, label: "RICH" };
}

/** Fallback when no 5Y fundamentals row: use raw PE TTM absolute tier. */
function tierForPe(pe?: number): { tier: 1 | 2 | 3 | 4; label: string } {
  if (pe == null) return { tier: 2, label: "—" };
  if (pe < 15) return { tier: 1, label: "CHEAP" };
  if (pe < 25) return { tier: 2, label: "FAIR" };
  if (pe < 40) return { tier: 3, label: "FULL" };
  return { tier: 4, label: "RICH" };
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
      const t = f ? tierForPercentile(f.fiveYearPctile) : tierForPe(q?.pe);
      return {
        ticker: h.ticker,
        weight: h.weight,
        pe: q?.pe,
        pctile: f?.fiveYearPctile,
        fiveYearLow: f?.fiveYearLow,
        fiveYearHigh: f?.fiveYearHigh,
        tier: t.tier,
        label: t.label,
      };
    })
    .sort((a, b) => a.tier - b.tier || b.weight - a.weight);

  const padCount = (6 - (cells.length % 6)) % 6;
  const usingPercentile = !!fundamentals && Object.keys(fundamentals.tickers).length > 0;

  return (
    <section className="max-w-[1280px] mx-auto px-4 sm:px-8 mb-12 sm:mb-16">
      <div className="flex flex-wrap items-baseline gap-3 sm:gap-4 mb-3">
        <span className="h-sc" style={{ fontSize: 12, color: "var(--ink-1)" }}>
          Valuation Heat · {usingPercentile ? "5Y price percentile" : "PE-derived"}
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
        {usingPercentile
          ? `当前价在 5 年月线收盘分布中的百分位 (Yahoo Finance · 60 monthly bars · ` +
            `${new Date(fundamentals!.generatedAt).toISOString().slice(0, 10)})。` +
            `档分:0–25 / 25–50 / 50–75 / 75–100。`
          : "v0.1 用 PE TTM 绝对值粗分四档 (<15 / 15–25 / 25–40 / ≥40)。" +
            "data/fundamentals/snapshot.json 缺失 — 跑 npm run fetch:fundamentals 后即切换为 5Y 百分位。"}
      </div>

      <div className="heat-grid">
        {cells.map((c) => (
          <div key={c.ticker} className={`heat-cell heat-q${c.tier}`}>
            <div className="lbl-sm">{c.label}</div>
            <div className="tk">{c.ticker}</div>
            <div>
              {c.pctile != null ? (
                <>
                  <div className="pe">5Y {c.pctile.toFixed(0)}%</div>
                  <div className="pct mt-1">
                    {c.fiveYearLow != null && c.fiveYearHigh != null ? (
                      <>
                        ${c.fiveYearLow.toFixed(0)}–{c.fiveYearHigh.toFixed(0)}
                      </>
                    ) : null}
                  </div>
                </>
              ) : (
                <>
                  <div className="pe">PE {c.pe != null ? c.pe.toFixed(1) : "—"}</div>
                  <div className="pct mt-1">weight {c.weight.toFixed(2)}%</div>
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
          {usingPercentile ? "0–25%" : "<15"}
        </span>
        <span className="flex items-center gap-2">
          <i className="inline-block heat-q2" style={{ width: 14, height: 14 }} />
          {usingPercentile ? "25–50%" : "15–25"}
        </span>
        <span className="flex items-center gap-2">
          <i className="inline-block heat-q3" style={{ width: 14, height: 14 }} />
          {usingPercentile ? "50–75%" : "25–40"}
        </span>
        <span className="flex items-center gap-2">
          <i className="inline-block heat-q4" style={{ width: 14, height: 14 }} />
          {usingPercentile ? "75–100%" : "≥40"}
        </span>
      </div>
    </section>
  );
}
