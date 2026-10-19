"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Info, TriangleAlert } from "lucide-react";
import MarketSwitch from "@/components/MarketSwitch";
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
import { COIN_GROUPS, COIN_GROUP_LABEL, DEFAULT_COIN_FILTERS, DEFAULT_COIN_WEIGHTS, scoreCoins } from "@/lib/crypto/scoring";
import type { CoinFilters, CoinGroup, CoinPicksLog, CoinSnapshotFile, CoinWeights } from "@/lib/crypto/types";
import { longDate, signed, zar } from "@/lib/format";
import { cn } from "@/lib/utils";
import CoinSheet from "./CoinSheet";
import { CoinContributionBar, SaBadges, coinGroupColor, coinTint } from "./bits";

const PRESETS: { id: string; label: string; weights: CoinWeights }[] = [
  { id: "balanced", label: "Balanced", weights: DEFAULT_COIN_WEIGHTS },
  { id: "trend", label: "Trend", weights: { fundamentals: 15, momentum: 70, stability: 15 } },
  { id: "defensive", label: "Defensive", weights: { fundamentals: 40, momentum: 20, stability: 40 } },
];

const GROUP_HINT: Record<CoinGroup, string> = {
  fundamentals: "Market cap, trading volume, supply still to unlock, track record",
  momentum: "3-, 6- and 12-month returns, position vs 200-day average",
  stability: "Calmer swings and shallower falls score higher",
};

const SHORTLIST = 5;

