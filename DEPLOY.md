# Deployment · Cloudflare Pages

This site uses a **hybrid deployment**:

- The dashboard itself is a fully static export (`output: 'export'` → `out/`).
  Every page, every JSON of 13F / delta / manual / statements / overlap data
  is bundled at build time and served from Cloudflare's edge CDN.
- The single dynamic endpoint, **`/api/quotes`**, is a Cloudflare Pages
  Function at [`functions/api/quotes.ts`](functions/api/quotes.ts). Cloudflare
  picks up this directory automatically and compiles it to a Worker; client
  requests hit the same `/api/quotes` URL and never know the difference.

There is no Vercel, no `next-on-pages` adapter, no Node runtime in
production. Everything ships to Cloudflare's edge.

## Dev / build / prod three-track summary

| Track          | Quotes via                               | Eastmoney source IP    |
|----------------|------------------------------------------|------------------------|
| `next dev`     | `src/app/api/quotes/route.ts` (Node)     | Your dev machine       |
| `npm run build`| route handler returns 404 placeholder    | n/a (build-time only)  |
| Production     | `functions/api/quotes.ts` (CF Worker)    | Cloudflare PoP outbound|

The route handler self-degrades when `STATIC_EXPORT=1` is set (by
`scripts/build-static.mjs`), so the file lives happily in the source tree
without breaking `output: 'export'`.

## One-time setup

1. **Push the repo to GitHub.** Phase 4 commits aren't on remote yet; the
   first push primes Cloudflare to build.

2. **Create a Cloudflare Pages project.**
   - Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git
   - Pick this repo
   - **Build command**: `npm run build`
   - **Build output directory**: `out`
   - **Node version**: 20
   - Environment variables: none required at runtime (the SEC_USER_AGENT is
     only used by GitHub Actions to refresh data, not at edge)

3. **Add GitHub Actions secret.**
   - Repo → Settings → Secrets and variables → Actions → New secret
   - Name: `SEC_USER_AGENT`
   - Value: `Your Name <real-email@domain.com>` — SEC blocks placeholder UAs
   - Used by [`.github/workflows/13f-quarterly-update.yml`](.github/workflows/13f-quarterly-update.yml)
     to fetch fresh 13F data weekly. The workflow commits to `data/` which
     triggers Cloudflare Pages to rebuild.

4. **(Optional) Configure custom domain** in Cloudflare Pages → Custom domains.

## Local verification before pushing

```bash
# Static build — produces out/ directory
npm run build

# Smoke test the static bundle (lightweight HTTP server)
npx serve out

# Visit http://localhost:3000 — everything should render except real-time
# quote prices (since /api/quotes is a Pages Function, not in the static bundle).
# Quote prices light up only after Cloudflare deploy.
```

## Smoke test after first deploy

The unknown is whether **`push2.eastmoney.com` accepts requests from
Cloudflare Workers IPs**. Workers run from Cloudflare's global PoPs, which
are not Chinese home IPs — Eastmoney may rate-limit or block them.

After first deploy:

```bash
# Replace with your actual deployed origin
curl -sf "https://your-project.pages.dev/api/quotes?secids=105.AAPL,116.00700" | jq .
```

**Pass case** — `count: 2`, both secids in `quotes`:
```json
{ "quotes": { "105.AAPL": { "price": 287.5, ... }, "116.00700": { "price": 412.6, ... } }, "count": 2, "missing": [] }
```

**Fail case** — `count: 0`, both in `missing`:
```json
{ "quotes": {}, "count": 0, "missing": ["105.AAPL", "116.00700"] }
```

If it fails, three fallback strategies (in order of effort):

1. **Move polling client-side via JSONP.** Eastmoney `push2` supports
   `?cb=callbackName`. Drop the Pages Function entirely; client browsers
   make CORS-free JSONP fetches directly. Loses server-side dedup but
   eastmoney sees real user IPs (Chinese home IPs from Chinese users).
2. **Proxy through a CN-reachable edge** (Tencent EdgeOne, Aliyun ESA,
   etc.) and rewrite `/api/quotes` to that proxy.
3. **Switch to a paid Western market data API** (Tiingo / EOD / Polygon).
   Lowest friction long term but loses HK/A-share coverage.

## Repo layout reference

```
.
├── data/                          ← static at build time, refreshed by Action
│   ├── 13f-history/<quarter>.json
│   ├── 13f-deltas/<pair>.json
│   ├── manual/{hk,cn}-holdings.json
│   ├── statements/{ticker}.json
│   └── peers/{berkshire,pabrai}/<quarter>.json + overlap.json
├── functions/api/
│   └── quotes.ts                  ← Cloudflare Pages Function
├── out/                           ← built by `npm run build`, deployed verbatim
├── scripts/                       ← only run in GitHub Actions / local dev
└── src/                           ← Next.js app source
```

## When data lands

- **GitHub Actions** runs every Monday 02:00 UTC = 10:00 Beijing.
- It reads CIK 0001759760 (H&H), CIK 0001067983 (Berkshire), CIK 0001549575
  (Dalal Street / Pabrai) from SEC EDGAR.
- If a new 13F filing exists, it lands in `data/13f-history/<new-quarter>.json`,
  deltas + overlap regenerate, and the bot commits.
- Cloudflare Pages picks up the commit, rebuilds, deploys — usually <2 min.

## What is NOT deployed

- `scripts/` — server-side data tooling, only runs in CI / local
- `scripts/_audit-shots.ts` + `puppeteer-core` devDep — local visual audit
- `data/peers/<filer>/<quarter>.json` files for filings older than the
  latest are skipped by `--limit 1`; old peer snapshots stay if already on disk
- `.audit/` — git-ignored screenshots
