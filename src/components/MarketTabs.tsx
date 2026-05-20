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
    <section className="max-w-[1280px] mx-auto px-4 sm:px-8 mb-4">
      <div className="tab-bar">
        <Tab active={market === "US"} onClick={() => onChange("US")}>
          <span>US</span>
          <span style={{ color: "var(--ink-4)", fontSize: 11 }}>美股 · {usCount}</span>
        </Tab>

        <Tab active={market === "HK"} onClick={() => onChange("HK")}>
          <span>HK</span>
          <span style={{ color: "var(--ink-4)", fontSize: 11 }}>港股 · {hkCount}</span>
        </Tab>

        <Tab active={market === "CN"} onClick={() => onChange("CN")}>
          <span>A股</span>
          <span style={{ color: "var(--ink-4)", fontSize: 11 }}>CN · {cnCount}</span>
        </Tab>

        <div
          className="hidden sm:flex ml-auto h-mono items-center"
          style={{ fontSize: 10, color: "var(--ink-4)", padding: "14px 0", letterSpacing: "0.04em" }}
        >
          sorted by weight ↓
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
