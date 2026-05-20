"use client";

import { useEffect } from "react";
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
        aria-label="Xueqiu notes"
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
      <header className="drawer-head">
        <div className="flex items-baseline justify-between">
          <span
            style={{
              fontSize: 12,
              color: "var(--ink-3)",
              letterSpacing: "0.08em",
              fontWeight: 500,
            }}
          >
            雪球札记 / XUEQIU NOTES
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="drawer-close h-mono"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 flex items-baseline gap-3 flex-wrap">
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 24,
              color: "var(--ink-1)",
              fontWeight: 500,
            }}
          >
            {ticker}
          </span>
          {statements?.nameZh && (
            <span style={{ fontSize: 15, color: "var(--ink-2)" }}>
              {statements.nameZh}
            </span>
          )}
          {statements?.nameEn && (
            <span className="lbl-sm">{statements.nameEn}</span>
          )}
        </div>

        <div
          className="mt-3 flex items-center gap-3 h-mono tnum"
          style={{ fontSize: 10, color: "var(--ink-4)" }}
        >
          <span>{quotes.length} entries</span>
          {statements?.lastUpdated && <span>updated {statements.lastUpdated}</span>}
          {seedFlag && (
            <span
              style={{
                color: "var(--accent-bright)",
                border: "1px solid var(--line-rule)",
                padding: "1px 7px",
                letterSpacing: "0.08em",
                fontSize: 9,
                borderRadius: 3,
              }}
            >
              SEED · 示例
            </span>
          )}
        </div>
      </header>

      <div className="drawer-body">
        {quotes.length === 0 ? (
          <EmptyState ticker={ticker} />
        ) : (
          quotes.map((q, i) => <QuoteCard key={`${q.date}-${i}`} q={q} />)
        )}
      </div>

      <footer className="drawer-foot">
        <span className="h-mono tnum" style={{ fontSize: 10, color: "var(--ink-4)" }}>
          ESC · 关闭
        </span>
        <a
          href="https://xueqiu.com/1247347556"
          target="_blank"
          rel="noopener noreferrer"
          className="gold-link h-mono"
          style={{ fontSize: 10, letterSpacing: "0.06em" }}
        >
          访问雪球 →
        </a>
      </footer>
    </div>
  );
}

function QuoteCard({ q }: { q: XueqiuQuote }) {
  return (
    <div
      style={{
        padding: "16px 18px",
        marginBottom: 12,
        border: "1px solid var(--line-rule)",
        borderRadius: 6,
        background: "var(--bg-paper)",
      }}
    >
      <div className="flex items-baseline justify-between mb-3">
        <span className="h-mono tnum" style={{ fontSize: 11, color: "var(--accent-bright)" }}>
          {q.date}
        </span>
        <span style={{ fontSize: 11, color: "var(--ink-3)", letterSpacing: "0.04em" }}>
          {q.source}
        </span>
      </div>
      <p
        style={{
          fontSize: 14,
          lineHeight: 1.75,
          color: "var(--ink-1)",
          margin: 0,
        }}
      >
        {q.content}
      </p>
      <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex flex-wrap gap-2">
          {q.tags.map((t) => (
            <span
              key={t}
              style={{
                fontSize: 10,
                letterSpacing: "0.04em",
                color: "var(--ink-3)",
                border: "1px solid var(--line-rule)",
                padding: "2px 8px",
                borderRadius: 3,
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
            style={{ fontSize: 10, letterSpacing: "0.04em" }}
          >
            原帖 →
          </a>
        )}
      </div>
    </div>
  );
}

function EmptyState({ ticker }: { ticker: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center"
      style={{ padding: "60px 24px", color: "var(--ink-3)" }}
    >
      <div style={{ fontSize: 28, color: "var(--ink-4)", marginBottom: 12 }}>ø</div>
      <div className="lbl-sm">NO ARCHIVAL ENTRIES</div>
      <p
        style={{
          fontSize: 13,
          lineHeight: 1.75,
          color: "var(--ink-3)",
          maxWidth: 360,
          marginTop: 12,
        }}
      >
        段先生在公开来源尚未对{" "}
        <span style={{ color: "var(--ink-2)" }}>{ticker}</span>{" "}
        留下记录，或正在整理中。
      </p>
    </div>
  );
}
