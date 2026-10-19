"use client";

import { CircleCheck, CircleX, TriangleAlert } from "lucide-react";
import { Sparkline } from "@/components/bits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { COIN_GROUPS, COIN_GROUP_LABEL, compactRand, formatCoinFactor } from "@/lib/crypto/scoring";
import type { ScoredCoin } from "@/lib/crypto/types";
import { longDate, signed, zar } from "@/lib/format";
import { CoinContributionBar, CoinPctBar, SaBadges, coinGroupColor } from "./bits";

export default function CoinSheet({
  coin: c,
  total,
  open,
  onOpenChange,
}: {
  coin: ScoredCoin | null;
  total: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open && c !== null} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-lg">
        {c && (
          <>
            <SheetHeader className="gap-3 px-6 pt-6 pb-5">
              <p className="text-muted-foreground text-sm">
                Ranked {c.rank} of {total}
                {c.fundamentals.marketCapRank ? ` · #${c.fundamentals.marketCapRank} by market cap` : ""}
              </p>
              <div className="flex items-end justify-between gap-4">
                <SheetTitle className="code-display min-w-0 truncate text-6xl sm:text-7xl">{c.symbol}</SheetTitle>
                <div className="shrink-0 text-right">
                  <p className="text-4xl font-semibold tabular-nums">{c.score.toFixed(0)}</p>
                  <p className="text-muted-foreground text-xs">score out of 100</p>
                </div>
              </div>
              <SheetDescription className="text-foreground flex flex-wrap items-center gap-2 font-medium">
                {c.name}
                <SaBadges exchanges={c.saExchanges} />
              </SheetDescription>
              <div className="pt-1">
                <CoinContributionBar coin={c} height={10} />
                <div className="text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  {COIN_GROUPS.map((g) => (
                    <span key={g} className="flex items-center gap-1.5">
                      <span className="inline-block size-2 rounded-full" style={{ background: coinGroupColor[g] }} />
                      {COIN_GROUP_LABEL[g]} adds {c.contribution[g].toFixed(0)}
                    </span>
                  ))}
                </div>
              </div>
              <p className="pt-2 text-lg leading-snug">{c.thesis}</p>
            </SheetHeader>

            <div className="space-y-6 px-6 pb-8">
              <Card className="gap-3 py-4">
                <CardHeader className="flex items-baseline justify-between px-4">
                  <CardTitle className="text-2xl tabular-nums">{zar(c.price)}</CardTitle>
                  <span className="text-muted-foreground text-sm">{c.priceDate ? longDate(c.priceDate) : ""}</span>
                </CardHeader>
                <CardContent className="space-y-3 px-4">
                  <Sparkline values={c.weekly} />
                  <dl className="grid grid-cols-3 gap-3 text-sm">
                    <Stat label="1 month" value={signed(c.technicals.ret1m)} />
                    <Stat label="Off all-time high" value={c.fundamentals.athChange === null ? "—" : `${Math.abs(c.fundamentals.athChange).toFixed(0)}%`} />
                    <Stat label="RSI (14 days)" value={c.technicals.rsi14 === null ? "—" : String(c.technicals.rsi14)} />
                    <Stat label="Market cap" value={c.fundamentals.marketCap === null ? "—" : compactRand(c.fundamentals.marketCap)} />
                    <Stat label="24h volume" value={c.fundamentals.volume24h === null ? "—" : compactRand(c.fundamentals.volume24h)} />
                    <Stat label="50 vs 200-day" value={signed(c.technicals.sma50vs200)} />
                  </dl>
                  <p className="text-muted-foreground text-xs">
                    {c.saExchanges.length
                      ? `Has a rand pair on ${c.saExchanges.join(" and ")}.`
                      : "No rand pair on Luno or VALR — you’d need to buy it with another coin or on an overseas exchange."}
                  </p>
                </CardContent>
              </Card>

              {c.strengths.length > 0 && (
                <section>
                  <h3 className="font-semibold">Why it ranks here</h3>
                  <ul className="mt-2 space-y-2 text-sm">
                    {c.strengths.map((f) => (
                      <li key={f.text} className="flex gap-2">
                        <CircleCheck className="text-momentum mt-0.5 size-4 shrink-0" aria-hidden />
                        {f.text}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {c.flags.length > 0 && (
                <section>
                  <h3 className="font-semibold">Check before you go further</h3>
                  <ul className="mt-2 space-y-2 text-sm">
                    {c.flags.map((f) => (
                      <li key={f.text} className="flex gap-2">
                        {f.tone === "bad" ? (
                          <CircleX className="text-destructive mt-0.5 size-4 shrink-0" aria-label="Risk" />
                        ) : (
                          <TriangleAlert className="text-warn mt-0.5 size-4 shrink-0" aria-label="Caution" />
                        )}
                        {f.text}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <Separator />

              <section>
                <h3 className="font-semibold">Every measure</h3>
                <p className="text-muted-foreground mt-1 text-sm">The bar shows where it sits in the list: further right is better.</p>
                {COIN_GROUPS.map((g) => (
                  <div key={g} className="mt-5">
                    <div className="flex items-baseline justify-between border-b pb-1.5">
                      <h4 className="text-sm font-semibold" style={{ color: coinGroupColor[g] }}>
                        {COIN_GROUP_LABEL[g]}
                      </h4>
                      <span className="text-muted-foreground text-sm tabular-nums">
                        {c.groups[g] === null ? "no data" : `${Math.round(c.groups[g]!)} overall`}
                      </span>
                    </div>
                    <Table>
                      <TableBody>
                        {c.factors
                          .filter((f) => f.group === g)
                          .map((f) => (
                            <TableRow key={f.key} className="hover:bg-transparent">
                              <TableCell className="px-0 whitespace-normal">{f.label}</TableCell>
                              <TableCell className="w-24 text-right tabular-nums">{formatCoinFactor(f.key, f.raw)}</TableCell>
                              <TableCell className="w-32 pr-0">
                                <CoinPctBar pct={f.pct} group={g} label={f.label} />
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
                <p className="text-muted-foreground mt-4 text-xs">
                  Volatility and falls are measured over the past year of daily rand prices, so they include the rand’s own
                  moves against the dollar.
                </p>
              </section>

              {c.notes.length > 0 && (
                <ul className="text-muted-foreground space-y-1 text-xs">
                  {c.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
