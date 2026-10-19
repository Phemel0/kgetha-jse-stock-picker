import type { Flag } from "../types";

export type CoinGroup = "fundamentals" | "momentum" | "stability";

/** South African exchanges Kgetha checks for a ZAR pair. */
export type SaExchange = "Luno" | "VALR";

/** Market-structure figures from CoinGecko, in rand. */
export interface CoinFundamentals {
  marketCap: number | null;
  marketCapRank: number | null;
  /** Market cap if every token that will ever exist were in circulation. */
  fdv: number | null;
  /** 24-hour trading volume across all exchanges. */
  volume24h: number | null;
  circulatingSupply: number | null;
  totalSupply: number | null;
  maxSupply: number | null;
  /** All-time high, rand, and how far below it the price is (%, negative). */
  ath: number | null;
  athChange: number | null;
  athDate: string | null;
}

/** Price-based indicators from daily closes (crypto trades every day, so periods are calendar days). */
export interface CoinTechnicals {
  /** Return from 12 months ago to 1 month ago, %. */
  ret12m1: number | null;
  /** 6-month return, %. */
  ret6m: number | null;
  /** 3-month return, %. */
  ret3m: number | null;
  /** 1-month return, %. */
  ret1m: number | null;
  /** Price vs its 200-day simple moving average, %. */
  vs200d: number | null;
  /** 50-day SMA vs 200-day SMA, %. */
  sma50vs200: number | null;
  /** 14-day RSI (Wilder). */
  rsi14: number | null;
  /** Annualised volatility of daily returns over the last year, %. */
  vol1y: number | null;
  /** Annualised volatility of the down days only, %. */
  downsideVol: number | null;
  /** Deepest peak-to-trough fall over the last year, % (positive number). */
  maxDrawdown1y: number | null;
  /** Days of daily price history available. */
  historyDays: number;
}

export interface CoinSnapshot {
  /** CoinGecko id, e.g. "bitcoin". */
  id: string;
  /** Ticker, upper case, e.g. "BTC". */
  symbol: string;
  name: string;
  /** Latest price in rand. */
  price: number | null;
  priceDate: string | null;
  fundamentals: CoinFundamentals;
  technicals: CoinTechnicals;
  /** South African exchanges with a ZAR pair for this coin. */
  saExchanges: SaExchange[];
  /** True when the coin is in the top 100 by market cap (after removing stablecoins and wrapped tokens). */
  top100: boolean;
  /** Weekly closes in rand, oldest first — for the sparkline. */
  weekly: number[];
  notes: string[];
}

export interface CoinSnapshotFile {
  source: "coingecko" | "demo";
  generatedAt: string;
  currency: "zar";
  coins: CoinSnapshot[];
  /** Coins the agent left out, and why (stablecoins, wrapped tokens, missing data). */
  excluded: { id: string; symbol: string; reason: string }[];
  requestsUsed: number;
}

export type CoinWeights = Record<CoinGroup, number>;

export interface CoinFilters {
  /** Only coins with a ZAR pair on Luno or VALR. */
  saOnly: boolean;
  /** Only coins trading above their 200-day average. */
  uptrendOnly: boolean;
  /** Hide coins swinging more than this much a year (annualised volatility, %). null = no limit. */
  maxVolatility: number | null;
}

export interface CoinFactorScore {
  key: string;
  label: string;
  group: CoinGroup;
  raw: number | null;
  pct: number | null;
}

export interface ScoredCoin extends CoinSnapshot {
  factors: CoinFactorScore[];
  groups: Record<CoinGroup, number | null>;
  score: number;
  contribution: Record<CoinGroup, number>;
  rank: number;
  strengths: Flag[];
  flags: Flag[];
  thesis: string;
  passesFilters: boolean;
}

export type CoinPicksLog = { date: string; picks: { id: string; symbol: string; score: number }[] }[];
