"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { FactorGroup } from "@/lib/types";
import { factorColor, type LandingData } from "./shared";

const GROUPS: FactorGroup[] = ["value", "quality", "momentum"];
const LABEL: Record<FactorGroup, string> = { value: "Value", quality: "Quality", momentum: "Momentum" };

/** Today's top picks in the slot Optimus used for testimonials: the "quote" is why the share made the list. */
export function ShortlistSection({ data }: { data: LandingData }) {
  const picks = data.top;
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const goTo = (idx: number) => {
    setIsAnimating(true);
    setTimeout(() => {
      setActiveIndex(idx);
      setIsAnimating(false);
    }, 300);
  };

  useEffect(() => {
    const interval = setInterval(() => goTo((activeIndex + 1) % picks.length), 6000);
    return () => clearInterval(interval);
  }, [activeIndex, picks.length]);

  if (picks.length === 0) return null;
  const pick = picks[activeIndex];

  return (
    <section id="shortlist" className="border-foreground/10 relative scroll-mt-24 border-t py-32 lg:py-40 lg:pb-14">
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        <div className="mb-16 flex items-center gap-4">
          <span className="text-muted-foreground font-mono text-sm">
            Today’s shortlist{data.isDemo ? " (demo data)" : ""}
          </span>
          <div className="bg-foreground/10 h-px flex-1" />
          <span className="text-muted-foreground font-mono text-xs">
            {String(activeIndex + 1).padStart(2, "0")} / {String(picks.length).padStart(2, "0")}
          </span>
        </div>

        <div className="grid gap-12 lg:grid-cols-12 lg:gap-20" aria-live="polite">
          <div className="lg:col-span-8">
            <blockquote className={`transition-all duration-300 ${isAnimating ? "translate-y-4 opacity-0" : "translate-y-0 opacity-100"}`}>
              <p className="font-display text-foreground text-4xl leading-[1.1] tracking-tight md:text-5xl lg:text-6xl">{pick.thesis}</p>
              {pick.strengths.length > 0 && (
                <ul className="text-muted-foreground mt-6 space-y-1">
                  {pick.strengths.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              )}
            </blockquote>

            <div className={`mt-12 flex items-center gap-6 transition-all delay-100 duration-300 ${isAnimating ? "opacity-0" : "opacity-100"}`}>
              <div className="bg-foreground/5 border-foreground/10 flex h-16 w-16 items-center justify-center rounded-full border">
                <span className="code-display text-foreground text-sm">{pick.code}</span>
              </div>
              <div>
                <p className="text-foreground text-lg font-medium">{pick.name}</p>
                <p className="text-muted-foreground">
                  Ranked {pick.rank} of {data.total}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center lg:col-span-4">
            <div
              className={`border-foreground/10 border p-8 transition-all duration-300 ${isAnimating ? "scale-95 opacity-0" : "scale-100 opacity-100"}`}
            >
              <span className="text-muted-foreground mb-4 block font-mono text-xs">Score out of 100</span>
              <p className="font-display text-foreground text-6xl">{pick.score.toFixed(0)}</p>
              <div className="bg-foreground/10 mt-6 flex h-2 overflow-hidden rounded-full" aria-hidden>
                {GROUPS.map((g) => (
                  <div key={g} style={{ width: `${pick.contribution[g]}%`, background: factorColor[g] }} />
                ))}
              </div>
              <ul className="text-muted-foreground mt-3 space-y-1 text-sm">
                {GROUPS.map((g) => (
                  <li key={g} className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: factorColor[g] }} />
                      {LABEL[g]}
                    </span>
                    <span className="tabular-nums">+{pick.contribution[g].toFixed(0)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 flex gap-2">
              {picks.map((p, idx) => (
                <button
                  key={p.code}
                  onClick={() => goTo(idx)}
                  aria-label={`Show ${p.code}, rank ${p.rank}`}
                  aria-current={idx === activeIndex}
                  className={`h-2 transition-all duration-300 ${
                    idx === activeIndex ? "bg-foreground w-8" : "bg-foreground/20 hover:bg-foreground/40 w-2"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="border-foreground/10 mt-24 flex flex-wrap items-center justify-between gap-4 border-t pt-12 pb-8">
          <p className="text-muted-foreground font-mono text-sm">The full ranking</p>
          <Link href="/picks" className="group inline-flex items-center gap-2 text-sm underline-offset-4 hover:underline">
            See all {data.total} in the picker
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>

      <div className="w-full overflow-hidden" aria-hidden>
        <div className="marquee flex items-center gap-16">
          {[...Array(2)].map((_, setIdx) => (
            <div key={setIdx} className="flex shrink-0 items-baseline gap-16">
              {data.ranking.map((r) => (
                <span key={`${setIdx}-${r.code}`} className="text-foreground/30 hover:text-foreground flex items-baseline gap-3 whitespace-nowrap transition-colors duration-300">
                  <span className="code-display text-xl md:text-2xl">{r.code}</span>
                  <span className="font-display text-xl md:text-2xl">{r.score.toFixed(0)}</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
