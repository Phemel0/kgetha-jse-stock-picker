/**
 * Minimal CoinGecko v3 client with a built-in rate limiter.
 * Works without a key (shared, IP-based limits — slow) or with a free Demo key from coingecko.com/en/api.
 */

export interface CoinGeckoOptions {
  /** Free Demo key, or a paid key with `plan: "pro"`. Optional. */
  apiKey?: string;
  plan?: "demo" | "pro";
  baseUrl?: string;
  /** Requests per minute to stay under. Default 30 with a key, 8 without. */
  rpm?: number;
  fetchImpl?: typeof fetch;
  log?: (msg: string) => void;
  /** Override for tests. */
  sleep?: (ms: number) => Promise<void>;
}

export class CoinGeckoError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const realSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class CoinGeckoClient {
  private base: string;
  private headers: Record<string, string>;
  private gapMs: number;
  private lastCall = 0;
  private fetchImpl: typeof fetch;
  private sleep: (ms: number) => Promise<void>;
  private log: (msg: string) => void;
  requests = 0;

  get msPerRequest() {
    return this.gapMs;
  }

  constructor(opts: CoinGeckoOptions = {}) {
    const pro = opts.plan === "pro";
    this.base = (opts.baseUrl ?? (pro ? "https://pro-api.coingecko.com/api/v3" : "https://api.coingecko.com/api/v3")).replace(/\/$/, "");
    this.headers = { accept: "application/json" };
    if (opts.apiKey) this.headers[pro ? "x-cg-pro-api-key" : "x-cg-demo-api-key"] = opts.apiKey;
    const rpm = opts.rpm ?? (opts.apiKey ? 30 : 8);
    this.gapMs = Math.ceil(60_000 / rpm) + 100;
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.sleep = opts.sleep ?? realSleep;
    this.log = opts.log ?? (() => {});
  }

  async get<T>(path: string, params: Record<string, string | number | boolean | undefined> = {}): Promise<T> {
    const url = new URL(this.base + path);
    for (const [k, v] of Object.entries(params)) if (v !== undefined) url.searchParams.set(k, String(v));

    for (let attempt = 0; attempt < 5; attempt++) {
      const wait = this.lastCall + this.gapMs - Date.now();
      if (wait > 0) await this.sleep(wait);
      this.lastCall = Date.now();
      this.requests++;

      let res: Response;
      try {
        res = await this.fetchImpl(url, { headers: this.headers });
      } catch (err) {
        const backoff = 2 ** attempt * 2_000;
        this.log(`  network error on ${url.pathname} (${(err as Error).message}); retrying in ${backoff / 1000}s`);
        await this.sleep(backoff);
        continue;
      }

      if (res.ok) return (await res.json()) as T;

      if (res.status === 429 || res.status >= 500) {
        const retryAfter = Number(res.headers.get("retry-after"));
        const backoff = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 15_000;
        this.log(`  ${res.status} on ${url.pathname}; waiting ${Math.round(backoff / 1000)}s`);
        await this.sleep(backoff);
        continue;
      }

      let message = res.statusText;
      try {
        const body = (await res.json()) as { error?: string | { message?: string }; status?: { error_message?: string } };
        message =
          (typeof body.error === "string" ? body.error : body.error?.message) ?? body.status?.error_message ?? message;
      } catch {
        /* not JSON */
      }
      throw new CoinGeckoError(res.status, message);
    }
    throw new CoinGeckoError(0, `Gave up on ${url.pathname} after 5 attempts`);
  }
}

/** One row of /coins/markets. */
export interface MarketRow {
  id: string;
  symbol: string;
  name: string;
  current_price: number | null;
  market_cap: number | null;
  market_cap_rank: number | null;
  fully_diluted_valuation: number | null;
  total_volume: number | null;
  circulating_supply: number | null;
  total_supply: number | null;
  max_supply: number | null;
  ath: number | null;
  ath_change_percentage: number | null;
  ath_date: string | null;
  last_updated: string | null;
}

export interface ExchangeTicker {
  base: string;
  target: string;
  coin_id: string;
  target_coin_id?: string;
  is_stale?: boolean;
  is_anomaly?: boolean;
}

export interface MarketChart {
  prices: [number, number][];
}
