// Executor — execution agent.
// Diffs the target book against current holdings, generates the minimal set of
// orders to reach target (buys and sells), and routes them through the
// RobinhoodAdapter. Applies a no-trade band so tiny drifts don't churn fees.

import type { Asset, Basket, BasketPosition, Fill, Order } from "../types";
import type { TargetWeight } from "./architect";
import { RobinhoodAdapter } from "../mcp/robinhoodAdapter";

export interface ExecConfig {
  noTradeBand: number; // ignore weight diffs smaller than this
}

export const DEFAULT_EXEC: ExecConfig = { noTradeBand: 0.005 };

let orderSeq = 0;
function orderId(): string {
  orderSeq += 1;
  return `ord_${Date.now().toString(36)}_${orderSeq}`;
}

export interface ExecOutcome {
  orders: Order[];
  fills: Fill[];
  basket: Basket;
}

export async function runExecutor(
  assets: Asset[],
  prior: Basket,
  targets: TargetWeight[],
  adapter: RobinhoodAdapter,
  cfg: ExecConfig = DEFAULT_EXEC
): Promise<ExecOutcome> {
  const byId = new Map(assets.map((a) => [a.id, a]));
  const nav = prior.nav;
  const priorById = new Map(prior.positions.map((p) => [p.assetId, p]));
  const targetById = new Map(targets.map((t) => [t.assetId, t.weight]));

  const orders: Order[] = [];

  // union of all asset ids across prior and target
  const allIds = new Set<string>([...priorById.keys(), ...targetById.keys()]);

  for (const id of allIds) {
    const a = byId.get(id);
    if (!a) continue;
    const targetW = targetById.get(id) ?? 0;
    const priorPos = priorById.get(id);
    const priorW = priorPos ? priorPos.marketValue / nav : 0;
    const diffW = targetW - priorW;
    if (Math.abs(diffW) < cfg.noTradeBand) continue;

    const notional = Math.abs(diffW) * nav;
    const price = a.lastValuation;
    const shares = Math.round((notional / price) * 1e4) / 1e4;
    if (shares <= 0) continue;

    orders.push({
      id: orderId(),
      assetId: id,
      ticker: a.ticker,
      side: diffW > 0 ? "buy" : "sell",
      notional: Math.round(notional * 100) / 100,
      shares,
      limitPrice: price,
      venue: a.class.startsWith("rwa") ? "robinhood-chain-dex" : "robinhood-mcp",
    });
  }

  // execute (sells first to free cash, then buys)
  orders.sort((x, y) => (x.side === y.side ? 0 : x.side === "sell" ? -1 : 1));
  const fills: Fill[] = [];
  for (const o of orders) {
    const a = byId.get(o.assetId)!;
    const fill = await adapter.execute(o, { liquidity: a.liquidityScore });
    fills.push(fill);
  }

  // rebuild the book from fills applied to prior holdings
  const shareMap = new Map<string, { shares: number; cost: number }>();
  for (const p of prior.positions) shareMap.set(p.assetId, { shares: p.shares, cost: p.avgCost });

  let cash = prior.cash;
  for (const f of fills) {
    const cur = shareMap.get(f.assetId) ?? { shares: 0, cost: f.price };
    if (f.side === "buy") {
      const newShares = cur.shares + f.shares;
      cur.cost = newShares > 0 ? (cur.shares * cur.cost + f.shares * f.price) / newShares : f.price;
      cur.shares = newShares;
      cash -= f.shares * f.price + f.feeUsd;
    } else {
      cur.shares = Math.max(0, cur.shares - f.shares);
      cash += f.shares * f.price - f.feeUsd;
    }
    shareMap.set(f.assetId, cur);
  }

  const positions: BasketPosition[] = [];
  let investedValue = 0;
  for (const [id, h] of shareMap) {
    if (h.shares <= 1e-6) continue;
    const a = byId.get(id);
    if (!a) continue;
    const mark = a.lastValuation;
    const marketValue = h.shares * mark;
    investedValue += marketValue;
    positions.push({
      assetId: id,
      ticker: a.ticker,
      name: a.name,
      targetWeight: targetById.get(id) ?? 0,
      currentWeight: 0, // filled after NAV known
      targetValue: (targetById.get(id) ?? 0) * nav,
      shares: Math.round(h.shares * 1e4) / 1e4,
      avgCost: Math.round(h.cost * 100) / 100,
      markPrice: mark,
      marketValue: Math.round(marketValue * 100) / 100,
      unrealizedPnl: Math.round((mark - h.cost) * h.shares * 100) / 100,
      unrealizedPnlPct: h.cost > 0 ? Math.round(((mark - h.cost) / h.cost) * 1e4) / 100 : 0,
      conviction: "medium",
    });
  }

  const newNav = investedValue + cash;
  for (const p of positions) p.currentWeight = Math.round((p.marketValue / newNav) * 1e4) / 1e4;
  positions.sort((a, b) => b.marketValue - a.marketValue);

  const basket: Basket = {
    id: prior.id,
    strategy: prior.strategy,
    nav: Math.round(newNav * 100) / 100,
    cash: Math.round(cash * 100) / 100,
    positions,
    createdAt: prior.createdAt,
    updatedAt: Date.now(),
  };

  return { orders, fills, basket };
}
