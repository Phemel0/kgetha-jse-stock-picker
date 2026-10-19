import { percentileRanks, weightedMean } from "../scoring";
import type { Flag } from "../types";
import type {
  CoinFactorScore,
  CoinFilters,
  CoinGroup,
  CoinSnapshot,
  CoinWeights,
  ScoredCoin,
} from "./types";

export const COIN_GROUPS: CoinGroup[] = ["fundamentals", "momentum", "stability"];
export const COIN_GROUP_LABEL: Record<CoinGroup, string> = {
  fundamentals: "Fundamentals",
  momentum: "Momentum",
  stability: "Stability",
};
export const DEFAULT_COIN_WEIGHTS: CoinWeights = { fundamentals: 30, momentum: 40, stability: 30 };
export const DEFAULT_COIN_FILTERS: CoinFilters = { saOnly: false, uptrendOnly: false, maxVolatility: null };

/** Daily volume / market cap. Above this, extra volume says more about wash trading than liquidity. */
const TURNOVER_CAP = 0.25;

export const turnover = (c: CoinSnapshot) => {
  const { volume24h: v, marketCap: m } = c.fundamentals;
  return v !== null && m ? v / m : null;
};

/** Share of the eventual supply already circulating (market cap / fully diluted value). */
export const floatRatio = (c: CoinSnapshot) => {
  const f = c.fundamentals;
  if (f.marketCap && f.fdv && f.fdv > 0) return Math.min(f.marketCap / f.fdv, 1);
  const cap = f.maxSupply ?? f.totalSupply;
  if (f.circulatingSupply && cap && cap > 0) return Math.min(f.circulatingSupply / cap, 1);
  return null;
};

const neg = (n: number | null) => (n === null ? null : -n);

interface CoinFactorDef {
  key: string;
  label: string;
  group: CoinGroup;
  weight: number;
  /** Value used for ranking — higher always means better. */
  rankValue: (c: CoinSnapshot) => number | null;
  /** Value shown to people. */
  display: (c: CoinSnapshot) => number | null;
  format: (n: number) => string;
}

const pct = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
const plain = (n: number) => `${n.toFixed(0)}%`;
const share = (n: number) => `${(n * 100).toFixed(n < 0.1 ? 1 : 0)}%`;
const days = (n: number) => `${n} days`;
export const compactRand = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1e12) return `R${(n / 1e12).toFixed(2)} tn`;
  if (abs >= 1e9) return `R${(n / 1e9).toFixed(1)} bn`;
  if (abs >= 1e6) return `R${(n / 1e6).toFixed(0)} m`;
  return `R${n.toFixed(0)}`;
};

export const COIN_FACTORS: CoinFactorDef[] = [
  // Fundamentals — size, liquidity and how much supply is still to come
  { key: "marketCap", label: "Market cap", group: "fundamentals", weight: 0.35, rankValue: (c) => c.fundamentals.marketCap, display: (c) => c.fundamentals.marketCap, format: compactRand },
  { key: "turnover", label: "Daily volume / market cap", group: "fundamentals", weight: 0.25, rankValue: (c) => { const t = turnover(c); return t === null ? null : Math.min(t, TURNOVER_CAP); }, display: turnover, format: share },
  { key: "float", label: "Supply already circulating", group: "fundamentals", weight: 0.25, rankValue: floatRatio, display: floatRatio, format: share },
  { key: "history", label: "Price history", group: "fundamentals", weight: 0.15, rankValue: (c) => Math.min(c.technicals.historyDays, 365), display: (c) => c.technicals.historyDays, format: days },
  // Momentum
  { key: "ret12m1", label: "12-month return (ex last month)", group: "momentum", weight: 0.3, rankValue: (c) => c.technicals.ret12m1, display: (c) => c.technicals.ret12m1, format: pct },
  { key: "ret6m", label: "6-month return", group: "momentum", weight: 0.25, rankValue: (c) => c.technicals.ret6m, display: (c) => c.technicals.ret6m, format: pct },
  { key: "ret3m", label: "3-month return", group: "momentum", weight: 0.2, rankValue: (c) => c.technicals.ret3m, display: (c) => c.technicals.ret3m, format: pct },
  { key: "vs200d", label: "Price vs 200-day average", group: "momentum", weight: 0.25, rankValue: (c) => c.technicals.vs200d, display: (c) => c.technicals.vs200d, format: pct },
  // Stability — calmer is better
  { key: "vol1y", label: "Volatility (1 year)", group: "stability", weight: 0.35, rankValue: (c) => neg(c.technicals.vol1y), display: (c) => c.technicals.vol1y, format: plain },
  { key: "downsideVol", label: "Downside volatility", group: "stability", weight: 0.25, rankValue: (c) => neg(c.technicals.downsideVol), display: (c) => c.technicals.downsideVol, format: plain },
  { key: "maxDrawdown1y", label: "Worst fall in the past year", group: "stability", weight: 0.4, rankValue: (c) => neg(c.technicals.maxDrawdown1y), display: (c) => c.technicals.maxDrawdown1y, format: plain },
];

