/**
 * Minimal .env.local loader for standalone tsx scripts.
 *
 * Next.js auto-loads .env.local for `next dev` / `next build`, but
 * `tsx scripts/...` invocations don't — this fills the gap without
 * requiring a `dotenv` dep.
 *
 * Import at the very top of each script (`import "./lib/load-env"`) so
 * env vars exist before module-level assertions run (e.g. the UA check
 * in edgar.ts).
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ENV_FILES = [".env.local", ".env"];

for (const file of ENV_FILES) {
  const path = resolve(process.cwd(), file);
  if (!existsSync(path)) continue;

  const content = readFileSync(path, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
