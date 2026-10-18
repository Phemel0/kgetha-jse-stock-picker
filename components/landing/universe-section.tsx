"use client";

import { useEffect, useState } from "react";
import { Eyebrow, useInView, type LandingData } from "./shared";

export function UniverseSection({ data }: { data: LandingData }) {
  const [ref, isVisible] = useInView<HTMLElement>(0.1);
  const [active, setActive] = useState(0);
  const total = data.universe.reduce((a, g) => a + g.count, 0);

  useEffect(() => {
    const interval = setInterval(() => setActive((prev) => (prev + 1) % data.universe.length), 2000);
    return () => clearInterval(interval);
  }, [data.universe.length]);

  return (
    <section id="universe" ref={ref} className="relative scroll-mt-24 overflow-hidden py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <div className="grid items-center gap-16 lg:grid-cols-2 lg:gap-24">
          <div className={`transition-all duration-700 ${isVisible ? "translate-x-0 opacity-100" : "-translate-x-8 opacity-0"}`}>
            <Eyebrow>Coverage</Eyebrow>
            <h2 className="font-display mb-8 text-4xl tracking-tight lg:text-6xl">
              Built for
              <br />
              the JSE.
            </h2>
            <p className="text-muted-foreground mb-12 text-xl leading-relaxed">
              Prices quoted in cents are converted to rand. Companies that report half-yearly fall back to annual figures.
              Valuations are rescaled to today’s price instead of being left at the period end.
            </p>

            <div className="grid grid-cols-3 gap-8">
              <div>
                <div className="font-display mb-2 text-4xl lg:text-5xl">{total}</div>
                <div className="text-muted-foreground text-sm">Shares in the starter list</div>
              </div>
              <div>
                <div className="font-display mb-2 text-4xl lg:text-5xl">{data.universe.length}</div>
                <div className="text-muted-foreground text-sm">Sectors</div>
              </div>
              <div>
                <div className="font-display mb-2 text-4xl lg:text-5xl">~36</div>
                <div className="text-muted-foreground text-sm">Minutes per run on the free plan</div>
              </div>
            </div>
          </div>

          <div className={`transition-all delay-200 duration-700 ${isVisible ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0"}`}>
            <div className="border-foreground/10 border">
              <div className="border-foreground/10 flex items-center justify-between border-b px-6 py-4">
                <span className="text-muted-foreground font-mono text-sm">Starter list</span>
                <span className="text-muted-foreground font-mono text-xs">edit in agent/universe.ts</span>
              </div>
              <ul>
                {data.universe.map((g, index) => (
                  <li
                    key={g.sector}
                    className={`border-foreground/5 flex items-center justify-between border-b px-6 py-5 transition-all duration-300 last:border-b-0 ${
                      active === index ? "bg-foreground/[0.02]" : ""
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span
                        className={`h-2 w-2 rounded-full transition-colors duration-300 ${active === index ? "bg-foreground" : "bg-foreground/20"}`}
                        aria-hidden
                      />
                      <div>
                        <div className="font-medium">{g.sector}</div>
                        <div className="text-muted-foreground text-sm">{g.note}</div>
                      </div>
                    </div>
                    <span className="text-muted-foreground font-mono text-sm">{g.count} shares</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
