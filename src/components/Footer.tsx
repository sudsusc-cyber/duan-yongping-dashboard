import { Stamp } from "./atoms";

interface Props {
  latest: { accessionNumber: string };
  fetchedAt?: string;
}

export default function Footer({ latest, fetchedAt }: Props) {
  return (
    <footer className="border-t mt-20" style={{ borderColor: "var(--line-rule)" }}>
      <div className="max-w-[1480px] mx-auto px-10 py-12 grid grid-cols-12 gap-10">
        <div className="col-span-5">
          <Stamp size={60} />
          <div
            className="brush mt-5"
            style={{ fontSize: 22, lineHeight: 1.4, color: "var(--gold-light)" }}
          >
            &ldquo;stop doing list{" "}
            <span className="h-cn" style={{ fontStyle: "normal" }}>比</span>{" "}
            to do list{" "}
            <span className="h-cn" style={{ fontStyle: "normal" }}>更重要。</span>&rdquo;
          </div>
          <div className="mt-3 lbl-sm">— 大道无形我有型 · 雪球</div>
        </div>
        <div className="col-span-3">
          <div className="lbl mb-4" style={{ color: "var(--gold)" }}>
            SOURCES · 数据来源
          </div>
          <ul className="space-y-2 h-mono" style={{ fontSize: 11, color: "var(--ink-2)" }}>
            <li>SEC EDGAR · 13F-HR · {latest.accessionNumber}</li>
            <li>
              东方财富 · 实时行情 ·{" "}
              {fetchedAt ? new Date(fetchedAt).toLocaleTimeString() : "—"}
            </li>
            <li>雪球 · 大道无形我有型</li>
          </ul>
        </div>
        <div className="col-span-4">
          <div className="lbl mb-4" style={{ color: "var(--gold)" }}>
            CAVEAT EMPTOR · 投资警示
          </div>
          <p
            style={{
              fontSize: 11,
              lineHeight: 1.75,
              color: "var(--ink-3)",
              fontFamily: "var(--sans)",
            }}
          >
            本看板仅作研究参考。段永平本人多次表示
            <em className="h-quote" style={{ color: "var(--ink-2)" }}>"不要跟着我买"</em>。
            13F 信息有 ~45 天滞后,持仓可能已变。
            <strong style={{ color: "var(--ink-2)", fontWeight: 500 }}>
              本工具不构成投资建议。
            </strong>
          </p>
        </div>
      </div>
      <div className="border-t" style={{ borderColor: "var(--line-mute)" }}>
        <div
          className="max-w-[1480px] mx-auto px-10 py-5 flex justify-between items-center h-mono"
          style={{ fontSize: 10, color: "var(--ink-4)" }}
        >
          <span>
            © MMXXVI · DUAN-YONGPING-DASHBOARD · A SEC EDGAR MIRROR · NO AFFILIATION WITH H&amp;H INTERNATIONAL
          </span>
          <span className="flex items-center gap-2">
            <i
              className="inline-block"
              style={{ width: 6, height: 6, background: "var(--gold)" }}
            />
            Build 0.1 · Phase 3
          </span>
        </div>
      </div>
    </footer>
  );
}
