"use client";

import { useEffect, useState } from "react";
import { Stamp, DataDot } from "./atoms";

interface Props {
  fetchedAt?: string;
  latestFiling: { reportDate: string; filingDate: string };
}

function dateStrip(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy} · ${mm} · ${dd}`;
}

function clockStrip(d: Date): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function quoteAge(iso: string | undefined, now: Date | null): string {
  if (!iso || !now) return "—";
  const ms = now.getTime() - new Date(iso).getTime();
  const sec = Math.max(0, Math.round(ms / 1000));
  if (sec < 1) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  return `${min}m ago`;
}

export default function Hero({ fetchedAt, latestFiling }: Props) {
  // Initial null avoids SSR/CSR hydration mismatch — first paint shows dashes,
  // useEffect lifts in the real time and re-renders every second thereafter.
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      {/* TopBar — date + ticking clock + freshness pulse */}
      <div className="border-b" style={{ borderColor: "var(--line-mute)" }}>
        <div
          className="max-w-[1480px] mx-auto px-10 flex items-center justify-between"
          style={{ height: 36 }}
        >
          <div className="flex items-center gap-5 lbl">
            <span style={{ color: "var(--gold-light)" }}>丙午年</span>
            <span style={{ color: "var(--ink-5)" }}>·</span>
            <span>季春</span>
            <span style={{ color: "var(--ink-5)" }}>·</span>
            <span
              className="h-mono tnum"
              style={{ color: "var(--ink-2)", letterSpacing: "0.10em" }}
            >
              {now ? dateStrip(now) : "———— · —— · ——"}
            </span>
            <span style={{ color: "var(--ink-5)" }}>·</span>
            <span
              className="h-mono tnum"
              style={{ color: "var(--gold-light)", letterSpacing: "0.10em", fontSize: 11 }}
              suppressHydrationWarning
            >
              {now ? clockStrip(now) : "——:——:——"}
            </span>
          </div>
          <div
            className="flex items-center gap-7"
            style={{ fontFamily: "var(--mono)", color: "var(--ink-3)", fontSize: 10 }}
          >
            <span className="flex items-center gap-2">
              <DataDot color="var(--rise)" pulse />
              <span suppressHydrationWarning>
                QUOTE / 实时 · {fetchedAt ? quoteAge(fetchedAt, now) : "awaiting tick"}
              </span>
            </span>
            <span className="flex items-center gap-2">
              <DataDot color="var(--gold)" />
              13F / {latestFiling.reportDate} · filed {latestFiling.filingDate}
            </span>
            <span className="flex items-center gap-2">
              <DataDot color="var(--ink-3)" />
              FUNDAMENTALS / live PE via 东财
            </span>
          </div>
        </div>
      </div>

      {/* Brand row */}
      <header className="max-w-[1480px] mx-auto px-10 pt-14 pb-10">
        <div className="grid grid-cols-12 items-end gap-10">
          <div className="col-span-7 flex items-end gap-7">
            <Stamp />
            <div>
              <div className="lbl-sm" style={{ color: "var(--gold)" }}>
                EST. MMXVIII · MENLO PARK CALIFORNIA
              </div>
              <h1 className="h-display mt-1" style={{ fontSize: 58, lineHeight: 1, color: "var(--ink-1)" }}>
                段永平
                <span style={{ color: "var(--gold-deep)", fontSize: 38, fontStyle: "italic", padding: "0 8px" }}>·</span>
                H&amp;H
                <span className="h-display-it block mt-2" style={{ fontSize: 36, color: "var(--gold)" }}>
                  Real-Time Holdings Atlas
                </span>
              </h1>
              <div
                className="mt-4 flex items-center gap-3 h-mono"
                style={{ fontSize: 11, color: "var(--ink-3)", letterSpacing: "0.05em" }}
              >
                <span>CIK 0001759760</span>
                <span style={{ color: "var(--ink-5)" }}>/</span>
                <span>FORM 13F-HR</span>
                <span style={{ color: "var(--ink-5)" }}>/</span>
                <span>SEC EDGAR · DAILY MIRROR</span>
              </div>
            </div>
          </div>

          <nav
            className="col-span-5 flex justify-end items-center gap-9 h-sc"
            style={{ fontSize: 11 }}
          >
            <a className="cursor-pointer" style={{ color: "var(--ink-1)" }}>HOLDINGS</a>
            <a className="cursor-pointer" style={{ color: "var(--ink-3)" }}>QUARTERLY</a>
            <a className="cursor-pointer" style={{ color: "var(--ink-3)" }}>VALUATION</a>
            <a className="cursor-pointer" style={{ color: "var(--ink-3)" }}>STATEMENTS</a>
          </nav>
        </div>
      </header>
    </>
  );
}
