/**
 * Minimal roic.ai v3 client with a built-in rate limiter.
 * Free plan: 5 requests per sliding minute — the limiter spaces calls out so we never trip a 429,
 * and still backs off properly if one happens anyway.
 */

export interface RoicOptions {
  apiKey: string;
  baseUrl?: string;
  /** Requests per minute allowed on your plan. Free = 5, Individual = 300. */
  rpm?: number;
  fetchImpl?: typeof fetch;
  log?: (msg: string) => void;
  /** Override for tests. */
  sleep?: (ms: number) => Promise<void>;
}

export class RoicError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

const realSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class RoicClient {
  private base: string;
  private gapMs: number;
  private lastCall = 0;
  private fetchImpl: typeof fetch;
  private sleep: (ms: number) => Promise<void>;
  private log: (msg: string) => void;
  requests = 0;

  /** Milliseconds the limiter leaves between requests. */
  get msPerRequest() {
    return this.gapMs;
  }

  constructor(private opts: RoicOptions) {
    this.base = (opts.baseUrl ?? "https://api.roic.ai").replace(/\/$/, "");
    const rpm = opts.rpm ?? 5;
    // Spread calls evenly across the minute, with a small safety margin.
    this.gapMs = Math.ceil(60_000 / rpm) + 250;
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
        res = await this.fetchImpl(url, { headers: { Authorization: `Bearer ${this.opts.apiKey}` } });
      } catch (err) {
        const backoff = 2 ** attempt * 2_000;
        this.log(`  network error on ${url.pathname} (${(err as Error).message}); retrying in ${backoff / 1000}s`);
        await this.sleep(backoff);
        continue;
      }

      if (res.ok) return (await res.json()) as T;

      let code = "unknown";
      let message = res.statusText;
      try {
        const body = (await res.json()) as { error?: { code?: string; message?: string } };
        code = body.error?.code ?? code;
        message = body.error?.message ?? message;
      } catch {
        /* non-JSON error body */
      }

      if (res.status === 429) {
        const retryAfter = Number(res.headers.get("retry-after")) || 60;
        this.log(`  rate limited; waiting ${retryAfter}s`);
        await this.sleep(retryAfter * 1000 + Math.random() * 1000);
        continue;
      }
      if (res.status >= 500) {
        const backoff = 2 ** attempt * 2_000 + Math.random() * 1000;
        this.log(`  server error ${res.status}; retrying in ${Math.round(backoff / 1000)}s`);
        await this.sleep(backoff);
        continue;
      }
      throw new RoicError(res.status, code, message);
    }
    throw new RoicError(0, "retries_exhausted", `Gave up on ${url.pathname} after 5 attempts`);
  }
}

/* ---- Response shapes (only the fields the agent reads) ---- */

export interface ListResponse<T> {
  data: T[];
  next_page_url: string | null;
}

export interface Exchange {
  code: string;
  exchange_name: string | null;
  exchange_local_name: string | null;
  mics: string[];
  markets: string[];
  symbol_count: number;
}

export interface Ticker {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
  is_primary: boolean;
  status: string;
  trading_currency: string | null;
}

interface Period {
  period_type: string;
  period_end_date: string;
  currency: string | null;
  price_currency: string | null;
}

export interface Multiples extends Period {
  pe_ratio: number | null;
  pr_to_book_ratio: number | null;
  pr_to_free_cash_flow: number | null;
  ev_to_ttm_ebitda: number | null;
  pr_last: number | null;
  enterprise_value: number | null;
  bs_sh_out: number | null;
}

export interface Profitability extends Period {
  return_com_eqy: number | null;
  return_on_inv_capital: number | null;
  oper_margin: number | null;
}

export interface Credit extends Period {
  net_debt_to_ebitda: number | null;
}

export interface PriceBar {
  date: string;
  close: number;
}

export interface PriceResponse extends ListResponse<PriceBar> {
  symbol: string;
  currency: string | null;
}
