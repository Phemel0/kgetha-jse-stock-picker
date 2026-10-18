import Link from "next/link";
import { UNIVERSE_GROUPS } from "@/agent/universe";
import { AgentSection } from "@/components/landing/agent-section";
import { CtaSection } from "@/components/landing/cta-section";
import { FooterSection } from "@/components/landing/footer-section";
import { HeroSection } from "@/components/landing/hero-section";
import { LimitsSection } from "@/components/landing/limits-section";
import { Navigation } from "@/components/landing/navigation";
import { PulseSection } from "@/components/landing/pulse-section";
import { RunSection } from "@/components/landing/run-section";
import { ScoringSection } from "@/components/landing/scoring-section";
import type { LandingData } from "@/components/landing/shared";
import { ShortlistSection } from "@/components/landing/shortlist-section";
import { StackSection } from "@/components/landing/stack-section";
import { UniverseSection } from "@/components/landing/universe-section";
import { latestPriceDate, loadSnapshot } from "@/lib/data";
import { FACTORS, scoreUniverse } from "@/lib/scoring";

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export default function Home() {
  const snapshot = loadSnapshot();
  if (!snapshot) {
    return (
      <main className="landing mx-auto max-w-xl px-4 py-24">
        <h1 className="text-2xl font-semibold">No data yet</h1>
        <p className="text-muted-foreground mt-3">
          Run <code>npm run agent</code>, or open the <Link href="/picks">picker</Link>.
        </p>
      </main>
    );
  }

  // Scored with the default weights, exactly as the picker opens.
  const ranked = scoreUniverse(snapshot.stocks);
  const stocks = snapshot.stocks;

  const data: LandingData = {
    isDemo: snapshot.source === "demo",
    priceDate: latestPriceDate(snapshot),
    total: stocks.length,
    aboveTrend: stocks.filter((s) => s.technicals.vs200d !== null && s.technicals.vs200d > 0).length,
    profitable: stocks.filter((s) => s.fundamentals.pe !== null && s.fundamentals.pe > 0).length,
    medianRet6m: median(stocks.map((s) => s.technicals.ret6m).filter((r): r is number => r !== null)),
    measures: FACTORS.length,
    universe: UNIVERSE_GROUPS.map((g) => ({ sector: g.sector, note: g.note, count: g.codes.length })),
    top: ranked.slice(0, 5).map((s) => ({
      rank: s.rank,
      code: s.code,
      name: s.name,
      score: s.score,
      thesis: s.thesis,
      strengths: s.strengths.slice(0, 2).map((f) => f.text),
      contribution: s.contribution,
    })),
    ranking: ranked.map((s) => ({ code: s.code, score: s.score })),
  };

  return (
    <main className="landing noise-overlay relative min-h-screen overflow-x-hidden">
      <Navigation />
      <HeroSection data={data} />
      <ScoringSection />
      <AgentSection data={data} />
      <UniverseSection data={data} />
      <PulseSection data={data} />
      <StackSection />
      <LimitsSection />
      <ShortlistSection data={data} />
      <RunSection />
      <CtaSection />
      <FooterSection data={data} />
    </main>
  );
}
