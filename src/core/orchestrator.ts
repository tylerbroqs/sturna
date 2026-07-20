// Orchestrator — runs one full pass of the agent swarm and emits a timeline of
// AgentEvents that clients can stream. This is the "conductor" that turns six
// independent agents into a single autonomous investment cycle:
//
//   Scout → Analyst → Architect → Sentinel → Executor → Steward
//
// Every stage produces real, inspectable output. If Sentinel rejects, the cycle
// halts before any order is placed.

import type {
  AgentEvent,
  AgentName,
  Asset,
  Basket,
  CycleResult,
  ExecutionMode,
} from "./types.js";
import { runScout, DEFAULT_SCOUT, type ScoutConfig } from "./agents/scout.js";
import { runAnalyst, MANDATES, type Mandate } from "./agents/analyst.js";
import { runArchitect, DEFAULT_CONSTRUCTION, type ConstructionConfig } from "./agents/architect.js";
import { runSentinel, DEFAULT_LIMITS, type RiskLimits } from "./agents/sentinel.js";
import { runExecutor, DEFAULT_EXEC } from "./agents/executor.js";
import { runSteward } from "./agents/steward.js";
import { RobinhoodAdapter } from "./mcp/robinhoodAdapter.js";

let cycleSeq = 0;
let eventSeq = 0;

function nextCycleId(): string {
  cycleSeq += 1;
  return `cyc_${Date.now().toString(36)}_${cycleSeq}`;
}

export interface CycleConfig {
  mandateKey: keyof typeof MANDATES;
  mode: ExecutionMode;
  mcpToken?: string;
  scout?: ScoutConfig;
  construction?: ConstructionConfig;
  limits?: RiskLimits;
}

export async function runCycle(
  universe: Asset[],
  prior: Basket,
  cfg: CycleConfig
): Promise<CycleResult> {
  const cycleId = nextCycleId();
  const startedAt = Date.now();
  const events: AgentEvent[] = [];
  const emit = (agent: AgentName, level: AgentEvent["level"], title: string, detail: string, meta?: Record<string, unknown>) => {
    eventSeq += 1;
    events.push({ id: `evt_${eventSeq}`, cycleId, agent, level, title, detail, at: Date.now(), meta });
  };

  const mandate: Mandate = MANDATES[cfg.mandateKey]!;
  const navBefore = prior.nav;

  // 1. Scout
  const scout = runScout(universe, cfg.scout ?? DEFAULT_SCOUT);
  emit(
    "Scout",
    "info",
    `Scanned ${universe.length} tokenized assets on Robinhood Chain`,
    `${scout.eligible.length} passed custody + liquidity gates; ${scout.rejected.length} filtered out.`,
    { eligible: scout.eligible.map((a) => a.ticker), rejected: scout.rejected.map((r) => `${r.asset.ticker}: ${r.reason}`) }
  );

  // 2. Analyst
  const scores = runAnalyst(scout.eligible, mandate);
  const top = scores.slice(0, 3).map((s) => `${s.assetId} ${s.composite}`).join(", ");
  emit(
    "Analyst",
    "decision",
    `Scored ${scores.length} names under "${mandate.name}" mandate`,
    `Top conviction: ${top}. Multi-factor model (growth/quality/momentum/liquidity/thesis-fit).`,
    { scores }
  );

  // 3. Architect
  const { targets, notes } = runArchitect(scout.eligible, scores, cfg.construction ?? DEFAULT_CONSTRUCTION);
  emit(
    "Architect",
    "decision",
    `Constructed ${targets.length}-name target book`,
    (notes.length ? notes.join(" ") + " " : "") +
      `Weights: ${targets.map((t) => `${universe.find((a) => a.id === t.assetId)?.ticker}=${(t.weight * 100).toFixed(1)}%`).join(", ")}`,
    { targets }
  );

  // 4. Sentinel
  const risk = runSentinel(scout.eligible, targets, cfg.limits ?? DEFAULT_LIMITS);
  emit(
    "Sentinel",
    risk.verdict === "rejected" ? "warn" : risk.verdict === "approved-with-flags" ? "warn" : "success",
    `Risk verdict: ${risk.verdict.toUpperCase()}`,
    `${risk.notes} HHI ${risk.hhi}, wVol ${(risk.weightedVol * 100).toFixed(0)}%, 1d VaR95 ${(risk.var95 * 100).toFixed(1)}%.` +
      (risk.breaches.length ? ` Flags: ${risk.breaches.join("; ")}.` : ""),
    { risk }
  );

  if (!risk.ok) {
    const finishedAt = Date.now();
    emit("Executor", "warn", "Execution halted", "Sentinel rejected the book — no orders placed. Prior positions retained.");
    return {
      cycleId, startedAt, finishedAt, mode: cfg.mode,
      universeSize: universe.length, selected: 0,
      scores, risk, orders: [], fills: [],
      basket: prior, events, navBefore, navAfter: navBefore,
      summary: `Cycle ${cycleId} HALTED by Sentinel: ${risk.breaches[0] ?? "risk breach"}.`,
    };
  }

  // 5. Executor
  const adapter = new RobinhoodAdapter({ mode: cfg.mode, mcpToken: cfg.mcpToken });
  const st = adapter.status();
  const outcome = await runExecutor(scout.eligible, prior, targets, adapter, DEFAULT_EXEC);
  const buys = outcome.orders.filter((o) => o.side === "buy").length;
  const sells = outcome.orders.filter((o) => o.side === "sell").length;
  const totalFees = outcome.fills.reduce((s, f) => s + f.feeUsd, 0);
  emit(
    "Executor",
    "success",
    `Routed ${outcome.orders.length} orders via ${st.mode === "mcp-live" ? "Robinhood MCP" : "paper engine"}`,
    `${buys} buys / ${sells} sells filled. Venue: ${st.endpoint}. Fees $${totalFees.toFixed(2)}. ${st.note}`,
    { orders: outcome.orders, fills: outcome.fills, adapter: st }
  );

  // attach conviction to positions from scores
  const convById = new Map(scores.map((s) => [s.assetId, s.conviction]));
  for (const p of outcome.basket.positions) p.conviction = convById.get(p.assetId) ?? "medium";

  // 6. Steward
  const drift = runSteward(outcome.basket);
  emit(
    "Steward",
    "info",
    "Post-trade book verified",
    `NAV $${outcome.basket.nav.toLocaleString()}. ${drift.reason} Next: continuous drift monitoring until threshold.`,
    { drift }
  );

  const finishedAt = Date.now();
  const navAfter = outcome.basket.nav;
  return {
    cycleId, startedAt, finishedAt, mode: cfg.mode,
    universeSize: universe.length, selected: outcome.basket.positions.length,
    scores, risk, orders: outcome.orders, fills: outcome.fills,
    basket: outcome.basket, events, navBefore, navAfter,
    summary:
      `Cycle ${cycleId}: ${outcome.basket.positions.length} positions, ` +
      `NAV $${navAfter.toLocaleString()}, risk ${risk.verdict}, ${outcome.orders.length} orders.`,
  };
}

export function seedBasket(strategyName: string, startingCapital: number): Basket {
  return {
    id: "sturna-flagship",
    strategy: strategyName,
    nav: startingCapital,
    cash: startingCapital,
    positions: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
