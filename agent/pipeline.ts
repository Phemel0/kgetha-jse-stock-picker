import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { computeTechnicals, weekly } from "../lib/indicators";
import type { Fundamentals, Snapshot, StockSnapshot } from "../lib/types";
import {
  RoicClient,
  RoicError,
  type Credit,
  type Exchange,
  type ListResponse,
  type Multiples,
  type PriceResponse,
  type Profitability,
  type Ticker,
} from "./roic";

const V = "/v3.0.0";

export interface PipelineOptions {
  client: RoicClient;
  /** Share codes to screen, or "exchange" for every listed share. */
  universe: string[] | "exchange";
  exchange?: string;
  maxStocks?: number;
  /** Directory for per-day raw-response cache, so an interrupted run resumes where it stopped. */
  cacheDir?: string;
  log?: (msg: string) => void;
  now?: Date;
}

/** JSE prices are often quoted in cents (ZAc). Return the factor that converts to rand. */
export function toRandFactor(currency: string | null | undefined): number {
  if (!currency) return 1;
  return /^(zac|zax)$/i.test(currency) || currency === "ZAc" ? 0.01 : 1;
}

/** Find the roic.ai exchange code for the Johannesburg Stock Exchange. */
export async function discoverJseCode(client: RoicClient): Promise<Exchange | null> {
  const res = await client.get<ListResponse<Exchange>>(`${V}/exchanges`);
  return (
    res.data.find((e) => e.mics?.includes("XJSE")) ??
    res.data.find((e) => /johannesburg/i.test(`${e.exchange_name} ${e.exchange_local_name}`)) ??
    res.data.find((e) => e.code === "JSE") ??
    null
  );
}

async function listTickers(client: RoicClient, exchange: string): Promise<Ticker[]> {
  const out: Ticker[] = [];
  let page: string | undefined;
  do {
    const res = await client.get<ListResponse<Ticker>>(`${V}/tickers`, {
      exchange,
      status: "listed",
      limit: 2000,
      page,
    });
    out.push(...res.data);
    page = res.next_page_url ? new URL(res.next_page_url, "https://x").searchParams.get("page") ?? undefined : undefined;
  } while (page);
  return out;
}

/**
 * The financial endpoints return their figures at the period-end price. Rescale price-based multiples
 * to today's price so the valuation is current. Returns null if the units look inconsistent.
 */
export function rescaleMultiples(m: Multiples, latestPriceRand: number | null) {
  const factor = toRandFactor(m.price_currency);
  const periodPrice = m.pr_last !== null ? m.pr_last * factor : null;
  let k = 1;
  let rescaled = false;
  if (latestPriceRand && periodPrice && periodPrice > 0) {
    const ratio = latestPriceRand / periodPrice;
    // A ratio far outside this band means a unit mismatch or a split we can't see — keep period figures.
    if (ratio > 0.2 && ratio < 5) {
      k = ratio;
      rescaled = true;
    }
  }
  let evEbitda = m.ev_to_ttm_ebitda;
  if (rescaled && evEbitda !== null && m.enterprise_value && m.pr_last && m.bs_sh_out) {
    const ebitda = m.enterprise_value / evEbitda;
    const mcap = m.pr_last * m.bs_sh_out;
    const ev = m.enterprise_value + mcap * (k - 1);
    evEbitda = ev / ebitda;
  }
  const r = (n: number | null) => (n === null ? null : Math.round(n * k * 100) / 100);
  return {
    pe: r(m.pe_ratio),
    pb: r(m.pr_to_book_ratio),
    pfcf: r(m.pr_to_free_cash_flow),
    evEbitda: evEbitda === null ? null : Math.round(evEbitda * 100) / 100,
    rescaled,
  };
}

const round1 = (n: number | null | undefined) => (n === null || n === undefined ? null : Math.round(n * 10) / 10);

