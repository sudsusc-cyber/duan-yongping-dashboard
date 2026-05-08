"use client";

import { useEffect } from "react";
import { BanXin } from "./atoms";
import type { StatementsFile, XueqiuQuote } from "@/lib/types";

interface Props {
  ticker: string | null;
  statements: StatementsFile | null;
  onClose: () => void;
}

const isSeed = (note?: string): boolean =>
  !!note && /示例|SEED|seed/i.test(note);

export default function DuanQuotesDrawer({ ticker, statements, onClose }: Props) {
  const isOpen = ticker != null;

  // ESC closes
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Body scroll lock while drawer is open
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  return (
    <>
      <div
        className={`drawer-backdrop ${isOpen ? "is-open" : ""}`}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={`drawer ${isOpen ? "is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="段永平雪球札记"
      >
        {ticker && (
          <DrawerInner ticker={ticker} statements={statements} onClose={onClose} />
        )}
      </aside>
    </>
  );
}

function DrawerInner({
  ticker,
  statements,
  onClose,
}: {
  ticker: string;
  statements: StatementsFile | null;
  onClose: () => void;
}) {
  const quotes = [...(statements?.quotes ?? [])].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  const seedFlag = isSeed(statements?.note);

  return (
    <div className="drawer-inner">
      {/* ── Header ─────────────────────────────────── */}
      <header className="drawer-head">
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-3">
            <span className="h-sc" style={{ fontSize: 11, color: "var(--gold)" }}>
              DUAN · 札记
            </span>
            <span
              className="brush"
              style={{
                fontSize: 13,
                color: "var(--ink-3)",
                letterSpacing: "0.42em",
              }}
            >
              段 · 公 · 曰
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="drawer-close h-mono"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 flex items-baseline gap-4 flex-wrap">
          <span className="h-display" style={{ fontSize: 38, color: "var(--ink-1)" }}>
            {ticker}
          </span>
          {statements?.nameZh && (
            <span
              className="h-cn"
              style={{ fontSize: 18, color: "var(--ink-2)", letterSpacing: "0.10em" }}
            >
              {statements.nameZh}
            </span>
          )}
          {statements?.nameEn && (
            <span className="lbl-sm">{statements.nameEn}</span>
          )}
        </div>

        <div className="mt-3 flex items-center gap-4 h-mono tnum" style={{ fontSize: 10, color: "var(--ink-4)" }}>
          <span>{quotes.length} entries</span>
          {statements?.lastUpdated && <span>updated {statements.lastUpdated}</span>}
          {seedFlag && (
            <span
              style={{
                color: "var(--gold-light)",
                border: "1px dashed var(--gold-deep)",
                padding: "1px 8px",
                letterSpacing: "0.20em",
                fontSize: 9,
              }}
            >
              SEED · 示例
            </span>
          )}
        </div>
      </header>

      {/* ── Body ───────────────────────────────────── */}
      <div className="drawer-body">
        {quotes.length === 0 ? (
          <EmptyState ticker={ticker} />
        ) : (
          quotes.map((q, i) => <QuoteCard key={`${q.date}-${i}`} q={q} />)
        )}
      </div>

      {/* ── Footer ─────────────────────────────────── */}
      <footer className="drawer-foot">
        <span className="h-mono tnum" style={{ fontSize: 10, color: "var(--ink-4)" }}>
          ESC · 关闭
        </span>
        <a
          href="https://xueqiu.com/1247347556"
          target="_blank"
          rel="noopener noreferrer"
          className="gold-link h-mono"
          style={{ fontSize: 10, letterSpacing: "0.10em" }}
        >
          访问雪球 · 大道无形我有型 →
        </a>
      </footer>
    </div>
  );
}

function QuoteCard({ q }: { q: XueqiuQuote }) {
  return (
    <BanXin style={{ padding: "20px 22px", marginBottom: 14 }}>
      <div className="flex items-baseline justify-between mb-3">
        <span className="h-mono tnum" style={{ fontSize: 11, color: "var(--gold-light)" }}>
          {q.date}
        </span>
        <span
          className="h-cn"
          style={{ fontSize: 11, color: "var(--ink-3)", letterSpacing: "0.08em" }}
        >
          {q.source}
        </span>
      </div>
      <p
        className="pull-quote h-cn"
        style={{
          fontSize: 16,
          lineHeight: 1.85,
          color: "var(--ink-1)",
          fontStyle: "normal",
        }}
      >
        {q.content}
      </p>
      <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex flex-wrap gap-2">
          {q.tags.map((t) => (
            <span
              key={t}
              className="h-cn"
              style={{
                fontSize: 10,
                letterSpacing: "0.20em",
                color: "var(--ink-3)",
                border: "1px solid var(--line-rule)",
                padding: "2px 8px",
              }}
            >
              {t}
            </span>
          ))}
        </div>
        {q.url && (
          <a
            href={q.url}
            target="_blank"
            rel="noopener noreferrer"
            className="gold-link h-mono"
            style={{ fontSize: 10, letterSpacing: "0.08em" }}
          >
            原帖 →
          </a>
        )}
      </div>
    </BanXin>
  );
}

function EmptyState({ ticker }: { ticker: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center"
      style={{ padding: "60px 24px", color: "var(--ink-3)" }}
    >
      <div
        className="h-display-it"
        style={{ fontSize: 32, color: "var(--ink-3)", marginBottom: 12 }}
      >
        ø
      </div>
      <div className="h-sc" style={{ fontSize: 11, color: "var(--ink-3)" }}>
        NO ARCHIVAL ENTRIES
      </div>
      <p
        className="h-cn mt-3"
        style={{ fontSize: 13, lineHeight: 1.85, color: "var(--ink-3)", maxWidth: 360 }}
      >
        段公在公开来源尚未对 <span style={{ color: "var(--ink-2)" }}>{ticker}</span> 留下记录,或正在整理中。
      </p>
    </div>
  );
}