export default function CryptoPicker({ snapshot, log }: { snapshot: CoinSnapshotFile; log: CoinPicksLog }) {
  const [weights, setWeights] = useState<CoinWeights>(DEFAULT_COIN_WEIGHTS);
  const [filters, setFilters] = useState<CoinFilters>(DEFAULT_COIN_FILTERS);
  const [selected, setSelected] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("kgetha:crypto-settings");
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
      localStorage.setItem("kgetha:crypto-settings", JSON.stringify({ weights, filters }));
    } catch {
      /* storage unavailable */
    }
  }, [weights, filters]);

  // Measured after mount: the page is pre-rendered, so "now" must be the viewer's clock.
  const [ageDays, setAgeDays] = useState(0);
  useEffect(() => {
    setAgeDays(Math.floor((Date.now() - new Date(snapshot.generatedAt).getTime()) / 86_400_000));
  }, [snapshot.generatedAt]);

  const ranked = useMemo(() => scoreCoins(snapshot.coins, weights, filters), [snapshot, weights, filters]);
  const visible = ranked.filter((c) => c.passesFilters);
  const shortlist = visible.slice(0, SHORTLIST);
  const current = ranked.find((c) => c.id === selected) ?? null;

  const prevPicks = log.length > 1 ? new Set(log.at(-2)!.picks.map((p) => p.id)) : null;
  const prevDate = log.length > 1 ? log.at(-2)!.date : null;
  const isDemo = snapshot.source === "demo";
  const total = COIN_GROUPS.reduce((a, g) => a + weights[g], 0) || 1;
  const activePreset = PRESETS.find((p) => COIN_GROUPS.every((g) => p.weights[g] === weights[g]))?.id ?? "";
  const saCount = snapshot.coins.filter((c) => c.saExchanges.length > 0).length;

  const open = (id: string) => {
    setSelected(id);
    setSheetOpen(true);
  };

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-4 sm:px-6">
          <div className="flex items-baseline gap-3">
            <Link href="/" className="code-display focus-visible:ring-ring/50 rounded-sm text-2xl outline-none focus-visible:ring-[3px]">
              Kgetha
            </Link>
            <span className="text-muted-foreground hidden sm:inline">Crypto picker</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {isDemo ? (
              <Badge variant="outline" className="border-warn/50 text-warn">
                Demo data
              </Badge>
            ) : (
              <p className="text-muted-foreground text-sm">Prices in rand, {longDate(snapshot.generatedAt)}, from CoinGecko</p>
            )}
            <MarketSwitch active="crypto" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
        {isDemo && (
          <Alert className="border-warn/40 bg-warn/5">
            <Info className="text-warn" />
            <AlertTitle>You’re looking at invented coins with simulated prices.</AlertTitle>
            <AlertDescription>
              Run the crypto agent (no key needed, a free CoinGecko key makes it faster) to screen the real top 100 and
              everything on Luno and VALR. The README walks through it.
            </AlertDescription>
          </Alert>
        )}
        {!isDemo && ageDays > 2 && (
          <Alert variant="destructive">
            <TriangleAlert />
            <AlertTitle>This data is {ageDays} days old.</AlertTitle>
            <AlertDescription>
              Crypto moves fast and the agent runs daily, so it may have stopped. Check the latest run under Actions in your
              GitHub repo.
            </AlertDescription>
          </Alert>
        )}

        <section aria-labelledby="shortlist">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h1 id="shortlist" className="text-xl font-semibold">
              Shortlist
            </h1>
            <p className="text-muted-foreground text-sm">
              Top {shortlist.length} of {visible.length} coins on your current mix
            </p>
          </div>

          {shortlist.length === 0 ? (
            <Card className="mt-4">
              <CardContent className="text-muted-foreground">No coins pass your filters. Loosen a filter to see the ranking.</CardContent>
            </Card>
          ) : (
            <ol className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {shortlist.map((c) => (
                <li key={c.id} className="min-w-0">
                  <Card className="hover:border-foreground/30 relative h-full gap-3 py-5 transition-colors">
                    <CardHeader className="px-5">
                      <CardDescription>#{c.rank}</CardDescription>
                      <CardAction>
                        {prevPicks && !prevPicks.has(c.id) && (
                          <Badge className="bg-momentum/15 text-momentum border-transparent">New</Badge>
                        )}
                      </CardAction>
                      <CardTitle>
                        <button
                          onClick={() => open(c.id)}
                          className="code-display focus-visible:ring-ring/50 block truncate text-[clamp(2.5rem,3.6vw,3.6rem)] outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-[3px]"
                          aria-label={`${c.symbol}, ${c.name}, rank ${c.rank}, score ${c.score.toFixed(0)}. Open details.`}
                        >
                          {c.symbol}
                        </button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 px-5">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <CoinContributionBar coin={c} />
                        </div>
                        <span className="text-xl font-semibold tabular-nums">{c.score.toFixed(0)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium">{c.name}</p>
                        <SaBadges exchanges={c.saExchanges} className="shrink-0" />
                      </div>
                      <p className="text-muted-foreground text-sm leading-snug">{c.thesis}</p>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ol>
          )}
        </section>

        <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
          <Card className="min-w-0 gap-5 lg:sticky lg:top-6 lg:self-start" aria-label="Scoring controls">
            <CardHeader>
              <CardTitle>Your mix</CardTitle>
              <CardDescription>How much each kind of evidence counts toward the score.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex h-2 overflow-hidden rounded-full" aria-hidden>
                {COIN_GROUPS.map((g) => (
                  <div key={g} style={{ width: `${(weights[g] / total) * 100}%`, background: coinGroupColor[g] }} />
                ))}
              </div>

              {COIN_GROUPS.map((g) => (
                <div key={g} className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label style={{ color: coinGroupColor[g] }}>{COIN_GROUP_LABEL[g]}</Label>
                    <span className="text-muted-foreground text-sm tabular-nums">{Math.round((weights[g] / total) * 100)}%</span>
                  </div>
                  <Slider
                    value={[weights[g]]}
                    onValueChange={([v]) => setWeights((w) => ({ ...w, [g]: v }))}
                    min={0}
                    max={100}
                    step={5}
                    style={coinTint(g)}
                    thumbLabels={[`${COIN_GROUP_LABEL[g]} weight`]}
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
                    id="sa-only"
                    checked={filters.saOnly}
                    onCheckedChange={(v) => setFilters((f) => ({ ...f, saOnly: v === true }))}
                  />
                  <Label htmlFor="sa-only" className="leading-snug font-normal">
                    Buyable in rand on Luno or VALR ({saCount})
                  </Label>
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="uptrend"
                    checked={filters.uptrendOnly}
                    onCheckedChange={(v) => setFilters((f) => ({ ...f, uptrendOnly: v === true }))}
                  />
                  <Label htmlFor="uptrend" className="leading-snug font-normal">
                    Only coins above their 200-day average
                  </Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-vol" className="font-normal">
                    Maximum volatility
                  </Label>
                  <Select
                    value={filters.maxVolatility === null ? "any" : String(filters.maxVolatility)}
                    onValueChange={(v) => setFilters((f) => ({ ...f, maxVolatility: v === "any" ? null : Number(v) }))}
                  >
                    <SelectTrigger id="max-vol" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any amount</SelectItem>
                      <SelectItem value="100">Up to 100% a year</SelectItem>
                      <SelectItem value="75">Up to 75% a year</SelectItem>
                      <SelectItem value="55">Up to 55% a year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <p className="text-muted-foreground text-sm">
                Showing {visible.length} of {ranked.length}. Filters hide coins; they don’t change anyone’s score.
              </p>
            </CardFooter>
          </Card>

          <Card className="min-w-0 gap-4" aria-labelledby="ranking">
            <CardHeader>
              <CardTitle id="ranking">Full ranking</CardTitle>
              <CardDescription>
                Group scores are percentiles: 80 means better than 80% of the list. Stability is higher when a coin swings less.
              </CardDescription>
              <CardAction>
                <Badge variant="secondary" className="tabular-nums">
                  {visible.length} coins
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="px-2 sm:px-4">
              <Table className="min-w-[36rem]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-muted-foreground w-10 font-normal">#</TableHead>
                    <TableHead className="text-muted-foreground font-normal">Coin</TableHead>
                    <TableHead className="text-muted-foreground w-44 font-normal">Score</TableHead>
                    {COIN_GROUPS.map((g) => (
                      <TableHead key={g} className="text-muted-foreground hidden text-right font-normal md:table-cell">
                        {COIN_GROUP_LABEL[g]}
                      </TableHead>
                    ))}
                    <TableHead className="text-muted-foreground text-right font-normal">Price</TableHead>
                    <TableHead className="text-muted-foreground text-right font-normal">6 months</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((c) => (
                    <TableRow
                      key={c.id}
                      onClick={() => open(c.id)}
                      data-state={sheetOpen && selected === c.id ? "selected" : undefined}
                      className="cursor-pointer"
                    >
                      <TableCell className="text-muted-foreground tabular-nums">{c.rank}</TableCell>
                      <TableCell>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            open(c.id);
                          }}
                          className="focus-visible:ring-ring/50 flex items-center gap-2 rounded-sm text-left outline-none focus-visible:ring-[3px]"
                        >
                          <span className="font-bold" style={{ fontStretch: "115%" }}>
                            {c.symbol}
                          </span>
                          <span className="text-muted-foreground max-w-[12rem] truncate">{c.name}</span>
                          <SaBadges exchanges={c.saExchanges} className="hidden lg:inline-flex" />
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span className="w-7 text-right font-semibold tabular-nums">{c.score.toFixed(0)}</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex-1 py-1.5">
                                <CoinContributionBar coin={c} height={6} />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              {COIN_GROUPS.map((g) => `${COIN_GROUP_LABEL[g]} ${c.contribution[g].toFixed(0)}`).join(" + ")}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                      {COIN_GROUPS.map((g) => (
                        <TableCell key={g} className="hidden text-right tabular-nums md:table-cell">
                          {c.groups[g] === null ? <span className="text-muted-foreground">—</span> : Math.round(c.groups[g]!)}
                        </TableCell>
                      ))}
                      <TableCell className="text-right tabular-nums">{zar(c.price)}</TableCell>
                      <TableCell
                        className={cn(
                          "text-right tabular-nums",
                          c.technicals.ret6m !== null && (c.technicals.ret6m >= 0 ? "text-momentum" : "text-destructive"),
                        )}
                      >
                        {signed(c.technicals.ret6m)}
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
              The list is the top 100 coins by market cap plus everything with a rand pair on Luno or VALR. Stablecoins,
              wrapped and staked copies are left out because they track another asset. Each coin is ranked against the rest
              on every measure, so 80 means it beats most of its peers — not that it will go up. The agent refreshes once a
              day.
            </p>
            {prevDate && <p className="mt-2">Coins marked New weren’t on the shortlist on {longDate(prevDate)}.</p>}
          </div>
          <div>
            <h2 className="text-foreground font-semibold">Before you buy anything</h2>
            <p className="mt-2 max-w-prose">
              Crypto can halve in weeks, and a high score here is no protection. Kgetha ranks public price and supply data
              mechanically; it isn’t financial advice and doesn’t know your circumstances. Only put in what you can afford
              to lose, and check the project itself before acting on a ranking.
            </p>
            {snapshot.excluded.length > 0 && (
              <Collapsible className="mt-3">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="group -ml-3">
                    {snapshot.excluded.length} coins left out
                    <ChevronDown className="transition-transform group-data-[state=open]:rotate-180" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ul className="mt-2 space-y-1">
                    {snapshot.excluded.map((e) => (
                      <li key={e.id}>
                        <strong className="text-foreground">{e.symbol}</strong>: {e.reason}
                      </li>
                    ))}
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </footer>
      </main>

      <CoinSheet coin={current} total={ranked.length} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
