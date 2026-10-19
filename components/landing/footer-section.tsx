"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AnimatedWave } from "./animated-wave";
import { REPO_URL, Wordmark, longDate, type LandingData } from "./shared";

const columns: { title: string; links: { name: string; href: string; external?: boolean }[] }[] = [
  {
    title: "Kgetha",
    links: [
      { name: "Today’s picks", href: "/picks" },
      { name: "Crypto picks", href: "/crypto" },
      { name: "How the score works", href: "#scoring" },
      { name: "The agent", href: "#agent" },
      { name: "Coverage", href: "#universe" },
    ],
  },
  {
    title: "Project",
    links: [
      { name: "Run it yourself", href: "#run" },
      { name: "Setup guide", href: `${REPO_URL}#readme`, external: true },
      { name: "GitHub", href: REPO_URL, external: true },
    ],
  },
  {
    title: "Data",
    links: [
      { name: "roic.ai", href: "https://www.roic.ai", external: true },
      { name: "CoinGecko", href: "https://www.coingecko.com", external: true },
      { name: "Limits", href: "#limits" },
    ],
  },
];

export function FooterSection({ data }: { data: LandingData }) {
  return (
    <footer className="border-foreground/10 relative border-t">
      <div className="pointer-events-none absolute inset-0 h-64 overflow-hidden opacity-20">
        <AnimatedWave />
      </div>

      <div className="relative z-10 mx-auto max-w-[1400px] px-6 lg:px-12">
        <div className="py-16 lg:py-24">
          <div className="grid grid-cols-2 gap-12 md:grid-cols-5 lg:gap-8">
            <div className="col-span-2">
              <a href="#" className="mb-6 inline-flex" aria-label="Kgetha, back to top">
                <Wordmark />
              </a>
              <p className="text-muted-foreground mb-8 max-w-xs leading-relaxed">
                Ranks JSE shares on value, quality and momentum every trading day, and explains every pick.
              </p>
              <a
                href={REPO_URL}
                className="text-muted-foreground hover:text-foreground group flex w-fit items-center gap-1 text-sm transition-colors"
              >
                GitHub
                <ArrowUpRight className="h-3 w-3 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
              </a>
            </div>

            {columns.map((col) => (
              <div key={col.title}>
                <h3 className="mb-6 text-sm font-medium">{col.title}</h3>
                <ul className="space-y-4">
                  {col.links.map((link) => (
                    <li key={link.name}>
                      {link.href.startsWith("/") ? (
                        <Link href={link.href} className="text-muted-foreground hover:text-foreground text-sm transition-colors">
                          {link.name}
                        </Link>
                      ) : (
                        <a
                          href={link.href}
                          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
                        >
                          {link.name}
                          {link.external && <ArrowUpRight className="h-3 w-3" aria-hidden />}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="border-foreground/10 flex flex-col items-center justify-between gap-4 border-t py-8 md:flex-row">
          <p className="text-muted-foreground text-sm">© 2026 Kgetha. Not financial advice.</p>
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            {data.isDemo ? (
              <>
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Showing demo data
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Prices to {data.priceDate ? longDate(data.priceDate) : "—"}
              </>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
