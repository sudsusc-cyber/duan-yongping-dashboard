export default function DisclaimerBanner() {
  return (
    <section className="max-w-[1280px] mx-auto px-8 mt-6 mb-6">
      <div
        className="flex items-start gap-3 px-4 py-3 rounded-md"
        style={{
          background: "rgba(216,68,60,0.06)",
          border: "1px solid rgba(216,68,60,0.20)",
        }}
      >
        <span style={{ color: "var(--rise)", fontSize: 14, lineHeight: 1.4 }}>⚠</span>
        <div style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.7 }}>
          段永平本人不向 SEC 直接申报 13F。本表镜像{" "}
          <strong style={{ color: "var(--ink-1)", fontWeight: 600 }}>
            H&amp;H International Investment, LLC
          </strong>
          {" "}的 13F-HR，加上港股/A股的公开访谈整理。
          <span style={{ color: "var(--ink-3)" }}>
            {" "}不构成投资建议；段公曰&ldquo;不要跟着我买&rdquo;。
          </span>
        </div>
        <div className="ml-auto shrink-0 h-mono" style={{ fontSize: 10, color: "var(--ink-4)" }}>
          NOT INVESTMENT ADVICE
        </div>
      </div>
    </section>
  );
}
