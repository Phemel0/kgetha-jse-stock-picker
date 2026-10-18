import { describe, expect, it } from "vitest";
import { computeTechnicals, pctReturn, rsi, sma } from "../lib/indicators";
import { percentileRanks, scoreUniverse } from "../lib/scoring";
import type { StockSnapshot } from "../lib/types";
import { buildStock, rescaleMultiples, runPipeline, toRandFactor } from "../agent/pipeline";
import { RoicClient } from "../agent/roic";

describe("indicators", () => {
  it("computes SMA and returns", () => {
    expect(sma([1, 2, 3, 4], 2)).toBe(3.5);
    expect(sma([1], 2)).toBeNull();
    expect(pctReturn([100, 110, 121], 2)).toBeCloseTo(21);
    expect(pctReturn([100, 110, 121], 2, 1)).toBeCloseTo(10);
  });

  it("RSI is 100 on a straight rise and ~0 on a straight fall", () => {
    const up = Array.from({ length: 30 }, (_, i) => 100 + i);
    expect(rsi(up)).toBe(100);
    expect(rsi(up.slice().reverse())!).toBeLessThan(1);
  });

  it("an uptrend scores positive momentum", () => {
    const closes = Array.from({ length: 300 }, (_, i) => 100 * 1.002 ** i);
    const t = computeTechnicals(closes);
    expect(t.ret12m1!).toBeGreaterThan(0);
    expect(t.vs200d!).toBeGreaterThan(0);
    expect(t.offHigh52w).toBe(0);
  });
});

describe("percentileRanks", () => {
  it("ranks 0–100, skips nulls, shares ties", () => {
    expect(percentileRanks([3, null, 1, 2])).toEqual([100, null, 0, 50]);
    expect(percentileRanks([5, 5, 1])).toEqual([75, 75, 0]);
  });
});

const mk = (code: string, pe: number | null, ret: number | null): StockSnapshot => ({
  symbol: `JSE:${code}`,
  code,
  name: code,
  price: 100,
  priceDate: "2026-10-16",
  fundamentals: { pe, pfcf: null, evEbitda: null, pb: null, roe: 15, roic: 12, operMargin: 20, netDebtEbitda: 1, periodEnd: "2026-06-30", periodType: "ttm" },
  technicals: { ret12m1: ret, ret6m: ret, ret1m: 0, vs200d: ret, sma50vs200: 0, rsi14: 50, offHigh52w: 5, vol1y: 25 },
  weekly: [],
  notes: [],
});

describe("scoreUniverse", () => {
  const universe = [mk("CHP", 5, 30), mk("EXP", 40, -20), mk("MID", 12, 5), mk("LOS", -8, 10)];

  it("ranks cheap-and-rising first and expensive-and-falling last", () => {
    const r = scoreUniverse(universe);
    expect(r[0].code).toBe("CHP");
    expect(r.at(-1)!.code).toBe("EXP");
  });

  it("treats a loss-maker as the most expensive on P/E, not the cheapest", () => {
    const r = scoreUniverse(universe);
    const los = r.find((s) => s.code === "LOS")!;
    expect(los.factors.find((f) => f.key === "pe")!.pct).toBe(0);
    expect(los.flags.some((f) => f.text.includes("Loss-making"))).toBe(true);
  });

  it("weights change the order; filters only hide", () => {
    const momentumOnly = scoreUniverse(universe, { value: 0, quality: 0, momentum: 100 });
    expect(momentumOnly[0].code).toBe("CHP");
    expect(momentumOnly[1].code).toBe("LOS");
    const filtered = scoreUniverse(universe, undefined, { profitableOnly: true, uptrendOnly: false, maxNetDebtEbitda: null });
    expect(filtered.find((s) => s.code === "LOS")!.passesFilters).toBe(false);
    expect(filtered.find((s) => s.code === "LOS")!.score).toBe(scoreUniverse(universe).find((s) => s.code === "LOS")!.score);
  });

  it("contributions add up to the score", () => {
    for (const s of scoreUniverse(universe)) {
      const sum = s.contribution.value + s.contribution.quality + s.contribution.momentum;
      expect(sum).toBeCloseTo(s.score, 0);
    }
  });
});

