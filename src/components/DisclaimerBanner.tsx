import { BanXin, FishTail } from "./atoms";

export default function DisclaimerBanner() {
  return (
    <section className="max-w-[1480px] mx-auto px-10 grid grid-cols-12 gap-10 mb-14">
      {/* 引言 */}
      <div className="col-span-7">
        <div className="lbl mb-5">
          QUOTATION OF THE DAY <FishTail /> 大道无形我有型
        </div>
        <blockquote
          className="pull-quote"
          style={{ fontSize: 30, lineHeight: 1.45, color: "var(--ink-1)" }}
        >
          &ldquo;<span className="h-cn">本分这两个字</span>
          <span style={{ color: "var(--ink-3)" }}>,</span>
          <span className="h-cn">是我们公司的核心</span>
          <span style={{ color: "var(--ink-3)" }}>。</span>
          <span className="h-cn">投资也是同样的道理 — </span>
          <em>do the right thing, do things right</em>
          <span style={{ color: "var(--ink-3)" }}>.</span>&rdquo;
        </blockquote>
        <div className="mt-5 flex items-center gap-4 lbl-sm">
          <span style={{ color: "var(--ink-3)" }}>— 段永平 · 雪球 · 2018</span>
          <span style={{ color: "var(--ink-5)" }}>·</span>
          <a className="gold-link cursor-pointer">阅读全文 / READ</a>
        </div>
      </div>

      {/* 编者按 · 数据完整性免责声明 */}
      <BanXin
        as="aside"
        className="col-span-5"
        style={{
          background: "linear-gradient(180deg, rgba(192,57,43,0.06), transparent 70%)",
          padding: "22px 24px",
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="lbl" style={{ color: "var(--rise)" }}>
            ⚠ DISCLOSURE FRAGMENT · 申报片段
          </span>
        </div>
        <div className="h-cn" style={{ fontSize: 14, lineHeight: 1.85, color: "var(--ink-2)" }}>
          本看板仅同步 <strong style={{ color: "var(--ink-1)" }}>H&amp;H International Investment, LLC</strong>{" "}
          在 SEC 之 13F-HR 申报。段永平本人曾于雪球公开提及:"其实我管的账号里有一个账号里拼多多是第二大持股。"
          <span style={{ color: "var(--ink-3)" }}> — 故 13F 不能等同于其全部资产配置。</span>
        </div>
        <div
          className="mt-4 h-mono"
          style={{ fontSize: 10, color: "var(--ink-3)", lineHeight: 1.7 }}
        >
          不覆盖 / NOT COVERED:
          <div style={{ color: "var(--ink-2)", marginTop: 4 }}>
            茅台 (A股)　·　腾讯 (00700.HK)　·　个人 IBKR　·　家族其他实体
          </div>
        </div>
      </BanXin>
    </section>
  );
}
