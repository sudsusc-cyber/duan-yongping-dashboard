/**
 * Two-mode config:
 *   `next dev`         → standard SSR + route handlers (full local quotes)
 *   STATIC_EXPORT=1    → static export to out/, no API routes
 *                        (set by scripts/build-static.mjs, used by Cloudflare)
 *
 * Production /api/quotes is served by functions/api/quotes.ts as a Cloudflare
 * Pages Function — outside the Next.js bundle.
 *
 * @type {import('next').NextConfig}
 */
const isStaticExport = process.env.STATIC_EXPORT === "1";

const nextConfig = {
  reactStrictMode: true,
  ...(isStaticExport && {
    output: "export",
    images: { unoptimized: true },
    trailingSlash: false,
  }),
};

export default nextConfig;
