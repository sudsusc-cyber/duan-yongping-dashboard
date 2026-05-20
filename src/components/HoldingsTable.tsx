"use client";

import { useEffect, useRef, useState } from "react";
import { DeltaBadge, WeightBar, type ActionKind } from "./atoms";
import type { Quote } from "@/lib/types";

interface Holding {
  ticker: string;
  cusip: string;
  exchange: string;
  nameOfIssuer: string;
  nameZh?: string;
  classNote?: string;
  value: number;
  shares: number;
  weight: number;
  putCall?: "Put" | "Call";
}

interface DeltaRecord {
  ticker: string;
  cusip: string;
  putCall?: "Put" | "Call";
  action: { kind: ActionKind; pctChange: number; deltaShares: number; deltaValue: number };
}

interface Props {
  holdings: Holding[];
  deltaRecords: DeltaRecord[];
  qtrsHeld: Record<string, number>;
  quotes: Record<string, Quote>;
  marketSecidFor: (h: Holding) => string;
  closedRecords: DeltaRecord[];
  onSelectTicker?: (ticker: string) => void;
}

const dedupeKey = (h: { cusip: string; putCall?: string }) =>
  `${h.cusip}|${h.putCall ?? ""}`;

/**
 * Track value transitions; return "up" / "down" briefly after each change,
 * null otherwise. Caller applies a CSS animation class for the duration.
 * Initial value mount does NOT trigger a flash (avoids a flash storm on
 * first render when 19 rows all "change" from undefined → real number).
 */
function useFlashDirection(value: number | undefined): "up" | "down" | null {
  const prev = useRef<number | undefined>(undefined);
  const [dir, setDir] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (value === undefined) return;
    const p = prev.current;
    prev.current = value;
    if (p === undefined || p === value) return;
    setDir(value > p ? "up" : "down");
    const t = setTimeout(() => setDir(null), 700);
    return () => clearTimeout(t);
  }, [value]);

  return dir;
}

/** Flash-on-change number cell. Renders "—" when value is missing. */
function FlashNum({
  value,
  format,
  className = "",
}: {
  value: number | undefined;
  format: (n: number) => string;
  className?: string;
}) {
  const dir = useFlashDirection(value);
  if (value == null) {
    return <span style={{ color: "var(--ink-4)" }}>—</span>;
  }
  const flashClass = dir === "up" ? "flash-up" : dir === "down" ? "flash-down" : "";
  return <span className={`${flashClass} ${className}`.trim()}>{format(value)}</span>;
}

