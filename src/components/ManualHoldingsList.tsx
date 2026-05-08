"use client";

import { BanXin } from "./atoms";
import type { Quote } from "@/lib/types";

interface Holding {
  ticker: string;
  exchange: string;
  secid: string;
  nameZh?: string;
  nameEn: string;
  estimated: boolean;
  estimatedSizeHint?: string;
  sourceLabel: string;
  sourceUrl: string;
  notes?: string;
}

interface Props {
  marketLabelZh: string;
  disclaimer: string;
  currency: string;
  holdings: Holding[];
  quotes: Record<string, Quote>;
  onSelectTicker?: (ticker: string) => void;
}

function priceSymbol(currency: string): string {
  return currency === "HKD" ? "HK$" : currency === "CNY" ? "¥" : "$";
}

export default function ManualHoldingsList({
  marketLabelZh,
  disclaimer,
  currency,
  holdings,
  quotes,
  onSelectTicker,
}: Props) {
  const sym = priceSymbol(currency);

  return (
    <section className="max-w-[1480px] mx-auto px-10 mb-20 grid grid-cols-12 gap-10">
      <BanXin
        as="aside"
        className="col-span-4 self-start"
        style={{
          padding: "22px 24px",
          background:
            "linear-gradient(180deg, rgba(192,57,43,0.04), transparent 70%)",
        }}
      >
        <div className="lbl mb-3" style={{ color: "var(--rise)" }}>
          ⚠ 参考标 · REFERENCE STANDARD
        </div>
        <div
          className="h-cn mb-3"
          style={{ fontSize: 13, color: "var(--ink-1)", letterSpacing: "0.3em" }}
        >
          {marketLabelZh}
        </div>
        <p
          className="h-cn"
          style={{ fontSize: 13, lineHeight: 1.85, color: "var(--ink-2)" }}
        >
          {disclaimer}
        </p>
      </BanXin>

      <div className="col-span-8 space-y-5">
        {holdings.map((h) => {
          const q = quotes[h.secid];
          return (
            <BanXin
              key={h.secid}
              style={{ padding: "20px 22px", cursor: onSelectTicker ? "pointer" : undefined }}
              onClick={onSelectTicker ? () => onSelectTicker(h.ticker) : undefined}
            >
              <div className="flex items-baseline gap-4 flex-wrap">
                <span className="h-display" style={{ fontSize: 28 }}>
                  {h.ticker}
                </span>
                {h.nameZh && (
                  <span className="h-cn" style={{ fontSize: 16, color: "var(--ink-2)" }}>
                    {h.nameZh}
                  </span>
                )}
                <span className="lbl-sm">
                  {h.nameEn} · {h.exchange}
                </span>
                <span
                  className="ml-auto h-mono tnum"
                  style={{ fontSize: 22, color: "var(--ink-1)" }}
                >
                  {q?.price != null ? `${sym}${q.price.toFixed(2)}` : "—"}
                </span>
                <span
                  className="h-mono tnum"
                  style={{
                    fontSize: 12,
                    color: q
                      ? q.changePct >= 0
                        ? "var(--rise)"
                        : "var(--fall)"
                      : "var(--ink-4)",
                  }}
                >
                  {q?.changePct != null
                    ? `${q.changePct >= 0 ? "+" : ""}${q.changePct.toFixed(2)}%`
                    : ""}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-12 gap-4">
                <div className="col-span-8">
                  <div className="lbl-sm mb-1">来源 / SOURCE</div>
                  <div className="h-mono" style={{ fontSize: 12, color: "var(--ink-2)" }}>
                    {h.sourceLabel}
                  </div>
                  {h.notes && (
                    <p
                      className="h-cn mt-3"
                      style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.75 }}
                    >
                      {h.notes}
                    </p>
                  )}
                </div>
                <div className="col-span-4 text-right">
                  <div className="lbl-sm mb-1">SIZE HINT</div>
                  <div className="h-cn" style={{ fontSize: 12, color: "var(--ink-3)" }}>
                    {h.estimatedSizeHint ?? "—"}
                  </div>
                </div>
              </div>
            </BanXin>
          );
        })}
      </div>
    </section>
  );
}
