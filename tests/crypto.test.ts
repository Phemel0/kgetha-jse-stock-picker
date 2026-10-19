import { describe, expect, it } from "vitest";
import { computeCoinTechnicals, maxDrawdown, weeklyCloses } from "../lib/crypto/indicators";
import { floatRatio, scoreCoins } from "../lib/crypto/scoring";
import type { CoinSnapshot } from "../lib/crypto/types";
import { zar } from "../lib/format";
import { CoinGeckoClient } from "../agent/crypto/coingecko";
import { dailyCloses, looksPegged, runCryptoPipeline } from "../agent/crypto/pipeline";

describe("crypto indicators", () => {
  it("measures the deepest fall from a peak", () => {
    const closes = [...Array(20).fill(100), 50, ...Array(20).fill(80)];
    expect(maxDrawdown(closes)).toBeCloseTo(50);
  });

  it("uses calendar days: 365 closes of steady growth give a positive 12-month return", () => {
    const closes = Array.from({ length: 366 }, (_, i) => 100 * 1.002 ** i);
    const t = computeCoinTechnicals(closes);
    expect(t.ret12m1!).toBeGreaterThan(0);
    expect(t.vs200d!).toBeGreaterThan(0);
    expect(t.maxDrawdown1y).toBe(0);
    expect(t.historyDays).toBe(366);
  });

  it("samples weekly closes ending on the latest", () => {
    const w = weeklyCloses(Array.from({ length: 15 }, (_, i) => i));
    expect(w).toEqual([0, 7, 14]);
  });
});

const mk = (symbol: string, o: { mcap?: number; ret?: number | null; vol?: number; dd?: number; sa?: boolean; fdv?: number }): CoinSnapshot => ({
  id: symbol.toLowerCase(),
  symbol,
  name: symbol,
  price: 100,
  priceDate: "2026-10-18",
  fundamentals: {
    marketCap: o.mcap ?? 1e10,
    marketCapRank: 1,
    fdv: o.fdv ?? o.mcap ?? 1e10,
    volume24h: (o.mcap ?? 1e10) * 0.05,
    circulatingSupply: null,
    totalSupply: null,
    maxSupply: null,
    ath: 120,
    athChange: -20,
    athDate: "2025-12-01",
  },
  technicals: {
    ret12m1: o.ret ?? null, ret6m: o.ret ?? null, ret3m: o.ret ?? null, ret1m: 0,
    vs200d: o.ret ?? null, sma50vs200: 0, rsi14: 50,
    vol1y: o.vol ?? 60, downsideVol: (o.vol ?? 60) * 0.7, maxDrawdown1y: o.dd ?? 40, historyDays: 366,
  },
  saExchanges: o.sa ? ["VALR"] : [],
  top100: true,
  weekly: [],
  notes: [],
});

describe("scoreCoins", () => {
  const coins = [
    mk("BIG", { mcap: 1e12, ret: 40, vol: 45, dd: 25, sa: true }),
    mk("PUMP", { mcap: 5e9, ret: 300, vol: 160, dd: 80 }),
    mk("MID", { mcap: 5e10, ret: 5, vol: 70, dd: 45, sa: true }),
    mk("DUMP", { mcap: 2e9, ret: -70, vol: 140, dd: 90, fdv: 1e10 }),
  ];

  it("ranks large, rising, calm coins first and falling, volatile ones last", () => {
    const r = scoreCoins(coins);
    expect(r[0].symbol).toBe("BIG");
    expect(r.at(-1)!.symbol).toBe("DUMP");
  });

  it("momentum-only weights favour the strongest trend", () => {
    expect(scoreCoins(coins, { fundamentals: 0, momentum: 100, stability: 0 })[0].symbol).toBe("PUMP");
  });

  it("flags extreme risk and dilution", () => {
    const dump = scoreCoins(coins).find((c) => c.symbol === "DUMP")!;
    expect(dump.flags.some((f) => f.text.startsWith("Extremely volatile"))).toBe(true);
    expect(dump.flags.some((f) => f.text.includes("eventual supply"))).toBe(true);
    expect(floatRatio(dump)).toBeCloseTo(0.2);
  });

  it("filters only hide; contributions add up to the score", () => {
    const all = scoreCoins(coins);
    const filtered = scoreCoins(coins, undefined, { saOnly: true, uptrendOnly: false, maxVolatility: 100 });
    expect(filtered.filter((c) => c.passesFilters).map((c) => c.symbol).sort()).toEqual(["BIG", "MID"]);
    for (const c of filtered) {
      expect(c.score).toBe(all.find((a) => a.id === c.id)!.score);
      expect(c.contribution.fundamentals + c.contribution.momentum + c.contribution.stability).toBeCloseTo(c.score, 0);
    }
  });
});

