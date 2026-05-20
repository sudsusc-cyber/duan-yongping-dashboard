import Link from "next/link";

export default function NotFound() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: "var(--bg-ink)", color: "var(--ink-1)" }}
    >
      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: 80,
          fontWeight: 300,
          color: "var(--ink-3)",
          letterSpacing: "-0.04em",
          lineHeight: 1,
        }}
      >
        404
      </div>
      <div
        className="mt-4"
        style={{ fontSize: 14, color: "var(--ink-2)", letterSpacing: "0.02em" }}
      >
        页面不存在 · This page was not found.
      </div>
      <Link
        href="/"
        className="mt-8 h-mono"
        style={{
          fontSize: 11,
          letterSpacing: "0.08em",
          color: "var(--accent-bright)",
          textDecoration: "none",
          padding: "6px 14px",
          border: "1px solid var(--line-rule)",
          borderRadius: 4,
        }}
      >
        ← 返回首页 / Back to dashboard
      </Link>
    </main>
  );
}
