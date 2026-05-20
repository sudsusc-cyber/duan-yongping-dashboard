interface Props {
  latest: { accessionNumber: string };
  fetchedAt?: string;
}

export default function Footer({ latest, fetchedAt }: Props) {
  return (
    <footer className="border-t mt-12" style={{ borderColor: "var(--line-rule)" }}>
      <div className="max-w-[1280px] mx-auto px-4 sm:px-8 py-6 sm:py-8 grid grid-cols-1 sm:grid-cols-12 gap-5 sm:gap-8">
        <div className="sm:col-span-7">
          <div className="lbl mb-3">SOURCES · 数据来源</div>
          <ul
            className="space-y-1.5 h-mono"
            style={{ fontSize: 11, color: "var(--ink-2)" }}
          >
            <li>SEC EDGAR · 13F-HR · {latest.accessionNumber}</li>
            <li>
              东方财富 · 实时行情 ·{" "}
              {fetchedAt ? new Date(fetchedAt).toLocaleTimeString() : "—"}
            </li>
            <li>雪球 / 公开访谈 · 港股 + A股 持仓口径</li>
          </ul>
        </div>
        <div className="sm:col-span-5">
          <div className="lbl mb-3">CAVEAT · 投资警示</div>
          <p
            style={{
              fontSize: 11,
              lineHeight: 1.7,
              color: "var(--ink-3)",
            }}
          >
            13F 信息有约 45 天滞后，持仓可能已变；港股/A股栏目为公开发言整理，非 SEC 披露。
            <strong style={{ color: "var(--ink-2)", fontWeight: 500 }}>
              {" "}本工具不构成投资建议。
            </strong>
          </p>
        </div>
      </div>
      <div className="border-t" style={{ borderColor: "var(--line-mute)" }}>
        <div
          className="max-w-[1280px] mx-auto px-4 sm:px-8 py-4 flex flex-col sm:flex-row sm:justify-between gap-2 sm:items-center h-mono"
          style={{ fontSize: 10, color: "var(--ink-4)", letterSpacing: "0.04em" }}
        >
          <span>© 2026 · DUAN-YONGPING-DASHBOARD · NO AFFILIATION</span>
          <span className="flex items-center gap-2">
            <i
              className="inline-block"
              style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }}
            />
            build · neutral
          </span>
        </div>
      </div>
    </footer>
  );
}
