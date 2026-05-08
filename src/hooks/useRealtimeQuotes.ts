"use client";

import useSWR from "swr";
import type { Quote } from "@/lib/types";

interface QuotesPayload {
  quotes: Record<string, Quote>;
  count: number;
  requested: number;
  missing: string[];
  fetchedAt: string;
  error?: string;
}

const fetcher = async (url: string): Promise<QuotesPayload> => {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`/api/quotes ${res.status}: ${body.slice(0, 120)}`);
  }
  return res.json();
};

/**
 * Subscribe to real-time quotes for a fixed batch of secids.
 *
 * - Polls /api/quotes every `intervalMs` (default 30s).
 * - Pauses while the tab is hidden (`refreshWhenHidden: false`).
 * - Re-fetches on window focus + reconnect.
 *
 * Pass an empty array to disable polling (e.g. before persisted secids load).
 *
 * Usage:
 *   const { quotes, fetchedAt, isLoading, refresh } = useRealtimeQuotes([
 *     "105.AAPL", "116.00700", "1.600519",
 *   ]);
 *   const aapl = quotes["105.AAPL"];
 */
export function useRealtimeQuotes(secids: string[], intervalMs = 30_000) {
  const key =
    secids.length > 0
      ? `/api/quotes?secids=${encodeURIComponent(secids.join(","))}`
      : null;

  const { data, error, isLoading, mutate } = useSWR<QuotesPayload>(key, fetcher, {
    refreshInterval: intervalMs,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshWhenHidden: false,
    dedupingInterval: 500,
  });

  return {
    quotes: data?.quotes ?? {},
    fetchedAt: data?.fetchedAt,
    missing: data?.missing ?? [],
    isLoading,
    error,
    refresh: () => mutate(),
  };
}
