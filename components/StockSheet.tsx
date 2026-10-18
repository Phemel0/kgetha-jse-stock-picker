"use client";

import { CircleCheck, CircleX, TriangleAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { longDate, num, rand, signed } from "@/lib/format";
import { GROUPS, GROUP_LABEL } from "@/lib/scoring";
import type { FactorScore, ScoredStock } from "@/lib/types";
import { ContributionBar, PctBar, Sparkline, groupColor } from "./bits";

function rawValue(f: FactorScore): string {
  if (f.raw === null) return "—";
  if (["pe", "pfcf", "evEbitda", "pb", "netDebtEbitda"].includes(f.key)) return num(f.raw, "×");
  if (f.group === "momentum") return signed(f.raw);
  return num(f.raw, "%");
}

export default function StockSheet({
  stock: s,
  total,
  open,
  onOpenChange,
}: {
  stock: ScoredStock | null;
  total: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open && s !== null} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-lg">
        {s && (
          <>
            <SheetHeader className="gap-3 px-6 pt-6 pb-5">
              <p className="text-muted-foreground text-sm">
                Ranked {s.rank} of {total}
              </p>
              <div className="flex items-end justify-between gap-4">
                <SheetTitle className="code-display text-7xl">{s.code}</SheetTitle>
                <div className="text-right">
                  <p className="text-4xl font-semibold tabular-nums">{s.score.toFixed(0)}</p>
                  <p className="text-muted-foreground text-xs">score out of 100</p>
                </div>
              </div>
              <SheetDescription className="text-foreground font-medium">{s.name}</SheetDescription>
              <div className="pt-1">
                <ContributionBar stock={s} height={10} />
                <div className="text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  {GROUPS.map((g) => (
                    <span key={g} className="flex items-center gap-1.5">
                      <span className="inline-block size-2 rounded-full" style={{ background: groupColor[g] }} />
                      {GROUP_LABEL[g]} adds {s.contribution[g].toFixed(0)}
                    </span>
                  ))}
                </div>
              </div>
              <p className="pt-2 text-lg leading-snug">{s.thesis}</p>
            </SheetHeader>

            <div className="space-y-6 px-6 pb-8">
              <Card className="gap-3 py-4">
                <CardHeader className="flex items-baseline justify-between px-4">
                  <CardTitle className="text-2xl tabular-nums">{rand(s.price)}</CardTitle>
                  <span className="text-muted-foreground text-sm">{s.priceDate ? longDate(s.priceDate) : ""}</span>
                </CardHeader>
                <CardContent className="space-y-3 px-4">
                  <Sparkline values={s.weekly} />
                  <dl className="grid grid-cols-3 gap-3 text-sm">
                    <Stat label="1 month" value={signed(s.technicals.ret1m)} />
                    <Stat
                      label="Off 52-week high"
                      value={s.technicals.offHigh52w === null ? "—" : `${s.technicals.offHigh52w.toFixed(1)}%`}
                    />
                    <Stat label="RSI (14 days)" value={s.technicals.rsi14 === null ? "—" : String(s.technicals.rsi14)} />
                    <Stat label="50 vs 200-day" value={signed(s.technicals.sma50vs200)} />
                    <Stat label="Volatility" value={s.technicals.vol1y === null ? "—" : `${s.technicals.vol1y}% a year`} />
                  </dl>
                </CardContent>
              </Card>

              {s.strengths.length > 0 && (
                <section>
                  <h3 className="font-semibold">Why it ranks here</h3>
                  <ul className="mt-2 space-y-2 text-sm">
                    {s.strengths.map((f) => (
                      <li key={f.text} className="flex gap-2">
                        <CircleCheck className="text-momentum mt-0.5 size-4 shrink-0" aria-hidden />
                        {f.text}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {s.flags.length > 0 && (
                <section>
                  <h3 className="font-semibold">Check before you go further</h3>
                  <ul className="mt-2 space-y-2 text-sm">
                    {s.flags.map((f) => (
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
                <p className="text-muted-foreground mt-1 text-sm">
                  The bar shows where it sits in the list: further right is better.
                </p>
                {GROUPS.map((g) => (
                  <div key={g} className="mt-5">
                    <div className="flex items-baseline justify-between border-b pb-1.5">
                      <h4 className="text-sm font-semibold" style={{ color: groupColor[g] }}>
                        {GROUP_LABEL[g]}
                      </h4>
                      <span className="text-muted-foreground text-sm tabular-nums">
                        {s.groups[g] === null ? "no data" : `${Math.round(s.groups[g]!)} overall`}
                      </span>
                    </div>
                    <Table>
                      <TableBody>
                        {s.factors
                          .filter((f) => f.group === g)
                          .map((f) => (
                            <TableRow key={f.key} className="hover:bg-transparent">
                              <TableCell className="px-0 whitespace-normal">{f.label}</TableCell>
                              <TableCell className="w-20 text-right tabular-nums">{rawValue(f)}</TableCell>
                              <TableCell className="w-36 pr-0">
                                <PctBar pct={f.pct} group={g} label={f.label} />
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
                <p className="text-muted-foreground mt-4 text-xs">
                  Financials from the {s.fundamentals.periodType === "annual" ? "latest annual" : "trailing 12-month"} period
                  {s.fundamentals.periodEnd ? ` ending ${longDate(s.fundamentals.periodEnd)}` : ""}. Valuation multiples
                  are adjusted to the latest price.
                </p>
              </section>

              {s.notes.length > 0 && (
                <ul className="text-muted-foreground space-y-1 text-xs">
                  {s.notes.map((n) => (
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
