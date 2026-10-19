import type {
  FactorGroup,
  FactorScore,
  Filters,
  Flag,
  ScoredStock,
  StockSnapshot,
  Weights,
} from "./types";

export const DEFAULT_WEIGHTS: Weights = { value: 40, quality: 25, momentum: 35 };
export const DEFAULT_FILTERS: Filters = { profitableOnly: false, uptrendOnly: false, maxNetDebtEbitda: null };
export const GROUPS: FactorGroup[] = ["value", "quality", "momentum"];
export const GROUP_LABEL: Record<FactorGroup, string> = {
  value: "Value",
  quality: "Quality",
  momentum: "Momentum",
};

/** Turn "lower is better" multiples into yields so a negative (loss-making) figure ranks last, not first. */
const yieldOf = (multiple: number | null) => (multiple === null || multiple === 0 ? null : 1 / multiple);

interface FactorDef {
  key: string;
  label: string;
  group: FactorGroup;
  weight: number;
  /** Value used for ranking — higher always means better. */
  rankValue: (s: StockSnapshot) => number | null;
  /** Value shown to people. */
  display: (s: StockSnapshot) => number | null;
  format: (n: number) => string;
}

const x = (n: number) => `${n.toFixed(1)}×`;
const pct = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
const plain = (n: number) => `${n.toFixed(1)}%`;

export const FACTORS: FactorDef[] = [
  // Value — cheaper is better
  { key: "pe", label: "P/E", group: "value", weight: 0.35, rankValue: (s) => yieldOf(s.fundamentals.pe), display: (s) => s.fundamentals.pe, format: x },
  { key: "pfcf", label: "Price / free cash flow", group: "value", weight: 0.25, rankValue: (s) => yieldOf(s.fundamentals.pfcf), display: (s) => s.fundamentals.pfcf, format: x },
  { key: "evEbitda", label: "EV / EBITDA", group: "value", weight: 0.25, rankValue: (s) => yieldOf(s.fundamentals.evEbitda), display: (s) => s.fundamentals.evEbitda, format: x },
  { key: "pb", label: "Price / book", group: "value", weight: 0.15, rankValue: (s) => yieldOf(s.fundamentals.pb), display: (s) => s.fundamentals.pb, format: x },
  // Quality — part of "fundamentals": stops the value screen buying broken companies
  { key: "roe", label: "Return on equity", group: "quality", weight: 0.3, rankValue: (s) => s.fundamentals.roe, display: (s) => s.fundamentals.roe, format: plain },
  { key: "roic", label: "Return on invested capital", group: "quality", weight: 0.3, rankValue: (s) => s.fundamentals.roic, display: (s) => s.fundamentals.roic, format: plain },
  { key: "operMargin", label: "Operating margin", group: "quality", weight: 0.2, rankValue: (s) => s.fundamentals.operMargin, display: (s) => s.fundamentals.operMargin, format: plain },
  { key: "netDebtEbitda", label: "Net debt / EBITDA", group: "quality", weight: 0.2, rankValue: (s) => (s.fundamentals.netDebtEbitda === null ? null : -s.fundamentals.netDebtEbitda), display: (s) => s.fundamentals.netDebtEbitda, format: x },
  // Momentum
  { key: "ret12m1", label: "12-month return (ex last month)", group: "momentum", weight: 0.4, rankValue: (s) => s.technicals.ret12m1, display: (s) => s.technicals.ret12m1, format: pct },
  { key: "ret6m", label: "6-month return", group: "momentum", weight: 0.3, rankValue: (s) => s.technicals.ret6m, display: (s) => s.technicals.ret6m, format: pct },
  { key: "vs200d", label: "Price vs 200-day average", group: "momentum", weight: 0.3, rankValue: (s) => s.technicals.vs200d, display: (s) => s.technicals.vs200d, format: pct },
];

