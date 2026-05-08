"use client";

import type { ReactNode } from "react";

export type Market = "US" | "HK" | "CN";

interface Props {
  market: Market;
  onChange: (m: Market) => void;
  usCount: number;
  hkCount: number;
  cnCount: number;
}

export default function MarketTabs({ market, onChange, usCount, hkCount, cnCount }: Props) {
  return (
    <section className="max-w-[1480px] mx-auto px-10 mb-8">
      <div className="tab-bar">
        <Tab active={market === "US"} onClick={() => onChange("US")}>
          <span
            className="h-cn"
            style={{ fontFamily: "var(--serif-cn)", letterSpacing: "0.42em", fontSize: 13 }}
          >
            美 · 股
          </span>
          <span
            className="h-mono"
            style={{ fontSize: 9, letterSpacing: "0.05em", color: "var(--ink-3)" }}
          >
            US · 13F-HR · {usCount} positions
          </span>
        </Tab>

        <Tab active={market === "HK"} onClick={() => onChange("HK")}>
          <span
            className="h-cn"
            style={{ fontFamily: "var(--serif-cn)", letterSpacing: "0.42em", fontSize: 13 }}
          >
            港 · 股
          </span>
          <span
            className="h-mono"
            style={{ fontSize: 9, letterSpacing: "0.05em", color: "var(--ink-4)" }}
          >
            HK · {hkCount}
          </span>
          <span className="est">参考标 · 公开访谈</span>
        </Tab>

        <Tab active={market === "CN"} onClick={() => onChange("CN")}>
          <span
            className="h-cn"
            style={{ fontFamily: "var(--serif-cn)", letterSpacing: "0.42em", fontSize: 13 }}
          >
            A · 股
          </span>
          <span
            className="h-mono"
            style={{ fontSize: 9, letterSpacing: "0.05em", color: "var(--ink-4)" }}
          >
            CN · {cnCount}
          </span>
          <span className="est">参考标 · 公开访谈</span>
        </Tab>

        <div
          className="ml-auto h-mono flex items-center"
          style={{ fontSize: 10, color: "var(--ink-4)", padding: "14px 0" }}
        >
          sort: weight ↓
        </div>
      </div>
    </section>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" className={`tab ${active ? "is-active" : ""}`} onClick={onClick}>
      {children}
    </button>
  );
}
