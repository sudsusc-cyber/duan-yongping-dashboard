/**
 * GET /api/quotes?secids=105.AAPL,116.00700,1.600519
 *
 * Server-side proxy to Eastmoney push2. Lives on the same origin as the page
 * to sidestep CORS, and lets us hide upstream details (UA spoofing, throttling
 * if needed, fallback to Yahoo later) behind one stable contract.
 *
 * Response shape: { quotes: { [secid]: Quote }, count, fetchedAt }
 *
 * NOTE: This route is for `next dev` ONLY. At static-export build time it is
 *       moved out of the way by `scripts/build-static.mjs`, and the same
 *       contract is served in production by [`functions/api/quotes.ts`]
 *       (Cloudflare Pages Function).
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchQuotes } from "@/lib/eastmoney";

// Two-mode handler so the file can sit in src/app/api/ without breaking
// static export.
//   STATIC_EXPORT=1  → force-static, GET emits a 404 JSON at build time;
//                      production /api/quotes is shadowed by
//                      functions/api/quotes.ts (Cloudflare Pages Function).
//   otherwise        → force-dynamic, normal eastmoney proxy for `next dev`.
const STATIC = process.env.STATIC_EXPORT === "1";
export const dynamic = STATIC ? "force-static" : "force-dynamic";
export const revalidate = 0;

const MAX_BATCH = 50;

export async function GET(req: NextRequest) {
  if (STATIC) {
    return NextResponse.json(
      {
        error:
          "production /api/quotes is served by functions/api/quotes.ts as a " +
          "Cloudflare Pages Function — this static asset is a placeholder",
      },
      { status: 404 },
    );
  }

  const raw = req.nextUrl.searchParams.get("secids") ?? "";
  const secids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (secids.length === 0) {
    return NextResponse.json(
      { error: "missing 'secids' query param", example: "?secids=105.AAPL,116.00700" },
      { status: 400 },
    );
  }

  if (secids.length > MAX_BATCH) {
    return NextResponse.json(
      { error: `too many secids (max ${MAX_BATCH}, got ${secids.length})` },
      { status: 400 },
    );
  }

  try {
    const map = await fetchQuotes(secids);
    const quotes: Record<string, unknown> = {};
    for (const [k, v] of map) quotes[k] = v;

    const missing = secids.filter((s) => !map.has(s));
    return NextResponse.json(
      {
        quotes,
        count: map.size,
        requested: secids.length,
        missing,
        fetchedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `upstream fetch failed: ${msg}` },
      { status: 502 },
    );
  }
}
