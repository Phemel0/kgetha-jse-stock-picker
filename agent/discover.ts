/**
 * One-off check: does roic.ai cover the JSE on your key, and under which code?
 * Uses 3 requests. Run with `npm run agent:discover`.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { discoverJseCode, toRandFactor } from "./pipeline";
import { RoicClient, type ListResponse, type PriceResponse, type Ticker } from "./roic";

const root = path.resolve(import.meta.dirname, "..");
for (const f of [".env.local", ".env"]) if (existsSync(path.join(root, f))) process.loadEnvFile(path.join(root, f));

if (!process.env.ROIC_API_KEY) {
  console.error("ROIC_API_KEY is not set. Copy .env.example to .env and add your key.");
  process.exit(1);
}
const client = new RoicClient({ apiKey: process.env.ROIC_API_KEY, baseUrl: process.env.ROIC_BASE_URL, rpm: Number(process.env.ROIC_RPM) || 5 });

const ex = await discoverJseCode(client);
if (!ex) {
  console.log("The JSE wasn't found in roic.ai's exchange list. The free data source won't work for JSE shares.");
  process.exit(1);
}
console.log(`Found: ${ex.exchange_name ?? "?"} — code "${ex.code}", MICs ${ex.mics.join(", ")}, ${ex.symbol_count} symbols`);

const tickers = await client.get<ListResponse<Ticker>>("/v3.0.0/tickers", { exchange: ex.code, status: "listed", limit: 10 });
console.log("Sample tickers:");
for (const t of tickers.data) console.log(`  ${t.symbol.padEnd(12)} ${t.type.padEnd(6)} ${t.trading_currency ?? ""}  ${t.name}`);

const sample = tickers.data.find((t) => t.type === "stock") ?? tickers.data[0];
if (sample) {
  const p = await client.get<PriceResponse>(`/v3.0.0/stock-prices/${encodeURIComponent(sample.symbol)}`, { limit: 1 });
  const bar = p.data[0];
  console.log(
    `Latest price for ${sample.symbol}: ${bar?.close} ${p.currency ?? ""} on ${bar?.date} ` +
      `(the agent converts to R${bar ? (bar.close * toRandFactor(p.currency)).toFixed(2) : "?"})`,
  );
}
console.log(`\nAll good. If the code isn't "JSE", you can pin it with ROIC_EXCHANGE=${ex.code} to save a request per run.`);
