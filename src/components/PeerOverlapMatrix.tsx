"use client";

import { BanXin } from "./atoms";

interface SharedHolding {
  cusip: string;
  ticker: string;
  nameEn: string;
  nameZh?: string;
  hhWeight: number;
  peerWeight: number;
  hhValue: number;
  peerValue: number;
  minWeight: number;
}

interface PeerStats {
  name: string;
  cik: string;
  reportDate: string;
  filingDate: string;
  totalValue: number;
  totalPositions: number;
  sharedHoldings: SharedHolding[];
  overlapCount: number;
  overlapHhWeight: number;
  overlapPeerWeight: number;
  overlapMinWeight: number;
}

interface PeerOverlap {
  generatedAt: string;
  hhReportDate: string;
  hhEquityCusipCount: number;
  peers: PeerStats[];
}

interface Props {
  overlap: PeerOverlap;
}

// Editorial sub-headers for known peers (filer "name" → display label & note).
// Hand-curated because the SEC name field is operator-of-record, not the
// public-facing handle (e.g. "Dalal Street, LLC" → Mohnish Pabrai).
const PEER_LABEL: Record<string, { display: string; subtitle: string; emptyNote?: string }> = {
  "BERKSHIRE HATHAWAY INC": {
    display: "Berkshire Hathaway",
    subtitle: "Warren Buffett · 巴菲特",
  },
  "Himalaya Capital Management LLC": {
    display: "Himalaya Capital",
    subtitle: "Li Lu · 李录",
  },
  "Dalal Street, LLC": {
    display: "Dalal Street",
    subtitle: "Mohnish Pabrai · 莫尼什·帕伯莱",
    emptyNote:
      "Pabrai 当前持仓集中在煤炭、油气钻井等周期股 (Warrior Met / Transocean / Alpha Met / Valaris),与 H&H 的科技-消费蓝筹组合无交集。这本身就是一个信号:同为价值派,在当下宏观节点上选择截然不同的赛道。",
  },
};

const peerLabel = (name: string) =>
  PEER_LABEL[name] ?? { display: name, subtitle: "" };

export default function PeerOverlapMatrix({ overlap }: Props) {
  return (
    <section className="max-w-[1280px] mx-auto px-8 mb-16">
      <div className="flex items-baseline gap-4 mb-3">
        <span className="h-sc" style={{ fontSize: 12, color: "var(--ink-1)" }}>
          Peer Overlap · By CUSIP
        </span>
        <span
          style={{
            fontFamily: "var(--serif-cn)",
            color: "var(--ink-3)",
            fontSize: 13,
            letterSpacing: "0.42em",
          }}
        >
          同 · 道 · 共 · 持
        </span>
        <span className="ml-auto lbl-sm">
          H&amp;H {overlap.hhReportDate} · {overlap.hhEquityCusipCount} equity CUSIPs
        </span>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {overlap.peers.map((peer) => (
          <PeerCard key={peer.cik} peer={peer} />
        ))}
      </div>

      <div
        className="mt-4 pt-3 border-t flex justify-between items-baseline h-mono"
        style={{ borderColor: "var(--line-rule)", fontSize: 11, color: "var(--ink-3)" }}
      >
        <span>
          intersection by 9-digit CUSIP · equity-only · sub-accounts aggregated
        </span>
        <span>peer 13F as of {overlap.peers[0]?.reportDate ?? "—"}</span>
      </div>
    </section>
  );
}

