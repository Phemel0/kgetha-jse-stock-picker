import type { Technicals } from "./types";

/** Trading days per period on the JSE (approx.). */
const D = { m1: 21, m6: 126, m12: 252 };

const round = (n: number | null, dp = 2) =>
  n === null || !Number.isFinite(n) ? null : Math.round(n * 10 ** dp) / 10 ** dp;

export function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  let sum = 0;
  for (let i = values.length - period; i < values.length; i++) sum += values[i];
  return sum / period;
}

/** Percentage return between the close `back` days ago and the close `upTo` days ago. */
export function pctReturn(closes: number[], back: number, upTo = 0): number | null {
  const end = closes.length - 1 - upTo;
  const start = closes.length - 1 - back;
  if (start < 0 || end < 0 || closes[start] <= 0) return null;
  return (closes[end] / closes[start] - 1) * 100;
}

/** Wilder's RSI. */
export function rsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const ch = closes[i] - closes[i - 1];
    if (ch >= 0) gain += ch;
    else loss -= ch;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  for (let i = period + 1; i < closes.length; i++) {
    const ch = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(ch, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-ch, 0)) / period;
  }
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

/** Annualised volatility of daily log returns over the last `days` closes, %. */
export function volatility(closes: number[], days = D.m12): number | null {
  const slice = closes.slice(-days - 1);
  if (slice.length < 30) return null;
  const rets: number[] = [];
  for (let i = 1; i < slice.length; i++) {
    if (slice[i - 1] > 0 && slice[i] > 0) rets.push(Math.log(slice[i] / slice[i - 1]));
  }
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance = rets.reduce((a, r) => a + (r - mean) ** 2, 0) / (rets.length - 1);
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
}

/** Every 5th close, ending on the latest — enough for a sparkline. */
export function weekly(closes: number[], weeks = 104): number[] {
  const out: number[] = [];
  for (let i = closes.length - 1; i >= 0 && out.length < weeks; i -= 5) out.unshift(round(closes[i], 2)!);
  return out;
}

/** Compute every technical indicator from daily closes ordered oldest → newest. */
export function computeTechnicals(closes: number[]): Technicals {
  const last = closes.at(-1) ?? null;
  const s200 = sma(closes, 200);
  const s50 = sma(closes, 50);
  const yr = closes.slice(-D.m12);
  const high = yr.length ? Math.max(...yr) : null;
  return {
    ret12m1: round(pctReturn(closes, D.m12, D.m1), 1),
    ret6m: round(pctReturn(closes, D.m6), 1),
    ret1m: round(pctReturn(closes, D.m1), 1),
    vs200d: last !== null && s200 ? round((last / s200 - 1) * 100, 1) : null,
    sma50vs200: s50 && s200 ? round((s50 / s200 - 1) * 100, 1) : null,
    rsi14: round(rsi(closes), 0),
    offHigh52w: last !== null && high ? round((1 - last / high) * 100, 1) : null,
    vol1y: round(volatility(closes), 0),
  };
}
