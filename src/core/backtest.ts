// Backtest — deterministic multi-cycle simulation of the swarm.
//
// Runs the full six-agent pipeline repeatedly over seeded GBM price paths:
// rebalance, then hold the book for a fixed number of simulated trading days,
// marking it to market daily. Every run with the same config and seed produces
// the same result, so backtests are reproducible and comparable across
// mandates.
//
// The benchmark is an equal-weight buy-and-hold of the entire eligible
// universe, marked from the same price paths — a harder, fairer bar than a
// random-walk index.

import type { Basket, NavPoint } from "./types.js";
import { buildUniverse } from "./universe.js";
import { MANDATES } from "./agents/analyst.js";
import { runCycle, seedBasket } from "./orchestrator.js";
import { markToMarket } from "./agents/steward.js";
import { mulberry32, gaussian } from "./rng.js";

export interface BacktestConfig {
  mandateKey: keyof typeof MANDATES;
  /** Number of rebalance cycles (default 52 — one simulated year, weekly). */
  cycles?: number;
  /** Simulated trading days between rebalances (default 5). */
  stepsPerCycle?: number;
  startingCapital?: number;
  /** RNG seed — same seed, same result (default 42). */
  seed?: number;
}

export interface BacktestResult {
  mandateKey: string;
  mandateName: string;
  cycles: number;
  days: number;
  seed: number;
  startingCapital: number;
  finalNav: number;
  totalReturnPct: number;
  benchReturnPct: number;
  alphaPct: number;
  annualizedReturnPct: number;
  annualizedVolPct: number;
  sharpe: number;
  maxDrawdownPct: number;
  /** Average one-way turnover per rebalance, excluding the initial buy-in. */
  avgTurnoverPct: number;
  totalFeesUsd: number;
  orders: number;
  /** Cycles halted by the Sentinel (no orders placed). */
  halts: number;
  navCurve: NavPoint[];
  finalPositions: { ticker: string; weightPct: number; conviction: string }[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function runBacktest(cfg: BacktestConfig): Promise<BacktestResult> {
  const mandate = MANDATES[cfg.mandateKey];
  if (!mandate) {
    throw new Error(`Unknown mandate "${cfg.mandateKey}". Valid keys: ${Object.keys(MANDATES).join(", ")}`);
  }
  const cycles = cfg.cycles ?? 52;
  const steps = cfg.stepsPerCycle ?? 5;
  const capital = cfg.startingCapital ?? 1_000_000;
  const seed = cfg.seed ?? 42;
  if (cycles < 1 || steps < 1) throw new Error("cycles and stepsPerCycle must be >= 1");

  // Fresh universe per run: prices are mutated in place as the clock advances.
  const universe = buildUniverse();
  const rand = mulberry32((seed >>> 0) || 1);

  // Equal-weight buy-and-hold benchmark, funded at the same starting marks.
  const benchUnits = new Map(universe.map((a) => [a.id, capital / universe.length / a.lastValuation]));
  const benchNav = () =>
    universe.reduce((s, a) => s + (benchUnits.get(a.id) ?? 0) * a.lastValuation, 0);

  // One simulated trading day: every asset takes a GBM step from the shared
  // seeded stream (same dynamics as the live engine's price ticks).
  const tick = (): void => {
    for (const a of universe) {
      const dailyVol = a.volatility / Math.sqrt(252);
      const ret = 0.08 / 252 + dailyVol * gaussian(rand);
      a.lastValuation = Math.max(0.01, round2(a.lastValuation * Math.exp(ret)));
      a.history = [...a.history.slice(-160), { t: Date.now(), price: a.lastValuation }];
    }
  };

  let basket: Basket = seedBasket(mandate.name, capital);
  const navCurve: NavPoint[] = [{ t: 0, nav: capital, benchmark: capital }];
  const dailyNavs: number[] = [capital];
  const turnovers: number[] = [];
  let totalFees = 0;
  let orders = 0;
  let halts = 0;
  let day = 0;

  for (let c = 0; c < cycles; c++) {
    const result = await runCycle(universe, basket, { mandateKey: cfg.mandateKey, mode: "paper" });
    basket = result.basket;
    if (!result.risk.ok) halts++;
    orders += result.orders.length;
    totalFees += result.fills.reduce((s, f) => s + f.feeUsd, 0);
    const gross = result.orders.reduce((s, o) => s + o.notional, 0);
    turnovers.push(result.navBefore > 0 ? gross / result.navBefore : 0);

    for (let d = 0; d < steps; d++) {
      tick();
      day++;
      basket = markToMarket(basket, universe);
      dailyNavs.push(basket.nav);
      navCurve.push({ t: day, nav: basket.nav, benchmark: round2(benchNav()) });
    }
  }

  // Performance statistics from daily observations.
  const finalNav = basket.nav;
  const totalReturn = (finalNav - capital) / capital;
  const benchReturn = (benchNav() - capital) / capital;
  const rets: number[] = [];
  for (let i = 1; i < dailyNavs.length; i++) {
    const prev = dailyNavs[i - 1]!;
    if (prev > 0) rets.push((dailyNavs[i]! - prev) / prev);
  }
  const mean = rets.length ? rets.reduce((s, r) => s + r, 0) / rets.length : 0;
  const variance = rets.length ? rets.reduce((s, r) => s + (r - mean) ** 2, 0) / rets.length : 0;
  const dailyVol = Math.sqrt(variance);
  const sharpe = dailyVol > 0 ? (mean / dailyVol) * Math.sqrt(252) : 0;
  const annReturn = day > 0 ? Math.pow(finalNav / capital, 252 / day) - 1 : 0;

  let peak = capital;
  let maxDd = 0;
  for (const v of dailyNavs) {
    peak = Math.max(peak, v);
    maxDd = Math.min(maxDd, (v - peak) / peak);
  }

  // The first cycle is the initial buy-in (~100% turnover by construction);
  // report steady-state turnover when there is more than one cycle.
  const steady = turnovers.length > 1 ? turnovers.slice(1) : turnovers;
  const avgTurnover = steady.length ? steady.reduce((s, t) => s + t, 0) / steady.length : 0;

  return {
    mandateKey: cfg.mandateKey,
    mandateName: mandate.name,
    cycles,
    days: day,
    seed,
    startingCapital: capital,
    finalNav: round2(finalNav),
    totalReturnPct: round2(totalReturn * 100),
    benchReturnPct: round2(benchReturn * 100),
    alphaPct: round2((totalReturn - benchReturn) * 100),
    annualizedReturnPct: round2(annReturn * 100),
    annualizedVolPct: round2(dailyVol * Math.sqrt(252) * 100),
    sharpe: round2(sharpe),
    maxDrawdownPct: round2(maxDd * 100),
    avgTurnoverPct: round2(avgTurnover * 100),
    totalFeesUsd: round2(totalFees),
    orders,
    halts,
    navCurve,
    finalPositions: basket.positions
      .filter((p) => p.currentWeight >= 0.001) // hide no-trade-band dust from the report
      .map((p) => ({
        ticker: p.ticker,
        weightPct: round2(p.currentWeight * 100),
        conviction: p.conviction,
      })),
  };
}
