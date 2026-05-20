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
    <section className="max-w-[1280px] mx-auto px-4 sm:px-8 mb-12 sm:mb-16 grid grid-cols-1 sm:grid-cols-12 gap-5 sm:gap-8">
      <BanXin
        as="aside"
        className="sm:col-span-4 self-start"
        style={{ padding: "18px 20px" }}
      >
        <div className="lbl mb-3" style={{ color: "var(--rise)" }}>
          ⚠ 参考标 / REFERENCE
        </div>
        <div
          className="mb-3"
          style={{ fontSize: 14, color: "var(--ink-1)", fontWeight: 500 }}
        >
          {marketLabelZh}
        </div>
        <p style={{ fontSize: 13, lineHeight: 1.7, color: "var(--ink-2)", margin: 0 }}>
          {disclaimer}
        </p>
      </BanXin>

      <div className="sm:col-span-8 space-y-4 sm:space-y-5">
        {holdings.map((h) => {
          const q = quotes[h.secid];
          return (
            <BanXin
              key={h.secid}
              style={{ padding: "16px 20px", cursor: onSelectTicker ? "pointer" : undefined }}
              onClick={onSelectTicker ? () => onSelectTicker(h.ticker) : undefined}
            >
              <div className="flex items-baseline gap-4 flex-wrap">
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 20,
                    color: "var(--ink-1)",
                    fontWeight: 500,
                  }}
                >
                  {h.ticker}
                </span>
                {h.nameZh && (
                  <span style={{ fontSize: 14, color: "var(--ink-2)" }}>
                    {h.nameZh}
                  </span>
                )}
                <span className="lbl-sm" style={{ textTransform: "none", letterSpacing: 0 }}>
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
              <div className="mt-3 grid grid-cols-12 gap-3 sm:gap-4">
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
