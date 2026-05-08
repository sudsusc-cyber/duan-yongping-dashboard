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
  /** Portfolio-level day/day, weighted by 13F filing-date weight; null when no quotes yet. */
  portfolio?: {
    /** weighted Δ% across covered equity holdings, e.g. +1.24 */
    dPct: number | null;
    /** Σ(covered weight) / Σ(equity weight) — 0..1 */
    coverage: number;
    /** number of equity (non-option) US holdings used as the basis */
    basis: number;
  };
}

function quarterTag(reportDate: string): string {
  const [y, m] = reportDate.split("-");
  const q = Math.ceil(parseInt(m, 10) / 3);
  return `${y} · Q${q}`;
}

function chineseMonthHalf(d: Date): string {
  const m = ["一","二","三","四","五","六","七","八","九","十","十一","十二"][d.getMonth()];
  const day = d.getDate();
  const half = day <= 10 ? "上旬" : day <= 20 ? "中旬" : "下旬";
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

  // next-expected: 当前 reportDate + ~3 months + 45-day deadline
  const period = new Date(latest.reportDate);
  const nextEnd = new Date(period);
  nextEnd.setMonth(period.getMonth() + 3);
  const due = new Date(nextEnd);
  due.setDate(due.getDate() + 45);
  const today = new Date();
  const daysToDue = Math.ceil((due.getTime() - today.getTime()) / 86400000);

  return (
    <section className="max-w-[1480px] mx-auto px-10 mb-16">
      <div className="grid grid-cols-12 gap-6">
        {/* AUM */}
        <BanXin as="article" className="col-span-3" style={{ padding: "24px 22px" }}>
          <div className="lbl-sm" style={{ color: "var(--gold)", letterSpacing: "0.22em" }}>
            AS-OF VALUE · 披露市值
          </div>
          <div className="big-num tnum mt-4" style={{ fontSize: 60 }}>
            ${(total / 1e9).toFixed(2)}
            <span style={{ fontSize: 26, color: "var(--ink-3)" }}> B</span>
          </div>
          <div className="mt-1 h-mono tnum" style={{ fontSize: 11, color: "var(--ink-3)" }}>
            {reportTag} · {latest.totalPositions} positions
          </div>
          <div className="mt-5">
            <WeightBar pct={Math.min(100, total / 2.5e10 * 100)} width="100%" />
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

        {/* TODAY · weighted day/day across US 13F equity book */}
        <BanXin as="article" className="col-span-3" style={{ padding: "24px 22px" }}>
          <div className="lbl-sm" style={{ color: "var(--gold)", letterSpacing: "0.22em" }}>
            TODAY · 当日组合
          </div>
          {portfolio?.dPct != null ? (
            <>
              <div
                className="big-num tnum mt-4"
                style={{
                  fontSize: 60,
                  color: portfolio.dPct >= 0 ? "var(--rise)" : "var(--fall)",
                }}
              >
                {portfolio.dPct >= 0 ? "+" : ""}
                {portfolio.dPct.toFixed(2)}
                <span style={{ fontSize: 26, color: "var(--ink-3)" }}> %</span>
              </div>
              <div className="mt-1 h-mono tnum" style={{ fontSize: 11, color: "var(--ink-3)" }}>
                US 13F basis · {portfolio.basis} positions · ex-options
              </div>
              {portfolio.coverage >= 0.9999 ? (
                <div
                  className="mt-5 flex justify-between items-baseline h-mono tnum"
                  style={{ fontSize: 10, color: "var(--ink-4)" }}
                >
                  <span style={{ color: "var(--gold-light)" }}>full coverage · 全覆盖</span>
                  <span>
                    {fetchedAt
                      ? `@ ${new Date(fetchedAt).toLocaleTimeString()}`
                      : "—"}
                  </span>
                </div>
              ) : (
                <>
                  <div className="mt-5">
                    <WeightBar pct={portfolio.coverage * 100} width="100%" />
                  </div>
                  <div
                    className="mt-2 flex justify-between h-mono tnum"
                    style={{ fontSize: 10, color: "var(--ink-4)" }}
                  >
                    <span>quote coverage {(portfolio.coverage * 100).toFixed(0)}%</span>
                    <span>
                      {fetchedAt
                        ? `@ ${new Date(fetchedAt).toLocaleTimeString()}`
                        : "—"}
                    </span>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <div className="big-num tnum mt-4" style={{ fontSize: 60, color: "var(--ink-3)" }}>
                —
              </div>
              <div className="mt-1 h-mono tnum" style={{ fontSize: 11, color: "var(--ink-3)" }}>
                {fetchedAt
                  ? `quotes @ ${new Date(fetchedAt).toLocaleTimeString()}`
                  : "awaiting first tick"}
              </div>
              <div className="mt-5 lbl-sm" style={{ color: "var(--ink-4)" }}>
                weighted d/d · pending quotes
              </div>
            </>
          )}
        </BanXin>

        {/* REPORT */}
        <BanXin as="article" className="col-span-3" style={{ padding: "24px 22px" }}>
          <div className="lbl-sm" style={{ color: "var(--gold)", letterSpacing: "0.22em" }}>
            REPORT · 当前报告期
          </div>
          <div className="big-num tnum mt-4" style={{ fontSize: 56 }}>
            {reportTag.replace(" · ", " ")}
          </div>
          <div
            className="mt-3 h-mono tnum"
            style={{ fontSize: 11, color: "var(--ink-2)", lineHeight: 1.85 }}
          >
            <span style={{ color: "var(--ink-3)" }}>Period end</span>
            <span style={{ color: "var(--ink-1)" }}>{latest.reportDate}</span>
            <br />
            <span style={{ color: "var(--ink-3)" }}>Filed at</span>
            <span style={{ color: "var(--ink-1)" }}>{latest.filingDate}</span>
            <br />
            <span style={{ color: "var(--ink-3)" }}>SEC delay</span>
            <span style={{ color: "var(--ink-1)" }}>{filingDelay} days</span>
          </div>
        </BanXin>

        {/* NEXT */}
        <BanXin as="article" className="col-span-3" style={{ padding: "24px 22px" }}>
          <div className="lbl-sm" style={{ color: "var(--gold)", letterSpacing: "0.22em" }}>
            NEXT · 下次预期披露
          </div>
          <div className="big-num mt-4" style={{ fontSize: 44 }}>
            {nextEnd.getFullYear()} · Q{Math.ceil((nextEnd.getMonth() + 1) / 3)}
          </div>
          <div
            className="big-num h-display-it mt-1"
            style={{ fontSize: 28, color: "var(--gold-light)" }}
          >
            {chineseMonthHalf(due)}
          </div>
          <div
            className="mt-3 h-mono tnum"
            style={{ fontSize: 11, color: "var(--ink-3)", lineHeight: 1.7 }}
          >
            Statutory deadline {due.toISOString().slice(0, 10)}
          </div>
          <div
            className="mt-3 flex items-center gap-2 h-mono"
            style={{ fontSize: 10, color: "var(--gold-light)" }}
          >
            <span style={{ display: "inline-block", width: 10, height: 1, background: "var(--gold)" }} />
            <span>
              T {daysToDue >= 0 ? "−" : "+"} {Math.abs(daysToDue)} days
            </span>
          </div>
        </BanXin>
      </div>
    </section>
  );
}
