/**
 * 13F-HR InfoTable XML parser.
 *
 * The XML is namespaced (typically ns1: or n1:). fast-xml-parser strips
 * namespace prefixes when removeNSPrefix=true, leaving:
 *
 *   informationTable
 *     └── infoTable[]            // one per holding
 *         ├── nameOfIssuer
 *         ├── titleOfClass
 *         ├── cusip
 *         ├── value              // dollars (post-2022 SEC rule); pre-2022 was $thousands
 *         ├── shrsOrPrnAmt
 *         │     ├── sshPrnamt
 *         │     └── sshPrnamtType   // SH | PRN
 *         ├── putCall?           // "Put" | "Call" (absent for outright shares)
 *         ├── investmentDiscretion
 *         ├── otherManager?
 *         └── votingAuthority
 *               ├── Sole, Shared, None
 */

import { XMLParser } from "fast-xml-parser";

export interface RawInfoTableRow {
  nameOfIssuer: string;
  titleOfClass: string;
  cusip: string;
  value: number;
  shares: number;
  shareType: "SH" | "PRN";
  putCall?: "Put" | "Call";
  investmentDiscretion?: string;
}

export interface ParseResult {
  rows: RawInfoTableRow[];
  rawCount: number;
}

const PARSER = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
  parseTagValue: false, // keep numeric strings as strings; we coerce manually
  trimValues: true,
});

function coerceNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/[,\s]/g, "");
    const n = Number(cleaned);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function coerceCusip(v: unknown): string {
  // CUSIP is 9 chars; some sources give it lowercase or pad to fewer chars
  return String(v ?? "").trim().toUpperCase();
}

/**
 * Parse a 13F InfoTable XML payload.
 *
 * `valueScale` reflects SEC's evolving "dollars vs. thousands" rule:
 *   - filings BEFORE Q3 2022 (~rule effective 2023-01-03) reported value in $thousands
 *   - filings AFTER report a literal dollar amount
 *
 * We default to 1 (literal dollars) and let callers override per filing date.
 */
export function parse13FInfoTable(xml: string, valueScale = 1): ParseResult {
  const parsed = PARSER.parse(xml) as {
    informationTable?: { infoTable?: unknown };
  };

  const root = parsed.informationTable?.infoTable;
  if (!root) {
    return { rows: [], rawCount: 0 };
  }

  const rawRows = Array.isArray(root) ? root : [root];

  const rows: RawInfoTableRow[] = rawRows.map((r: any) => {
    const sharesObj = r.shrsOrPrnAmt ?? {};
    const sshPrnamt = coerceNumber(sharesObj.sshPrnamt);
    const sshPrnamtType = String(sharesObj.sshPrnamtType ?? "SH").toUpperCase() as
      | "SH"
      | "PRN";

    return {
      nameOfIssuer: String(r.nameOfIssuer ?? "").trim(),
      titleOfClass: String(r.titleOfClass ?? "").trim(),
      cusip: coerceCusip(r.cusip),
      value: coerceNumber(r.value) * valueScale,
      shares: sshPrnamt,
      shareType: sshPrnamtType === "PRN" ? "PRN" : "SH",
      putCall: r.putCall ? (String(r.putCall) as "Put" | "Call") : undefined,
      investmentDiscretion: r.investmentDiscretion
        ? String(r.investmentDiscretion).trim()
        : undefined,
    };
  });

  return { rows, rawCount: rawRows.length };
}

/**
 * Determine the SEC dollar-scale rule for a given filing date.
 *
 * Pre-2023-01-03 filings: report dollar values in **thousands**, multiply by 1000.
 * Post-2023-01-03 filings: report literal dollars, leave as-is.
 *
 * Reference: SEC Form 13F amendments effective 2023-01-03
 * https://www.sec.gov/files/form13f.pdf
 */
export function valueScaleForFilingDate(filingDateIso: string): 1 | 1000 {
  const t = Date.parse(filingDateIso);
  // 2023-01-03 cutoff
  return t >= Date.parse("2023-01-03") ? 1 : 1000;
}
