/**
 * Generates data/crypto-demo-snapshot.json: invented coins with simulated prices, so the crypto
 * dashboard works before the agent has run. None of these coins or numbers are real.
 * Run with `npm run demo-data:crypto`.
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { computeCoinTechnicals, weeklyCloses } from "../../lib/crypto/indicators";
import type { CoinSnapshot, CoinSnapshotFile, SaExchange } from "../../lib/crypto/types";

let seed = 20261019;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 2 ** 32;
  return seed / 2 ** 32;
};
const normal = () => Math.sqrt(-2 * Math.log(rand() + 1e-12)) * Math.cos(2 * Math.PI * rand());
const between = (a: number, b: number) => a + rand() * (b - a);
const sig = (n: number) => (n >= 1 ? Math.round(n * 100) / 100 : Number(n.toPrecision(4)));

type Tier = "major" | "large" | "mid" | "small";
const coins: [string, string, Tier][] = [
  ["BAO", "Baobab", "major"],
  ["IMP", "Impala Chain", "major"],
  ["KUDU", "Kudu Network", "large"],
  ["SBK", "Springbok Protocol", "large"],
  ["PROT", "Protea", "large"],
  ["MRL", "Marula Finance", "large"],
  ["NALA", "Nala", "large"],
  ["ZEB", "Zebra Ledger", "mid"],
  ["UMB", "Umbrella Pine", "mid"],
  ["KLF", "Kalahari Labs", "mid"],
  ["TBM", "Table Mountain", "mid"],
  ["IDL", "Indlovu", "mid"],
  ["FYN", "Fynbos", "mid"],
  ["MOP", "Mopani", "mid"],
  ["SKA", "Skaapie", "small"],
  ["VLK", "Valk", "small"],
  ["JAC", "Jacaranda", "mid"],
  ["NGU", "Ngubu", "small"],
  ["ORX", "Oryx DEX", "mid"],
  ["RNK", "Rinkhals", "small"],
  ["SUNB", "Sunbird", "small"],
  ["KRU", "Kruger Compute", "mid"],
  ["DUNE", "Sossusvlei", "small"],
  ["HYR", "Hyrax", "small"],
  ["LIMP", "Limpopo Bridge", "small"],
  ["MBE", "Mbeki Oracle", "mid"],
  ["QUA", "Quagga", "small"],
  ["GNU", "Gnu Storage", "small"],
  ["EGL", "Fish Eagle", "mid"],
  ["CHT", "Cheetah Pay", "mid"],
  ["TOKO", "Tokoloshe", "small"],
  ["AMA", "Amarula", "small"],
];

const tier: Record<Tier, { mcap: [number, number]; vol: number; float: [number, number]; sa: number }> = {
  major: { mcap: [4e11, 2.2e12], vol: 0.55, float: [0.9, 1], sa: 1 },
  large: { mcap: [6e10, 3e11], vol: 0.75, float: [0.6, 1], sa: 0.8 },
  mid: { mcap: [8e9, 6e10], vol: 0.95, float: [0.3, 0.95], sa: 0.45 },
  small: { mcap: [5e8, 8e9], vol: 1.25, float: [0.15, 0.8], sa: 0.25 },
};

const days = 366;
const end = new Date("2026-10-18T00:00:00Z");

const snapshotCoins: CoinSnapshot[] = coins.map(([symbol, name, t]) => {
  const p = tier[t];
  const drift = normal() * 0.6;
  const dailyVol = (p.vol * between(0.7, 1.3)) / Math.sqrt(365);
  const young = t === "small" && rand() < 0.3;
  const len = young ? Math.round(between(90, 250)) : days;
  let price = Math.exp(between(Math.log(0.01), Math.log(150_000)));
  const closes: number[] = [];
  for (let i = 0; i < len; i++) {
    price *= Math.exp(drift / 365 - dailyVol ** 2 / 2 + dailyVol * normal());
    closes.push(price);
  }
  const marketCap = between(...p.mcap);
  const float = Math.min(1, between(...p.float));
  const peak = Math.max(...closes) * between(1, 2.5);
  const sa: SaExchange[] = rand() < p.sa ? (rand() < 0.5 ? ["Luno", "VALR"] : ["VALR"]) : [];
  return {
    id: name.toLowerCase().replace(/\s+/g, "-"),
    symbol,
    name,
    price: sig(closes.at(-1)!),
    priceDate: end.toISOString().slice(0, 10),
    fundamentals: {
      marketCap: Math.round(marketCap),
      marketCapRank: 0,
      fdv: Math.round(marketCap / float),
      volume24h: Math.round(marketCap * Math.exp(between(Math.log(0.005), Math.log(0.4)))),
      circulatingSupply: Math.round(marketCap / closes.at(-1)!),
      totalSupply: Math.round(marketCap / closes.at(-1)! / float),
      maxSupply: rand() < 0.5 ? Math.round(marketCap / closes.at(-1)! / float) : null,
      ath: sig(peak),
      athChange: Math.round((closes.at(-1)! / peak - 1) * 1000) / 10,
      athDate: "2025-12-04",
    },
    technicals: computeCoinTechnicals(closes),
    saExchanges: sa,
    top100: true,
    weekly: weeklyCloses(closes).map(sig),
    notes: ["Demo data — invented coin and simulated prices"],
  };
});

snapshotCoins
  .sort((a, b) => b.fundamentals.marketCap! - a.fundamentals.marketCap!)
  .forEach((c, i) => (c.fundamentals.marketCapRank = i + 1));

const snapshot: CoinSnapshotFile = {
  source: "demo",
  generatedAt: new Date("2026-10-18T05:00:00Z").toISOString(),
  currency: "zar",
  coins: snapshotCoins,
  excluded: [],
  requestsUsed: 0,
};

await writeFile(path.resolve(import.meta.dirname, "../../data/crypto-demo-snapshot.json"), JSON.stringify(snapshot));
console.log(`Wrote ${snapshotCoins.length} demo coins to data/crypto-demo-snapshot.json`);
