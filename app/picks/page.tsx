import type { Metadata } from "next";
import Picker from "@/components/Picker";
import { loadPicksLog, loadSnapshot } from "@/lib/data";

export const metadata: Metadata = {
  title: "Picks — Kgetha",
  description: "Today's ranked JSE shortlist. Adjust the mix of value, quality and momentum and see why each share ranks where it does.",
};

export default function PicksPage() {
  const snapshot = loadSnapshot();

  if (!snapshot) {
    return (
      <main className="mx-auto max-w-xl px-4 py-24">
        <h1 className="text-2xl font-semibold">No data yet</h1>
        <p className="text-muted-foreground mt-3">
          Run <code>npm run agent</code> to collect JSE data, or <code>npm run demo-data</code> to try the dashboard with
          invented companies.
        </p>
      </main>
    );
  }

  return <Picker snapshot={snapshot} log={loadPicksLog(snapshot)} />;
}