export async function runPipeline(opts: PipelineOptions): Promise<Snapshot> {
  const { client } = opts;
  const log = opts.log ?? console.log;
  const now = opts.now ?? new Date();
  const day = now.toISOString().slice(0, 10);
  const cacheDir = opts.cacheDir ? path.join(opts.cacheDir, day) : null;
  if (cacheDir && opts.cacheDir) {
    await mkdir(cacheDir, { recursive: true });
    // Only today's responses are useful; clear earlier days.
    for (const d of await readdir(opts.cacheDir)) if (d !== day) await rm(path.join(opts.cacheDir, d), { recursive: true, force: true });
  }

  // 1. Which exchange code does roic.ai use for the JSE?
  let exchange = opts.exchange;
  if (!exchange) {
    const found = await discoverJseCode(client);
    if (!found) throw new Error("Couldn't find the Johannesburg Stock Exchange in roic.ai's exchange list. Run `npm run agent:discover`.");
    exchange = found.code;
    log(`Exchange: ${found.exchange_name ?? found.code} (code ${exchange}, ${found.symbol_count} symbols)`);
  }

  // 2. Resolve the universe against the live ticker list.
  const tickers = await listTickers(client, exchange);
  if (tickers.length === 0) throw new Error(`roic.ai returned no listed tickers for exchange "${exchange}".`);
  const byCode = new Map<string, Ticker>();
  for (const t of tickers) {
    const code = t.symbol.split(":").pop()!.toUpperCase();
    // Prefer the ordinary share if a code repeats.
    if (!byCode.has(code) || t.type === "stock") byCode.set(code, t);
  }

  const skipped: Snapshot["skipped"] = [];
  let codes: string[];
  if (opts.universe === "exchange") {
    codes = [...byCode.values()].filter((t) => t.type === "stock").map((t) => t.symbol.split(":").pop()!.toUpperCase());
  } else {
    codes = [];
    for (const c of opts.universe) {
      if (byCode.has(c.toUpperCase())) codes.push(c.toUpperCase());
      else skipped.push({ code: c, reason: `Not found on roic.ai's ${exchange} ticker list` });
    }
  }
  if (opts.maxStocks) codes = codes.slice(0, opts.maxStocks);
  const etaMin = Math.ceil((codes.length * 4 * client.msPerRequest) / 60_000);
  log(`Screening ${codes.length} shares (~${codes.length * 4} requests, about ${etaMin} min on this plan)`);

  // 3. Collect data share by share.
  const stocks: StockSnapshot[] = [];
  for (const [i, code] of codes.entries()) {
    const t = byCode.get(code)!;
    log(`[${i + 1}/${codes.length}] ${code} — ${t.name}`);
    try {
      const raw = await fetchStock(client, t.symbol, cacheDir, code);
      const stock = buildStock(t, code, raw);
      if (stock.price === null) {
        skipped.push({ code, reason: "No price history" });
        continue;
      }
      stocks.push(stock);
    } catch (err) {
      const msg = err instanceof RoicError ? `${err.status} ${err.code}: ${err.message}` : (err as Error).message;
      log(`  skipped: ${msg}`);
      skipped.push({ code, reason: msg });
      if (err instanceof RoicError && (err.status === 401 || err.status === 402)) throw err;
    }
  }

  return {
    source: "roic.ai",
    generatedAt: now.toISOString(),
    exchange,
    stocks,
    skipped,
    requestsUsed: client.requests,
  };
}

interface RawStock {
  multiples: Multiples | null;
  profitability: Profitability | null;
  credit: Credit | null;
  prices: PriceResponse;
}

async function fetchStock(client: RoicClient, symbol: string, cacheDir: string | null, code: string): Promise<RawStock> {
  const cacheFile = cacheDir ? path.join(cacheDir, `${code}.json`) : null;
  if (cacheFile) {
    try {
      return JSON.parse(await readFile(cacheFile, "utf8")) as RawStock;
    } catch {
      /* not cached yet */
    }
  }

  const id = encodeURIComponent(symbol);
  // JSE companies mostly report half-yearly, so trailing-12-month figures can be missing — fall back to annual.
  let periodType = "ttm";
  let mult = await client.get<ListResponse<Multiples>>(`${V}/fundamental/multiples/${id}`, { period_type: "ttm", limit: 1 });
  if (mult.data.length === 0) {
    periodType = "annual";
    mult = await client.get<ListResponse<Multiples>>(`${V}/fundamental/multiples/${id}`, { period_type: "annual", limit: 1 });
  }
  const prof = await client.get<ListResponse<Profitability>>(`${V}/fundamental/ratios/profitability/${id}`, {
    period_type: periodType,
    limit: 1,
  });
  const cred = await client.get<ListResponse<Credit>>(`${V}/fundamental/ratios/credit/${id}`, {
    period_type: periodType,
    limit: 1,
  });
  const prices = await client.get<PriceResponse>(`${V}/stock-prices/${id}`, {
    adjustment: "splits",
    order: "desc",
    limit: 400,
  });

  const raw: RawStock = {
    multiples: mult.data[0] ?? null,
    profitability: prof.data[0] ?? null,
    credit: cred.data[0] ?? null,
    prices,
  };
  if (cacheFile) await writeFile(cacheFile, JSON.stringify(raw));
  return raw;
}

export function buildStock(t: Ticker, code: string, raw: RawStock): StockSnapshot {
  const notes: string[] = [];
  const factor = toRandFactor(raw.prices.currency ?? t.trading_currency);
  const bars = [...raw.prices.data].filter((b) => b.close > 0).sort((a, b) => a.date.localeCompare(b.date));
  const closes = bars.map((b) => b.close * factor);
  const price = closes.at(-1) ?? null;
  if (closes.length < 260) notes.push(`Only ${closes.length} days of price history — 12-month momentum may be missing`);

  let valuation = { pe: null, pb: null, pfcf: null, evEbitda: null, rescaled: false } as ReturnType<typeof rescaleMultiples>;
  if (raw.multiples) {
    valuation = rescaleMultiples(raw.multiples, price);
    if (!valuation.rescaled) notes.push("Valuation uses period-end prices (couldn't rescale to today's price)");
  } else {
    notes.push("No valuation multiples available");
  }

  const fundamentals: Fundamentals = {
    pe: valuation.pe,
    pfcf: valuation.pfcf,
    evEbitda: valuation.evEbitda,
    pb: valuation.pb,
    roe: round1(raw.profitability?.return_com_eqy),
    roic: round1(raw.profitability?.return_on_inv_capital),
    operMargin: round1(raw.profitability?.oper_margin),
    netDebtEbitda: round1(raw.credit?.net_debt_to_ebitda),
    periodEnd: raw.multiples?.period_end_date ?? raw.profitability?.period_end_date ?? null,
    periodType: raw.multiples?.period_type ?? raw.profitability?.period_type ?? null,
  };

  return {
    symbol: t.symbol,
    code,
    name: t.name,
    price: price === null ? null : Math.round(price * 100) / 100,
    priceDate: bars.at(-1)?.date ?? null,
    fundamentals,
    technicals: computeTechnicals(closes),
    weekly: weekly(closes),
    notes,
  };
}