/** Percentile rank (0–100) of each value among the non-null values; ties share the average rank. */
export function percentileRanks(values: (number | null)[]): (number | null)[] {
  const present = values
    .map((v, i) => ({ v, i }))
    .filter((d): d is { v: number; i: number } => d.v !== null && Number.isFinite(d.v))
    .sort((a, b) => a.v - b.v);
  const out: (number | null)[] = values.map(() => null);
  if (present.length === 0) return out;
  if (present.length === 1) {
    out[present[0].i] = 50;
    return out;
  }
  let j = 0;
  while (j < present.length) {
    let k = j;
    while (k + 1 < present.length && present[k + 1].v === present[j].v) k++;
    const avgRank = (j + k) / 2;
    const p = (avgRank / (present.length - 1)) * 100;
    for (let m = j; m <= k; m++) out[present[m].i] = p;
    j = k + 1;
  }
  return out;
}

export function weightedMean(items: { value: number | null; weight: number }[]): number | null {
  let sum = 0;
  let w = 0;
  for (const it of items) {
    if (it.value === null) continue;
    sum += it.value * it.weight;
    w += it.weight;
  }
  return w === 0 ? null : sum / w;
}

function passes(s: StockSnapshot, f: Filters): boolean {
  if (f.profitableOnly && !(s.fundamentals.pe !== null && s.fundamentals.pe > 0)) return false;
  if (f.uptrendOnly && !(s.technicals.vs200d !== null && s.technicals.vs200d > 0)) return false;
  if (f.maxNetDebtEbitda !== null && s.fundamentals.netDebtEbitda !== null && s.fundamentals.netDebtEbitda > f.maxNetDebtEbitda)
    return false;
  return true;
}

function describe(f: FactorDef, s: StockSnapshot, p: number, good: boolean): string {
  const raw = f.display(s);
  const shown = raw === null ? "" : ` ${f.format(raw)}`;
  const share = Math.round(good ? p : 100 - p);
  if (share >= 100) return `${f.label}${shown} — ${good ? "best" : "worst"} on the list`;
  const cmp = good ? "better than" : "worse than";
  return `${f.label}${shown} — ${cmp} ${share}% of the list`;
}

function riskFlags(s: StockSnapshot): Flag[] {
  const flags: Flag[] = [];
  const { fundamentals: fu, technicals: t } = s;
  if (fu.pe !== null && fu.pe < 0) flags.push({ tone: "bad", text: "Loss-making over the latest period" });
  if (fu.netDebtEbitda !== null && fu.netDebtEbitda > 3)
    flags.push({ tone: "bad", text: `High debt: net debt is ${fu.netDebtEbitda.toFixed(1)}× EBITDA` });
  if (t.vs200d !== null && t.vs200d < 0) flags.push({ tone: "warn", text: "Trading below its 200-day average" });
  if (t.rsi14 !== null && t.rsi14 >= 75) flags.push({ tone: "warn", text: `Short-term overbought (RSI ${t.rsi14})` });
  if (t.rsi14 !== null && t.rsi14 <= 25) flags.push({ tone: "warn", text: `Sharp recent sell-off (RSI ${t.rsi14})` });
  if (t.vol1y !== null && t.vol1y >= 45) flags.push({ tone: "warn", text: `Volatile: ${t.vol1y}% annualised swings` });
  if (fu.periodEnd) {
    const ageDays = (Date.now() - new Date(fu.periodEnd).getTime()) / 86_400_000;
    if (ageDays > 400) flags.push({ tone: "warn", text: `Financials are stale (period ended ${fu.periodEnd})` });
  }
  if (fu.pe === null && fu.evEbitda === null) flags.push({ tone: "warn", text: "No valuation data — scored on price only" });
  return flags;
}

function thesisFor(groups: Record<FactorGroup, number | null>): string {
  const tag = (g: number | null) => (g === null ? null : g >= 67 ? "strong" : g >= 34 ? "middling" : "weak");
  const v = tag(groups.value);
  const q = tag(groups.quality);
  const m = tag(groups.momentum);
  if (v === "strong" && m === "strong") return "Cheap and already moving up — the profile this screen is built to find.";
  if (v === "strong" && q === "strong") return "Cheap with solid returns on capital; the price hasn't caught on yet.";
  if (v === "strong" && m === "weak") return "Cheap, but the market is still selling it. Possible value trap — check why.";
  if (v === "strong") return "Ranks mainly on valuation.";
  if (q === "strong" && m === "strong") return "Quality business in a strong uptrend; valuation is no bargain.";
  if (m === "strong" && v === "weak") return "Strong trend but expensive. Momentum is carrying the score.";
  if (m === "strong") return "Ranks mainly on price momentum.";
  if (q === "strong") return "High-quality business at a fair price, with no strong trend either way.";
  if (v === "weak" && m === "weak") return "Expensive and falling — bottom of the list on both screens.";
  return "No standout factor; sits in the middle of the pack.";
}

