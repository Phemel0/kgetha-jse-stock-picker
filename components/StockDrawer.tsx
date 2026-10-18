"use client";

import { useEffect, useRef } from "react";
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

export default function StockDrawer({ stock: s, total, onClose }: { stock: ScoredStock; total: number; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, s.code]);

  const t = s.technicals;
  const watchOuts = s.flags;

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
      <button className="absolute inset-0 bg-ink/30" aria-label="Close details" onClick={onClose} tabIndex={-1} />
      <div className="drawer-in relative h-full w-full max-w-lg overflow-y-auto bg-surface shadow-[-12px_0_32px_-16px_rgba(19,38,31,0.35)]">
        <div className="sticky top-0 flex items-center justify-between border-b border-rule bg-surface px-5 py-3">
          <p className="text-sm text-muted">
            Ranked {s.rank} of {total}
          </p>
          <button ref={closeRef} onClick={onClose} className="rounded px-2 py-1 text-sm hover:bg-rule/50">
            Close
          </button>
        </div>

        <div className="px-5 py-6">
          <div className="flex items-end justify-between gap-4">
            <h2 id="drawer-title" className="code-display text-7xl">
              {s.code}
            </h2>
            <div className="text-right">
              <p className="text-4xl font-semibold tabular-nums">{s.score.toFixed(0)}</p>
              <p className="text-xs text-muted">score out of 100</p>
            </div>
          </div>
          <p className="mt-2 font-medium">{s.name}</p>
          <div className="mt-4">
            <ContributionBar stock={s} height={10} />
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              {GROUPS.map((g) => (
                <span key={g} className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: groupColor[g] }} />
                  {GROUP_LABEL[g]} adds {s.contribution[g].toFixed(0)}
                </span>
              ))}
            </div>
          </div>

          <p className="mt-6 text-lg leading-snug">{s.thesis}</p>

          <div className="mt-6 rounded border border-rule bg-paper p-4">
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-semibold tabular-nums">{rand(s.price)}</p>
              <p className="text-sm text-muted">{s.priceDate ? longDate(s.priceDate) : ""}</p>
            </div>
            <div className="mt-3">
              <Sparkline values={s.weekly} />
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
              <div>
                <dt className="text-muted">1 month</dt>
                <dd className="tabular-nums">{signed(t.ret1m)}</dd>
              </div>
              <div>
                <dt className="text-muted">Off 52-week high</dt>
                <dd className="tabular-nums">{t.offHigh52w === null ? "—" : `${t.offHigh52w.toFixed(1)}%`}</dd>
              </div>
              <div>
                <dt className="text-muted">RSI (14 days)</dt>
                <dd className="tabular-nums">{t.rsi14 ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted">50 vs 200-day</dt>
                <dd className="tabular-nums">{signed(t.sma50vs200)}</dd>
              </div>
              <div>
                <dt className="text-muted">Volatility</dt>
                <dd className="tabular-nums">{t.vol1y === null ? "—" : `${t.vol1y}% a year`}</dd>
              </div>
            </dl>
          </div>

          {s.strengths.length > 0 && (
            <section className="mt-6">
              <h3 className="font-semibold">Why it ranks here</h3>
              <ul className="mt-2 space-y-1.5 text-sm">
                {s.strengths.map((f) => (
                  <li key={f.text} className="flex gap-2">
                    <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-momentum" />
                    {f.text}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {watchOuts.length > 0 && (
            <section className="mt-6">
              <h3 className="font-semibold">Check before you go further</h3>
              <ul className="mt-2 space-y-1.5 text-sm">
                {watchOuts.map((f) => (
                  <li key={f.text} className="flex gap-2">
                    <span aria-hidden className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${f.tone === "bad" ? "bg-bad" : "bg-warn"}`} />
                    {f.text}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-8">
            <h3 className="font-semibold">Every measure</h3>
            <p className="mt-1 text-sm text-muted">The bar shows where it sits in the list: further right is better.</p>
            {GROUPS.map((g) => (
              <div key={g} className="mt-4">
                <div className="flex items-baseline justify-between border-b border-rule pb-1">
                  <h4 className="text-sm font-semibold" style={{ color: groupColor[g] }}>
                    {GROUP_LABEL[g]}
                  </h4>
                  <span className="text-sm tabular-nums text-muted">
                    {s.groups[g] === null ? "no data" : `${Math.round(s.groups[g]!)} overall`}
                  </span>
                </div>
                <table className="mt-1 w-full text-sm">
                  <tbody>
                    {s.factors
                      .filter((f) => f.group === g)
                      .map((f) => (
                        <tr key={f.key}>
                          <th scope="row" className="py-1.5 pr-3 text-left font-normal">
                            {f.label}
                          </th>
                          <td className="w-20 py-1.5 pr-3 text-right tabular-nums">{rawValue(f)}</td>
                          <td className="w-32 py-1.5">
                            <PctBar pct={f.pct} group={g} />
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ))}
            <p className="mt-3 text-xs text-muted">
              Financials from the {s.fundamentals.periodType === "annual" ? "latest annual" : "trailing 12-month"} period
              {s.fundamentals.periodEnd ? ` ending ${longDate(s.fundamentals.periodEnd)}` : ""}. Valuation multiples are
              adjusted to the latest price.
            </p>
          </section>

          {s.notes.length > 0 && (
            <ul className="mt-6 space-y-1 text-xs text-muted">
              {s.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
