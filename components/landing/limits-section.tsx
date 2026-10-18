"use client";

import { FileSearch, FlaskConical, Scale, TriangleAlert } from "lucide-react";
import { Eyebrow, useInView } from "./shared";

const points = [
  {
    icon: Scale,
    title: "Relative, not absolute",
    description: "Scores rank shares against each other. In a falling market, the top pick can still fall.",
  },
  {
    icon: TriangleAlert,
    title: "Risks are flagged",
    description: "Every share lists what to check before going further, from losses to stale financials.",
  },
  {
    icon: FlaskConical,
    title: "Demo data is labelled",
    description: "Until the agent runs with a real data key, the site says so on every page.",
  },
  {
    icon: FileSearch,
    title: "Check the source",
    description: "Read the company’s latest results and SENS announcements before acting on a ranking.",
  },
];

const flags = ["Loss-making", "Net debt over 3× EBITDA", "Below 200-day average", "RSI over 75 or under 25", "High volatility", "Stale financials"];

export function LimitsSection() {
  const [ref, isVisible] = useInView<HTMLElement>(0.1);
  return (
    <section id="limits" ref={ref} className="bg-foreground/[0.02] relative scroll-mt-24 overflow-hidden py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <div className="grid gap-16 lg:grid-cols-2 lg:gap-24">
          <div className={`transition-all duration-700 ${isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
            <Eyebrow>Read this first</Eyebrow>
            <h2 className="font-display mb-8 text-4xl tracking-tight lg:text-6xl">
              A screen,
              <br />
              not advice.
            </h2>
            <p className="text-muted-foreground mb-12 text-xl leading-relaxed">
              Kgetha ranks shares mechanically from public data. A high score means a share beats its peers on these measures
              today, not that its price will rise. It doesn’t know your circumstances.
            </p>

            <p className="text-muted-foreground mb-4 font-mono text-sm">Flags it raises</p>
            <div className="flex flex-wrap gap-3">
              {flags.map((flag, index) => (
                <span
                  key={flag}
                  className={`border-foreground/10 border px-4 py-2 font-mono text-sm transition-all duration-500 ${
                    isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                  }`}
                  style={{ transitionDelay: `${index * 50 + 200}ms` }}
                >
                  {flag}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-6">
            {points.map((p, index) => (
              <div
                key={p.title}
                className={`border-foreground/10 hover:border-foreground/20 group border p-6 transition-all duration-500 ${
                  isVisible ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0"
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start gap-4">
                  <div className="border-foreground/10 group-hover:bg-foreground group-hover:text-background flex h-10 w-10 shrink-0 items-center justify-center border transition-colors duration-300">
                    <p.icon className="h-5 w-5" aria-hidden />
                  </div>
                  <div>
                    <h3 className="mb-1 text-lg font-medium transition-transform duration-300 group-hover:translate-x-1">{p.title}</h3>
                    <p className="text-muted-foreground">{p.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
