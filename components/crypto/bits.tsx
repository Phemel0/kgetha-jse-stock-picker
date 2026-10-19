import type * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { COIN_GROUPS, COIN_GROUP_LABEL } from "@/lib/crypto/scoring";
import type { CoinGroup, SaExchange, ScoredCoin } from "@/lib/crypto/types";
import { cn } from "@/lib/utils";

export const coinGroupColor: Record<CoinGroup, string> = {
  fundamentals: "var(--fundamentals)",
  momentum: "var(--momentum)",
  stability: "var(--stability)",
};

export const coinTint = (g: CoinGroup) => ({ "--primary": coinGroupColor[g] }) as React.CSSProperties;

export function CoinContributionBar({ coin, height = 8 }: { coin: ScoredCoin; height?: number }) {
  const label = COIN_GROUPS.map((g) => `${COIN_GROUP_LABEL[g]} ${coin.contribution[g].toFixed(0)}`).join(", ");
  return (
    <div
      className="bg-muted flex w-full overflow-hidden rounded-full"
      style={{ height }}
      role="img"
      aria-label={`Score ${coin.score.toFixed(0)} of 100: ${label}`}
    >
      {COIN_GROUPS.map((g) => (
        <div key={g} style={{ width: `${coin.contribution[g]}%`, background: coinGroupColor[g] }} />
      ))}
    </div>
  );
}

export function CoinPctBar({ pct, group, label }: { pct: number | null; group: CoinGroup; label: string }) {
  if (pct === null) return <span className="text-muted-foreground text-sm">no data</span>;
  return (
    <div className="flex items-center gap-2">
      <Progress value={Math.max(pct, 2)} style={coinTint(group)} className="h-1.5" aria-label={`${label}: percentile ${Math.round(pct)}`} />
      <span className="text-muted-foreground w-7 text-right text-sm tabular-nums">{Math.round(pct)}</span>
    </div>
  );
}

/** Which SA exchanges list the coin in rand. */
export function SaBadges({ exchanges, className }: { exchanges: SaExchange[]; className?: string }) {
  if (exchanges.length === 0) return null;
  return (
    <span className={cn("inline-flex gap-1", className)}>
      {exchanges.map((e) => (
        <Badge key={e} variant="outline" className="px-1.5 py-0 text-[0.7rem] font-medium" title={`ZAR pair on ${e}`}>
          {e}
        </Badge>
      ))}
    </span>
  );
}
