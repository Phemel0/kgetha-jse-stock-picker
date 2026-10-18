"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedTetrahedron } from "./animated-tetrahedron";
import { useInView } from "./shared";

export function CtaSection() {
  const [ref, isVisible] = useInView<HTMLElement>(0.2);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMouse({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 });
  };

  return (
    <section ref={ref} className="relative overflow-hidden py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <div
          className={`border-foreground relative border transition-all duration-1000 ${isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}
          onMouseMove={handleMouseMove}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-10 transition-opacity duration-300"
            style={{ background: `radial-gradient(600px circle at ${mouse.x}% ${mouse.y}%, rgba(0,0,0,0.15), transparent 40%)` }}
          />

          <div className="relative z-10 px-8 py-16 lg:px-16 lg:py-24">
            <div className="flex flex-col items-center justify-between gap-12 lg:flex-row">
              <div className="flex-1">
                <h2 className="font-display mb-8 text-4xl leading-[0.95] tracking-tight lg:text-7xl">
                  See today’s
                  <br />
                  shortlist.
                </h2>
                <p className="text-muted-foreground mb-12 max-w-xl text-xl leading-relaxed">
                  Set your own mix of value, quality and momentum, filter out what you don’t want, and read why each share
                  made the list.
                </p>
                <div className="flex flex-col items-start gap-4 sm:flex-row">
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
                    <a href="#run">Run it yourself</a>
                  </Button>
                </div>
                <p className="text-muted-foreground mt-8 font-mono text-sm">Free to use. Not financial advice.</p>
              </div>

              <div className="-mr-16 hidden h-[500px] w-[500px] items-center justify-center lg:flex">
                <AnimatedTetrahedron />
              </div>
            </div>
          </div>

          <div className="border-foreground/10 absolute top-0 right-0 h-32 w-32 border-b border-l" aria-hidden />
          <div className="border-foreground/10 absolute bottom-0 left-0 h-32 w-32 border-t border-r" aria-hidden />
        </div>
      </div>
    </section>
  );
}
