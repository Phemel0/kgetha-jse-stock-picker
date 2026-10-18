/**
 * Generates data/demo-snapshot.json: invented companies with simulated prices, so the dashboard
 * works before you add an API key. None of these companies or numbers are real.
 * Run with `npm run demo-data`.
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { computeTechnicals, weekly } from "../lib/indicators";
import type { Snapshot, StockSnapshot } from "../lib/types";

// Deterministic PRNG so the demo looks the same on every build.
let seed = 20261018;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 2 ** 32;
  return seed / 2 ** 32;
};
const normal = () => Math.sqrt(-2 * Math.log(rand() + 1e-12)) * Math.cos(2 * Math.PI * rand());
const between = (a: number, b: number) => a + rand() * (b - a);
const r1 = (n: number) => Math.round(n * 10) / 10;

type Profile = "miner" | "bank" | "retail" | "tech" | "industrial" | "property";
const companies: [string, string, Profile][] = [
  ["HVP", "Highveld Platinum", "miner"],
  ["KRG", "Karoo Gold", "miner"],
  ["WCM", "Waterberg Coal & Metals", "miner"],
  ["NMC", "Namaqua Copper", "miner"],
  ["BSH", "Bushveld Chrome", "miner"],
  ["FRB", "Fynbos Bank", "bank"],
  ["MDF", "Mopane Financial", "bank"],
  ["ULI", "Umhlanga Life", "bank"],
  ["KSB", "Kgalagadi Savings Bank", "bank"],
  ["TBI", "Table Bay Insurance", "bank"],
  ["SPR", "Spaza Retail Group", "retail"],
  ["JCF", "Jacaranda Foods", "retail"],
  ["MTW", "Marula Wines", "retail"],
  ["IZF", "Izinto Fashion", "retail"],
  ["RVS", "Rooibos Value Stores", "retail"],
  ["KTD", "Kalahari Digital", "tech"],
  ["UBN", "Ubuntu Networks", "tech"],
  ["SVP", "Savanna Payments", "tech"],
  ["LMT", "Limpopo Media & Tech", "tech"],
  ["DRL", "Drakensberg Logistics", "industrial"],
  ["VLE", "Vaal Engineering", "industrial"],
  ["SSC", "Soweto Steel & Cement", "industrial"],
  ["GRC", "Gariep Chemicals", "industrial"],
  ["MPL", "Mpumalanga Power", "industrial"],
  ["CBP", "Cape Boland Property", "property"],
  ["SFR", "Sandton Fund REIT", "property"],
  ["DBP", "Durban Port Properties", "property"],
  ["KNY", "Knysna Leisure", "retail"],
  ["TKA", "Tugela Agri", "industrial"],
  ["PLB", "Pilanesberg Brands", "retail"],
];

const base: Record<Profile, { pe: [number, number]; roe: [number, number]; margin: [number, number]; debt: [number, number]; vol: number }> = {
  miner: { pe: [4, 14], roe: [4, 28], margin: [8, 40], debt: [-1, 2], vol: 0.42 },
  bank: { pe: [6, 12], roe: [10, 22], margin: [20, 35], debt: [0, 0], vol: 0.24 },
  retail: { pe: [10, 26], roe: [8, 35], margin: [4, 14], debt: [0, 2.5], vol: 0.28 },
  tech: { pe: [14, 45], roe: [2, 30], margin: [5, 30], debt: [-1, 1.5], vol: 0.36 },
  industrial: { pe: [6, 18], roe: [3, 20], margin: [4, 16], debt: [0.5, 4.5], vol: 0.3 },
  property: { pe: [7, 14], roe: [5, 12], margin: [40, 65], debt: [4, 8], vol: 0.22 },
};

const days = 420;
const end = new Date("2026-10-16");
const dates: string[] = [];
for (let d = new Date(end); dates.length < days; d.setDate(d.getDate() - 1)) {
  if (d.getDay() !== 0 && d.getDay() !== 6) dates.unshift(d.toISOString().slice(0, 10));
}

const stocks: StockSnapshot[] = companies.map(([code, name, profile]) => {
  const p = base[profile];
  const drift = normal() * 0.25; // annual drift, varies a lot between companies
  const dailyVol = p.vol / Math.sqrt(252);
  let price = between(15, 450);
  const closes: number[] = [];
  for (let i = 0; i < days; i++) {
    price *= Math.exp(drift / 252 - dailyVol ** 2 / 2 + dailyVol * normal());
    closes.push(Math.round(price * 100) / 100);
  }
  const lossMaker = rand() < 0.08;
  const pe = lossMaker ? -r1(between(5, 30)) : r1(between(...p.pe));
  const isBank = profile === "bank";
  return {
    symbol: `DEMO:${code}`,
    code,
    name,
    price: closes.at(-1)!,
    priceDate: dates.at(-1)!,
    fundamentals: {
      pe,
      pfcf: lossMaker ? null : r1(pe * between(0.7, 1.6)),
      evEbitda: isBank ? null : r1(Math.abs(pe) * between(0.45, 0.8)),
      pb: r1(between(0.6, 4.5)),
      roe: lossMaker ? -r1(between(2, 15)) : r1(between(...p.roe)),
      roic: lossMaker ? -r1(between(1, 8)) : r1(between(...p.roe) * 0.75),
      operMargin: lossMaker ? -r1(between(1, 10)) : r1(between(...p.margin)),
      netDebtEbitda: isBank ? null : r1(between(...p.debt)),
      periodEnd: rand() < 0.1 ? "2025-06-30" : "2026-06-30",
      periodType: "ttm",
    },
    technicals: computeTechnicals(closes),
    weekly: weekly(closes),
    notes: ["Demo data — invented company and simulated prices"],
  };
});

const snapshot: Snapshot = {
  source: "demo",
  generatedAt: new Date("2026-10-16T18:00:00Z").toISOString(),
  exchange: "DEMO",
  stocks,
  skipped: [],
  requestsUsed: 0,
};

await writeFile(path.resolve(import.meta.dirname, "../data/demo-snapshot.json"), JSON.stringify(snapshot));
console.log(`Wrote ${stocks.length} demo companies to data/demo-snapshot.json`);
