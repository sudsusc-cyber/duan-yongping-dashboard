import type { ReactNode } from "react";

// ── Stamp · kept as no-op (legacy import safety) ──────────
export function Stamp(_: { char?: string; size?: number } = {}) {
  return null;
}

// ── BanXin · simple bordered card (no corner marks in neutral mode) ──
export function BanXin({
  children,
  className = "",
  style,
  as: As = "div",
  onClick,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  as?: "div" | "article" | "aside" | "section";
  onClick?: () => void;
}) {
  return (
    <As className={`ban-xin ${className}`} style={style} onClick={onClick}>
      {children}
    </As>
  );
}

// ── WeightBar ────────────────────────────────────────────
export function WeightBar({ pct, width = 90 }: { pct: number; width?: number | string }) {
  return (
    <div className="weight-bar" style={{ width }}>
      <i style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  );
}

// ── DeltaBadge ───────────────────────────────────────────
export type ActionKind = "NEW" | "ADD" | "REDUCE" | "CLOSED" | "HOLD";

export function DeltaBadge({
  kind,
  pctChange,
}: {
  kind: ActionKind;
  pctChange?: number;
}) {
  const fmt = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
  switch (kind) {
    case "NEW":
      return <span className="badge badge-new">◆ NEW</span>;
    case "ADD":
      return <span className="badge badge-add">▲ {pctChange != null ? fmt(pctChange) : ""}</span>;
    case "REDUCE":
      return <span className="badge badge-cut">▼ {pctChange != null ? fmt(pctChange) : ""}</span>;
    case "CLOSED":
      return <span className="badge badge-close">✕ closed</span>;
    case "HOLD":
    default:
      return <span className="badge badge-hold">— hold</span>;
  }
}

// ── FishTail · no-op (legacy) ──────────────────────────
export function FishTail() {
  return null;
}

// ── DataDot ────────────────────────────────────────────
export function DataDot({
  color = "var(--accent)",
  pulse = false,
}: {
  color?: string;
  pulse?: boolean;
}) {
  return (
    <span
      className={`inline-block ${pulse ? "animate-pulse-dot" : ""}`}
      style={{
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: color,
        boxShadow: pulse ? `0 0 8px ${color}` : undefined,
      }}
    />
  );
}
