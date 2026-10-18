import type * as React from "react";
import { Progress } from "@/components/ui/progress";
import { GROUPS, GROUP_LABEL } from "@/lib/scoring";
import type { FactorGroup, ScoredStock } from "@/lib/types";

export const groupColor: Record<FactorGroup, string> = {
  value: "var(--value)",
  quality: "var(--quality)",
  momentum: "var(--momentum)",
};

/** Re-tints any shadcn component that draws with `primary` (Slider, Progress) in a factor's colour. */
export const tint = (g: FactorGroup) => ({ "--primary": groupColor[g] }) as React.CSSProperties;

/** The score as a bar out of 100, split by how much each factor group contributed. */
export function ContributionBar({ stock, height = 8 }: { stock: ScoredStock; height?: number }) {
  const label = GROUPS.map((g) => `${GROUP_LABEL[g]} ${stock.contribution[g].toFixed(0)}`).join(", ");
  return (
    <div
      className="bg-muted flex w-full overflow-hidden rounded-full"
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
  const stroke = up ? "var(--momentum)" : "var(--destructive)";
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label={`Price over ${values.length} weeks, ${up ? "up" : "down"} overall`}
    >
      <path d={`${d}L${width},${height}L0,${height}Z`} fill={stroke} opacity={0.08} />
      <path d={d} fill="none" stroke={stroke} strokeWidth={1.75} strokeLinejoin="round" />
      <circle cx={pts.at(-1)![0]} cy={pts.at(-1)![1]} r={3} fill={stroke} />
    </svg>
  );
}

/** A 0–100 percentile as a shadcn Progress bar in the factor's colour. */
export function PctBar({ pct, group, label }: { pct: number | null; group: FactorGroup; label: string }) {
  if (pct === null) return <span className="text-muted-foreground text-sm">no data</span>;
  return (
    <div className="flex items-center gap-2">
      <Progress value={Math.max(pct, 2)} style={tint(group)} className="h-1.5" aria-label={`${label}: percentile ${Math.round(pct)}`} />
      <span className="text-muted-foreground w-7 text-right text-sm tabular-nums">{Math.round(pct)}</span>
    </div>
  );
}
