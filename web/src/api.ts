import { useCallback, useEffect, useRef, useState } from "react";
// The agent swarm runs entirely in the browser so the site deploys as a pure
// static SPA (Vercel/Netlify/GH Pages) with no backend. The exact same core
// engine also powers the optional Hono server in src/server for self-hosting.
import { Engine, AGENTS } from "../../src/core/engine";
import { MANDATES } from "../../src/core/agents/analyst";
import { ROBINHOOD_TRADING_MCP, ROBINHOOD_BANKING_MCP } from "../../src/core/mcp/robinhoodAdapter";

export interface Metrics {
  nav: number; startingCapital: number; totalReturnPct: number; benchReturnPct: number;
  alphaPct: number; sharpe: number; maxDrawdownPct: number; unrealizedPnl: number;
  positions: number; cash: number; cyclesRun: number;
}
export interface AgentMeta { name: string; role: string; blurb: string; color: string; }
export interface AdapterStatus { mode: string; endpoint: string; ready: boolean; note: string; }
export interface DriftReport {
  maxDrift: number; totalDrift: number; rebalanceRecommended: boolean; reason: string;
  driftedNames: { ticker: string; current: number; target: number; drift: number }[];
}
export interface RiskReport {
  ok: boolean; concentrationTop: number; hhi: number; weightedVol: number;
  weightedLiquidity: number; var95: number; breaches: string[];
  verdict: "approved" | "approved-with-flags" | "rejected"; notes: string;
}
export interface Overview {
  metrics: Metrics;
  mandate: { key: string; name: string; favorSectors: string[] };
  mandates: { key: string; name: string }[];
  adapter: AdapterStatus;
  mode: string;
  agents: AgentMeta[];
  drift: DriftReport;
  risk: RiskReport | null;
  endpoints: { trading: string; banking: string };
}
export interface Position {
  assetId: string; ticker: string; name: string; targetWeight: number; currentWeight: number;
  shares: number; avgCost: number; markPrice: number; marketValue: number;
  unrealizedPnl: number; unrealizedPnlPct: number; conviction: "high" | "medium" | "low";
}
export interface Basket {
  id: string; strategy: string; nav: number; cash: number; positions: Position[]; updatedAt: number;
}
export interface NavPoint { t: number; nav: number; benchmark: number; }
export interface AgentEvent {
  id: string; cycleId: string; agent: string; level: "info" | "decision" | "warn" | "success";
  title: string; detail: string; at: number;
}
export interface UniverseAsset {
  id: string; ticker: string; name: string; class: string; sector: string; contract: string;
  price: number; impliedValuationB: number; revenueGrowth: number; grossMargin: number;
  yieldApy: number | null; liquidityScore: number; volatility: number; onchainTvlM: number;
  custodian: string; thesis: string; spark: number[];
}

// ---- in-browser engine singleton -----------------------------------------
const engine = new Engine(1_000_000);
const ready = (async () => {
  await engine.runOnce();
  await engine.runOnce();
})();
// keep NAV breathing between manual cycles
setInterval(() => engine.refreshMarks(), 5000);

const settle = <T>(fn: () => T): Promise<T> => ready.then(fn);

function buildOverview(): Overview {
  const m = MANDATES[engine.mandateKey]!;
  return {
    metrics: engine.metrics(),
    mandate: { key: engine.mandateKey, name: m.name, favorSectors: m.favorSectors },
    mandates: Object.entries(MANDATES).map(([key, md]) => ({ key, name: md.name })),
    adapter: engine.adapterStatus(),
    mode: engine.mode,
    agents: AGENTS,
    drift: engine.driftReport(),
    risk: engine.cycles[0]?.risk ?? null,
    endpoints: { trading: ROBINHOOD_TRADING_MCP, banking: ROBINHOOD_BANKING_MCP },
  };
}

export const api = {
  overview: () => settle(buildOverview),
  basket: () => settle(() => engine.basket as unknown as Basket),
  nav: () => settle(() => engine.navHistory as NavPoint[]),
  activity: () => settle(() => engine.activity.slice(0, 60) as unknown as AgentEvent[]),
  universe: () =>
    settle(() =>
      engine.universe.map((a) => ({
        id: a.id, ticker: a.ticker, name: a.name, class: a.class, sector: a.sector,
        contract: a.contract, price: a.lastValuation, impliedValuationB: a.impliedValuationB,
        revenueGrowth: a.revenueGrowth, grossMargin: a.grossMargin, yieldApy: a.yieldApy,
        liquidityScore: a.liquidityScore, volatility: a.volatility, onchainTvlM: a.onchainTvlM,
        custodian: a.custodian, thesis: a.thesis,
        spark: a.history.slice(-40).map((b) => b.price),
      })) as UniverseAsset[]
    ),
  runCycle: async () => {
    await ready;
    const r = await engine.runOnce();
    return { ok: true, cycleId: r.cycleId, summary: r.summary };
  },
  setMandate: async (key: string) => {
    await ready;
    engine.setMandate(key);
    await engine.runOnce();
    return { ok: true };
  },
};

/** Poll a fetcher on an interval; returns latest data + manual refresh. */
export function usePoll<T>(fetcher: () => Promise<T>, intervalMs: number): {
  data: T | null; error: string | null; refresh: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fRef = useRef(fetcher);
  fRef.current = fetcher;

  const refresh = useCallback(() => {
    fRef.current().then(setData).catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, refresh]);

  return { data, error, refresh };
}
