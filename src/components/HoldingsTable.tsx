"use client";

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

const ROMAN = [
  "i", "ii", "iii", "iv", "v", "vi", "vii", "viii",
  "ix", "x", "xi", "xii", "xiii", "xiv", "xv", "xvi", "xvii", "xviii",
];

const dedupeKey = (h: { cusip: string; putCall?: string }) =>
  `${h.cusip}|${h.putCall ?? ""}`;

export default function HoldingsTable({
  holdings,
  deltaRecords,
  qtrsHeld,
  quotes,
  marketSecidFor,
  closedRecords,
  onSelectTicker,
}: Props) {
  const recordByKey = new Map(deltaRecords.map((r) => [dedupeKey(r), r]));

  return (
    <section className="max-w-[1480px] mx-auto px-10 mb-20">
      <div className="flex items-baseline gap-4 mb-3">
        <span className="h-sc" style={{ fontSize: 12, color: "var(--ink-1)" }}>
          Holdings · By Weight
        </span>
        <span
          style={{
            fontFamily: "var(--serif-cn)",
            color: "var(--ink-3)",
            fontSize: 13,
            letterSpacing: "0.42em",
          }}
        >
          持 · 仓 · 总 · 览
        </span>
        <span className="ml-auto lbl-sm">live prices via 东财</span>
      </div>

      <table className="book-table mt-3">
        <thead>
          <tr>
            <th style={{ width: 32 }}>#</th>
            <th>Issuer · 标的</th>
            <th>Action</th>
            <th className="text-right" style={{ width: 100 }}>Last</th>
            <th className="text-right" style={{ width: 80 }}>Δ Day</th>
            <th className="text-right" style={{ width: 110 }}>Disclosed</th>
            <th className="text-right" style={{ width: 200 }}>Weight · 权重</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((h, i) => {
            const key = dedupeKey(h);
            const rec = recordByKey.get(key);
            const action: ActionKind = rec?.action.kind ?? "HOLD";
            const pctChange = rec?.action.pctChange;
            const qtrs = qtrsHeld[key] ?? 1;
            const secid = marketSecidFor(h);
            const q = secid ? quotes[secid] : undefined;
            const isTenet = qtrs >= 8 && !h.putCall;

            return (
              <tr
                key={key}
                className="row"
                onClick={() => onSelectTicker?.(h.ticker)}
              >
                <td className="idx">{ROMAN[i] ?? String(i + 1)}</td>
                <td>
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span className="h-display" style={{ fontSize: 21 }}>
                      {h.ticker}
                    </span>
                    {h.nameZh && (
                      <span
                        className="h-cn"
                        style={{ fontSize: 12, color: "var(--ink-3)" }}
                      >
                        {h.nameZh}
                      </span>
                    )}
                    {isTenet && <span className="tenet">本分</span>}
                    {h.putCall && (
                      <span className="opt-tag">⚙ {h.putCall.toUpperCase()}</span>
                    )}
                  </div>
                  <div className="lbl-sm mt-1">
                    {h.nameOfIssuer} · {h.exchange} · {h.cusip}
                  </div>
                </td>
                <td>
                  <DeltaBadge kind={action} pctChange={pctChange} />
                </td>
                <td className="text-right num-cell">
                  {q?.price != null ? (
                    q.price.toFixed(2)
                  ) : (
                    <span style={{ color: "var(--ink-4)" }}>—</span>
                  )}
                </td>
                <td
                  className="text-right num-cell"
                  style={{
                    color: q
                      ? q.changePct >= 0
                        ? "var(--rise)"
                        : "var(--fall)"
                      : "var(--ink-4)",
                  }}
                >
                  {q?.changePct != null
                    ? `${q.changePct >= 0 ? "+" : ""}${q.changePct.toFixed(2)}%`
                    : "—"}
                </td>
                <td className="text-right num-cell">
                  ${(h.value / 1e6).toFixed(1)} M
                </td>
                <td className="text-right">
                  <div className="flex items-center justify-end gap-3">
                    <span className="num-cell">{h.weight.toFixed(2)}%</span>
                    <WeightBar pct={Math.min(100, h.weight * 2)} width={120} />
                  </div>
                </td>
              </tr>
            );
          })}

          {/* CLOSED rows */}
          {closedRecords.map((r) => (
            <tr key={`closed-${r.cusip}`} className="row" style={{ opacity: 0.55 }}>
              <td className="idx">—</td>
              <td>
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span
                    className="h-display"
                    style={{
                      fontSize: 21,
                      textDecoration: "line-through",
                      textDecorationColor: "var(--ink-4)",
                    }}
                  >
                    {r.ticker}
                  </span>
                </div>
                <div className="lbl-sm mt-1">
                  已清仓 · prev value $
                  {(Math.abs(r.action.deltaValue) / 1e6).toFixed(1)} M
                </div>
              </td>
              <td>
                <DeltaBadge kind="CLOSED" />
              </td>
              <td className="text-right num-cell" style={{ color: "var(--ink-4)" }}>—</td>
              <td className="text-right num-cell" style={{ color: "var(--ink-4)" }}>—</td>
              <td className="text-right num-cell" style={{ color: "var(--ink-4)" }}>—</td>
              <td className="text-right num-cell" style={{ color: "var(--ink-4)" }}>—</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div
        className="mt-4 pt-3 border-t flex justify-between items-baseline h-mono"
        style={{ borderColor: "var(--line-rule)", fontSize: 11, color: "var(--ink-3)" }}
      >
        <span>
          {holdings.length} active · {closedRecords.length} closed last quarter
        </span>
        <span>weights at filing date · live prices via 东方财富</span>
      </div>
    </section>
  );
}
