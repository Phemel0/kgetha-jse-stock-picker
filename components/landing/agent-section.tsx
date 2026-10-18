"use client";

import { useEffect, useState } from "react";
import { Eyebrow, useInView, type LandingData } from "./shared";

function buildSteps(data: LandingData) {
  const date = data.priceDate ?? "today";
  const n = data.universe.reduce((a, g) => a + g.count, 0);
  const top3 = data.top.slice(0, 3);
  return [
    {
      number: "I",
      title: "Collect",
      description:
        "After the JSE closes, the agent pulls valuation multiples, returns, debt and two years of prices for each share from roic.ai, paced to fit the free plan.",
      file: "npm run agent",
      code: `$ npm run agent
Exchange: Johannesburg Stock Exchange
Screening ${n} shares
[1/${n}] NPN — Naspers
[2/${n}] PRX — Prosus
[3/${n}] MTN — MTN Group
...`,
    },
    {
      number: "II",
      title: "Score",
      description:
        "Every measure is ranked against the rest of the list, so 80 means better than 80% of peers. Three groups are weighted into one score, and you can change the weights.",
      file: "lib/scoring.ts",
      code: `value     40%  P/E, P/FCF, EV/EBITDA, P/B
quality   25%  ROE, ROIC, margin, debt
momentum  35%  12-1m, 6m, vs 200-day

score = weighted percentile, 0–100`,
    },
    {
      number: "III",
      title: "Publish",
      description:
        "The shortlist is committed to GitHub and the site redeploys with fresh picks. If a run fails, yesterday’s picks stay up and the site warns you.",
      file: "data/snapshot.json",
      code: `Shortlist for ${date}${data.isDemo ? "  (demo)" : ""}
${top3.map((s) => `  ${s.rank}. ${s.code.padEnd(5)} ${s.score.toFixed(1)}`).join("\n")}

✓ snapshot committed
✓ site redeployed`,
    },
  ];
}

export function AgentSection({ data }: { data: LandingData }) {
  const steps = buildSteps(data);
  const [activeStep, setActiveStep] = useState(0);
  const [ref, isVisible] = useInView<HTMLElement>(0.1);

  useEffect(() => {
    const interval = setInterval(() => setActiveStep((prev) => (prev + 1) % steps.length), 5000);
    return () => clearInterval(interval);
  }, [steps.length, activeStep]);

  const step = steps[activeStep];

  return (
    <section id="agent" ref={ref} className="bg-foreground text-background relative scroll-mt-24 overflow-hidden py-24 lg:py-32">
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "repeating-linear-gradient(-45deg, transparent, transparent 40px, currentColor 40px, currentColor 41px)",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-[1400px] px-6 lg:px-12">
        <div className="mb-16 lg:mb-24">
          <Eyebrow tone="dark">The agent</Eyebrow>
          <h2
            className={`font-display text-4xl tracking-tight transition-all duration-700 lg:text-6xl ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            Three steps.
            <br />
            <span className="text-background/50">Every trading day.</span>
          </h2>
        </div>

        <div className="grid gap-16 lg:grid-cols-2 lg:gap-24">
          <div className="min-w-0">
            {steps.map((s, index) => (
              <button
                key={s.number}
                type="button"
                onClick={() => setActiveStep(index)}
                aria-pressed={activeStep === index}
                className={`border-background/10 group w-full border-b py-8 text-left transition-all duration-500 ${
                  activeStep === index ? "opacity-100" : "opacity-40 hover:opacity-70"
                }`}
              >
                <div className="flex items-start gap-6">
                  <span className="font-display text-background/30 text-3xl">{s.number}</span>
                  <div className="flex-1">
                    <h3 className="font-display mb-3 text-2xl transition-transform duration-300 group-hover:translate-x-2 lg:text-3xl">
                      {s.title}
                    </h3>
                    <p className="text-background/60 leading-relaxed">{s.description}</p>
                    {activeStep === index && (
                      <div className="bg-background/20 mt-4 h-px overflow-hidden">
                        <div key={activeStep} className="bg-background step-progress h-full w-0" />
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="min-w-0 self-start lg:sticky lg:top-32">
            <div className="border-background/10 overflow-hidden border">
              <div className="border-background/10 flex items-center justify-between border-b px-6 py-4">
                <div className="flex gap-2" aria-hidden>
                  <div className="bg-background/20 h-3 w-3 rounded-full" />
                  <div className="bg-background/20 h-3 w-3 rounded-full" />
                  <div className="bg-background/20 h-3 w-3 rounded-full" />
                </div>
                <span className="text-background/40 font-mono text-xs">{step.file}</span>
              </div>

              <div className="min-h-[280px] overflow-x-auto p-6 font-mono text-sm sm:p-8">
                <pre className="text-background/70" aria-label={step.code}>
                  {step.code.split("\n").map((line, lineIndex) => (
                    <div key={`${activeStep}-${lineIndex}`} className="code-line-reveal leading-loose" style={{ animationDelay: `${lineIndex * 80}ms` }}>
                      <span className="text-background/20 inline-block w-8 select-none">{lineIndex + 1}</span>
                      <span className="inline-flex">
                        {line.split("").map((char, charIndex) => (
                          <span
                            key={`${activeStep}-${lineIndex}-${charIndex}`}
                            className="code-char-reveal"
                            style={{ animationDelay: `${lineIndex * 80 + charIndex * 15}ms` }}
                          >
                            {char === " " ? " " : char}
                          </span>
                        ))}
                      </span>
                    </div>
                  ))}
                </pre>
              </div>

              <div className="border-background/10 flex items-center gap-3 border-t px-6 py-4">
                <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
                <span className="text-background/40 font-mono text-xs">Runs weekdays at 17:40 SAST</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
