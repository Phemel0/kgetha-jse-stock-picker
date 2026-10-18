"use client";

import { useEffect, useMemo, useState } from "react";
import type { PicksLog } from "@/app/page";
import { longDate, rand, signed } from "@/lib/format";
import { DEFAULT_FILTERS, DEFAULT_WEIGHTS, GROUPS, GROUP_LABEL, scoreUniverse } from "@/lib/scoring";
import type { Filters, Snapshot, Weights } from "@/lib/types";
import { ContributionBar, groupColor } from "./bits";
import StockDrawer from "./StockDrawer";

const PRESETS: { label: string; weights: Weights }[] = [
  { label: "Balanced", weights: DEFAULT_WEIGHTS },
  { label: "Value first", weights: { value: 60, quality: 30, momentum: 10 } },
  { label: "Momentum first", weights: { value: 15, quality: 15, momentum: 70 } },
];

const SHORTLIST = 5;

export default function Picker({ snapshot, log }: { snapshot: Snapshot; log: PicksLog }) {
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [openCode, setOpenCode] = useState<string | null>(null);

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

  const ranked = useMemo(() => scoreUniverse(snapshot.stocks, weights, filters), [snapshot, weights, filters]);
  const visible = ranked.filter((s) => s.passesFilters);
  const shortlist = visible.slice(0, SHORTLIST);
  const open = ranked.find((s) => s.code === openCode) ?? null;

  const prevPicks = log.length > 1 ? new Set(log.at(-2)!.picks.map((p) => p.code)) : null;
  const prevDate = log.length > 1 ? log.at(-2)!.date : null;
  const isDemo = snapshot.source === "demo";
  const total = GROUPS.reduce((a, g) => a + weights[g], 0) || 1;
  const priceDate = snapshot.stocks.map((s) => s.priceDate).filter(Boolean).sort().at(-1);
  // Computed after mount: the page is pre-rendered, so "now" must be the viewer's clock, not the build's.
  const [ageDays, setAgeDays] = useState(0);
  useEffect(() => {
    setAgeDays(Math.floor((Date.now() - new Date(snapshot.generatedAt).getTime()) / 86_400_000));
  }, [snapshot.generatedAt]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-rule">
        <div className="mx-auto flex max-w-7xl flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-4 py-4 sm:px-6">
          <div className="flex items-baseline gap-3">
            <span className="code-display text-2xl">Kgetha</span>
            <span className="text-muted">JSE stock picker</span>
          </div>
          <p className="text-sm text-muted">
            {isDemo ? "Demo data" : `Prices to ${priceDate ? longDate(priceDate) : "—"}, from roic.ai`}
          </p>
        </div>
      </header>

      {!isDemo && ageDays > 4 && (
        <div className="border-b border-bad/40 bg-bad/10">
          <p className="mx-auto max-w-7xl px-4 py-3 text-sm sm:px-6">
            This data is {ageDays} days old. The agent may have stopped running — check the latest run under Actions in your
            GitHub repo.
          </p>
        </div>
      )}

      {isDemo && (
        <div className="border-b border-warn/40 bg-warn/10">
          <p className="mx-auto max-w-7xl px-4 py-3 text-sm sm:px-6">
            <strong className="font-semibold">You’re looking at invented companies with simulated prices.</strong> Add a roic.ai
            key and run the agent to screen real JSE shares — the README walks through it.
          </p>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Shortlist */}
        <section aria-labelledby="shortlist" className="py-8 sm:py-10">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h1 id="shortlist" className="text-xl font-semibold">
              Shortlist
            </h1>
            <p className="text-sm text-muted">
              Top {shortlist.length} of {visible.length} shares on your current mix
            </p>
          </div>

          {shortlist.length === 0 ? (
            <p className="mt-6 text-muted">No shares pass your filters. Loosen a filter on the left to see the ranking.</p>
          ) : (
            <ol className="mt-5 grid gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-5">
              {shortlist.map((s) => (
                <li key={s.code}>
                  <button
                    onClick={() => setOpenCode(s.code)}
                    className="group block w-full text-left"
                    aria-label={`${s.code}, ${s.name}, rank ${s.rank}, score ${s.score.toFixed(0)}. Open details.`}
                  >
                    <span className="code-display block text-[clamp(3rem,4.4vw,4.5rem)] group-hover:underline group-hover:decoration-2 group-hover:underline-offset-4">
                      {s.code}
                    </span>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1">
                        <ContributionBar stock={s} />
                      </div>
                      <span className="text-xl font-semibold tabular-nums">{s.score.toFixed(0)}</span>
                    </div>
                    <p className="mt-2 truncate text-sm font-medium">
                      {s.name}
                      {prevPicks && !prevPicks.has(s.code) && (
                        <span className="ml-2 rounded-sm bg-momentum/15 px-1.5 py-0.5 text-xs font-semibold text-momentum">
                          New
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-sm leading-snug text-muted">{s.thesis}</p>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>

        <div className="grid gap-8 border-t border-rule py-8 lg:grid-cols-[17rem_1fr] lg:gap-10">
          {/* Controls */}
          <aside className="min-w-0 lg:sticky lg:top-6 lg:self-start" aria-label="Scoring controls">
            <h2 className="font-semibold">Your mix</h2>
            <p className="mt-1 text-sm text-muted">How much each kind of evidence counts toward the score.</p>

            <div className="mt-4 flex h-2 overflow-hidden rounded-[2px]" aria-hidden>
              {GROUPS.map((g) => (
                <div key={g} style={{ width: `${(weights[g] / total) * 100}%`, background: groupColor[g] }} />
              ))}
            </div>

            <div className="mt-4 space-y-4">
              {GROUPS.map((g) => (
                <label key={g} className="block">
                  <span className="flex justify-between text-sm">
                    <span className="font-medium" style={{ color: groupColor[g] }}>
                      {GROUP_LABEL[g]}
                    </span>
                    <span className="tabular-nums text-muted">{Math.round((weights[g] / total) * 100)}%</span>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={weights[g]}
                    onChange={(e) => setWeights({ ...weights, [g]: Number(e.target.value) })}
                    className="mt-1 w-full"
                    style={{ color: groupColor[g] }}
                  />
                  <span className="text-xs text-muted">
                    {g === "value" && "P/E, free-cash-flow, EV/EBITDA and book multiples"}
                    {g === "quality" && "Returns on equity and capital, margins, debt"}
                    {g === "momentum" && "6- and 12-month returns, position vs 200-day average"}
                  </span>
                </label>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {PRESETS.map((p) => {
                const active = GROUPS.every((g) => p.weights[g] === weights[g]);
                return (
                  <button
                    key={p.label}
                    onClick={() => setWeights(p.weights)}
                    aria-pressed={active}
                    className={`rounded-full border px-3 py-1 text-sm ${active ? "border-ink bg-ink text-paper" : "border-rule hover:border-ink"}`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            <h2 className="mt-8 font-semibold">Filters</h2>
            <div className="mt-3 space-y-3 text-sm">
              <label className="flex gap-2">
                <input
                  type="checkbox"
                  checked={filters.profitableOnly}
                  onChange={(e) => setFilters({ ...filters, profitableOnly: e.target.checked })}
                  className="mt-0.5"
                />
                Profitable companies only
              </label>
              <label className="flex gap-2">
                <input
                  type="checkbox"
                  checked={filters.uptrendOnly}
                  onChange={(e) => setFilters({ ...filters, uptrendOnly: e.target.checked })}
                  className="mt-0.5"
                />
                Only shares above their 200-day average
              </label>
              <label className="block">
                <span>Maximum net debt</span>
                <select
                  value={filters.maxNetDebtEbitda ?? ""}
                  onChange={(e) => setFilters({ ...filters, maxNetDebtEbitda: e.target.value === "" ? null : Number(e.target.value) })}
                  className="mt-1 block w-full rounded border border-rule bg-surface px-2 py-1.5"
                >
                  <option value="">Any amount</option>
                  <option value="3">Up to 3× EBITDA</option>
                  <option value="2">Up to 2× EBITDA</option>
                  <option value="1">Up to 1× EBITDA</option>
                </select>
              </label>
            </div>
            <p className="mt-3 text-sm text-muted">
              Showing {visible.length} of {ranked.length}. Filters hide shares; they don’t change anyone’s score.
            </p>
          </aside>

          {/* Ranking */}
          <section aria-labelledby="ranking" className="min-w-0">
            <h2 id="ranking" className="font-semibold">
              Full ranking
            </h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[36rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-rule text-left text-muted">
                    <th scope="col" className="w-10 py-2 pr-2 font-normal">
                      #
                    </th>
                    <th scope="col" className="py-2 pr-4 font-normal">
                      Share
                    </th>
                    <th scope="col" className="w-48 py-2 pr-4 font-normal">
                      Score
                    </th>
                    {GROUPS.map((g) => (
                      <th key={g} scope="col" className="hidden py-2 pr-4 text-right font-normal md:table-cell">
                        {GROUP_LABEL[g]}
                      </th>
                    ))}
                    <th scope="col" className="py-2 pr-4 text-right font-normal">
                      Price
                    </th>
                    <th scope="col" className="py-2 text-right font-normal">
                      6 months
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((s) => (
                    <tr
                      key={s.code}
                      onClick={() => setOpenCode(s.code)}
                      className={`cursor-pointer border-b border-rule/70 hover:bg-surface ${openCode === s.code ? "bg-surface" : ""}`}
                    >
                      <td className="py-2.5 pr-2 tabular-nums text-muted">{s.rank}</td>
                      <td className="py-2.5 pr-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenCode(s.code);
                          }}
                          className="text-left"
                        >
                          <span className="font-bold" style={{ fontStretch: "115%" }}>
                            {s.code}
                          </span>
                          <span className="ml-2 text-muted">{s.name}</span>
                        </button>
                      </td>
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center gap-3">
                          <span className="w-7 text-right font-semibold tabular-nums">{s.score.toFixed(0)}</span>
                          <div className="flex-1">
                            <ContributionBar stock={s} height={6} />
                          </div>
                        </div>
                      </td>
                      {GROUPS.map((g) => (
                        <td key={g} className="hidden py-2.5 pr-4 text-right tabular-nums md:table-cell">
                          {s.groups[g] === null ? <span className="text-muted">—</span> : Math.round(s.groups[g]!)}
                        </td>
                      ))}
                      <td className="py-2.5 pr-4 text-right tabular-nums">{rand(s.price)}</td>
                      <td
                        className="py-2.5 text-right tabular-nums"
                        style={{ color: s.technicals.ret6m === null ? undefined : s.technicals.ret6m >= 0 ? "var(--momentum)" : "var(--bad)" }}
                      >
                        {signed(s.technicals.ret6m)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted">
              Value, Quality and Momentum columns are percentiles: 80 means better than 80% of the list on that measure.
            </p>
          </section>
        </div>

        <footer className="grid gap-6 border-t border-rule py-8 text-sm text-muted md:grid-cols-2">
          <div>
            <h2 className="font-semibold text-ink">How the score works</h2>
            <p className="mt-2 max-w-prose">
              Each share is ranked against the rest of the list on every measure, so a score of 80 means it beats most of
              its peers — not that it will go up. Loss-making companies rank last on valuation, and shares missing a whole
              group of data are marked down. The agent refreshes the data once a trading day.
            </p>
            {prevDate && <p className="mt-2">Shares marked New weren’t on the shortlist on {longDate(prevDate)}.</p>}
          </div>
          <div>
            <h2 className="font-semibold text-ink">Before you buy anything</h2>
            <p className="mt-2 max-w-prose">
              Kgetha screens public data mechanically. It isn’t financial advice and doesn’t know your circumstances. Read the
              company’s latest results and SENS announcements before acting on a ranking.
            </p>
            {snapshot.skipped.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer">{snapshot.skipped.length} shares couldn’t be scored</summary>
                <ul className="mt-2 space-y-1">
                  {snapshot.skipped.map((s) => (
                    <li key={s.code}>
                      <strong className="text-ink">{s.code}</strong>: {s.reason}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        </footer>
      </main>

      {open && <StockDrawer stock={open} total={ranked.length} onClose={() => setOpenCode(null)} />}
    </div>
  );
}
