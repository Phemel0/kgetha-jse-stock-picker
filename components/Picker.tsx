"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Info, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { longDate, rand, signed } from "@/lib/format";
import { DEFAULT_FILTERS, DEFAULT_WEIGHTS, GROUPS, GROUP_LABEL, scoreUniverse } from "@/lib/scoring";
import type { FactorGroup, Filters, PicksLog, Snapshot, Weights } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ContributionBar, groupColor, tint } from "./bits";
import StockSheet from "./StockSheet";

const PRESETS: { id: string; label: string; weights: Weights }[] = [
  { id: "balanced", label: "Balanced", weights: DEFAULT_WEIGHTS },
  { id: "value", label: "Value", weights: { value: 60, quality: 30, momentum: 10 } },
  { id: "momentum", label: "Momentum", weights: { value: 15, quality: 15, momentum: 70 } },
];

const GROUP_HINT: Record<FactorGroup, string> = {
  value: "P/E, free-cash-flow, EV/EBITDA and book multiples",
  quality: "Returns on equity and capital, margins, debt",
  momentum: "6- and 12-month returns, position vs 200-day average",
};

const SHORTLIST = 5;

export default function Picker({ snapshot, log }: { snapshot: Snapshot; log: PicksLog }) {
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [selected, setSelected] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Remember the person's mix between visits.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("kgetha:settings");
      if (saved) {
        const s = JSON.parse(saved);
        if (s.weights) setWeights(s.weights);
        if (s.filters) setFilters(s.filters);
      }
    } catch {
      /* storage unavailable */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("kgetha:settings", JSON.stringify({ weights, filters }));
    } catch {
      /* storage unavailable */
    }
  }, [weights, filters]);

  // Computed after mount: the page is pre-rendered, so "now" must be the viewer's clock, not the build's.
  const [ageDays, setAgeDays] = useState(0);
  useEffect(() => {
    setAgeDays(Math.floor((Date.now() - new Date(snapshot.generatedAt).getTime()) / 86_400_000));
  }, [snapshot.generatedAt]);

  const ranked = useMemo(() => scoreUniverse(snapshot.stocks, weights, filters), [snapshot, weights, filters]);
  const visible = ranked.filter((s) => s.passesFilters);
  const shortlist = visible.slice(0, SHORTLIST);
  const current = ranked.find((s) => s.code === selected) ?? null;

  const prevPicks = log.length > 1 ? new Set(log.at(-2)!.picks.map((p) => p.code)) : null;
  const prevDate = log.length > 1 ? log.at(-2)!.date : null;
  const isDemo = snapshot.source === "demo";
  const total = GROUPS.reduce((a, g) => a + weights[g], 0) || 1;
  const priceDate = snapshot.stocks.map((s) => s.priceDate).filter(Boolean).sort().at(-1);
  const activePreset = PRESETS.find((p) => GROUPS.every((g) => p.weights[g] === weights[g]))?.id ?? "";

  const open = (code: string) => {
    setSelected(code);
    setSheetOpen(true);
  };

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-4 sm:px-6">
          <div className="flex items-baseline gap-3">
            <Link href="/" className="code-display focus-visible:ring-ring/50 rounded-sm text-2xl outline-none focus-visible:ring-[3px]">
              Kgetha
            </Link>
            <span className="text-muted-foreground">JSE stock picker</span>
          </div>
          {isDemo ? (
            <Badge variant="outline" className="border-warn/50 text-warn">
              Demo data
            </Badge>
          ) : (
            <p className="text-muted-foreground text-sm">
              Prices to {priceDate ? longDate(priceDate) : "—"}, from roic.ai
            </p>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
        {isDemo && (
          <Alert className="border-warn/40 bg-warn/5">
            <Info className="text-warn" />
            <AlertTitle>You’re looking at invented companies with simulated prices.</AlertTitle>
            <AlertDescription>
              Add a roic.ai key and run the agent to screen real JSE shares. The README walks through it.
            </AlertDescription>
          </Alert>
        )}
        {!isDemo && ageDays > 4 && (
          <Alert variant="destructive">
            <TriangleAlert />
            <AlertTitle>This data is {ageDays} days old.</AlertTitle>
            <AlertDescription>
              The agent may have stopped running. Check the latest run under Actions in your GitHub repo.
            </AlertDescription>
          </Alert>
        )}

        {/* Shortlist */}
        <section aria-labelledby="shortlist">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h1 id="shortlist" className="text-xl font-semibold">
              Shortlist
            </h1>
            <p className="text-muted-foreground text-sm">
              Top {shortlist.length} of {visible.length} shares on your current mix
            </p>
          </div>

          {shortlist.length === 0 ? (
            <Card className="mt-4">
              <CardContent className="text-muted-foreground">
                No shares pass your filters. Loosen a filter to see the ranking.
              </CardContent>
            </Card>
          ) : (
            <ol className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {shortlist.map((s) => (
                <li key={s.code} className="min-w-0">
                  <Card className="hover:border-foreground/30 relative h-full gap-3 py-5 transition-colors">
                    <CardHeader className="px-5">
                      <CardDescription>#{s.rank}</CardDescription>
                      <CardAction>
                        {prevPicks && !prevPicks.has(s.code) && (
                          <Badge className="bg-momentum/15 text-momentum border-transparent">New</Badge>
                        )}
                      </CardAction>
                      <CardTitle>
                        {/* The button stretches over the whole card, so anywhere on it opens the detail sheet. */}
                        <button
                          onClick={() => open(s.code)}
                          className="code-display focus-visible:ring-ring/50 block text-[clamp(2.75rem,4vw,4rem)] outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-[3px]"
                          aria-label={`${s.code}, ${s.name}, rank ${s.rank}, score ${s.score.toFixed(0)}. Open details.`}
                        >
                          {s.code}
                        </button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 px-5">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <ContributionBar stock={s} />
                        </div>
                        <span className="text-xl font-semibold tabular-nums">{s.score.toFixed(0)}</span>
                      </div>
                      <p className="truncate text-sm font-medium">{s.name}</p>
                      <p className="text-muted-foreground text-sm leading-snug">{s.thesis}</p>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ol>
          )}
        </section>

        <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
          {/* Controls */}
          <Card className="min-w-0 gap-5 lg:sticky lg:top-6 lg:self-start" aria-label="Scoring controls">
            <CardHeader>
              <CardTitle>Your mix</CardTitle>
              <CardDescription>How much each kind of evidence counts toward the score.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex h-2 overflow-hidden rounded-full" aria-hidden>
                {GROUPS.map((g) => (
                  <div key={g} style={{ width: `${(weights[g] / total) * 100}%`, background: groupColor[g] }} />
                ))}
              </div>

              {GROUPS.map((g) => (
                <div key={g} className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label id={`w-${g}`} style={{ color: groupColor[g] }}>
                      {GROUP_LABEL[g]}
                    </Label>
                    <span className="text-muted-foreground text-sm tabular-nums">
                      {Math.round((weights[g] / total) * 100)}%
                    </span>
                  </div>
                  <Slider
                    value={[weights[g]]}
                    onValueChange={([v]) => setWeights((w) => ({ ...w, [g]: v }))}
                    min={0}
                    max={100}
                    step={5}
                    style={tint(g)}
                    thumbLabels={[`${GROUP_LABEL[g]} weight`]}
                  />
                  <p className="text-muted-foreground text-xs">{GROUP_HINT[g]}</p>
                </div>
              ))}

              <div className="space-y-2">
              <p className="text-muted-foreground text-xs">Presets</p>
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                value={activePreset}
                onValueChange={(id) => {
                  const p = PRESETS.find((x) => x.id === id);
                  if (p) setWeights(p.weights);
                }}
                className="w-full"
                aria-label="Preset mixes"
              >
                {PRESETS.map((p) => (
                  <ToggleGroupItem key={p.id} value={p.id} className="px-1.5 text-xs">
                    {p.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              </div>

              <Separator />

              <div className="space-y-4">
                <p className="text-sm font-semibold">Filters</p>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="profitable"
                    checked={filters.profitableOnly}
                    onCheckedChange={(c) => setFilters((f) => ({ ...f, profitableOnly: c === true }))}
                  />
                  <Label htmlFor="profitable" className="leading-snug font-normal">
                    Profitable companies only
                  </Label>
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="uptrend"
                    checked={filters.uptrendOnly}
                    onCheckedChange={(c) => setFilters((f) => ({ ...f, uptrendOnly: c === true }))}
                  />
                  <Label htmlFor="uptrend" className="leading-snug font-normal">
                    Only shares above their 200-day average
                  </Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-debt" className="font-normal">
                    Maximum net debt
                  </Label>
                  <Select
                    value={filters.maxNetDebtEbitda === null ? "any" : String(filters.maxNetDebtEbitda)}
                    onValueChange={(v) => setFilters((f) => ({ ...f, maxNetDebtEbitda: v === "any" ? null : Number(v) }))}
                  >
                    <SelectTrigger id="max-debt" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any amount</SelectItem>
                      <SelectItem value="3">Up to 3× EBITDA</SelectItem>
                      <SelectItem value="2">Up to 2× EBITDA</SelectItem>
                      <SelectItem value="1">Up to 1× EBITDA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <p className="text-muted-foreground text-sm">
                Showing {visible.length} of {ranked.length}. Filters hide shares; they don’t change anyone’s score.
              </p>
            </CardFooter>
          </Card>

          {/* Ranking */}
          <Card className="min-w-0 gap-4" aria-labelledby="ranking">
            <CardHeader>
              <CardTitle id="ranking">Full ranking</CardTitle>
              <CardDescription>
                Value, Quality and Momentum are percentiles: 80 means better than 80% of the list on that measure.
              </CardDescription>
              <CardAction>
                <Badge variant="secondary" className="tabular-nums">
                  {visible.length} shares
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="px-2 sm:px-4">
              <Table className="min-w-[36rem]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-muted-foreground w-10 font-normal">#</TableHead>
                    <TableHead className="text-muted-foreground font-normal">Share</TableHead>
                    <TableHead className="text-muted-foreground w-48 font-normal">Score</TableHead>
                    {GROUPS.map((g) => (
                      <TableHead key={g} className="text-muted-foreground hidden text-right font-normal md:table-cell">
                        {GROUP_LABEL[g]}
                      </TableHead>
                    ))}
                    <TableHead className="text-muted-foreground text-right font-normal">Price</TableHead>
                    <TableHead className="text-muted-foreground text-right font-normal">6 months</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((s) => (
                    <TableRow
                      key={s.code}
                      onClick={() => open(s.code)}
                      data-state={sheetOpen && selected === s.code ? "selected" : undefined}
                      className="cursor-pointer"
                    >
                      <TableCell className="text-muted-foreground tabular-nums">{s.rank}</TableCell>
                      <TableCell>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            open(s.code);
                          }}
                          className="focus-visible:ring-ring/50 rounded-sm text-left outline-none focus-visible:ring-[3px]"
                        >
                          <span className="font-bold" style={{ fontStretch: "115%" }}>
                            {s.code}
                          </span>
                          <span className="text-muted-foreground ml-2">{s.name}</span>
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span className="w-7 text-right font-semibold tabular-nums">{s.score.toFixed(0)}</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex-1 py-1.5">
                                <ContributionBar stock={s} height={6} />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              {GROUPS.map((g) => `${GROUP_LABEL[g]} ${s.contribution[g].toFixed(0)}`).join(" + ")}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                      {GROUPS.map((g) => (
                        <TableCell key={g} className="hidden text-right tabular-nums md:table-cell">
                          {s.groups[g] === null ? <span className="text-muted-foreground">—</span> : Math.round(s.groups[g]!)}
                        </TableCell>
                      ))}
                      <TableCell className="text-right tabular-nums">{rand(s.price)}</TableCell>
                      <TableCell
                        className={cn(
                          "text-right tabular-nums",
                          s.technicals.ret6m !== null && (s.technicals.ret6m >= 0 ? "text-momentum" : "text-destructive"),
                        )}
                      >
                        {signed(s.technicals.ret6m)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Separator />

        <footer className="text-muted-foreground grid gap-6 pb-4 text-sm md:grid-cols-2">
          <div>
            <h2 className="text-foreground font-semibold">How the score works</h2>
            <p className="mt-2 max-w-prose">
              Each share is ranked against the rest of the list on every measure, so a score of 80 means it beats most of
              its peers — not that it will go up. Loss-making companies rank last on valuation, and shares missing a whole
              group of data are marked down. The agent refreshes the data once a trading day.
            </p>
            {prevDate && <p className="mt-2">Shares marked New weren’t on the shortlist on {longDate(prevDate)}.</p>}
          </div>
          <div>
            <h2 className="text-foreground font-semibold">Before you buy anything</h2>
            <p className="mt-2 max-w-prose">
              Kgetha screens public data mechanically. It isn’t financial advice and doesn’t know your circumstances. Read the
              company’s latest results and SENS announcements before acting on a ranking.
            </p>
            {snapshot.skipped.length > 0 && (
              <Collapsible className="mt-3">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="group -ml-3">
                    {snapshot.skipped.length} shares couldn’t be scored
                    <ChevronDown className="transition-transform group-data-[state=open]:rotate-180" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ul className="mt-2 space-y-1">
                    {snapshot.skipped.map((s) => (
                      <li key={s.code}>
                        <strong className="text-foreground">{s.code}</strong>: {s.reason}
                      </li>
                    ))}
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </footer>
      </main>

      <StockSheet stock={current} total={ranked.length} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
