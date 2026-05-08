/**
 * SEC EDGAR API client.
 *
 * Constraints:
 *  - User-Agent MUST include a real contact email (otherwise 403)
 *  - Rate limit: 10 req/sec; we throttle to ~6 to stay safe
 *  - JSON submissions endpoint:  /submissions/CIK{10-digit}.json
 *  - Filing archive layout:      /Archives/edgar/data/{cik-int}/{accession-no-dashes}/
 */

import { setTimeout as sleep } from "node:timers/promises";
import { setGlobalDispatcher, Agent, ProxyAgent } from "undici";

const SEC_DATA = "https://data.sec.gov";
const SEC_ARCHIVES = "https://www.sec.gov/Archives";

// Network setup:
//  - Node fetch (undici) does NOT auto-honour HTTPS_PROXY env. If the host
//    runs traffic through a local proxy (Clash, mitmproxy, corp gateway),
//    we must wire it explicitly.
//  - data.sec.gov also advertises IPv6 addresses that are unroutable from
//    some networks; default 10s connect timeout is tight when the agent
//    falls back through multiple addresses.
const PROXY_URL =
  process.env.HTTPS_PROXY ||
  process.env.https_proxy ||
  process.env.HTTP_PROXY ||
  process.env.http_proxy ||
  "";

setGlobalDispatcher(
  PROXY_URL
    ? new ProxyAgent({ uri: PROXY_URL, connect: { timeout: 30_000 } })
    : new Agent({ connect: { timeout: 30_000, family: 4 } }),
);

if (PROXY_URL) {
  console.log(`[edgar] using HTTPS_PROXY=${PROXY_URL}`);
}

const UA = process.env.SEC_USER_AGENT;
if (!UA || UA.includes("your-email@example.com")) {
  throw new Error(
    "[edgar] SEC_USER_AGENT env var missing or still using the placeholder.\n" +
      '       Set it to "Project Name <real-email@domain>" before running.\n' +
      "       (See .env.example.)",
  );
}

const RATE_LIMIT_MS = 160; // ~6 req/sec, well under SEC's 10/sec cap

async function secFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "User-Agent": UA!,
      Accept: init.headers && (init.headers as Record<string, string>).Accept
        ? (init.headers as Record<string, string>).Accept
        : "application/json",
      ...((init.headers as Record<string, string>) ?? {}),
    },
  });
  await sleep(RATE_LIMIT_MS);
  if (!res.ok) {
    throw new Error(`[edgar] HTTP ${res.status} ${res.statusText} :: ${url}`);
  }
  return res;
}

// -------------------------------------------------------------- types

export interface FilingEntry {
  accessionNumber: string;   // "0001759760-26-000003"
  form: string;              // "13F-HR" or "13F-HR/A"
  filingDate: string;        // "2026-02-13"
  reportDate: string;        // "2025-12-31"
  primaryDocument: string;   // "primary_doc.xml"
}

export interface FilerSubmissions {
  cik: string;
  name: string;
  filings: FilingEntry[];
}

// -------------------------------------------------------------- API

/**
 * Fetch the filer's recent 13F filings via the JSON submissions endpoint.
 * Note: /submissions returns the most recent ~1000 filings; older history
 * lives in `filings.files[]` rollover JSON files (we don't need those for v1).
 */
export async function listFilings(cik: string): Promise<FilerSubmissions> {
  const padded = cik.padStart(10, "0");
  const res = await secFetch(`${SEC_DATA}/submissions/CIK${padded}.json`);
  const json = (await res.json()) as {
    cik: string;
    name: string;
    filings: {
      recent: {
        accessionNumber: string[];
        form: string[];
        filingDate: string[];
        reportDate: string[];
        primaryDocument: string[];
      };
    };
  };

  const recent = json.filings.recent;
  const entries: FilingEntry[] = [];
  for (let i = 0; i < recent.form.length; i++) {
    const form = recent.form[i];
    if (form.startsWith("13F-HR")) {
      entries.push({
        accessionNumber: recent.accessionNumber[i],
        form,
        filingDate: recent.filingDate[i],
        reportDate: recent.reportDate[i],
        primaryDocument: recent.primaryDocument[i],
      });
    }
  }

  return { cik: padded, name: json.name, filings: entries };
}

/**
 * Resolve and download the InfoTable XML for a given 13F filing.
 *
 * Each filing folder has an index.json listing all attached files; the
 * InfoTable is named like "infotable.xml" / "form13fInfoTable.xml" /
 * "<accession>_infotable.xml". We pick the first .xml whose name contains
 * "infotable" (case-insensitive).
 */
export async function fetchInfoTableXml(
  cik: string,
  accessionNumber: string,
): Promise<{ url: string; xml: string }> {
  const cikInt = String(parseInt(cik, 10));
  const cleanAcc = accessionNumber.replace(/-/g, "");
  const folderUrl = `${SEC_ARCHIVES}/edgar/data/${cikInt}/${cleanAcc}/`;

  const indexRes = await secFetch(`${folderUrl}index.json`);
  const index = (await indexRes.json()) as {
    directory: { item: Array<{ name: string; type?: string }> };
  };

  // Filename heuristic across filers:
  //   Most: "infotable.xml" / "form13fInfoTable.xml" / "<acc>_infotable.xml"
  //   Some big filers (Berkshire): the InfoTable is the SEC schema number,
  //     e.g. "50240.xml". The only other .xml is "primary_doc.xml" (form metadata).
  // Strategy: prefer name match, else the unique non-primary_doc .xml.
  const xmlFiles = index.directory.item.filter((f) =>
    f.name.toLowerCase().endsWith(".xml"),
  );
  let infoEntry = xmlFiles.find((f) =>
    f.name.toLowerCase().includes("infotable"),
  );
  if (!infoEntry) {
    const nonPrimary = xmlFiles.filter(
      (f) => f.name.toLowerCase() !== "primary_doc.xml",
    );
    if (nonPrimary.length === 1) infoEntry = nonPrimary[0];
  }
  if (!infoEntry) {
    const names = xmlFiles.map((f) => f.name).join(", ");
    throw new Error(
      `[edgar] No infoTable.xml found in ${folderUrl}  (xmls: ${names || "none"})`,
    );
  }

  const xmlUrl = `${folderUrl}${infoEntry.name}`;
  const xmlRes = await secFetch(xmlUrl, { headers: { Accept: "application/xml" } });
  const xml = await xmlRes.text();
  return { url: xmlUrl, xml };
}
