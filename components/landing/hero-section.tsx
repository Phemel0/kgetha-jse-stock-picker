"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FactorGroup } from "@/lib/types";
import { AnimatedSphere } from "./animated-sphere";
import { factorColor, type LandingData } from "./shared";

const words: FactorGroup[] = ["value", "quality", "momentum"];

export function HeroSection({ data }: { data: LandingData }) {
  const [isVisible, setIsVisible] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => setIsVisible(true), []);

  useEffect(() => {
    const interval = setInterval(() => setWordIndex((prev) => (prev + 1) % words.length), 2500);
    return () => clearInterval(interval);
  }, []);

  const word = words[wordIndex];
  // Facts about Kgetha itself, in place of Optimus's customer stats.
  const stats = [
    { value: String(data.universe.reduce((a, g) => a + g.count, 0)), label: "JSE shares screened", note: "starter list" },
    { value: String(data.measures), label: "measures per share", note: "value, quality, momentum" },
    { value: "17:40", label: "daily refresh", note: "weekdays, SAST" },
    { value: "2 yrs", label: "of daily prices", note: "per share" },
    { value: "Free", label: "data key", note: "roic.ai" },
  ];

  return (
    <section className="relative flex min-h-screen flex-col justify-center overflow-hidden">
      <div className="pointer-events-none absolute top-1/2 right-0 h-[600px] w-[600px] -translate-y-1/2 opacity-40 lg:h-[800px] lg:w-[800px]">
        <AnimatedSphere />
      </div>

      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-30" aria-hidden>
        {[...Array(8)].map((_, i) => (
          <div key={`h-${i}`} className="bg-foreground/10 absolute h-px" style={{ top: `${12.5 * (i + 1)}%`, left: 0, right: 0 }} />
        ))}
        {[...Array(12)].map((_, i) => (
          <div key={`v-${i}`} className="bg-foreground/10 absolute w-px" style={{ left: `${8.33 * (i + 1)}%`, top: 0, bottom: 0 }} />
        ))}
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1400px] px-6 py-32 lg:px-12 lg:py-40">
        <div className={`mb-8 transition-all duration-700 ${isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
          <span className="text-muted-foreground inline-flex items-center gap-3 font-mono text-sm">
            <span className="bg-foreground/30 h-px w-8" />A stock picker for the JSE
          </span>
        </div>

        <div className="mb-12">
          <h1
            aria-label="JSE shares, ranked by value, quality and momentum"
            className={`font-display text-[clamp(3rem,11vw,9.5rem)] leading-[0.9] tracking-tight transition-all duration-1000 ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
            }`}
          >
            <span className="block" aria-hidden>
              JSE shares,
            </span>
            <span className="block" aria-hidden>
              ranked by{" "}
              <span className="relative inline-block">
                <span key={wordIndex} className="inline-flex" style={{ color: factorColor[word] }}>
                  {word.split("").map((char, i) => (
                    <span key={`${wordIndex}-${i}`} className="animate-char-in inline-block" style={{ animationDelay: `${i * 50}ms` }}>
                      {char}
                    </span>
                  ))}
                </span>
                <span
                  className="absolute right-0 -bottom-2 left-0 h-3 opacity-20 transition-colors duration-500"
                  style={{ background: factorColor[word] }}
                />
              </span>
            </span>
          </h1>
        </div>

        <div className="grid items-end gap-12 lg:grid-cols-2 lg:gap-24">
          <p
            className={`text-muted-foreground max-w-xl text-xl leading-relaxed transition-all delay-200 duration-700 lg:text-2xl ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            Kgetha screens the JSE’s largest shares every trading day, scores each one on value, quality and momentum, and
            tells you why it made the list.
          </p>

          <div
            className={`flex flex-col items-start gap-4 transition-all delay-300 duration-700 sm:flex-row ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            <Button asChild size="lg" className="bg-foreground hover:bg-foreground/90 text-background group h-14 rounded-full px-8 text-base">
              <Link href="/picks">
                Open today’s picks
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-foreground/20 hover:bg-foreground/5 h-14 rounded-full bg-transparent px-8 text-base"
            >
              <a href="#scoring">How the score works</a>
            </Button>
          </div>
        </div>
      </div>

      {/* Facts marquee */}
      <div
        className={`absolute right-0 bottom-16 left-0 transition-all delay-500 duration-700 lg:bottom-24 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden
      >
        <div className="marquee flex gap-16 whitespace-nowrap">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex gap-16">
              {stats.map((stat) => (
                <div key={`${stat.label}-${i}`} className="flex items-baseline gap-4">
                  <span className="font-display text-4xl lg:text-5xl">{stat.value}</span>
                  <span className="text-muted-foreground text-sm">
                    {stat.label}
                    <span className="mt-1 block font-mono text-xs">{stat.note}</span>
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
