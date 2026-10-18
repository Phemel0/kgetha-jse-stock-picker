"use client";

import { useEffect, useRef, useState } from "react";
import type { FactorGroup } from "@/lib/types";

export const REPO_URL = "https://github.com/Phemel0/kgetha-jse-stock-picker";

/** Everything the landing page shows from the latest agent snapshot, computed on the server. */
export interface LandingData {
  isDemo: boolean;
  priceDate: string | null;
  total: number;
  aboveTrend: number;
  profitable: number;
  medianRet6m: number | null;
  measures: number;
  universe: { sector: string; note: string; count: number }[];
  top: {
    rank: number;
    code: string;
    name: string;
    score: number;
    thesis: string;
    strengths: string[];
    contribution: Record<FactorGroup, number>;
  }[];
  ranking: { code: string; score: number }[];
}

/** Reveals a section once it scrolls into view (fires once). */
export function useInView<T extends Element>(threshold = 0.1) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return [ref, inView] as const;
}

/** Kgetha's wordmark — replaces the Optimus logo. */
export function Wordmark({ size = "md", tag = true }: { size?: "sm" | "md"; tag?: boolean }) {
  return (
    <span className="inline-flex items-baseline gap-2">
      <span className={`code-display tracking-tight transition-all duration-500 ${size === "sm" ? "text-xl" : "text-2xl"}`}>
        Kgetha
      </span>
      {tag && (
        <span className={`text-muted-foreground font-mono transition-all duration-500 ${size === "sm" ? "text-[10px]" : "text-xs"}`}>
          JSE
        </span>
      )}
    </span>
  );
}

/** The thin rule + small mono label above each section heading (Optimus pattern). */
export function Eyebrow({ children, tone = "light", center = false }: { children: React.ReactNode; tone?: "light" | "dark"; center?: boolean }) {
  const rule = tone === "dark" ? "bg-background/30" : "bg-foreground/30";
  return (
    <span
      className={`mb-6 inline-flex items-center gap-3 font-mono text-sm ${tone === "dark" ? "text-background/50" : "text-muted-foreground"}`}
    >
      <span className={`h-px w-8 ${rule}`} />
      {children}
      {center && <span className={`h-px w-8 ${rule}`} />}
    </span>
  );
}

export const factorColor: Record<FactorGroup, string> = {
  value: "var(--value)",
  quality: "var(--quality)",
  momentum: "var(--momentum)",
};

export function longDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
}
