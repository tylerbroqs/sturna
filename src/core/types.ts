// Core domain types for the Sturna agent swarm.
// Everything the agents produce and consume is typed here.

export type AssetClass = "pre-ipo" | "rwa-credit" | "rwa-realestate" | "rwa-treasury" | "private-fund";

export interface PriceBar {
  t: number; // unix ms
  price: number;
}

/** A tokenized private / real-world asset in the investable universe. */
export interface Asset {
  id: string; // on-chain symbol, e.g. "oSPACEX"
  name: string;
  ticker: string;
  class: AssetClass;
  sector: string;
  chain: "Robinhood Chain";
  contract: string; // simulated 0x contract address
  // fundamentals
  lastValuation: number; // $ per token (last mark)
  impliedValuationB: number; // implied company / pool valuation in $B
  revenueGrowth: number; // yoy, 0..1+
  grossMargin: number; // 0..1
  yieldApy: number | null; // for RWA credit/treasury
  // market microstructure
  liquidityScore: number; // 0..100 depth of on-chain liquidity
  volatility: number; // annualized, e.g. 0.6
  onchainTvlM: number; // $M of on-chain TVL / float
  // provenance
  custodian: string;
  inceptionDays: number; // how long token has existed
  thesis: string;
  history: PriceBar[]; // recent price path
}

export interface AssetScore {
  assetId: string;
  growth: number; // 0..100
  quality: number; // 0..100
  momentum: number; // 0..100
  liquidity: number; // 0..100
  thesisFit: number; // 0..100
  composite: number; // 0..100 weighted
  conviction: "high" | "medium" | "low";
  rationale: string;
}

export interface BasketPosition {
  assetId: string;
  ticker: string;
  name: string;
  targetWeight: number; // 0..1
  currentWeight: number; // 0..1
  targetValue: number; // $
  shares: number; // token units held
  avgCost: number;
  markPrice: number;
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  conviction: AssetScore["conviction"];
}

export interface Basket {
  id: string;
  strategy: string; // human-readable mandate
  nav: number; // net asset value $
  cash: number;
  positions: BasketPosition[];
  createdAt: number;
  updatedAt: number;
}

export interface RiskReport {
  ok: boolean;
  concentrationTop: number; // largest single weight
  hhi: number; // Herfindahl index 0..1
  weightedVol: number;
  weightedLiquidity: number;
  var95: number; // 1-day 95% VaR as % of NAV
  breaches: string[];
  verdict: "approved" | "approved-with-flags" | "rejected";
  notes: string;
}

export type OrderSide = "buy" | "sell";

export interface Order {
  id: string;
  assetId: string;
  ticker: string;
  side: OrderSide;
  notional: number; // $ amount
  shares: number;
  limitPrice: number;
  venue: "robinhood-mcp" | "robinhood-chain-dex";
}

export interface Fill {
  orderId: string;
  assetId: string;
  ticker: string;
  side: OrderSide;
  shares: number;
  price: number; // executed incl. slippage
  slippageBps: number;
  feeUsd: number;
  txHash: string; // simulated
  at: number;
}

export type AgentName = "Scout" | "Analyst" | "Architect" | "Sentinel" | "Executor" | "Steward";

export interface AgentEvent {
  id: string;
  cycleId: string;
  agent: AgentName;
  level: "info" | "decision" | "warn" | "success";
  title: string;
  detail: string;
  at: number;
  meta?: Record<string, unknown>;
}

export interface CycleResult {
  cycleId: string;
  startedAt: number;
  finishedAt: number;
  mode: ExecutionMode;
  universeSize: number;
  selected: number;
  scores: AssetScore[];
  risk: RiskReport;
  orders: Order[];
  fills: Fill[];
  basket: Basket;
  events: AgentEvent[];
  navBefore: number;
  navAfter: number;
  summary: string;
}

export type ExecutionMode = "paper" | "mcp-live";

export interface NavPoint {
  t: number;
  nav: number;
  benchmark: number;
}
