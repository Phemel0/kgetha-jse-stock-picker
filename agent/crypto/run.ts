/**
 * The crypto picker agent. Run with `npm run agent:crypto`.
 *
 *   1. Takes the top 100 coins by market cap from CoinGecko, minus stablecoins, wrapped and staked tokens
 *   2. Adds every coin you can buy in rand on Luno or VALR
 *   3. Pulls a year of daily ZAR prices per coin, computes momentum and risk, scores everything
 *   4. Writes data/crypto-snapshot.json and appends today's shortlist to data/crypto-picks-log.json
 *
 * Env: COINGECKO_API_KEY (optional, free Demo key), COINGECKO_PLAN (demo|pro), COINGECKO_RPM,
 *      CRYPTO_TOP_N (default 100), CRYPTO_SA_LISTED (default on; "0" to skip), MAX_COINS, TOP_N (default 10)
 */
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { scoreCoins } from "../../lib/crypto/scoring";
import type { CoinPicksLog } from "../../lib/crypto/types";
import { CoinGeckoClient, CoinGeckoError } from "./coingecko";
import { runCryptoPipeline } from "./pipeline";

const root = path.resolve(import.meta.dirname, "../..");
for (const f of [".env.local", ".env"]) {
  const p = path.join(root, f);
  if (existsSync(p)) process.loadEnvFile(p);
}

const apiKey = process.env.COINGECKO_API_KEY || undefined;
if (!apiKey) console.log("No COINGECKO_API_KEY set — using CoinGecko's keyless limits, so this run is slower. A free Demo key speeds it up.");

const client = new CoinGeckoClient({
  apiKey,
  plan: process.env.COINGECKO_PLAN === "pro" ? "pro" : "demo",
  rpm: Number(process.env.COINGECKO_RPM) || undefined,
  log: console.log,
});

const started = Date.now();
let snapshot: Awaited<ReturnType<typeof runCryptoPipeline>>;
try {
  snapshot = await runCryptoPipeline({
    client,
    topN: Number(process.env.CRYPTO_TOP_N) || 100,
    includeSaListed: process.env.CRYPTO_SA_LISTED !== "0",
    maxCoins: Number(process.env.MAX_COINS) || undefined,
    cacheDir: path.join(root, "agent/.cache-crypto"),
  });
} catch (err) {
  if (err instanceof CoinGeckoError && (err.status === 401 || err.status === 403))
    console.error("CoinGecko rejected the API key. Check COINGECKO_API_KEY (and COINGECKO_PLAN=pro only for paid keys).");
  else console.error(`Agent stopped: ${(err as Error).message}`);
  console.error("No snapshot written; the dashboard keeps showing the previous one.");
  process.exit(1);
}

if (snapshot.coins.length === 0) {
  console.error("No coins could be scored — snapshot not written.");
  process.exit(1);
}

const dataDir = path.join(root, "data");
await writeFile(path.join(dataDir, "crypto-snapshot.json"), JSON.stringify(snapshot, null, 1));

const topN = Number(process.env.TOP_N) || 10;
const shortlist = scoreCoins(snapshot.coins).slice(0, topN);
const logPath = path.join(dataDir, "crypto-picks-log.json");
const history: CoinPicksLog = existsSync(logPath) ? JSON.parse(await readFile(logPath, "utf8")) : [];
const date = snapshot.generatedAt.slice(0, 10);
const entry = { date, picks: shortlist.map((c) => ({ id: c.id, symbol: c.symbol, score: c.score })) };
const next = [...history.filter((h) => h.date !== date), entry].slice(-120);
await writeFile(logPath, JSON.stringify(next, null, 1));

const prev = history.filter((h) => h.date !== date).at(-1);
const prevIds = new Set(prev?.picks.map((p) => p.id) ?? []);
console.log(`\nCrypto shortlist for ${date} (default weights):`);
for (const c of shortlist) {
  const isNew = prev && !prevIds.has(c.id) ? "  new" : "";
  const sa = c.saExchanges.length ? `  [${c.saExchanges.join(", ")}]` : "";
  console.log(`  ${String(c.rank).padStart(2)}. ${c.symbol.padEnd(6)} ${c.score.toFixed(1).padStart(5)}  ${c.thesis}${sa}${isNew}`);
}
console.log(
  `\nScored ${snapshot.coins.length} coins, left out ${snapshot.excluded.length}, ` +
    `${snapshot.requestsUsed} requests in ${Math.round((Date.now() - started) / 60_000)} min.`,
);
