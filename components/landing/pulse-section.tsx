"use client";

import { useEffect, useRef, useState } from "react";
import { Eyebrow, longDate, useInView, type LandingData } from "./shared";

function AnimatedCounter({ end, suffix = "", prefix = "" }: { end: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || done.current) return;
        done.current = true;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          setCount(end);
          return;
        }
        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min((now - start) / 2000, 1);
          setCount(Math.round((1 - Math.pow(1 - progress, 3)) * end));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [end]);

  return (
    <div ref={ref} className="font-display text-6xl tracking-tight lg:text-8xl">
      {prefix}
      {count.toLocaleString("en-ZA")}
      {suffix}
    </div>
  );
}

export function PulseSection({ data }: { data: LandingData }) {
  const [ref, isVisible] = useInView<HTMLElement>(0.1);
  const med = data.medianRet6m;

  const metrics = [
    { end: data.total, label: "Shares scored in the latest run" },
    { end: data.aboveTrend, suffix: ` of ${data.total}`, label: "Trading above their 200-day average" },
    { end: data.profitable, suffix: ` of ${data.total}`, label: "Profitable over the latest period" },
    {
      end: med === null ? 0 : Math.round(Math.abs(med)),
      prefix: med === null ? "" : med >= 0 ? "+" : "−",
      suffix: "%",
      label: "Median 6-month return across the list",
    },
  ];

  return (
    <section ref={ref} className="border-foreground/10 relative border-y py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <div className="mb-16 flex flex-col gap-8 lg:mb-24 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Eyebrow>Across the list</Eyebrow>
            <h2
              className={`font-display text-4xl tracking-tight transition-all duration-700 lg:text-6xl ${
                isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
            >
              Where the market
              <br />
              stands today.
            </h2>
          </div>
          <div className="text-muted-foreground flex items-center gap-4 font-mono text-sm">
            {data.isDemo ? (
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Demo data: invented companies
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                Prices to {data.priceDate ? longDate(data.priceDate) : "—"}
              </span>
            )}
          </div>
        </div>

        <div className="bg-foreground/10 grid grid-cols-1 gap-px md:grid-cols-2">
          {metrics.map((metric, index) => (
            <div
              key={metric.label}
              className={`bg-background p-8 transition-all duration-700 lg:p-12 ${isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <AnimatedCounter end={metric.end} prefix={metric.prefix} suffix={metric.suffix} />
              <div className="text-muted-foreground mt-4 text-lg">{metric.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
