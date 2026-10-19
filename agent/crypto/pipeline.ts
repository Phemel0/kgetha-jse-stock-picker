import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { computeCoinTechnicals, weeklyCloses } from "../../lib/crypto/indicators";
import type { CoinSnapshot, CoinSnapshotFile, SaExchange } from "../../lib/crypto/types";
import { CoinGeckoClient, CoinGeckoError, type ExchangeTicker, type MarketChart, type MarketRow } from "./coingecko";

/** CoinGecko categories whose coins track another asset rather than trade on their own merits. */
export const EXCLUDED_CATEGORIES = ["stablecoins", "wrapped-tokens", "liquid-staking-tokens", "tokenized-gold"];

/** Backstop if a category lookup fails: the largest pegged, wrapped and staked tokens. */
const EXCLUDED_IDS = new Set([
  "tether", "usd-coin", "dai", "ethena-usde", "usds", "first-digital-usd", "paypal-usd", "true-usd", "frax",
  "wrapped-bitcoin", "coinbase-wrapped-btc", "weth", "wrapped-steth", "staked-ether", "wrapped-eeth",
  "rocket-pool-eth", "binance-staked-sol", "jito-staked-sol", "tether-gold", "pax-gold", "euro-coin",
]);

/** Names and symbols that give a pegged or derivative token away. */
export function looksPegged(row: Pick<MarketRow, "id" | "symbol" | "name">): string | null {
  const s = row.symbol.toLowerCase();
  const n = row.name.toLowerCase();
  if (/usd/.test(s) || /\busd/.test(n) || /^(dai|eurc|eurs|zarp|zarc|xaut|paxg)$/.test(s)) return "Stablecoin or pegged token";
  if (/\b(wrapped|bridged)\b/.test(n)) return "Wrapped or bridged copy of another coin";
  if (/\b(staked|restaked|liquid staking)\b/.test(n)) return "Staking receipt token";
  return null;
}

/** CoinGecko ids for the South African exchanges. */
export const SA_EXCHANGES: Record<SaExchange, string> = { Luno: "luno", VALR: "valr" };

export interface CryptoPipelineOptions {
  client: CoinGeckoClient;
  /** How many coins by market cap make up the core list (after exclusions). */
  topN?: number;
  /** Also screen coins with a ZAR pair on Luno or VALR, even outside the top list. */
  includeSaListed?: boolean;
  maxCoins?: number;
  cacheDir?: string;
  log?: (msg: string) => void;
  now?: Date;
}

async function markets(client: CoinGeckoClient, params: Record<string, string | number>): Promise<MarketRow[]> {
  return client.get<MarketRow[]>("/coins/markets", { vs_currency: "zar", order: "market_cap_desc", per_page: 250, page: 1, ...params });
}

/** Coin ids with a live ZAR pair on one exchange. */
async function zarListings(client: CoinGeckoClient, exchangeId: string, log: (m: string) => void): Promise<Set<string>> {
  const ids = new Set<string>();
  for (let page = 1; page <= 10; page++) {
    const res = await client.get<{ tickers: ExchangeTicker[] }>(`/exchanges/${exchangeId}/tickers`, { page, order: "base_target" });
    for (const t of res.tickers ?? []) {
      if (t.target?.toUpperCase() === "ZAR" && t.coin_id && !t.is_anomaly) ids.add(t.coin_id);
    }
    if ((res.tickers?.length ?? 0) < 100) break;
  }
  log(`  ${exchangeId}: ${ids.size} coins with a ZAR pair`);
  return ids;
}

/** Daily closes, one per UTC day, oldest first. The last point is today's price so far. */
export function dailyCloses(chart: MarketChart): { date: string; close: number }[] {
  const byDay = new Map<string, number>();
  for (const [ts, price] of chart.prices ?? []) {
    if (!(price > 0)) continue;
    byDay.set(new Date(ts).toISOString().slice(0, 10), price);
  }
  return [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, close]) => ({ date, close }));
}

const r = (n: number | null | undefined, dp = 2) => (n === null || n === undefined || !Number.isFinite(n) ? null : Math.round(n * 10 ** dp) / 10 ** dp);
/** Rand amounts: keep 4 significant figures for tiny prices. */
const sig = (n: number) => (Math.abs(n) >= 1 ? Math.round(n * 100) / 100 : Number(n.toPrecision(4)));

export function buildCoin(row: MarketRow, chart: MarketChart, sa: SaExchange[], top100: boolean): CoinSnapshot {
  const notes: string[] = [];
  const days = dailyCloses(chart);
  const closes = days.map((d) => d.close);
  if (row.current_price && closes.length) closes[closes.length - 1] = row.current_price;
  const technicals = computeCoinTechnicals(closes);
  if (closes.length < 366) notes.push(`${closes.length} days of price history — CoinGecko's free plan covers up to a year`);

  return {
    id: row.id,
    symbol: row.symbol.toUpperCase(),
    name: row.name,
    price: row.current_price === null ? (closes.at(-1) ?? null) : sig(row.current_price),
    priceDate: row.last_updated?.slice(0, 10) ?? days.at(-1)?.date ?? null,
    fundamentals: {
      marketCap: r(row.market_cap, 0),
      marketCapRank: row.market_cap_rank,
      fdv: r(row.fully_diluted_valuation, 0),
      volume24h: r(row.total_volume, 0),
      circulatingSupply: r(row.circulating_supply, 0),
      totalSupply: r(row.total_supply, 0),
      maxSupply: r(row.max_supply, 0),
      ath: row.ath === null ? null : sig(row.ath),
      athChange: r(row.ath_change_percentage, 1),
      athDate: row.ath_date?.slice(0, 10) ?? null,
    },
    technicals,
    saExchanges: sa,
    top100,
    weekly: weeklyCloses(closes).map(sig),
    notes,
  };
}

