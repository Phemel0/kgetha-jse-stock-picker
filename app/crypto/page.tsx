import type { Metadata } from "next";
import CryptoPicker from "@/components/crypto/CryptoPicker";
import { loadCoinPicksLog, loadCoinSnapshot } from "@/lib/crypto/data";

export const metadata: Metadata = {
  title: "Crypto — Kgetha",
  description:
    "Today's ranked crypto shortlist in rand: the top 100 coins plus everything on Luno and VALR, scored on fundamentals, momentum and stability.",
};

export default function CryptoPage() {
  const snapshot = loadCoinSnapshot();

  if (!snapshot) {
    return (
      <main className="mx-auto max-w-xl px-4 py-24">
        <h1 className="text-2xl font-semibold">No crypto data yet</h1>
        <p className="text-muted-foreground mt-3">
          Run <code>npm run agent:crypto</code> to collect prices from CoinGecko, or <code>npm run demo-data:crypto</code> to
          try the dashboard with invented coins.
        </p>
      </main>
    );
  }

  return <CryptoPicker snapshot={snapshot} log={loadCoinPicksLog(snapshot)} />;
}
