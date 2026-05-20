"use client";

import { useEffect, useState } from "react";
import { DataDot } from "./atoms";

interface Props {
  fetchedAt?: string;
  latestFiling: { reportDate: string; filingDate: string };
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
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header
      className="border-b sticky top-0 z-20"
      style={{
        borderColor: "var(--line-rule)",
        background: "rgba(12,13,16,0.85)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
    >
      <div className="max-w-[1280px] mx-auto px-8 h-14 flex items-center gap-6">
        <div className="flex items-baseline gap-3">
          <span style={{ fontSize: 16, fontWeight: 600, color: "var(--ink-1)", letterSpacing: "0.04em" }}>
            段永平
          </span>
          <span
            className="h-mono"
            style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.10em" }}
          >
            DUAN YONGPING · H&amp;H 13F MIRROR
          </span>
        </div>

        <div
          className="ml-auto flex items-center gap-6 h-mono"
          style={{ fontSize: 11, color: "var(--ink-3)", letterSpacing: "0.04em" }}
        >
          <span className="flex items-center gap-2">
            <DataDot color="var(--accent)" pulse />
            <span suppressHydrationWarning>
              LAST · {now ? clockStrip(now) : "——:——:——"}
            </span>
          </span>
          <span style={{ color: "var(--ink-4)" }}>·</span>
          <span suppressHydrationWarning>
            QUOTE {fetchedAt ? quoteAge(fetchedAt, now) : "—"}
          </span>
          <span style={{ color: "var(--ink-4)" }}>·</span>
          <span>13F {latestFiling.reportDate}</span>
          <span style={{ color: "var(--ink-4)" }}>·</span>
          <button
            type="button"
            className="sync-btn"
            onClick={() => typeof window !== "undefined" && window.location.reload()}
            title="刷新"
          >
            ↻ SYNC
          </button>
        </div>
      </div>
    </header>
  );
}
