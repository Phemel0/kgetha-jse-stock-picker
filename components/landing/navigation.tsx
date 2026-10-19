"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { REPO_URL, Wordmark } from "./shared";

const navLinks = [
  { name: "The score", href: "#scoring" },
  { name: "The agent", href: "#agent" },
  { name: "Shortlist", href: "#shortlist" },
  { name: "Run it yourself", href: "#run" },
  { name: "Crypto", href: "/crypto" },
];

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={`fixed z-50 transition-all duration-500 ${isScrolled ? "top-4 right-4 left-4" : "top-0 right-0 left-0"}`}>
      <nav
        className={`mx-auto transition-all duration-500 ${
          isScrolled || isMobileMenuOpen
            ? "bg-background/80 border-foreground/10 max-w-[1200px] rounded-2xl border shadow-lg backdrop-blur-xl"
            : "max-w-[1400px] bg-transparent"
        }`}
      >
        <div
          className={`flex items-center justify-between px-6 transition-all duration-500 lg:px-8 ${isScrolled ? "h-14" : "h-20"}`}
        >
          <a href="#" className="group flex items-center" aria-label="Kgetha, back to top">
            <Wordmark size={isScrolled ? "sm" : "md"} />
          </a>

          <div className="hidden items-center gap-12 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-foreground/70 hover:text-foreground group relative text-sm transition-colors duration-300"
              >
                {link.name}
                <span className="bg-foreground absolute -bottom-1 left-0 h-px w-0 transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
          </div>

          <div className="hidden items-center gap-4 md:flex">
            <a
              href={REPO_URL}
              className={`text-foreground/70 hover:text-foreground transition-all duration-500 ${isScrolled ? "text-xs" : "text-sm"}`}
            >
              GitHub
            </a>
            <Button
              asChild
              size="sm"
              className={`bg-foreground hover:bg-foreground/90 text-background rounded-full transition-all duration-500 ${
                isScrolled ? "h-8 px-4 text-xs" : "px-6"
              }`}
            >
              <Link href="/picks">Open the picker</Link>
            </Button>
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 md:hidden"
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu: full-screen overlay */}
      <div
        className={`bg-background fixed inset-0 z-40 transition-all duration-500 md:hidden ${
          isMobileMenuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        style={{ top: 0 }}
        aria-hidden={!isMobileMenuOpen}
      >
        <div className="flex h-full flex-col px-8 pt-28 pb-8">
          <div className="flex flex-1 flex-col justify-center gap-8">
            {navLinks.map((link, i) => (
              <a
                key={link.name}
                href={link.href}
                tabIndex={isMobileMenuOpen ? 0 : -1}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`font-display text-foreground hover:text-muted-foreground text-5xl transition-all duration-500 ${
                  isMobileMenuOpen ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                }`}
                style={{ transitionDelay: isMobileMenuOpen ? `${i * 75}ms` : "0ms" }}
              >
                {link.name}
              </a>
            ))}
          </div>

          <div
            className={`border-foreground/10 flex gap-4 border-t pt-8 transition-all duration-500 ${
              isMobileMenuOpen ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
            style={{ transitionDelay: isMobileMenuOpen ? "300ms" : "0ms" }}
          >
            <Button asChild variant="outline" className="h-14 flex-1 rounded-full text-base">
              <a href={REPO_URL} tabIndex={isMobileMenuOpen ? 0 : -1}>
                GitHub
              </a>
            </Button>
            <Button asChild className="bg-foreground text-background h-14 flex-1 rounded-full text-base">
              <Link href="/picks" tabIndex={isMobileMenuOpen ? 0 : -1}>
                Open the picker
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
