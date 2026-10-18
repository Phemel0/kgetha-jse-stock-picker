/**
 * The stock picker agent. Run with `npm run agent`.
 *
 *   1. Finds the JSE on roic.ai and checks which shares in the universe exist
 *   2. Pulls valuation, profitability, debt and two years of prices for each share (rate-limited)
 *   3. Computes momentum indicators, scores every share, and writes data/snapshot.json
 *   4. Appends today's shortlist to data/picks-log.json so you can see how picks change over time
 *
 * Env: ROIC_API_KEY (required), ROIC_RPM (default 5), ROIC_EXCHANGE, UNIVERSE=exchange, MAX_STOCKS, TOP_N (default 10)
 */
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { scoreUniverse } from "../lib/scoring";
import { runPipeline } from "./pipeline";
import { RoicClient, RoicError } from "./roic";
import { STARTER_UNIVERSE } from "./universe";

const root = path.resolve(import.meta.dirname, "..");
for (const f of [".env.local", ".env"]) {
  const p = path.join(root, f);
  if (existsSync(p)) process.loadEnvFile(p);
}

const apiKey = process.env.ROIC_API_KEY;
if (!apiKey) {
  console.error("ROIC_API_KEY is not set. Copy .env.example to .env and add your free key from roic.ai.");
  process.exit(1);
}

const topN = Number(process.env.TOP_N) || 10;
const client = new RoicClient({
  apiKey,
  baseUrl: process.env.ROIC_BASE_URL,
  rpm: Number(process.env.ROIC_RPM) || 5,
  log: console.log,
});

const started = Date.now();
let snapshot: Awaited<ReturnType<typeof runPipeline>>;
try {
  snapshot = await runPipeline({
    client,
    universe: process.env.UNIVERSE === "exchange" ? "exchange" : STARTER_UNIVERSE,
    exchange: process.env.ROIC_EXCHANGE || undefined,
    maxStocks: Number(process.env.MAX_STOCKS) || undefined,
    cacheDir: path.join(root, "agent/.cache"),
  });
} catch (err) {
  if (err instanceof RoicError && err.status === 401)
    console.error("roic.ai rejected the API key. Check ROIC_API_KEY — copy it again from your roic.ai account page.");
  else if (err instanceof RoicError && err.status === 402)
    console.error(`Your roic.ai plan doesn't include this data (${err.message}).`);
  else console.error(`Agent stopped: ${(err as Error).message}`);
  console.error("No snapshot written; the dashboard keeps showing the previous one.");
  process.exit(1);
}

if (snapshot.stocks.length === 0) {
  console.error("No shares could be scored — snapshot not written. See the skipped list above.");
  process.exit(1);
}

const dataDir = path.join(root, "data");
await writeFile(path.join(dataDir, "snapshot.json"), JSON.stringify(snapshot, null, 1));

// Score with the default weights and log the shortlist.
const ranked = scoreUniverse(snapshot.stocks);
const shortlist = ranked.slice(0, topN);
const logPath = path.join(dataDir, "picks-log.json");
const history: { date: string; picks: { code: string; score: number }[] }[] = existsSync(logPath)
  ? JSON.parse(await readFile(logPath, "utf8"))
  : [];
const date = snapshot.generatedAt.slice(0, 10);
const entry = { date, picks: shortlist.map((s) => ({ code: s.code, score: s.score })) };
const next = [...history.filter((h) => h.date !== date), entry].slice(-120);
await writeFile(logPath, JSON.stringify(next, null, 1));

const prev = history.filter((h) => h.date !== date).at(-1);
const prevCodes = new Set(prev?.picks.map((p) => p.code) ?? []);

console.log(`\nShortlist for ${date} (default weights):`);
for (const s of shortlist) {
  const isNew = prev && !prevCodes.has(s.code) ? "  new" : "";
  console.log(`  ${String(s.rank).padStart(2)}. ${s.code.padEnd(5)} ${s.score.toFixed(1).padStart(5)}  ${s.thesis}${isNew}`);
}
if (prev) {
  const dropped = [...prevCodes].filter((c) => !shortlist.some((s) => s.code === c));
  if (dropped.length) console.log(`  Dropped since ${prev.date}: ${dropped.join(", ")}`);
}
console.log(
  `\nScored ${snapshot.stocks.length} shares, skipped ${snapshot.skipped.length}, ` +
    `${snapshot.requestsUsed} requests in ${Math.round((Date.now() - started) / 60_000)} min.`,
);
for (const s of snapshot.skipped) console.log(`  skipped ${s.code}: ${s.reason}`);