/**
 * Score every stock in the universe. Pure and fast, so the dashboard reruns it on every slider move.
 * Ranks are computed across the whole universe, then filters only hide stocks — so a filter never changes another stock's score.
 */
export function scoreUniverse(
  stocks: StockSnapshot[],
  weights: Weights = DEFAULT_WEIGHTS,
  filters: Filters = DEFAULT_FILTERS,
): ScoredStock[] {
  const ranksByFactor = FACTORS.map((f) => percentileRanks(stocks.map(f.rankValue)));
  const totalW = GROUPS.reduce((a, g) => a + Math.max(0, weights[g]), 0) || 1;

  const scored = stocks.map((s, i) => {
    const factors: FactorScore[] = FACTORS.map((f, fi) => ({
      key: f.key,
      label: f.label,
      group: f.group,
      raw: f.display(s),
      pct: ranksByFactor[fi][i],
    }));

    const groups = Object.fromEntries(
      GROUPS.map((g) => [
        g,
        weightedMean(FACTORS.map((f, fi) => ({ value: f.group === g ? ranksByFactor[fi][i] : null, weight: f.weight }))),
      ]),
    ) as Record<FactorGroup, number | null>;

    // Groups with no data drop out and the remaining weights are renormalised.
    const avail = GROUPS.filter((g) => groups[g] !== null && weights[g] > 0);
    const availW = avail.reduce((a, g) => a + weights[g], 0);
    const contribution = Object.fromEntries(
      GROUPS.map((g) => [g, avail.includes(g) && availW > 0 ? ((groups[g] as number) * weights[g]) / availW : 0]),
    ) as Record<FactorGroup, number>;
    // Penalise thin coverage: a stock missing a whole group can't outrank one scored on everything.
    const coverage = availW / totalW;
    const rawScore = GROUPS.reduce((a, g) => a + contribution[g], 0);
    const score = rawScore * (0.6 + 0.4 * coverage);
    const scale = rawScore > 0 ? score / rawScore : 0;
    for (const g of GROUPS) contribution[g] *= scale;

    const ranked = FACTORS.map((f, fi) => ({ f, p: ranksByFactor[fi][i] })).filter(
      (d): d is { f: FactorDef; p: number } => d.p !== null && weights[d.f.group] > 0,
    );
    const strengths: Flag[] = ranked
      .filter((d) => d.p >= 75)
      .sort((a, b) => b.p - a.p)
      .slice(0, 3)
      .map((d) => ({ tone: "good", text: describe(d.f, s, d.p, true) }));
    const risks = riskFlags(s);
    // Don't repeat a weakness that a risk flag already spells out.
    const covered = new Set<string>();
    if (risks.some((r) => r.text.startsWith("High debt"))) covered.add("netDebtEbitda");
    if (risks.some((r) => r.text.startsWith("Loss-making"))) covered.add("pe");
    const weaknesses: Flag[] = ranked
      .filter((d) => d.p <= 20 && !covered.has(d.f.key))
      .sort((a, b) => a.p - b.p)
      .slice(0, 2)
      .map((d) => ({ tone: "warn", text: describe(d.f, s, d.p, false) }));

    return {
      ...s,
      factors,
      groups,
      score: Math.round(score * 10) / 10,
      contribution,
      rank: 0,
      strengths,
      flags: [...risks, ...weaknesses],
      thesis: thesisFor(groups),
      passesFilters: passes(s, filters),
    } satisfies ScoredStock;
  });

  scored.sort((a, b) => b.score - a.score || a.code.localeCompare(b.code));
  scored.forEach((s, i) => (s.rank = i + 1));
  return scored;
}
