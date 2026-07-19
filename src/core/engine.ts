// Engine — the long-lived application state the API server serves from.
// Holds the universe, the live basket, cycle history, the NAV curve, and the
// activity feed. One process-wide singleton keeps the demo "alive" between
// requests; swap the in-memory arrays for a DB to persist across restarts.

import type {
  AgentEvent,
  Asset,
  Basket,
  CycleResult,
  ExecutionMode,
  NavPoint,
} from "./types";
import { buildUniverse } from "./universe";
import { MANDATES } from "./agents/analyst";
import { runCycle, seedBasket, type CycleConfig } from "./orchestrator";
import { markToMarket, runSteward, appendNavPoint } from "./agents/steward";
import { RobinhoodAdapter } from "./mcp/robinhoodAdapter";
import { mulberry32, gaussian } from "./rng";

// Browser-safe env read: `process` is undefined in the client bundle, where the
// engine runs entirely in-page (paper mode) with no MCP token.
function envToken(): string | undefined {
  const p = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return p?.env?.RH_MCP_TOKEN;
}

export interface AgentMeta {
  name: string;
  role: string;
  blurb: string;
  color: string;
}

export const AGENTS: AgentMeta[] = [
  { name: "Scout", role: "Sourcing", blurb: "Ingests the on-chain universe and enforces custody, liquidity & maturity gates.", color: "#C4F03A" },
  { name: "Analyst", role: "Research", blurb: "Scores every asset on a five-factor conviction model.", color: "#66D9EF" },
  { name: "Architect", role: "Construction", blurb: "Builds risk-adjusted target weights under mandate constraints.", color: "#AE81FF" },
  { name: "Sentinel", role: "Risk", blurb: "Independent circuit breaker — concentration, VaR & liquidity limits.", color: "#FD971F" },
  { name: "Executor", role: "Execution", blurb: "Routes minimal-turnover orders via Robinhood MCP / Chain DEX.", color: "#A6E22E" },
  { name: "Steward", role: "Monitoring", blurb: "Marks the book to market and watches for drift between cycles.", color: "#F92672" },
];

export class Engine {
  universe: Asset[];
  basket: Basket;
  cycles: CycleResult[] = [];
  activity: AgentEvent[] = [];
  navHistory: NavPoint[] = [];
  mandateKey: keyof typeof MANDATES = "ai-frontier";
  mode: ExecutionMode = "paper";
  private benchmarkNav: number;
  private startingCapital: number;

  constructor(startingCapital = 1_000_000) {
    this.universe = buildUniverse();
    this.startingCapital = startingCapital;
    this.benchmarkNav = startingCapital;
    this.basket = seedBasket(MANDATES[this.mandateKey]!.name, startingCapital);
    this.navHistory = [{ t: Date.now(), nav: startingCapital, benchmark: startingCapital }];
  }

  adapterStatus() {
    return new RobinhoodAdapter({ mode: this.mode, mcpToken: envToken() }).status();
  }

  /** Nudge all prices one step forward so the book is genuinely dynamic. */
  private tickPrices(seed: number): void {
    const rand = mulberry32(seed);
    for (const a of this.universe) {
      const dailyVol = a.volatility / Math.sqrt(252);
      const drift = 0.08 / 252;
      const shock = gaussian(rand);
      const ret = drift + dailyVol * shock;
      const next = Math.max(0.01, a.lastValuation * Math.exp(ret));
      a.lastValuation = Math.round(next * 100) / 100;
      a.history = [...a.history.slice(-160), { t: Date.now(), price: a.lastValuation }];
    }
    // benchmark = equal-weight basket of the eligible universe
    const eqRet = 0.06 / 252 + (0.18 / Math.sqrt(252)) * gaussian(rand);
    this.benchmarkNav = Math.round(this.benchmarkNav * Math.exp(eqRet) * 100) / 100;
  }

  async runOnce(): Promise<CycleResult> {
    this.tickPrices(Math.floor(Date.now() / 1000) + this.cycles.length * 7);
    this.basket = markToMarket(this.basket, this.universe);
    this.basket.strategy = MANDATES[this.mandateKey]!.name;

    const cfg: CycleConfig = {
      mandateKey: this.mandateKey,
      mode: this.mode,
      mcpToken: envToken(),
    };
    const result = await runCycle(this.universe, this.basket, cfg);
    this.basket = result.basket;
    this.cycles.unshift(result);
    if (this.cycles.length > 40) this.cycles.pop();
    this.activity = [...result.events.slice().reverse(), ...this.activity].slice(0, 200);
    this.navHistory = appendNavPoint(this.navHistory, this.basket.nav, this.benchmarkNav);
    if (this.navHistory.length > 400) this.navHistory = this.navHistory.slice(-400);
    return result;
  }

  /** Re-mark only (used to keep NAV alive without a full rebalance). */
  refreshMarks(): void {
    this.tickPrices(Math.floor(Date.now() / 997));
    this.basket = markToMarket(this.basket, this.universe);
    this.navHistory = appendNavPoint(this.navHistory, this.basket.nav, this.benchmarkNav);
    if (this.navHistory.length > 400) this.navHistory = this.navHistory.slice(-400);
  }

  driftReport() {
    return runSteward(this.basket);
  }

  metrics() {
    const nav = this.basket.nav;
    const totalReturn = (nav - this.startingCapital) / this.startingCapital;
    const benchReturn = (this.benchmarkNav - this.startingCapital) / this.startingCapital;
    const navs = this.navHistory.map((p) => p.nav);
    const rets: number[] = [];
    for (let i = 1; i < navs.length; i++) rets.push((navs[i]! - navs[i - 1]!) / navs[i - 1]!);
    const mean = rets.length ? rets.reduce((s, r) => s + r, 0) / rets.length : 0;
    const variance = rets.length ? rets.reduce((s, r) => s + (r - mean) ** 2, 0) / rets.length : 0;
    const vol = Math.sqrt(variance);
    const sharpe = vol > 0 ? (mean / vol) * Math.sqrt(252) : 0;
    let peak = navs[0] ?? nav;
    let maxDd = 0;
    for (const v of navs) {
      peak = Math.max(peak, v);
      maxDd = Math.min(maxDd, (v - peak) / peak);
    }
    const unrealized = this.basket.positions.reduce((s, p) => s + p.unrealizedPnl, 0);
    return {
      nav: Math.round(nav * 100) / 100,
      startingCapital: this.startingCapital,
      totalReturnPct: Math.round(totalReturn * 1e4) / 100,
      benchReturnPct: Math.round(benchReturn * 1e4) / 100,
      alphaPct: Math.round((totalReturn - benchReturn) * 1e4) / 100,
      sharpe: Math.round(sharpe * 100) / 100,
      maxDrawdownPct: Math.round(maxDd * 1e4) / 100,
      unrealizedPnl: Math.round(unrealized * 100) / 100,
      positions: this.basket.positions.length,
      cash: this.basket.cash,
      cyclesRun: this.cycles.length,
    };
  }

  setMandate(key: string): boolean {
    if (key in MANDATES) {
      this.mandateKey = key as keyof typeof MANDATES;
      return true;
    }
    return false;
  }
}