export function formatCoinFactor(key: string, raw: number | null): string {
  if (raw === null) return "—";
  const f = COIN_FACTORS.find((d) => d.key === key);
  return f ? f.format(raw) : String(raw);
}

function passes(c: CoinSnapshot, f: CoinFilters): boolean {
  if (f.saOnly && c.saExchanges.length === 0) return false;
  if (f.uptrendOnly && !(c.technicals.vs200d !== null && c.technicals.vs200d > 0)) return false;
  if (f.maxVolatility !== null && (c.technicals.vol1y === null || c.technicals.vol1y > f.maxVolatility)) return false;
  return true;
}

function describe(f: CoinFactorDef, c: CoinSnapshot, p: number, good: boolean): string {
  const raw = f.display(c);
  const shown = raw === null ? "" : ` ${f.format(raw)}`;
  const s = Math.round(good ? p : 100 - p);
  if (s >= 100) return `${f.label}${shown} — ${good ? "best" : "worst"} on the list`;
  return `${f.label}${shown} — ${good ? "better" : "worse"} than ${s}% of the list`;
}

function riskFlags(c: CoinSnapshot): Flag[] {
  const flags: Flag[] = [];
  const t = c.technicals;
  const to = turnover(c);
  const fl = floatRatio(c);
  // Crypto's normal is far wilder than shares', so these thresholds sit well above the share picker's.
  if (t.vol1y !== null && t.vol1y >= 120) flags.push({ tone: "bad", text: `Extremely volatile: ${t.vol1y}% annualised swings` });
  else if (t.vol1y !== null && t.vol1y >= 90) flags.push({ tone: "warn", text: `Volatile: ${t.vol1y}% annualised swings` });
  if (t.maxDrawdown1y !== null && t.maxDrawdown1y >= 75)
    flags.push({ tone: "bad", text: `Fell ${t.maxDrawdown1y.toFixed(0)}% from peak to trough in the past year` });
  if (t.vs200d !== null && t.vs200d < 0) flags.push({ tone: "warn", text: "Trading below its 200-day average" });
  if (t.rsi14 !== null && t.rsi14 >= 75) flags.push({ tone: "warn", text: `Short-term overbought (RSI ${t.rsi14})` });
  if (t.rsi14 !== null && t.rsi14 <= 25) flags.push({ tone: "warn", text: `Sharp recent sell-off (RSI ${t.rsi14})` });
  if (to !== null && to < 0.01) flags.push({ tone: "warn", text: "Thin trading: daily volume is under 1% of market cap" });
  if (to !== null && to > 1) flags.push({ tone: "warn", text: "Daily volume exceeds market cap — some of it may be wash trading" });
  if (fl !== null && fl < 0.5)
    flags.push({ tone: "warn", text: `Only ${(fl * 100).toFixed(0)}% of the eventual supply circulates — unlocks could dilute holders` });
  if (t.historyDays < 200) flags.push({ tone: "warn", text: `Only ${t.historyDays} days of price history — trend and risk measures are incomplete` });
  if (c.fundamentals.athChange !== null && c.fundamentals.athChange <= -85)
    flags.push({ tone: "warn", text: `${Math.abs(c.fundamentals.athChange).toFixed(0)}% below its all-time high` });
  return flags;
}

