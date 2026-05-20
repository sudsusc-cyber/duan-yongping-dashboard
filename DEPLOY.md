# Deploy · 段永平实时持仓看板

A static Next.js export + one Cloudflare Pages Function for quotes. Once set up,
every push triggers a build; every day at 03:00 UTC a bot fetches new 13F data
and pushes it back, which triggers another build. **Zero manual intervention
after first deploy.**

---

## Architecture

| Track          | Quotes via                               | Runtime                |
|----------------|------------------------------------------|------------------------|
| `next dev`     | `src/app/api/quotes/route.ts` (Node)     | Local dev server       |
| `npm run build`| Route handler self-degrades to 404       | Build only             |
| Production     | `functions/api/quotes.ts` (CF Worker)    | Cloudflare PoP outbound|

All quote endpoints proxy to **Tencent `qt.gtimg.cn`** (no API key required;
supports US/HK/CN markets). Previously used Eastmoney `push2`, which started
blocking many non-CN client IPs in 2026 — see commit history.

---

## Step 1 — Push the repo

```bash
git status                       # confirm clean (or stage what you want)
git add .
git commit -m "feat: ready to deploy"
git remote -v                    # set GitHub remote if missing
git push -u origin main
```

If you don't have a GitHub repo yet:

```bash
gh repo create duan-yongping-dashboard --public --source=. --remote=origin --push
```

## Step 2 — Add `SEC_USER_AGENT` GitHub secret

SEC EDGAR **blocks placeholder User-Agent strings** — the data-refresh bot
needs a real contact email so SEC can throttle / reach you on abuse.

1. Repo → **Settings → Secrets and variables → Actions → New repository secret**
2. **Name**: `SEC_USER_AGENT`
3. **Value**: `Duan Yongping Dashboard <your-real-email@example.com>`
4. Save.

(The `.env.local` placeholder is for local script runs; GitHub Actions reads
this secret, not the file.)

## Step 3 — Connect Cloudflare Pages

1. Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git**
2. Pick this repo, **production branch: `main`**
3. Build settings:
   - **Build command**: `npm run build`
   - **Build output directory**: `out`
   - **Node version**: 20
4. Environment variables: **none required at runtime**
5. **Save and deploy**

First build takes ~2 min. Subsequent builds (triggered by data refresh
commits) are ~1 min.

## Step 4 — Smoke-test the deploy

Replace with your actual `pages.dev` URL or custom domain:

```bash
curl -sf "https://your-project.pages.dev/" | head -50          # static HTML
curl -sf "https://your-project.pages.dev/api/quotes?secids=105.AAPL" | jq .
```

**Expected**:
```json
{
  "quotes": {
    "105.AAPL": { "price": 301.5, "changePct": 0.71, ... }
  },
  "count": 1, "requested": 1, "missing": []
}
```

If `count: 0` and `missing: ["105.AAPL"]` — Cloudflare PoP can't reach Tencent.
Workarounds in `functions/api/quotes.ts` header comment.

## Step 5 — Watch the first auto-refresh

The daily refresh job runs **every day at 03:00 UTC (11:00 Beijing)**:

- Pulls H&H + Berkshire / Li Lu / Pabrai 13F filings from SEC EDGAR
- Resolves any unknown CUSIPs via OpenFIGI (no API key, cached)
- Recomputes deltas + peer overlap
- Auto-commits to `data/` if anything changed → triggers a Pages rebuild

Manually trigger anytime: Repo → **Actions → Daily 13F Update → Run workflow**.

---

## Auto-discovery (what's automated)

| Trigger                     | Schedule      | Effect                                                   |
|-----------------------------|---------------|----------------------------------------------------------|
| Realtime quotes             | 1 Hz client   | Client → CF Worker → Tencent. Flashes on tick.           |
| 13F refresh                 | Daily 03:00 UTC | New filings land in `data/13f-history/<quarter>.json`  |
| Unknown CUSIP resolution    | Inside 13F job | OpenFIGI lookup, cached in `data/cusip-resolved.json`  |
| 5Y price percentile         | Daily 22:00 UTC | Yahoo Finance bars → `data/fundamentals/snapshot.json` |
| Page rebuild                | On every commit | `src/app/page.tsx` auto-picks newest quarter on disk   |

**You touch the code only if you want to redesign.** New H&H positions →
automatically picked up, tickered, quoted, displayed.

## What is still manual

`data/manual/hk-holdings.json` and `data/manual/cn-holdings.json` — segment
permanent because H&H's 13F doesn't include HK or A-share holdings (those
are in a Hong Kong vehicle, not SEC-disclosed). Edit by hand when 段永平
publicly references a new HK/CN position on Xueqiu.

## Local dev

```bash
npm install
npm run dev          # http://localhost:3000

# Refresh data locally:
SEC_USER_AGENT="Your Name <real@email.com>" npm run fetch:13f
npm run compute:deltas
```

## Production smoke test before pushing

```bash
npm run build                 # produces out/
npx serve out -l 3100         # serves at http://localhost:3100
# Quotes show "—" locally (api/quotes is a CF Function not in static bundle).
# That's expected. Quotes light up only on the live Cloudflare URL.
```