describe("agent pipeline", () => {
  it("converts cents to rand", () => {
    expect(toRandFactor("ZAc")).toBe(0.01);
    expect(toRandFactor("ZAC")).toBe(0.01);
    expect(toRandFactor("ZAR")).toBe(1);
  });

  it("rescales multiples to today's price and refuses absurd ratios", () => {
    const m = {
      period_type: "ttm", period_end_date: "2026-06-30", currency: "ZAR", price_currency: "ZAc",
      pe_ratio: 10, pr_to_book_ratio: 2, pr_to_free_cash_flow: 12, ev_to_ttm_ebitda: 8,
      pr_last: 10000, enterprise_value: 1200, bs_sh_out: 10,
    };
    // Period price R100, today R110 → multiples up 10%
    const r = rescaleMultiples(m, 110);
    expect(r.rescaled).toBe(true);
    expect(r.pe).toBeCloseTo(11);
    // R10,000 today vs R100 at period end looks like a unit mismatch → keep period figures
    expect(rescaleMultiples(m, 10000).rescaled).toBe(false);
  });

  it("runs end to end against a mocked roic.ai", async () => {
    const closes = Array.from({ length: 400 }, (_, i) => ({ date: new Date(Date.UTC(2025, 3, 1) + i * 86400000).toISOString().slice(0, 10), close: 10000 + i * 10 }));
    const routes: Record<string, unknown> = {
      "/v3.0.0/exchanges": { data: [{ code: "JSE", exchange_name: "Johannesburg Stock Exchange", exchange_local_name: null, mics: ["XJSE"], markets: ["south_africa"], symbol_count: 400 }], next_page_url: null },
      "/v3.0.0/tickers": { data: [{ symbol: "JSE:AAA", name: "Alpha", exchange: "JSE", type: "stock", is_primary: true, status: "listed", trading_currency: "ZAc" }, { symbol: "JSE:BBB", name: "Beta", exchange: "JSE", type: "stock", is_primary: true, status: "listed", trading_currency: "ZAc" }], next_page_url: null },
    };
    const fetchImpl = (async (input: URL | RequestInfo) => {
      const url = new URL(String(input));
      const p = url.pathname;
      let body: unknown = routes[p];
      if (p.includes("/fundamental/multiples/")) {
        body = url.searchParams.get("period_type") === "ttm" && p.includes("BBB")
          ? { data: [], next_page_url: null } // BBB has no TTM — agent must fall back to annual
          : { data: [{ period_type: url.searchParams.get("period_type"), period_end_date: "2026-06-30", currency: "ZAR", price_currency: "ZAc", pe_ratio: 9, pr_to_book_ratio: 1.5, pr_to_free_cash_flow: 11, ev_to_ttm_ebitda: 6, pr_last: 13500, enterprise_value: 1e9, bs_sh_out: 1e6 }], next_page_url: null };
      } else if (p.includes("/ratios/profitability/")) {
        body = { data: [{ period_type: "ttm", period_end_date: "2026-06-30", currency: "ZAR", price_currency: "ZAc", return_com_eqy: 18.2, return_on_inv_capital: 14.1, oper_margin: 22.5 }], next_page_url: null };
      } else if (p.includes("/ratios/credit/")) {
        body = { data: [{ period_type: "ttm", period_end_date: "2026-06-30", currency: "ZAR", price_currency: "ZAc", net_debt_to_ebitda: 1.2 }], next_page_url: null };
      } else if (p.includes("/stock-prices/")) {
        body = { data: closes.slice().reverse(), symbol: "x", currency: "ZAc", next_page_url: null };
      }
      if (!body) return new Response(JSON.stringify({ error: { code: "resource_missing", message: "nope" } }), { status: 404 });
      return new Response(JSON.stringify(body), { status: 200 });
    }) as typeof fetch;

    const client = new RoicClient({ apiKey: "test", fetchImpl, rpm: 100000, sleep: async () => {} });
    const snap = await runPipeline({ client, universe: ["AAA", "BBB", "ZZZ"], log: () => {} });
    expect(snap.exchange).toBe("JSE");
    expect(snap.stocks.map((s) => s.code)).toEqual(["AAA", "BBB"]);
    expect(snap.skipped).toEqual([{ code: "ZZZ", reason: "Not found on roic.ai's JSE ticker list" }]);
    const a = snap.stocks[0];
    expect(a.price).toBeCloseTo(139.9); // 13990 cents → R139.90
    expect(a.fundamentals.pe).toBeCloseTo(9 * (139.9 / 135), 1);
    expect(snap.stocks[1].fundamentals.periodType).toBe("annual");
    expect(a.technicals.ret12m1).not.toBeNull();
    // 2 setup calls + AAA (4) + BBB (5, incl. annual fallback)
    expect(snap.requestsUsed).toBe(11);
  });

  it("handles a share with no fundamentals", () => {
    const s = buildStock(
      { symbol: "JSE:X", name: "X", exchange: "JSE", type: "stock", is_primary: true, status: "listed", trading_currency: "ZAR" },
      "X",
      { multiples: null, profitability: null, credit: null, prices: { data: [{ date: "2026-10-16", close: 50 }], symbol: "JSE:X", currency: "ZAR", next_page_url: null } },
    );
    expect(s.price).toBe(50);
    expect(s.fundamentals.pe).toBeNull();
    expect(s.notes.length).toBeGreaterThan(0);
  });
});
