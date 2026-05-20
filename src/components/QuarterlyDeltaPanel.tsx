import type { ReactNode } from "react";
import { BanXin } from "./atoms";

interface Props {
  delta: {
    currentTag: string;
    previousTag: string;
    summary: {
      new: string[];
      closed: string[];
      addsTop3: Array<{ ticker: string; deltaShares: number; pctChange: number; deltaValue: number }>;
      reducesTop3: Array<{ ticker: string; deltaShares: number; pctChange: number; deltaValue: number }>;
    };
  };
}

function fmtSh(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  return `${n}`;
}

export default function QuarterlyDeltaPanel({ delta }: Props) {
  const s = delta.summary;
  return (
    <section className="max-w-[1280px] mx-auto px-4 sm:px-8 mb-12 sm:mb-16">
      <div className="flex flex-wrap items-baseline gap-3 sm:gap-4 mb-5 sm:mb-7">
        <span className="h-sc" style={{ fontSize: 12, color: "var(--ink-1)" }}>
          Quarterly Acts · {delta.currentTag} vs {delta.previousTag}
        </span>
        <span
          style={{
            fontFamily: "var(--serif-cn)",
            color: "var(--ink-3)",
            fontSize: 13,
            letterSpacing: "0.42em",
          }}
        >
          季 · 度 · 动 · 作
        </span>
        <span className="hidden sm:block ml-auto lbl-sm">comparator delta · cusip-matched</span>
      </div>

      <div className="grid grid-cols-12 gap-4 sm:gap-5">
        <Slot label="◆ NEW INITIATIONS" labelColor="var(--gold-light)" cn="新 · 建 · 仓">
          {s.new.length === 0 ? (
            <Empty caption="无新仓 · vacant" />
          ) : (
            <ul className="mt-7 space-y-3 text-center">
              {s.new.map((t) => (
                <li key={t} className="h-display" style={{ fontSize: 22 }}>
                  {t}
                </li>
              ))}
            </ul>
          )}
        </Slot>

        <Slot label="▲ ADDS · TOP 3" labelColor="var(--rise)" cn="加 · 仓">
          <ul className="mt-4 space-y-4">
            {s.addsTop3.length === 0 ? (
              <Empty caption="no adds" small />
            ) : (
              s.addsTop3.map((a) => (
                <Row
                  key={a.ticker}
                  ticker={a.ticker}
                  subline={`${fmtSh(a.deltaShares)} sh`}
                  amount={`${a.pctChange >= 0 ? "+" : ""}${a.pctChange.toFixed(1)}%`}
                  positive
                />
              ))
            )}
          </ul>
        </Slot>

        <Slot label="▼ TRIMS · TOP 3" labelColor="var(--fall)" cn="减 · 仓">
          <ul className="mt-4 space-y-4">
            {s.reducesTop3.length === 0 ? (
              <Empty caption="no trims" small />
            ) : (
              s.reducesTop3.map((a) => (
                <Row
                  key={a.ticker}
                  ticker={a.ticker}
                  subline={`${fmtSh(a.deltaShares)} sh`}
                  amount={`${a.pctChange.toFixed(1)}%`}
                  positive={false}
                />
              ))
            )}
          </ul>
        </Slot>

        <Slot label="✕ EXITS" labelColor="var(--ink-2)" cn="清 · 仓">
          {s.closed.length === 0 ? (
            <Empty caption="无清仓 · 0" />
          ) : (
            <div className="mt-7 flex flex-col items-center text-center">
              <div className="big-num" style={{ fontSize: 56, color: "var(--ink-2)" }}>
                {s.closed.length}
              </div>
              {s.closed.map((t) => (
                <div
                  key={t}
                  className="h-display mt-2"
                  style={{
                    fontSize: 20,
                    textDecoration: "line-through",
                    textDecorationColor: "var(--ink-4)",
                    color: "var(--ink-3)",
                  }}
                >
                  {t}
                </div>
              ))}
            </div>
          )}
        </Slot>
      </div>
    </section>
  );
}

function Slot({
  label,
  labelColor,
  cn,
  children,
}: {
  label: string;
  labelColor: string;
  cn: string;
  children: ReactNode;
}) {
  return (
    <BanXin as="article" className="col-span-6 sm:col-span-3" style={{ padding: "16px 14px", minHeight: 200 }}>
      <div className="lbl" style={{ color: labelColor, letterSpacing: "0.22em" }}>
        {label}
      </div>
      <div
        className="h-cn mt-1"
        style={{ fontSize: 12, color: "var(--ink-3)", letterSpacing: "0.42em" }}
      >
        {cn}
      </div>
      {children}
    </BanXin>
  );
}

function Empty({ caption, small = false }: { caption: string; small?: boolean }) {
  return (
    <div className="mt-7 flex flex-col items-center justify-center text-center">
      {!small && (
        <div className="big-num" style={{ fontSize: 56, color: "var(--ink-2)" }}>0</div>
      )}
      <div className="lbl-sm mt-3" style={{ color: "var(--ink-3)" }}>
        {caption}
      </div>
    </div>
  );
}

function Row({
  ticker,
  subline,
  amount,
  positive,
}: {
  ticker: string;
  subline: string;
  amount: string;
  positive: boolean;
}) {
  return (
    <li className="flex items-baseline justify-between">
      <div>
        <div className="h-display" style={{ fontSize: 17 }}>
          {ticker}
        </div>
        <div className="lbl-sm">{subline}</div>
      </div>
      <div className="num-cell" style={{ color: positive ? "var(--rise)" : "var(--fall)" }}>
        {amount}
      </div>
    </li>
  );
}
