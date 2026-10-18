"use client";

import { Eyebrow, useInView } from "./shared";

// The tools Kgetha is actually built on.
const stack = [
  { name: "roic.ai", role: "Market data" },
  { name: "GitHub Actions", role: "Daily schedule" },
  { name: "Vercel", role: "Hosting" },
  { name: "Next.js", role: "Web app" },
  { name: "TypeScript", role: "Agent and site" },
  { name: "shadcn/ui", role: "Components" },
  { name: "Radix UI", role: "Accessible primitives" },
  { name: "Tailwind CSS", role: "Styling" },
  { name: "Vitest", role: "Tests" },
];

function Row({ items, reverse = false }: { items: typeof stack; reverse?: boolean }) {
  return (
    <div className="w-full overflow-hidden" aria-hidden>
      <div className={`flex gap-6 ${reverse ? "marquee-reverse" : "marquee"}`}>
        {[...Array(2)].map((_, setIndex) => (
          <div key={setIndex} className="flex shrink-0 gap-6">
            {items.map((tool) => (
              <div
                key={`${tool.name}-${setIndex}`}
                className="border-foreground/10 hover:border-foreground/30 hover:bg-foreground/[0.02] group shrink-0 border px-8 py-6 transition-all duration-300"
              >
                <div className="text-lg font-medium transition-transform group-hover:translate-x-1">{tool.name}</div>
                <div className="text-muted-foreground text-sm">{tool.role}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function StackSection() {
  const [ref, isVisible] = useInView<HTMLElement>(0.1);
  return (
    <section ref={ref} className="relative overflow-hidden py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <div
          className={`mx-auto mb-16 max-w-3xl text-center transition-all duration-700 lg:mb-24 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <Eyebrow center>Under the hood</Eyebrow>
          <h2 className="font-display mb-6 text-4xl tracking-tight lg:text-6xl">
            No servers.
            <br />
            No subscriptions.
          </h2>
          <p className="text-muted-foreground text-xl">
            Free market data, a scheduled GitHub Action and a Next.js site on Vercel. The free tiers cover a daily run.
          </p>
          {/* Screen readers get the list once instead of the looping marquee. */}
          <ul className="sr-only">
            {stack.map((t) => (
              <li key={t.name}>
                {t.name}: {t.role}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mb-6">
        <Row items={stack} />
      </div>
      <Row items={[...stack].reverse()} reverse />
    </section>
  );
}
