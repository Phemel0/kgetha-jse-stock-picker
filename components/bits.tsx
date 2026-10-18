import { GROUPS, GROUP_LABEL } from "@/lib/scoring";
import type { FactorGroup, ScoredStock } from "@/lib/types";

export const groupColor: Record<FactorGroup, string> = {
  value: "var(--value)",
  quality: "var(--quality)",
  momentum: "var(--momentum)",
};

/** The score as a bar out of 100, split by how much each factor group contributed. */
export function ContributionBar({ stock, height = 8 }: { stock: ScoredStock; height?: number }) {
  const label = GROUPS.map((g) => `${GROUP_LABEL[g]} ${stock.contribution[g].toFixed(0)}`).join(", ");
  return (
    <div
      className="flex w-full overflow-hidden rounded-[2px] bg-rule/60"
      style={{ height }}
      role="img"
      aria-label={`Score ${stock.score.toFixed(0)} of 100: ${label}`}
    >
      {GROUPS.map((g) => (
        <div key={g} style={{ width: `${stock.contribution[g]}%`, background: groupColor[g] }} />
      ))}
    </div>
  );
}

export function Sparkline({ values, width = 320, height = 72 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * width, height - 4 - ((v - min) / span) * (height - 8)]);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
  const up = values.at(-1)! >= values[0];
  const stroke = up ? "var(--momentum)" : "var(--bad)";
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label={`Price over ${values.length} weeks, ${up ? "up" : "down"} overall`}>
      <path d={`${d}L${width},${height}L0,${height}Z`} fill={stroke} opacity={0.08} />
      <path d={d} fill="none" stroke={stroke} strokeWidth={1.75} strokeLinejoin="round" />
      <circle cx={pts.at(-1)![0]} cy={pts.at(-1)![1]} r={3} fill={stroke} />
    </svg>
  );
}

/** A 0–100 percentile as a short tick on a track. */
export function PctBar({ pct, group }: { pct: number | null; group: FactorGroup }) {
  if (pct === null) return <span className="text-sm text-muted">no data</span>;
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1.5 w-full rounded-full bg-rule/70">
        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.max(pct, 2)}%`, background: groupColor[group] }} />
      </div>
      <span className="w-8 text-right text-sm tabular-nums text-muted">{Math.round(pct)}</span>
    </div>
  );
}
