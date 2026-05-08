import type { ReactNode } from "react";

// ─────────────────────────────────────────────── Stamp · 段印章

export function Stamp({ char = "段", size = 92 }: { char?: string; size?: number }) {
  return (
    <span
      className="seal shrink-0"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.65) }}
    >
      {char}
    </span>
  );
}

// ─────────────────────────────────────────────── BanXin · corner-marked card

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
      <span className="corner-mark tl" />
      <span className="corner-mark tr" />
      <span className="corner-mark bl" />
      <span className="corner-mark br" />
      {children}
    </As>
  );
}

// ─────────────────────────────────────────────── WeightBar

export function WeightBar({ pct, width = 90 }: { pct: number; width?: number | string }) {
  return (
    <div className="weight-bar" style={{ width }}>
      <i style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  );
}

// ─────────────────────────────────────────────── DeltaBadge

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

// ─────────────────────────────────────────────── FishTail · 古籍鱼尾

export function FishTail() {
  return <span className="fishtail" />;
}

// ─────────────────────────────────────────────── DataDot · 时间戳条

export function DataDot({
  color = "var(--gold)",
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
        borderRadius: pulse ? "50%" : 0,
        background: color,
        boxShadow: pulse ? `0 0 8px ${color}` : undefined,
      }}
    />
  );
}
