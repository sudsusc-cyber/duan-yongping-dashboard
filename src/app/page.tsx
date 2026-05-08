export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center px-10 py-20">
      <div className="text-center max-w-xl">
        <div
          className="inline-flex items-center justify-center font-serifCn font-bold text-[60px] text-gold-light"
          style={{
            width: "92px",
            height: "92px",
            border: "2px solid #c9a961",
            transform: "rotate(-2deg)",
            background:
              "repeating-linear-gradient(45deg, rgba(228,204,146,0.05) 0 2px, transparent 2px 4px), rgba(192,57,43,0.06)",
            boxShadow:
              "0 0 0 1px rgba(192,57,43,0.10), 0 0 28px -6px rgba(192,57,43,0.20)",
          }}
        >
          段
        </div>

        <h1 className="font-display text-5xl mt-8 leading-tight">
          段永平
          <span className="text-gold-deep px-2">·</span>
          H&amp;H
        </h1>
        <p className="font-display italic text-gold text-3xl mt-2">
          Real-Time Holdings Atlas
        </p>

        <p className="font-mono text-xs mt-8 text-bone-300" style={{ letterSpacing: "0.20em" }}>
          PHASE 0 SCAFFOLD · NEXT.JS 14 · TAILWIND · TSX
        </p>

        <div className="mt-10 pt-8 border-t border-bone-500/20 text-bone-200 text-sm space-y-2 leading-relaxed">
          <p>项目骨架就绪。设计稿位于 <code className="font-mono text-gold-light">/design/index.html</code></p>
          <p className="text-bone-300 text-xs">
            Phase 1 — EDGAR 13F 拉取脚本 已就位,运行 <code className="font-mono text-gold-light">npm run fetch:13f</code> 同步真实持仓
          </p>
        </div>
      </div>
    </main>
  );
}
