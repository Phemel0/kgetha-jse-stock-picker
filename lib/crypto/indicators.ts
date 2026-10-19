import { pctReturn, rsi, sma } from "../indicators";
import type { CoinTechnicals } from "./types";

/** Crypto trades every day, so periods are calendar days. */
const D = { m1: 30, m3: 91, m6: 182, m12: 365 };

const round = (n: number | null, dp = 1) =>
  n === null || !Number.isFinite(n) ? null : Math.round(n * 10 ** dp) / 10 ** dp;

function logReturns(closes: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] > 0 && closes[i] > 0) out.push(Math.log(closes[i] / closes[i - 1]));
  }
  return out;
}

/** Annualised volatility of daily log returns over the last `days` closes, %. Crypto annualises over 365 days. */
export function cryptoVolatility(closes: number[], days = D.m12): number | null {
  const rets = logReturns(closes.slice(-days - 1));
  if (rets.length < 30) return null;
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance = rets.reduce((a, r) => a + (r - mean) ** 2, 0) / (rets.length - 1);
  return Math.sqrt(variance) * Math.sqrt(365) * 100;
}

/** Annualised downside deviation: only the down days count, measured from zero. */
export function downsideVolatility(closes: number[], days = D.m12): number | null {
  const rets = logReturns(closes.slice(-days - 1));
  if (rets.length < 30) return null;
  const sq = rets.reduce((a, r) => a + Math.min(r, 0) ** 2, 0) / rets.length;
  return Math.sqrt(sq) * Math.sqrt(365) * 100;
}

/** Deepest peak-to-trough fall within the last `days` closes, as a positive %. */
export function maxDrawdown(closes: number[], days = D.m12): number | null {
  const slice = closes.slice(-days);
  if (slice.length < 30) return null;
  let peak = slice[0];
  let worst = 0;
  for (const c of slice) {
    if (c > peak) peak = c;
    if (peak > 0) worst = Math.max(worst, 1 - c / peak);
  }
  return worst * 100;
}

/** Every 7th close, ending on the latest — weekly points for the sparkline. */
export function weeklyCloses(closes: number[], weeks = 53): number[] {
  const out: number[] = [];
  for (let i = closes.length - 1; i >= 0 && out.length < weeks; i -= 7) out.unshift(closes[i]);
  return out;
}

export function computeCoinTechnicals(closes: number[]): CoinTechnicals {
  const last = closes.at(-1) ?? null;
  const s200 = sma(closes, 200);
  const s50 = sma(closes, 50);
  return {
    ret12m1: round(pctReturn(closes, D.m12, D.m1)),
    ret6m: round(pctReturn(closes, D.m6)),
    ret3m: round(pctReturn(closes, D.m3)),
    ret1m: round(pctReturn(closes, D.m1)),
    vs200d: last !== null && s200 ? round((last / s200 - 1) * 100) : null,
    sma50vs200: s50 && s200 ? round((s50 / s200 - 1) * 100) : null,
    rsi14: round(rsi(closes), 0),
    vol1y: round(cryptoVolatility(closes), 0),
    downsideVol: round(downsideVolatility(closes), 0),
    maxDrawdown1y: round(maxDrawdown(closes)),
    historyDays: closes.length,
  };
}
