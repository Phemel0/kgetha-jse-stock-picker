"use client";

import { Eyebrow, useInView } from "./shared";

const lenses = [
  {
    number: "01",
    title: "Value",
    question: "Is it cheap?",
    description:
      "P/E, price to free cash flow, EV/EBITDA and price to book, adjusted to today’s price. A loss-making company ranks last on valuation, not first.",
    visual: "value",
    color: "var(--value)",
  },
  {
    number: "02",
    title: "Quality",
    question: "Is it a good business?",
    description:
      "Return on equity and on invested capital, operating margin, and net debt against EBITDA. It stops the value screen from favouring broken companies.",
    visual: "quality",
    color: "var(--quality)",
  },
  {
    number: "03",
    title: "Momentum",
    question: "Is the market agreeing?",
    description:
      "The 12-month return excluding the last month, the 6-month return, and where the price sits against its 200-day average.",
    visual: "momentum",
    color: "var(--momentum)",
  },
  {
    number: "04",
    title: "Reasons with every pick",
    question: "Why this one?",
    description:
      "Each share lists the measures that put it on the list and the risks to check first: losses, heavy debt, a broken trend or stale financials.",
    visual: "reasons",
    color: "currentColor",
  },
];

/** Cheapness: bars shrinking toward the cheapest. */
function ValueVisual() {
  return (
    <svg viewBox="0 0 200 160" className="h-full w-full" aria-hidden>
      <defs>
        <clipPath id="valueClip">
          <rect x="30" y="20" width="140" height="120" rx="4" />
        </clipPath>
      </defs>
      <rect x="30" y="20" width="140" height="120" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
      <g clipPath="url(#valueClip)">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={i} x="40" y={35 + i * 16} width="120" height="10" rx="2" fill="currentColor" opacity="0.15">
            <animate attributeName="opacity" values="0.15;0.8;0.15" dur="2s" begin={`${i * 0.15}s`} repeatCount="indefinite" />
            <animate attributeName="width" values="120;20;120" dur="2s" begin={`${i * 0.15}s`} repeatCount="indefinite" />
          </rect>
        ))}
      </g>
    </svg>
  );
}

/** Quality: a shield filling up. */
function QualityVisual() {
  return (
    <svg viewBox="0 0 200 160" className="h-full w-full" aria-hidden>
      <path d="M 100 20 L 150 40 L 150 90 Q 150 130 100 145 Q 50 130 50 90 L 50 40 Z" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M 100 35 L 135 50 L 135 85 Q 135 115 100 128 Q 65 115 65 85 L 65 50 Z" fill="currentColor" opacity="0.1">
        <animate attributeName="opacity" values="0.1;0.25;0.1" dur="2s" repeatCount="indefinite" />
      </path>
      <path d="M 82 84 L 95 97 L 120 70" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="60" y1="60" x2="140" y2="60" stroke="currentColor" strokeWidth="1" opacity="0">
        <animate attributeName="y1" values="40;120;40" dur="3s" repeatCount="indefinite" />
        <animate attributeName="y2" values="40;120;40" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0;0.5;0" dur="3s" repeatCount="indefinite" />
      </line>
    </svg>
  );
}

/** Momentum: a price line drawing itself above its moving average. */
function MomentumVisual() {
  const price = "M 25 120 L 45 112 L 60 116 L 78 98 L 95 102 L 112 84 L 128 88 L 145 66 L 160 70 L 178 44";
  return (
    <svg viewBox="0 0 200 160" className="h-full w-full" aria-hidden>
      <line x1="25" y1="140" x2="180" y2="140" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <path d="M 25 128 Q 100 112 178 76" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.4" />
      <path d={price} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeDasharray="260" strokeDashoffset="260">
        <animate attributeName="stroke-dashoffset" values="260;0;0;260" keyTimes="0;0.5;0.85;1" dur="4s" repeatCount="indefinite" />
      </path>
      <circle cx="178" cy="44" r="4" fill="currentColor">
        <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.45;0.5;0.85;1" dur="4s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/** Reasons: a checklist with one warning. */
function ReasonsVisual() {
  return (
    <svg viewBox="0 0 200 160" className="h-full w-full" aria-hidden>
      {[0, 1, 2].map((i) => (
        <g key={i} opacity="0.2">
          <animate attributeName="opacity" values="0.2;1;1;0.2" keyTimes="0;0.15;0.85;1" dur="3s" begin={`${i * 0.4}s`} repeatCount="indefinite" />
          <circle cx="50" cy={40 + i * 32} r="9" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d={`M 45 ${40 + i * 32} L 49 ${44 + i * 32} L 56 ${36 + i * 32}`} fill="none" stroke="currentColor" strokeWidth="2" />
          <rect x="70" y={36 + i * 32} width={90 - i * 15} height="8" rx="2" fill="currentColor" opacity="0.3" />
        </g>
      ))}
      <g opacity="0.2">
        <animate attributeName="opacity" values="0.2;1;1;0.2" keyTimes="0;0.15;0.85;1" dur="3s" begin="1.2s" repeatCount="indefinite" />
        <path d="M 50 126 L 60 144 L 40 144 Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <rect x="70" y="132" width="55" height="8" rx="2" fill="currentColor" opacity="0.3" />
      </g>
    </svg>
  );
}

const visuals: Record<string, () => React.ReactElement> = {
  value: ValueVisual,
  quality: QualityVisual,
  momentum: MomentumVisual,
  reasons: ReasonsVisual,
};

function LensRow({ lens, index }: { lens: (typeof lenses)[number]; index: number }) {
  const [ref, isVisible] = useInView<HTMLDivElement>(0.2);
  const Visual = visuals[lens.visual];
  return (
    <div
      ref={ref}
      className={`group relative transition-all duration-700 ${isVisible ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"}`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      <div className="border-foreground/10 flex flex-col gap-8 border-b py-12 lg:flex-row lg:gap-16 lg:py-20">
        <div className="shrink-0">
          <span className="text-muted-foreground font-mono text-sm">{lens.number}</span>
        </div>
        <div className="grid flex-1 items-center gap-8 lg:grid-cols-2">
          <div>
            <p className="mb-2 font-mono text-sm" style={{ color: lens.color }}>
              {lens.question}
            </p>
            <h3 className="font-display mb-4 text-3xl transition-transform duration-500 group-hover:translate-x-2 lg:text-4xl">
              {lens.title}
            </h3>
            <p className="text-muted-foreground text-lg leading-relaxed">{lens.description}</p>
          </div>
          <div className="flex justify-center lg:justify-end">
            <div className="h-40 w-48" style={{ color: lens.color }}>
              <Visual />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ScoringSection() {
  const [ref, isVisible] = useInView<HTMLElement>(0.1);
  return (
    <section id="scoring" ref={ref} className="relative scroll-mt-24 py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <div className="mb-16 lg:mb-24">
          <Eyebrow>The score</Eyebrow>
          <h2
            className={`font-display text-4xl tracking-tight transition-all duration-700 lg:text-6xl ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            Three ways to judge a share.
            <br />
            <span className="text-muted-foreground">One number out of 100.</span>
          </h2>
        </div>
        <div>
          {lenses.map((lens, index) => (
            <LensRow key={lens.number} lens={lens} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
