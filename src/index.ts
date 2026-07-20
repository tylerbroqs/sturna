// Sturna — public library entry point.
// Everything a consumer needs to run the swarm, compose a custom pipeline,
// or embed the engine in Node or the browser.

export { Engine, AGENTS, type AgentMeta } from "./core/engine.js";
export { runCycle, seedBasket, type CycleConfig } from "./core/orchestrator.js";
export { runBacktest, type BacktestConfig, type BacktestResult } from "./core/backtest.js";

export { runScout, DEFAULT_SCOUT, type ScoutConfig, type ScoutResult } from "./core/agents/scout.js";
export { runAnalyst, MANDATES, type Mandate } from "./core/agents/analyst.js";
export {
  runArchitect,
  DEFAULT_CONSTRUCTION,
  type ConstructionConfig,
  type TargetWeight,
} from "./core/agents/architect.js";
export { runSentinel, DEFAULT_LIMITS, type RiskLimits } from "./core/agents/sentinel.js";
export { runExecutor, DEFAULT_EXEC, type ExecConfig, type ExecOutcome } from "./core/agents/executor.js";
export {
  runSteward,
  markToMarket,
  appendNavPoint,
  DEFAULT_STEWARD,
  type DriftReport,
  type StewardConfig,
} from "./core/agents/steward.js";

export {
  RobinhoodAdapter,
  ROBINHOOD_TRADING_MCP,
  ROBINHOOD_BANKING_MCP,
  type AdapterConfig,
  type ExecContext,
} from "./core/mcp/robinhoodAdapter.js";

export { buildUniverse, priceReturn } from "./core/universe.js";
export { mulberry32, gaussian, gbmPath, round2, type GbmOptions } from "./core/rng.js";
export type * from "./core/types.js";
