"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Eyebrow, REPO_URL, useInView } from "./shared";

const examples = [
  {
    label: "Install",
    code: `git clone ${REPO_URL}
cd kgetha-jse-stock-picker
npm install`,
  },
  {
    label: "Configure",
    code: `cp .env.example .env
# paste your free key from roic.ai
ROIC_API_KEY=...

npm run agent:discover`,
  },
  {
    label: "Run",
    code: `npm run agent    # screen the JSE
npm run dev      # open the site`,
  },
];

const features = [
  { title: "Free data", description: "A free roic.ai key covers the starter list." },
  { title: "Resumable", description: "An interrupted run picks up where it stopped." },
  { title: "Tested", description: "Scoring and the agent run against a mocked API." },
  { title: "One file to edit", description: "Change the share list in agent/universe.ts." },
];

export function RunSection() {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);
  const [ref, isVisible] = useInView<HTMLElement>(0.1);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(examples[activeTab].code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <section id="run" ref={ref} className="relative scroll-mt-24 overflow-hidden py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <div className="grid items-start gap-16 lg:grid-cols-2 lg:gap-24">
          <div className={`min-w-0 transition-all duration-700 ${isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
            <Eyebrow>Run it yourself</Eyebrow>
            <h2 className="font-display mb-8 text-4xl tracking-tight lg:text-6xl">
              Fork it.
              <br />
              <span className="text-muted-foreground">Change the weights.</span>
            </h2>
            <p className="text-muted-foreground mb-12 text-xl leading-relaxed">
              The agent, the scoring and this site are one small TypeScript project. Add a free roic.ai key and it runs on
              GitHub Actions and Vercel.
            </p>

            <div className="grid grid-cols-2 gap-6">
              {features.map((f, index) => (
                <div
                  key={f.title}
                  className={`transition-all duration-500 ${isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
                  style={{ transitionDelay: `${index * 50 + 200}ms` }}
                >
                  <h3 className="mb-1 font-medium">{f.title}</h3>
                  <p className="text-muted-foreground text-sm">{f.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className={`min-w-0 transition-all delay-200 duration-700 lg:sticky lg:top-32 ${isVisible ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0"}`}>
            <div className="border-foreground/10 border">
              <div className="border-foreground/10 flex items-center border-b" role="tablist" aria-label="Setup steps">
                {examples.map((ex, idx) => (
                  <button
                    key={ex.label}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === idx}
                    onClick={() => setActiveTab(idx)}
                    className={`relative px-4 py-4 font-mono text-sm transition-colors sm:px-6 ${
                      activeTab === idx ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {ex.label}
                    {activeTab === idx && <span className="bg-foreground absolute right-0 bottom-0 left-0 h-px" />}
                  </button>
                ))}
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="text-muted-foreground hover:text-foreground px-4 py-4 transition-colors"
                  aria-label={copied ? "Copied" : "Copy commands"}
                >
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>

              <div className="bg-foreground/[0.01] min-h-[220px] overflow-x-auto p-6 font-mono text-sm sm:p-8" role="tabpanel">
                <pre className="text-foreground/80">
                  {examples[activeTab].code.split("\n").map((line, lineIndex) => (
                    <div key={`${activeTab}-${lineIndex}`} className="code-line-reveal leading-loose" style={{ animationDelay: `${lineIndex * 80}ms` }}>
                      <span className="inline-flex">
                        {line.split("").map((char, charIndex) => (
                          <span
                            key={`${activeTab}-${lineIndex}-${charIndex}`}
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
            </div>

            <div className="mt-6 flex items-center gap-6 text-sm">
              <a href={`${REPO_URL}#readme`} className="text-foreground underline-offset-4 hover:underline">
                Read the setup guide
              </a>
              <span className="text-foreground/20" aria-hidden>
                |
              </span>
              <a href={REPO_URL} className="text-muted-foreground hover:text-foreground">
                View on GitHub
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
