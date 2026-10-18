export type FactorGroup = "value" | "quality" | "momentum";

/** Raw fundamentals for one stock, from the latest trailing-12-month (or annual) period. */
export interface Fundamentals {
  /** Price / earnings, rescaled to the latest price. Negative when the company made a loss. */
  pe: number | null;
  /** Price / free cash flow, rescaled to the latest price. */
  pfcf: number | null;
  /** Enterprise value / EBITDA, rescaled to the latest price. */
  evEbitda: number | null;
  /** Price / book value, rescaled to the latest price. */
  pb: number | null;
  /** Return on common equity, %. */
  roe: number | null;
  /** Return on invested capital, %. */
  roic: number | null;
  /** Operating margin, %. */
  operMargin: number | null;
  /** Net debt / EBITDA (negative = net cash). */
  netDebtEbitda: number | null;
  /** End date of the financial period these figures come from. */
  periodEnd: string | null;
  /** "ttm" or "annual" — which cadence was available. */
  periodType: string | null;
}

/** Price-based indicators computed from daily closes. */
export interface Technicals {
  /** Return from 12 months ago to 1 month ago (classic momentum, skips the last month), %. */
  ret12m1: number | null;
  /** 6-month return, %. */
  ret6m: number | null;
  /** 1-month return, %. */
  ret1m: number | null;
  /** Price vs its 200-day simple moving average, %. */
  vs200d: number | null;
  /** 50-day SMA vs 200-day SMA, %. Positive = "golden cross" territory. */
  sma50vs200: number | null;
  /** 14-day RSI (Wilder). */
  rsi14: number | null;
  /** Distance below the 52-week high, % (0 = at the high). */
  offHigh52w: number | null;
  /** Annualised volatility of daily returns over the last year, %. */
  vol1y: number | null;
}

export interface StockSnapshot {
  /** Exchange-qualified symbol, e.g. "JSE:NPN". */
  symbol: string;
  /** Bare JSE share code, e.g. "NPN". */
  code: string;
  name: string;
  /** Latest close, in rand. */
  price: number | null;
  priceDate: string | null;
  fundamentals: Fundamentals;
  technicals: Technicals;
  /** Weekly closes in rand, oldest first — for the sparkline. */
  weekly: number[];
  /** Anything the agent noticed while collecting data for this stock. */
  notes: string[];
}

export interface Snapshot {
  /** "demo" means synthetic data — never real prices. */
  source: "roic.ai" | "demo";
  generatedAt: string;
  exchange: string;
  stocks: StockSnapshot[];
  skipped: { code: string; reason: string }[];
  requestsUsed: number;
}

export interface Weights {
  value: number;
  quality: number;
  momentum: number;
}

export interface Filters {
  /** Hide companies with negative or missing earnings. */
  profitableOnly: boolean;
  /** Hide stocks trading below their 200-day average. */
  uptrendOnly: boolean;
  /** Hide stocks with net debt above this multiple of EBITDA. null = no limit. */
  maxNetDebtEbitda: number | null;
}

export interface FactorScore {
  key: string;
  label: string;
  group: FactorGroup;
  raw: number | null;
  /** 0–100 percentile vs the rest of the universe; null when the figure is missing. */
  pct: number | null;
}

export interface Flag {
  tone: "good" | "bad" | "warn";
  text: string;
}

export interface ScoredStock extends StockSnapshot {
  factors: FactorScore[];
  groups: Record<FactorGroup, number | null>;
  /** Weighted composite, 0–100. */
  score: number;
  /** Each group's share of the composite (adds up to `score`). */
  contribution: Record<FactorGroup, number>;
  rank: number;
  strengths: Flag[];
  flags: Flag[];
  /** Short plain-language summary of why it ranks where it does. */
  thesis: string;
  passesFilters: boolean;
}