export default function HoldingsTable({
  holdings,
  deltaRecords,
  quotes,
  marketSecidFor,
  closedRecords,
  onSelectTicker,
}: Props) {
  const recordByKey = new Map(deltaRecords.map((r) => [dedupeKey(r), r]));
  const maxWeight = holdings.reduce((m, h) => Math.max(m, h.weight), 0);

  return (
    <section className="max-w-[1280px] mx-auto px-4 sm:px-8 mb-12 sm:mb-16">
      <div className="flex items-baseline gap-3 mb-3">
        <span style={{ fontSize: 13, color: "var(--ink-1)", fontWeight: 500 }}>
          持仓权重 / Allocation
        </span>
        <span className="hidden sm:block ml-auto lbl-sm">实时价 · 腾讯财经 · 闪动 = 刚刚变化</span>
      </div>

      <div className="overflow-x-auto -mx-4 px-4 sm:-mx-8 sm:px-8">
      <table className="book-table" style={{ minWidth: 960 }}>
        <thead>
          <tr>
            <th style={{ width: 36 }}>#</th>
            <th style={{ width: 80 }}>代码 / Code</th>
            <th>名称 / Name</th>
            <th style={{ width: 80 }}>Action</th>
            <th className="text-right" style={{ width: 90 }}>实时价</th>
            <th className="text-right" style={{ width: 80 }}>当日%</th>
            <th className="text-right" style={{ width: 90 }}>当日涨跌</th>
            <th className="text-right" style={{ width: 110 }}>披露市值</th>
            <th className="text-right" style={{ width: 200 }}>组合权重</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((h, i) => {
            const key = dedupeKey(h);
            const rec = recordByKey.get(key);
            const action: ActionKind = rec?.action.kind ?? "HOLD";
            const pctChange = rec?.action.pctChange;
            const secid = marketSecidFor(h);
            const q = secid ? quotes[secid] : undefined;
            // changeAbs is the absolute (price-unit) day delta. Tencent gives
            // it directly; fall back to deriving from price/changePct only if
            // changeAbs is missing.
            const dayChange =
              q?.changeAbs != null && q.changeAbs !== 0
                ? q.changeAbs
                : q?.price != null && q?.changePct != null
                  ? (q.price * q.changePct) / (100 + q.changePct)
                  : undefined;
            const barPct = maxWeight > 0 ? (h.weight / maxWeight) * 100 : 0;
            const upDownColor = q
              ? q.changePct >= 0
                ? "var(--rise)"
                : "var(--fall)"
              : "var(--ink-4)";

            return (
              <tr key={key} className="row" onClick={() => onSelectTicker?.(h.ticker)}>
                <td className="idx">{i + 1}</td>
                <td>
                  <span
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 13,
                      color: "var(--ink-1)",
                      fontWeight: 500,
                    }}
                  >
                    {h.ticker}
                  </span>
                </td>
                <td>
                  <div style={{ fontSize: 13, color: "var(--ink-1)" }}>
                    {h.nameZh || h.nameOfIssuer}
                  </div>
                  <div className="lbl-sm mt-0.5" style={{ textTransform: "none", letterSpacing: 0 }}>
                    {h.exchange}
                    {h.putCall ? ` · ${h.putCall.toUpperCase()}` : ""}
                  </div>
                </td>
                <td>
                  <DeltaBadge kind={action} pctChange={pctChange} />
                </td>
                <td className="text-right num-cell">
                  <FlashNum value={q?.price} format={(n) => n.toFixed(2)} />
                </td>
                <td className="text-right num-cell" style={{ color: upDownColor }}>
                  <FlashNum
                    value={q?.changePct}
                    format={(n) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`}
                  />
                </td>
                <td className="text-right num-cell" style={{ color: upDownColor }}>
                  <FlashNum
                    value={dayChange}
                    format={(n) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}`}
                  />
                </td>
                <td className="text-right num-cell">${(h.value / 1e6).toFixed(1)}M</td>
                <td className="text-right">
                  <div className="flex items-center justify-end gap-3">
                    <span className="num-cell">{h.weight.toFixed(2)}%</span>
                    <WeightBar pct={barPct} width={120} />
                  </div>
                </td>
              </tr>
            );
          })}

          {closedRecords.map((r) => (
            <tr key={`closed-${r.cusip}`} className="row" style={{ opacity: 0.5 }}>
              <td className="idx">—</td>
              <td>
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 13,
                    color: "var(--ink-3)",
                    textDecoration: "line-through",
                  }}
                >
                  {r.ticker}
                </span>
              </td>
              <td>
                <div className="lbl-sm" style={{ textTransform: "none", letterSpacing: 0 }}>
                  已清仓 · prev ${(Math.abs(r.action.deltaValue) / 1e6).toFixed(1)}M
                </div>
              </td>
              <td>
                <DeltaBadge kind="CLOSED" />
              </td>
              <td className="text-right num-cell" style={{ color: "var(--ink-4)" }}>—</td>
              <td className="text-right num-cell" style={{ color: "var(--ink-4)" }}>—</td>
              <td className="text-right num-cell" style={{ color: "var(--ink-4)" }}>—</td>
              <td className="text-right num-cell" style={{ color: "var(--ink-4)" }}>—</td>
              <td className="text-right num-cell" style={{ color: "var(--ink-4)" }}>—</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      <div
        className="mt-4 pt-3 border-t flex flex-col sm:flex-row sm:justify-between gap-1 sm:items-baseline h-mono"
        style={{ borderColor: "var(--line-rule)", fontSize: 11, color: "var(--ink-3)" }}
      >
        <span>
          {holdings.length} active · {closedRecords.length} closed last quarter
        </span>
        <span className="hidden sm:inline">weights at filing date · live prices via 腾讯财经 · 闪动指示刚刚变化</span>
      </div>
    </section>
  );
}
