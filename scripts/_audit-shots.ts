/**
 * Visual audit: screenshot the dashboard at several scroll positions / states.
 * Drops PNGs into .audit/ for inspection. Diagnostic only — do not commit.
 *
 *   npx tsx scripts/_audit-shots.ts
 */

import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const TARGET = "http://127.0.0.1:3000/";
const OUT_DIR = resolve(process.cwd(), ".audit");

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new" as any,
    args: ["--proxy-server=direct://", "--no-sandbox", "--disable-gpu"],
    defaultViewport: { width: 1480, height: 900, deviceScaleFactor: 1 },
  });

  const page = await browser.newPage();

  // Network is dark to push2.eastmoney.com from this machine right now,
  // so /api/quotes returns all-missing. Intercept the request inside the
  // page and return deterministic mock quotes so the visual audit can show
  // the populated state (Last/Δ%, TODAY card, valuation tiers, drawer).
  // This is audit-only and never touches the product code.
  await page.setRequestInterception(true);
  const MOCK_QUOTE = (secid: string, change: number, price: number, pe: number) => ({
    secid,
    ticker: secid.split(".")[1],
    exchange: parseInt(secid.split(".")[0], 10),
    price,
    prevClose: price / (1 + change / 100),
    open: price * 0.998,
    high: price * 1.012,
    low: price * 0.985,
    changeAbs: (price * change) / 100,
    changePct: change,
    pe,
    pb: pe / 4,
    fetchedAt: new Date().toISOString(),
  });
  // Anchor numbers loosely consistent with the +1.88% portfolio we calculated.
  const MOCKS: Record<string, ReturnType<typeof MOCK_QUOTE>> = {
    "105.AAPL": MOCK_QUOTE("105.AAPL", +1.17, 287.51, 32.4),
    "106.BRK_B": MOCK_QUOTE("106.BRK_B", +0.93, 469.83, 11.2),
    "105.NVDA": MOCK_QUOTE("105.NVDA", +5.77, 207.83, 51.6),
    "105.PDD": MOCK_QUOTE("105.PDD", +5.75, 102.31, 17.8),
    "105.GOOG": MOCK_QUOTE("105.GOOG", +2.83, 395.14, 28.1),
    "106.OXY": MOCK_QUOTE("106.OXY", -7.11, 55.12, 14.2),
    "105.MSFT": MOCK_QUOTE("105.MSFT", +0.63, 413.96, 33.5),
    "106.BABA": MOCK_QUOTE("106.BABA", +6.94, 141.44, 12.8),
    "106.TSM": MOCK_QUOTE("106.TSM", +6.36, 419.5, 24.1),
    "106.DIS": MOCK_QUOTE("106.DIS", +7.54, 108.06, 26.7),
    "105.CRWV": MOCK_QUOTE("105.CRWV", +7.89, 137.98, 92.3),
    "105.CRDO": MOCK_QUOTE("105.CRDO", +2.44, 198.29, 88.5),
    "105.ASML": MOCK_QUOTE("105.ASML", +7.06, 1544.74, 34.2),
    "105.TEM": MOCK_QUOTE("105.TEM", -1.05, 53.5, 0),
    "116.00700": MOCK_QUOTE("116.00700", +1.42, 412.6, 18.5),
    "116.09999": MOCK_QUOTE("116.09999", +0.83, 145.8, 14.2),
    "1.600519": MOCK_QUOTE("1.600519", -0.55, 1480.5, 22.7),
  };
  page.on("request", (req) => {
    const url = req.url();
    if (url.includes("/api/quotes")) {
      const u = new URL(url);
      const secids = (u.searchParams.get("secids") || "").split(",").filter(Boolean);
      const quotes: Record<string, any> = {};
      const missing: string[] = [];
      for (const s of secids) {
        if (MOCKS[s]) quotes[s] = MOCKS[s];
        else missing.push(s);
      }
      req.respond({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          quotes,
          count: Object.keys(quotes).length,
          requested: secids.length,
          missing,
          fetchedAt: new Date().toISOString(),
        }),
      });
      return;
    }
    req.continue();
  });

  await page.goto(TARGET, { waitUntil: "domcontentloaded", timeout: 30_000 });
  // Wait until at least one HoldingsTable Last cell has a numeric value
  // (i.e. /api/quotes has returned and React has setQuotes). The 1Hz hook
  // can take several seconds on a cold dev server. Tolerate timeout —
  // if the mock interception didn't fire, capture the empty state anyway
  // rather than failing the whole audit.
  try {
    await page.waitForFunction(
      () => {
        const cells = document.querySelectorAll(
          "table.book-table tbody tr.row td.num-cell",
        );
        return Array.from(cells).some((c) =>
          /^\d/.test((c.textContent || "").trim()),
        );
      },
      { timeout: 8_000, polling: 250 },
    );
  } catch {
    console.warn("[audit] quote-ready wait timed out; capturing anyway");
  }
  // Belt-and-suspenders so portfolio Δ memo recomputes.
  await new Promise((r) => setTimeout(r, 800));

  // 1. Top fold — Hero + DisclaimerBanner + SummaryQuartet + tabs.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${OUT_DIR}/01-top.png`, fullPage: false });

  // 2. HoldingsTable.
  await page.evaluate(() => window.scrollTo(0, 720));
  await page.screenshot({ path: `${OUT_DIR}/02-table.png`, fullPage: false });

  // 3. Quarterly delta panel.
  await page.evaluate(() => window.scrollTo(0, 1700));
  await page.screenshot({ path: `${OUT_DIR}/03-quarterly.png`, fullPage: false });

  // 4. Valuation heatmap.
  await page.evaluate(() => window.scrollTo(0, 2300));
  await page.screenshot({ path: `${OUT_DIR}/04-valuation.png`, fullPage: false });

  // 5. PeerOverlapMatrix.
  await page.evaluate(() => window.scrollTo(0, 3000));
  await page.screenshot({ path: `${OUT_DIR}/05-peer.png`, fullPage: false });

  // 6. Footer.
  await page.evaluate(() =>
    window.scrollTo(0, document.body.scrollHeight - 900),
  );
  await page.screenshot({ path: `${OUT_DIR}/06-footer.png`, fullPage: false });

  // 7. Drawer open: click first holding row.
  await page.evaluate(() => window.scrollTo(0, 720));
  await page.evaluate(() => {
    const tr = document.querySelector("table.book-table tbody tr.row");
    (tr as HTMLElement | null)?.click();
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${OUT_DIR}/07-drawer.png`, fullPage: false });

  // 8. ESC + HK tab.
  await page.keyboard.press("Escape");
  await new Promise((r) => setTimeout(r, 300));
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button.tab"));
    const hk = btns.find((b) => /HK|港/.test(b.textContent || ""));
    (hk as HTMLElement | null)?.click();
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.evaluate(() => window.scrollTo(0, 720));
  await page.screenshot({ path: `${OUT_DIR}/08-hk.png`, fullPage: false });

  // 9. CN tab.
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button.tab"));
    const cn = btns.find((b) => /CN|沪|A股|大陆/.test(b.textContent || ""));
    (cn as HTMLElement | null)?.click();
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.evaluate(() => window.scrollTo(0, 720));
  await page.screenshot({ path: `${OUT_DIR}/09-cn.png`, fullPage: false });

  // 10. Full page (long).
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button.tab"));
    const us = btns.find((b) => /US|美/.test(b.textContent || ""));
    (us as HTMLElement | null)?.click();
  });
  await new Promise((r) => setTimeout(r, 400));
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${OUT_DIR}/10-full.png`, fullPage: true });

  await browser.close();
  console.log("audit shots written to", OUT_DIR);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
