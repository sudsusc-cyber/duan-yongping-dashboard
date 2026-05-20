import { BanXin, WeightBar } from "./atoms";

interface Props {
  latest: {
    reportDate: string;
    filingDate: string;
    totalValue: number;
    totalPositions: number;
    accessionNumber: string;
  };
  delta: {
    previousTag: string;
    previous: { totalValue: number };
  };
  fetchedAt?: string;
  portfolio?: {
    dPct: number | null;
    coverage: number;
    basis: number;
  };
}

function quarterTag(reportDate: string): string {
  const [y, m] = reportDate.split("-");
  const q = Math.ceil(parseInt(m, 10) / 3);
  return `${y} Q${q}`;
}

function midMonth(due: Date): string {
  const m = due.getMonth() + 1;
  const d = due.getDate();
  const half = d <= 10 ? "上旬" : d <= 20 ? "中旬" : "下旬";
  return `${m}月${half}`;
}

export default function SummaryQuartet({ latest, delta, fetchedAt, portfolio }: Props) {
  const total = latest.totalValue;
  const prev = delta.previous.totalValue;
  const qoq = prev > 0 ? ((total - prev) / prev) * 100 : 0;
  const reportTag = quarterTag(latest.reportDate);
  const filingDelay = Math.round(
    (Date.parse(latest.filingDate) - Date.parse(latest.reportDate)) / 86400000,
  );

  const period = new Date(latest.reportDate);
  const nextEnd = new Date(period);
  nextEnd.setMonth(period.getMonth() + 3);
  const due = new Date(nextEnd);
  due.setDate(due.getDate() + 45);
  const today = new Date();
  const daysToDue = Math.ceil((due.getTime() - today.getTime()) / 86400000);
  const nextQTag = `${nextEnd.getFullYear()} Q${Math.ceil((nextEnd.getMonth() + 1) / 3)}`;

  // For the AUM weight bar — visualize total as fraction of a 25B reference.
  const aumBarPct = Math.min(100, (total / 2.5e10) * 100);

  return (
    <section className="max-w-[1280px] mx-auto px-8 mb-8">
      <div className="grid grid-cols-4 gap-4">
        {/* ── AUM ─────────────────────────────────── */}
        <BanXin as="article" style={{ padding: "18px 18px" }}>
          <div className="flex items-baseline justify-between">
            <span style={{ fontSize: 12, color: "var(--ink-2)", fontWeight: 500 }}>
              披露市值
            </span>
            <span className="h-mono lbl-sm">AS-OF VALUE</span>
          </div>
          <div className="big-num tnum mt-3" style={{ fontSize: 36, color: "var(--ink-1)" }}>
            ${(total / 1e9).toFixed(2)}
            <span style={{ fontSize: 16, color: "var(--ink-3)", marginLeft: 4 }}>B</span>
          </div>
          <div className="mt-1 h-mono tnum" style={{ fontSize: 11, color: "var(--ink-3)" }}>
            13F · {reportTag} · {latest.totalPositions} positions
          </div>
          <div className="mt-4">
            <WeightBar pct={aumBarPct} width="100%" />
          </div>
          <div
            className="mt-2 flex justify-between h-mono tnum"
            style={{ fontSize: 10, color: "var(--ink-4)" }}
          >
            <span>vs {delta.previousTag} ${(prev / 1e9).toFixed(2)}B</span>
            <span style={{ color: qoq >= 0 ? "var(--rise)" : "var(--fall)" }}>
              {qoq >= 0 ? "+" : ""}
              {qoq.toFixed(1)}%
            </span>
          </div>
        </BanXin>

        {/* ── TODAY · weighted d/d ─────────────────── */}
        <BanXin as="article" style={{ padding: "18px 18px" }}>
          <div className="flex items-baseline justify-between">
            <span style={{ fontSize: 12, color: "var(--ink-2)", fontWeight: 500 }}>
              今日组合
            </span>
            <span className="h-mono lbl-sm">DAILY MOVE</span>
          </div>
          {portfolio?.dPct != null ? (
            <>
              <div
                className="big-num tnum mt-3"
                style={{
                  fontSize: 36,
                  color: portfolio.dPct >= 0 ? "var(--rise)" : "var(--fall)",
                }}
              >
                {portfolio.dPct >= 0 ? "+" : ""}
                {portfolio.dPct.toFixed(2)}
                <span style={{ fontSize: 16, color: "var(--ink-3)", marginLeft: 4 }}>%</span>
              </div>
              <div className="mt-1 h-mono tnum" style={{ fontSize: 11, color: "var(--ink-3)" }}>
                US 13F basis · {portfolio.basis} positions · ex-options
              </div>
              <div className="mt-4">
                <WeightBar pct={portfolio.coverage * 100} width="100%" />
              </div>
              <div
                className="mt-2 flex justify-between h-mono tnum"
                style={{ fontSize: 10, color: "var(--ink-4)" }}
              >
                <span>
                  {portfolio.coverage >= 0.9999
                    ? "full coverage"
                    : `coverage ${(portfolio.coverage * 100).toFixed(0)}%`}
                </span>
                <span>
                  {fetchedAt
                    ? new Date(fetchedAt).toLocaleTimeString()
                    : "—"}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="big-num tnum mt-3" style={{ fontSize: 36, color: "var(--ink-3)" }}>
                —
              </div>
              <div className="mt-1 h-mono tnum" style={{ fontSize: 11, color: "var(--ink-3)" }}>
                {fetchedAt
                  ? `quotes @ ${new Date(fetchedAt).toLocaleTimeString()}`
                  : "awaiting first tick"}
              </div>
              <div className="mt-4 lbl-sm" style={{ color: "var(--ink-4)" }}>
                weighted d/d · pending quotes
              </div>
            </>
          )}
        </BanXin>

        {/* ── REPORT ─────────────────────────────── */}
        <BanXin as="article" style={{ padding: "18px 18px" }}>
          <div className="flex items-baseline justify-between">
            <span style={{ fontSize: 12, color: "var(--ink-2)", fontWeight: 500 }}>
              最新披露日
            </span>
            <span className="h-mono lbl-sm">LATEST 13F</span>
          </div>
          <div className="big-num tnum mt-3" style={{ fontSize: 30, color: "var(--ink-1)" }}>
            {latest.filingDate}
          </div>
          <div className="mt-1 h-mono tnum" style={{ fontSize: 11, color: "var(--ink-3)" }}>
            period end {latest.reportDate}
          </div>
          <div
            className="mt-4 pt-3 border-t flex justify-between items-baseline h-mono tnum"
            style={{ borderColor: "var(--line-mute)", fontSize: 10, color: "var(--ink-4)" }}
          >
            <span>SEC delay</span>
            <span style={{ color: "var(--ink-2)" }}>{filingDelay} days</span>
          </div>
        </BanXin>

        {/* ── NEXT ─────────────────────────────── */}
        <BanXin as="article" style={{ padding: "18px 18px" }}>
          <div className="flex items-baseline justify-between">
            <span style={{ fontSize: 12, color: "var(--ink-2)", fontWeight: 500 }}>
              下次预期披露
            </span>
            <span className="h-mono lbl-sm">NEXT FILING</span>
          </div>
          <div className="big-num tnum mt-3" style={{ fontSize: 30, color: "var(--ink-1)" }}>
            {nextQTag}
          </div>
          <div className="mt-1 h-mono tnum" style={{ fontSize: 11, color: "var(--ink-3)" }}>
            约 {midMonth(due)} · 截止 {due.toISOString().slice(0, 10)}
          </div>
          <div
            className="mt-4 pt-3 border-t flex justify-between items-baseline h-mono tnum"
            style={{ borderColor: "var(--line-mute)", fontSize: 10, color: "var(--ink-4)" }}
          >
            <span>countdown</span>
            <span style={{ color: "var(--accent-bright)" }}>
              T {daysToDue >= 0 ? "−" : "+"} {Math.abs(daysToDue)}d
            </span>
          </div>
        </BanXin>
      </div>
    </section>
  );
}
