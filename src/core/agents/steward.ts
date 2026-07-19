// Steward — monitoring & rebalance agent.
// Between cycles, the Steward watches the live book for drift away from target
// weights, marks positions to the latest on-chain price, and decides whether a
// rebalance is warranted. It's the agent that keeps the swarm honest over time.

import type { Asset, Basket, NavPoint } from "../types";

export interface DriftReport {
  maxDrift: number; // largest abs(current - target)
  totalDrift: number; // sum of abs drifts / 2 (turnover to fix)
  driftedNames: { ticker: string; current: number; target: number; drift: number }[];
  rebalanceRecommended: boolean;
  reason: string;
}

export interface StewardConfig {
  rebalanceThreshold: number; // trigger when maxDrift exceeds this
}

export const DEFAULT_STEWARD: StewardConfig = { rebalanceThreshold: 0.05 };

/** Re-mark a basket against the current universe prices (positions move with px). */
export function markToMarket(basket: Basket, assets: Asset[]): Basket {
  const byId = new Map(assets.map((a) => [a.id, a]));
  let invested = 0;
  const positions = basket.positions.map((p) => {
    const a = byId.get(p.assetId);
    const mark = a ? a.lastValuation : p.markPrice;
    const marketValue = p.shares * mark;
    invested += marketValue;
    return {
      ...p,
      markPrice: mark,
      marketValue: Math.round(marketValue * 100) / 100,
      unrealizedPnl: Math.round((mark - p.avgCost) * p.shares * 100) / 100,
      unrealizedPnlPct: p.avgCost > 0 ? Math.round(((mark - p.avgCost) / p.avgCost) * 1e4) / 100 : 0,
    };
  });
  const nav = invested + basket.cash;
  for (const p of positions) p.currentWeight = Math.round((p.marketValue / nav) * 1e4) / 1e4;
  return { ...basket, nav: Math.round(nav * 100) / 100, positions, updatedAt: Date.now() };
}

export function runSteward(basket: Basket, cfg: StewardConfig = DEFAULT_STEWARD): DriftReport {
  const driftedNames = basket.positions
    .map((p) => ({
      ticker: p.ticker,
      current: p.currentWeight,
      target: p.targetWeight,
      drift: Math.round((p.currentWeight - p.targetWeight) * 1e4) / 1e4,
    }))
    .sort((a, b) => Math.abs(b.drift) - Math.abs(a.drift));

  const maxDrift = driftedNames.reduce((m, d) => Math.max(m, Math.abs(d.drift)), 0);
  const totalDrift = Math.round((driftedNames.reduce((s, d) => s + Math.abs(d.drift), 0) / 2) * 1e4) / 1e4;
  const rebalanceRecommended = maxDrift > cfg.rebalanceThreshold;

  return {
    maxDrift,
    totalDrift,
    driftedNames: driftedNames.slice(0, 6),
    rebalanceRecommended,
    reason: rebalanceRecommended
      ? `Max drift ${(maxDrift * 100).toFixed(1)}% exceeds ${(cfg.rebalanceThreshold * 100).toFixed(0)}% band — rebalance recommended.`
      : `Book within tolerance (max drift ${(maxDrift * 100).toFixed(1)}%). Holding.`,
  };
}

/** Append a NAV observation vs a simple benchmark for the equity curve. */
export function appendNavPoint(history: NavPoint[], nav: number, benchmarkNav: number): NavPoint[] {
  return [...history, { t: Date.now(), nav: Math.round(nav * 100) / 100, benchmark: Math.round(benchmarkNav * 100) / 100 }];
}
