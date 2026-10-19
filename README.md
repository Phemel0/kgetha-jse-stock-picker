# Kgetha — JSE stock and crypto picker agent

An agent that screens JSE shares every trading day, scores them on **value**, **quality** and **momentum**, and publishes a ranked shortlist with the reasons behind each pick. The Next.js dashboard lets you re-weight the score and filter the list instantly.

It ships with **demo data** (invented companies, simulated prices) so you can see the dashboard before connecting real data.

> Kgetha ranks shares mechanically from public data. It is not financial advice.

## How it works

```
GitHub Action (weekdays 17:40 SAST)
  └─ npm run agent
       1. finds the JSE on roic.ai and checks the share list
       2. pulls valuation, returns, debt and 2 years of prices per share (rate-limited)
       3. computes momentum indicators, scores everything
       4. writes data/snapshot.json + data/picks-log.json and commits them
                                    │
Vercel redeploys on the commit ─────┘
  └─ dashboard re-scores in the browser as you move the sliders
```

**Why a scheduled job instead of live API calls?** The free roic.ai plan allows 5 requests a minute, and each share needs 4. Screening ~45 shares takes about 36 minutes — fine for a nightly job, too slow for a page load.

## The score

Every share is ranked against the rest of the list on each measure (a percentile, 0–100), then measures are averaged into three groups and weighted.

| Group | Measures | Default weight |
|---|---|---|
| Value | P/E, price/free cash flow, EV/EBITDA, price/book (as yields, so loss-makers rank last) | 40% |
| Quality | ROE, ROIC, operating margin, net debt/EBITDA | 25% |
| Momentum | 12-month return excluding the last month, 6-month return, price vs 200-day average | 35% |

Details that matter:
- **Valuation is adjusted to today's price.** Financials come from the latest trailing-12-month period (or annual, since many JSE companies report half-yearly), and multiples are rescaled from the period-end price to the latest close.
- **Prices are converted from cents to rand** when roic.ai quotes them in ZAc.
- **Missing data is marked down**, so a share missing a whole group can't outrank one scored on everything.
- **Filters only hide shares**; they never change anyone's score.
- **Watch-outs** are flagged per share: losses, net debt above 3× EBITDA, trading below the 200-day average, RSI ≥ 75 or ≤ 25, high volatility, stale financials.

All scoring logic is in `lib/scoring.ts` and `lib/indicators.ts` — change weights, add measures or rewrite the thesis lines there.

## Setup

Requires Node 22+.

```bash
npm install
npm run dev            # landing page at http://localhost:3000, picker at /picks
```

### 1. Get a free roic.ai key