function PeerCard({ peer }: { peer: PeerStats }) {
  const label = peerLabel(peer.name);
  const isEmpty = peer.overlapCount === 0;

  return (
    <BanXin as="article" className="col-span-4" style={{ padding: "22px 24px" }}>
      {/* ── Header ─────────────────────────────────── */}
      <div className="flex items-baseline justify-between mb-1">
        <div>
          <div className="h-display" style={{ fontSize: 24, color: "var(--ink-1)" }}>
            {label.display}
          </div>
          <div
            className="h-cn mt-1"
            style={{ fontSize: 12, color: "var(--ink-3)", letterSpacing: "0.16em" }}
          >
            {label.subtitle || peer.name}
          </div>
        </div>
        <div className="text-right h-mono tnum" style={{ fontSize: 10, color: "var(--ink-4)", lineHeight: 1.6 }}>
          <div>${(peer.totalValue / 1e9).toFixed(1)}B</div>
          <div>{peer.totalPositions} positions</div>
          <div>{peer.reportDate}</div>
        </div>
      </div>

      {/* ── Shared / Empty ─────────────────────────── */}
      {isEmpty ? (
        <EmptyOverlap note={label.emptyNote} />
      ) : (
        <>
          <div
            className="mt-4 pt-3 mb-2"
            style={{ borderTop: "1px solid var(--line-mute)" }}
          >
            <div className="flex items-baseline gap-3">
              <span className="lbl">{peer.overlapCount} shared</span>
              <span className="h-mono tnum" style={{ fontSize: 10, color: "var(--ink-4)" }}>
                min-Σ {peer.overlapMinWeight.toFixed(1)}% · H&amp;H Σ {peer.overlapHhWeight.toFixed(1)}% · peer Σ {peer.overlapPeerWeight.toFixed(1)}%
              </span>
            </div>
          </div>

          <ul className="space-y-3 mt-3">
            {peer.sharedHoldings.map((s) => (
              <SharedRow key={s.cusip} s={s} />
            ))}
          </ul>
        </>
      )}
    </BanXin>
  );
}

function SharedRow({ s }: { s: SharedHolding }) {
  // Cap viz at 30% so AAPL-scale weights don't make small overlaps invisible.
  const VIZ_CAP = 30;
  const hhPct = Math.min(100, (s.hhWeight / VIZ_CAP) * 100);
  const peerPct = Math.min(100, (s.peerWeight / VIZ_CAP) * 100);

  return (
    <li>
      <div className="flex items-baseline gap-3 mb-1">
        <span className="h-display" style={{ fontSize: 16, color: "var(--ink-1)" }}>
          {s.ticker}
        </span>
        {s.nameZh && (
          <span className="h-cn" style={{ fontSize: 11, color: "var(--ink-3)" }}>
            {s.nameZh}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <div>
          <div className="flex items-baseline justify-between">
            <span className="lbl-sm">H&amp;H</span>
            <span className="h-mono tnum" style={{ fontSize: 11, color: "var(--ink-2)" }}>
              {s.hhWeight.toFixed(1)}%
            </span>
          </div>
          <div className="overlap-bar mt-0.5">
            <i className="overlap-bar-hh" style={{ width: `${hhPct}%` }} />
          </div>
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <span className="lbl-sm">peer</span>
            <span className="h-mono tnum" style={{ fontSize: 11, color: "var(--ink-2)" }}>
              {s.peerWeight.toFixed(1)}%
            </span>
          </div>
          <div className="overlap-bar mt-0.5">
            <i className="overlap-bar-peer" style={{ width: `${peerPct}%` }} />
          </div>
        </div>
      </div>
    </li>
  );
}

function EmptyOverlap({ note }: { note?: string }) {
  return (
    <div
      className="mt-4 pt-4"
      style={{ borderTop: "1px solid var(--line-mute)" }}
    >
      <div className="flex items-baseline gap-3 mb-3">
        <span className="h-display-it" style={{ fontSize: 22, color: "var(--ink-3)" }}>
          ø
        </span>
        <span className="lbl">no shared CUSIPs</span>
      </div>
      {note && (
        <p
          className="h-cn"
          style={{
            fontSize: 12,
            lineHeight: 1.85,
            color: "var(--ink-3)",
          }}
        >
          {note}
        </p>
      )}
    </div>
  );
}