function thesisFor(g: Record<CoinGroup, number | null>): string {
  const tag = (n: number | null) => (n === null ? null : n >= 67 ? "strong" : n >= 34 ? "middling" : "weak");
  const f = tag(g.fundamentals);
  const m = tag(g.momentum);
  const s = tag(g.stability);
  if (f === "strong" && m === "strong" && s !== "weak") return "Large, liquid and trending up without wild swings — the profile this screen looks for.";
  if (m === "strong" && s === "weak") return "Strong trend, but a rough ride. Size any position for big swings.";
  if (f === "strong" && m === "strong") return "Established coin in a strong uptrend.";
  if (f === "strong" && s === "strong" && m === "weak") return "Established and relatively calm, but the trend is against it for now.";
  if (f === "strong" && s === "strong") return "Large and steady by crypto standards; the trend is unremarkable.";
  if (m === "strong") return "Ranks mainly on price momentum.";
  if (f === "strong" && m === "weak") return "Big and liquid, but the market is selling it.";
  if (f === "strong") return "Ranks mainly on size and liquidity.";
  if (s === "strong") return "Calmer than most, with no strong trend either way.";
  if (m === "weak" && s === "weak") return "Falling and volatile — bottom of the list on trend and risk.";
  if (f === "weak") return "Small or thinly traded; the score leans on price action alone.";
  return "No standout factor; sits in the middle of the pack.";
}

/** Score every coin. Pure and fast, so the dashboard reruns it on every slider move. */
export function scoreCoins(
  coins: CoinSnapshot[],
  weights: CoinWeights = DEFAULT_COIN_WEIGHTS,
  filters: CoinFilters = DEFAULT_COIN_FILTERS,
): ScoredCoin[] {
  const ranksByFactor = COIN_FACTORS.map((f) => percentileRanks(coins.map(f.rankValue)));
  const totalW = COIN_GROUPS.reduce((a, g) => a + Math.max(0, weights[g]), 0) || 1;

  const scored = coins.map((c, i) => {
    const factors: CoinFactorScore[] = COIN_FACTORS.map((f, fi) => ({
      key: f.key,
      label: f.label,
      group: f.group,
      raw: f.display(c),
      pct: ranksByFactor[fi][i],
    }));

    const groups = Object.fromEntries(
      COIN_GROUPS.map((g) => [
        g,
        weightedMean(COIN_FACTORS.map((f, fi) => ({ value: f.group === g ? ranksByFactor[fi][i] : null, weight: f.weight }))),
      ]),
    ) as Record<CoinGroup, number | null>;

    const avail = COIN_GROUPS.filter((g) => groups[g] !== null && weights[g] > 0);
    const availW = avail.reduce((a, g) => a + weights[g], 0);
    const contribution = Object.fromEntries(
      COIN_GROUPS.map((g) => [g, avail.includes(g) && availW > 0 ? ((groups[g] as number) * weights[g]) / availW : 0]),
    ) as Record<CoinGroup, number>;
    // A coin missing a whole group can't outrank one scored on everything.
    const coverage = availW / totalW;
    const rawScore = COIN_GROUPS.reduce((a, g) => a + contribution[g], 0);
    const score = rawScore * (0.6 + 0.4 * coverage);
    const scale = rawScore > 0 ? score / rawScore : 0;
    for (const g of COIN_GROUPS) contribution[g] *= scale;

    const ranked = COIN_FACTORS.map((f, fi) => ({ f, p: ranksByFactor[fi][i] })).filter(
      (d): d is { f: CoinFactorDef; p: number } => d.p !== null && weights[d.f.group] > 0,
    );
    const strengths: Flag[] = ranked
      .filter((d) => d.p >= 75 && d.f.key !== "history")
      .sort((a, b) => b.p - a.p)
      .slice(0, 3)
      .map((d) => ({ tone: "good", text: describe(d.f, c, d.p, true) }));
    const risks = riskFlags(c);
    // Don't repeat a weakness a risk flag already spells out.
    const covered = new Set<string>(["history"]);
    if (risks.some((r) => /volatile/i.test(r.text))) covered.add("vol1y").add("downsideVol");
    if (risks.some((r) => r.text.startsWith("Fell"))) covered.add("maxDrawdown1y");
    if (risks.some((r) => r.text.startsWith("Thin trading"))) covered.add("turnover");
    if (risks.some((r) => r.text.includes("eventual supply"))) covered.add("float");
    const weaknesses: Flag[] = ranked
      .filter((d) => d.p <= 20 && !covered.has(d.f.key))
      .sort((a, b) => a.p - b.p)
      .slice(0, 2)
      .map((d) => ({ tone: "warn", text: describe(d.f, c, d.p, false) }));

    return {
      ...c,
      factors,
      groups,
      score: Math.round(score * 10) / 10,
      contribution,
      rank: 0,
      strengths,
      flags: [...risks, ...weaknesses],
      thesis: thesisFor(groups),
      passesFilters: passes(c, filters),
    } satisfies ScoredCoin;
  });

  scored.sort((a, b) => b.score - a.score || a.symbol.localeCompare(b.symbol));
  scored.forEach((c, i) => (c.rank = i + 1));
  return scored;
}