export async function runCryptoPipeline(opts: CryptoPipelineOptions): Promise<CoinSnapshotFile> {
  const { client } = opts;
  const log = opts.log ?? console.log;
  const now = opts.now ?? new Date();
  const topN = opts.topN ?? 100;
  const day = now.toISOString().slice(0, 10);
  const cacheDir = opts.cacheDir ? path.join(opts.cacheDir, day) : null;
  if (cacheDir && opts.cacheDir) {
    await mkdir(cacheDir, { recursive: true });
    for (const d of await readdir(opts.cacheDir)) if (d !== day) await rm(path.join(opts.cacheDir, d), { recursive: true, force: true });
  }

  // 1. Tokens that only track something else: stablecoins, wrapped and staked copies, tokenised gold.
  const excludedIds = new Set(EXCLUDED_IDS);
  for (const category of EXCLUDED_CATEGORIES) {
    try {
      for (const row of await markets(client, { category })) excludedIds.add(row.id);
    } catch (err) {
      log(`  couldn't load category "${category}" (${(err as Error).message}); using the built-in list`);
    }
  }

  // 2. Top coins by market cap, in rand.
  const top = await markets(client, {});
  if (top.length === 0) throw new Error("CoinGecko returned no market data.");
  const excluded: CoinSnapshotFile["excluded"] = [];
  const rows = new Map<string, MarketRow>();
  const topIds = new Set<string>();
  for (const row of top) {
    const pegged = excludedIds.has(row.id) ? "Stablecoin, wrapped or staked token" : looksPegged(row);
    if (pegged) {
      if (topIds.size < topN) excluded.push({ id: row.id, symbol: row.symbol.toUpperCase(), reason: pegged });
      continue;
    }
    if (topIds.size < topN) {
      topIds.add(row.id);
      rows.set(row.id, row);
    }
  }
  log(`Top ${topIds.size} coins by market cap (left out ${excluded.length} pegged or wrapped tokens)`);

  // 3. Which coins can you buy in rand on Luno and VALR?
  const sa = new Map<string, SaExchange[]>();
  for (const [name, exchangeId] of Object.entries(SA_EXCHANGES) as [SaExchange, string][]) {
    try {
      for (const id of await zarListings(client, exchangeId, log)) sa.set(id, [...(sa.get(id) ?? []), name]);
    } catch (err) {
      log(`  couldn't load ${name} listings (${(err as Error).message}); SA availability will be incomplete`);
    }
  }

  if (opts.includeSaListed ?? true) {
    const extra = [...sa.keys()].filter((id) => !rows.has(id) && !excludedIds.has(id));
    const known = new Map(top.map((t) => [t.id, t]));
    const missing = extra.filter((id) => !known.has(id));
    if (missing.length) {
      for (let i = 0; i < missing.length; i += 250) {
        for (const row of await markets(client, { ids: missing.slice(i, i + 250).join(",") })) known.set(row.id, row);
      }
    }
    let added = 0;
    for (const id of extra) {
      const row = known.get(id);
      if (!row) continue;
      const pegged = looksPegged(row);
      if (pegged) {
        excluded.push({ id, symbol: row.symbol.toUpperCase(), reason: pegged });
        continue;
      }
      rows.set(id, row);
      added++;
    }
    log(`Added ${added} more coins listed in rand on Luno or VALR`);
  }

  let ids = [...rows.keys()];
  if (opts.maxCoins) ids = ids.slice(0, opts.maxCoins);
  const etaMin = Math.ceil((ids.length * client.msPerRequest) / 60_000);
  log(`Fetching a year of daily prices for ${ids.length} coins (~${ids.length} requests, about ${etaMin} min)`);

  // 4. A year of daily prices per coin.
  const coins: CoinSnapshot[] = [];
  for (const [i, id] of ids.entries()) {
    const row = rows.get(id)!;
    log(`[${i + 1}/${ids.length}] ${row.symbol.toUpperCase()} — ${row.name}`);
    try {
      const chart = await fetchChart(client, id, cacheDir);
      const coin = buildCoin(row, chart, sa.get(id) ?? [], topIds.has(id));
      if (coin.price === null || coin.technicals.historyDays < 30) {
        excluded.push({ id, symbol: coin.symbol, reason: "Less than 30 days of prices" });
        continue;
      }
      coins.push(coin);
    } catch (err) {
      const msg = err instanceof CoinGeckoError ? `${err.status}: ${err.message}` : (err as Error).message;
      log(`  skipped: ${msg}`);
      excluded.push({ id, symbol: row.symbol.toUpperCase(), reason: msg });
      if (err instanceof CoinGeckoError && (err.status === 401 || err.status === 403)) throw err;
    }
  }

  return { source: "coingecko", generatedAt: now.toISOString(), currency: "zar", coins, excluded, requestsUsed: client.requests };
}

async function fetchChart(client: CoinGeckoClient, id: string, cacheDir: string | null): Promise<MarketChart> {
  const cacheFile = cacheDir ? path.join(cacheDir, `${id}.json`) : null;
  if (cacheFile) {
    try {
      return JSON.parse(await readFile(cacheFile, "utf8")) as MarketChart;
    } catch {
      /* not cached yet */
    }
  }
  const chart = await client.get<MarketChart>(`/coins/${encodeURIComponent(id)}/market_chart`, {
    vs_currency: "zar",
    days: 365,
    interval: "daily",
  });
  const slim: MarketChart = { prices: chart.prices ?? [] };
  if (cacheFile) await writeFile(cacheFile, JSON.stringify(slim));
  return slim;
}