Sign up at [roic.ai](https://www.roic.ai), open the API page and copy your key.

```bash
cp .env.example .env   # paste the key into ROIC_API_KEY
npm run agent:discover # 3 requests: confirms JSE coverage and the exchange code
```

If discover prints an exchange code other than `JSE`, set `ROIC_EXCHANGE` to it.

### 2. Run the agent once locally

```bash
MAX_STOCKS=5 npm run agent   # quick check, ~4 minutes
npm run agent                # full list, ~36 minutes on the free plan
```

Interrupted? Run it again — today's responses are cached in `agent/.cache`, so it resumes without spending requests twice.

### 3. Schedule it

1. Push the project to a GitHub repo.
2. In the repo: **Settings → Secrets and variables → Actions** → add a secret `ROIC_API_KEY`. Optionally add variables `ROIC_EXCHANGE` and `ROIC_RPM`.
3. **Actions → Run stock picker agent → Run workflow** to test it. After that it runs every weekday after the JSE close.
4. Import the repo into Vercel. Each agent commit triggers a redeploy with fresh picks.

If the snapshot gets more than 4 days old, the dashboard shows a warning so you notice a broken run.

## Configuration

| Variable | Default | What it does |
|---|---|---|
| `ROIC_API_KEY` | — | Required for the agent |
| `ROIC_RPM` | `5` | Requests per minute on your plan. Individual plan: `300` (a full run then takes ~1 minute) |
| `ROIC_EXCHANGE` | auto | roic.ai exchange code for the JSE |
| `UNIVERSE` | starter list | Set to `exchange` to screen every listed JSE share (slow on the free plan) |
| `MAX_STOCKS` | all | Cap the number of shares |
| `TOP_N` | `10` | Shortlist length written to the picks log |

The share list lives in `agent/universe.ts`: a starter set of ~45 large JSE shares. It isn't an official index list — edit it to suit you. Shares roic.ai doesn't recognise are skipped and listed at the bottom of the dashboard.

## Crypto picker

`/crypto` ranks coins the same way the share picker ranks shares, with prices in rand.

**The list:** the top 100 coins by market cap, plus every coin with a ZAR pair on **Luno** or **VALR** (so you can see what you can actually buy locally). Stablecoins, wrapped and bridged copies, staking receipts and tokenised gold are left out, because they track another asset rather than trade on their own merits. The dashboard lists what was left out and why.

| Group | Measures | Default weight |
|---|---|---|
| Fundamentals | Market cap, daily volume / market cap (capped at 25% so wash trading doesn't help), share of the eventual supply already circulating, length of price history | 30% |
| Momentum | 12-month return excluding the last month, 6- and 3-month returns, price vs 200-day average | 40% |
| Stability | 1-year volatility, downside volatility, worst peak-to-trough fall in the past year — calmer scores higher | 30% |

Filters: buyable in rand on Luno/VALR, above the 200-day average, and a volatility ceiling. Watch-outs flag extreme volatility (≥ 120% a year), falls of 75% or more, thin trading, heavy future dilution (under half the supply circulating), short history and RSI extremes. The logic is in `lib/crypto/`.

Crypto trades every day, so periods are calendar days (30 / 91 / 182 / 365) and volatility is annualised over 365 days. Prices are in rand, so volatility includes the rand's own moves against the dollar.

### Run it

Data comes from [CoinGecko](https://www.coingecko.com/en/api). No key is needed, but the keyless limits are shared and slow; a free **Demo** key makes a run take about 5 minutes instead of ~15.

```bash
# optional: add COINGECKO_API_KEY to .env
MAX_COINS=5 npm run agent:crypto   # quick check
npm run agent:crypto               # full run, ~120 requests
```

It writes `data/crypto-snapshot.json` and `data/crypto-picks-log.json`. Until it has run, the page shows invented demo coins (`npm run demo-data:crypto` regenerates them).

To schedule it, add `COINGECKO_API_KEY` as a repository secret (optional) and run **Actions → Run crypto picker agent** once. After that it runs every day at 07:05 SAST and Vercel redeploys on the commit. Optional variables: `COINGECKO_PLAN=pro` for a paid key, `COINGECKO_RPM` to change the request rate.

| Variable | Default | What it does |
|---|---|---|
| `COINGECKO_API_KEY` | — | Free Demo key (optional) |
| `COINGECKO_RPM` | 30 with a key, 8 without | Requests per minute |
| `CRYPTO_TOP_N` | `100` | Size of the market-cap list |
| `CRYPTO_SA_LISTED` | on | Set to `0` to skip adding Luno/VALR coins outside the top list |
| `MAX_COINS` | all | Cap the number of coins |

CoinGecko's Luno and VALR listings and its category tags haven't been checked against a live key while building this — the first run's log prints how many ZAR pairs it found on each exchange, so check those numbers look right.

## Site

| Route | What it is |
|---|---|
| `/` | Landing page (design ported from the Optimus v0 template). Live numbers — market stats, today's top 5 and the full ranking marquee — come from the latest snapshot at build time, so each agent commit refreshes them. |
| `/picks` | The stock picker dashboard. |
| `/crypto` | The crypto picker dashboard. |

Landing sections live in `components/landing/`. Its warm neutral theme and Instrument fonts are scoped to the `.landing` class in `app/globals.css`, so the picker keeps its own theme.

## UI

The dashboard is built with [shadcn/ui](https://ui.shadcn.com) components (Radix primitives + Tailwind v4), which live as editable source in `components/ui`. The picker uses shadcn's default white (neutral) theme, defined as CSS variables in `app/globals.css`, plus one extra colour per factor (`--value`, `--quality`, `--momentum`). It is light-only.

Add more components the usual way:

```bash
npx shadcn@latest add dialog tabs
```

## Scripts

| Command | |
|---|---|
| `npm run dev` / `build` / `start` | Next.js dashboard |
| `npm run agent` | Run the screening agent |
| `npm run agent:discover` | Check JSE coverage on your key |
| `npm run demo-data` | Regenerate the demo snapshot |
| `npm run agent:crypto` | Run the crypto agent |
| `npm run demo-data:crypto` | Regenerate the crypto demo snapshot |
| `npm test` | Unit tests, plus an end-to-end agent run against a mocked API |

## Limits worth knowing

- roic.ai's JSE coverage hasn't been verified against a live key while building this — `agent:discover` is the first thing to run. If coverage is thin, the data layer is isolated in `agent/roic.ts` and `agent/pipeline.ts`, so swapping providers touches only those files.
- Free-plan history is 2 years, enough for 12-month momentum and the 200-day average.
- Scores are relative: the top share is the best of this list, not necessarily a good buy.
