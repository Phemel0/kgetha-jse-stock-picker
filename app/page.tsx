import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import Picker from "@/components/Picker";
import type { Snapshot } from "@/lib/types";

export type PicksLog = { date: string; picks: { code: string; score: number }[] }[];

function load<T>(file: string): T | null {
  const p = path.join(process.cwd(), "data", file);
  return existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as T) : null;
}

export default function Home() {
  // The agent writes snapshot.json; until it has run, show the clearly labelled demo set.
  const snapshot = load<Snapshot>("snapshot.json") ?? load<Snapshot>("demo-snapshot.json");
  const log = load<PicksLog>("picks-log.json") ?? [];

  if (!snapshot) {
    return (
      <main className="mx-auto max-w-xl px-4 py-24">
        <h1 className="text-2xl font-semibold">No data yet</h1>
        <p className="mt-3 text-muted-foreground">
          Run <code>npm run agent</code> to collect JSE data, or <code>npm run demo-data</code> to try the dashboard with
          invented companies.
        </p>
      </main>
    );
  }

  return <Picker snapshot={snapshot} log={snapshot.source === "demo" ? [] : log} />;
}
