/**
 * Static export build for Cloudflare Pages.
 *
 *   STATIC_EXPORT=1 → next.config.mjs flips on `output: 'export'`,
 *                     produces out/.
 *
 * The src/app/api/quotes/route.ts handler self-degrades to force-static +
 * 404 placeholder when STATIC_EXPORT=1. In production, that placeholder
 * is shadowed by functions/api/quotes.ts (Cloudflare Pages Function),
 * which never reaches the static asset.
 *
 * Run via: npm run build
 */

import { execSync } from "node:child_process";

console.log("[build-static] running next build with STATIC_EXPORT=1");
execSync("next build", {
  stdio: "inherit",
  env: { ...process.env, STATIC_EXPORT: "1" },
});