describe("crypto agent", () => {
  it("formats rand prices of any size", () => {
    expect(zar(1234567.891).replace(/\s/g, " ")).toBe("R1 234 567.89");
    expect(zar(0.004521)).toBe("R0.004521");
    expect(zar(0.5)).toBe("R0.5000");
  });

  it("spots stablecoins and wrapped tokens by name", () => {
    expect(looksPegged({ id: "tether", symbol: "usdt", name: "Tether" })).not.toBeNull();
    expect(looksPegged({ id: "ethena-usde", symbol: "usde", name: "Ethena USDe" })).not.toBeNull();
    expect(looksPegged({ id: "x", symbol: "wbtc", name: "Wrapped Bitcoin" })).not.toBeNull();
    expect(looksPegged({ id: "x", symbol: "zarp", name: "ZARP Stablecoin" })).not.toBeNull();
    expect(looksPegged({ id: "bitcoin", symbol: "btc", name: "Bitcoin" })).toBeNull();
    expect(looksPegged({ id: "solana", symbol: "sol", name: "Solana" })).toBeNull();
  });

  it("keeps one close per UTC day", () => {
    const d = dailyCloses({ prices: [[Date.UTC(2026, 9, 17), 1], [Date.UTC(2026, 9, 18), 2], [Date.UTC(2026, 9, 18, 14), 3]] });
    expect(d).toEqual([{ date: "2026-10-17", close: 1 }, { date: "2026-10-18", close: 3 }]);
  });

  it("runs end to end against a mocked CoinGecko", async () => {
    const row = (id: string, symbol: string, name: string, mcap: number) => ({
      id, symbol, name, current_price: 100, market_cap: mcap, market_cap_rank: 1, fully_diluted_valuation: mcap,
      total_volume: mcap / 20, circulating_supply: 1, total_supply: 1, max_supply: null, ath: 150,
      ath_change_percentage: -33, ath_date: "2025-12-01T00:00:00Z", last_updated: "2026-10-18T05:00:00Z",
    });
    const top = [row("bitcoin", "btc", "Bitcoin", 3e13), row("tether", "usdt", "Tether", 3e12), row("solana", "sol", "Solana", 1e12), row("ethena-usde", "usde", "Ethena USDe", 2e11)];
    const prices = Array.from({ length: 366 }, (_, i) => [Date.UTC(2025, 9, 18) + i * 86_400_000, 50 + i] as [number, number]);
    const seen: string[] = [];
    const fetchImpl = (async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = new URL(String(input));
      seen.push(url.pathname + url.search);
      expect((init?.headers as Record<string, string>)["x-cg-demo-api-key"]).toBe("k");
      const p = url.pathname.replace("/api/v3", "");
      let body: unknown;
      if (p === "/coins/markets") {
        const cat = url.searchParams.get("category");
        const ids = url.searchParams.get("ids");
        if (cat === "stablecoins") body = [top[1]];
        else if (cat) return new Response(JSON.stringify({ error: "invalid category" }), { status: 404 });
        else if (ids) body = ids.split(",").includes("valr-only") ? [row("valr-only", "vo", "Valr Only", 1e8)] : [];
        else body = top;
      } else if (p === "/exchanges/luno/tickers") {
        body = { tickers: [{ base: "XBT", target: "ZAR", coin_id: "bitcoin" }, { base: "XBT", target: "USDC", coin_id: "bitcoin" }] };
      } else if (p === "/exchanges/valr/tickers") {
        body = { tickers: [{ base: "BTC", target: "ZAR", coin_id: "bitcoin" }, { base: "VO", target: "ZAR", coin_id: "valr-only" }, { base: "USDT", target: "ZAR", coin_id: "tether" }] };
      } else if (p.endsWith("/market_chart")) {
        body = { prices };
      }
      if (!body) return new Response("{}", { status: 404 });
      return new Response(JSON.stringify(body), { status: 200 });
    }) as typeof fetch;

    const client = new CoinGeckoClient({ apiKey: "k", fetchImpl, rpm: 100_000, sleep: async () => {} });
    const snap = await runCryptoPipeline({ client, topN: 100, log: () => {}, now: new Date("2026-10-18T05:00:00Z") });

    expect(snap.coins.map((c) => c.id)).toEqual(["bitcoin", "solana", "valr-only"]);
    expect(snap.excluded.map((e) => e.id).sort()).toEqual(["ethena-usde", "tether"]);
    const btc = snap.coins[0];
    expect(btc.saExchanges).toEqual(["Luno", "VALR"]);
    expect(btc.top100).toBe(true);
    expect(snap.coins[2].top100).toBe(false);
    expect(snap.coins[2].saExchanges).toEqual(["VALR"]);
    expect(btc.price).toBe(100);
    expect(btc.technicals.ret12m1).not.toBeNull();
    // Tether is SA-listed but must not sneak back in as an extra.
    expect(seen.filter((s) => s.includes("market_chart")).length).toBe(3);
  });
});
