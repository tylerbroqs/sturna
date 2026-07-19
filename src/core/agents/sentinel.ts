// Sentinel — risk agent.
// Independent check on the Architect's proposed book. Computes concentration
// (HHI), weighted vol, weighted liquidity and a parametric 1-day 95% VaR, then
// issues a verdict. Sentinel can reject a cycle outright — it is the swarm's
// circuit breaker before any order reaches the Executor.

import type { Asset, RiskReport } from "../types";
import type { TargetWeight } from "./architect";

export interface RiskLimits {
  maxConcentration: number;
  maxHhi: number;
  maxWeightedVol: number;
  minWeightedLiquidity: number;
  maxVar95: number; // as % of NAV
}

export const DEFAULT_LIMITS: RiskLimits = {
  maxConcentration: 0.25,
  maxHhi: 0.22,
  maxWeightedVol: 0.5,
  minWeightedLiquidity: 55,
  maxVar95: 0.09,
};

const Z95 = 1.645;

export function runSentinel(
  assets: Asset[],
  targets: TargetWeight[],
  limits: RiskLimits = DEFAULT_LIMITS
): RiskReport {
  const byId = new Map(assets.map((a) => [a.id, a]));
  const breaches: string[] = [];

  const concentrationTop = targets.reduce((m, t) => Math.max(m, t.weight), 0);
  const hhi = targets.reduce((s, t) => s + t.weight * t.weight, 0);

  let weightedVol = 0;
  let weightedLiquidity = 0;
  for (const t of targets) {
    const a = byId.get(t.assetId);
    if (!a) continue;
    weightedVol += t.weight * a.volatility;
    weightedLiquidity += t.weight * a.liquidityScore;
  }

  // Parametric VaR using weighted vol as a portfolio-vol proxy (assumes some
  // diversification benefit via a 0.8 correlation haircut).
  const portVolDaily = (weightedVol * 0.8) / Math.sqrt(252);
  const var95 = Z95 * portVolDaily;

  if (concentrationTop > limits.maxConcentration)
    breaches.push(`Top position ${(concentrationTop * 100).toFixed(1)}% > ${(limits.maxConcentration * 100).toFixed(0)}% cap`);
  if (hhi > limits.maxHhi) breaches.push(`HHI ${hhi.toFixed(3)} > ${limits.maxHhi} (too concentrated)`);
  if (weightedVol > limits.maxWeightedVol)
    breaches.push(`Weighted vol ${(weightedVol * 100).toFixed(0)}% > ${(limits.maxWeightedVol * 100).toFixed(0)}%`);
  if (weightedLiquidity < limits.minWeightedLiquidity)
    breaches.push(`Weighted liquidity ${weightedLiquidity.toFixed(0)} < ${limits.minWeightedLiquidity} floor`);
  if (var95 > limits.maxVar95)
    breaches.push(`1d 95% VaR ${(var95 * 100).toFixed(1)}% > ${(limits.maxVar95 * 100).toFixed(0)}% budget`);

  // A single hard breach (concentration or VaR) rejects; soft breaches flag.
  const hardBreach =
    concentrationTop > limits.maxConcentration * 1.15 || var95 > limits.maxVar95 * 1.2;

  const verdict: RiskReport["verdict"] = hardBreach
    ? "rejected"
    : breaches.length > 0
      ? "approved-with-flags"
      : "approved";

  const notes =
    verdict === "rejected"
      ? "Hard risk breach — cycle halted before execution. Architect must reduce concentration/VaR."
      : verdict === "approved-with-flags"
        ? "Within tolerance but carrying flags; execution allowed with monitoring."
        : "All risk checks passed cleanly.";

  return {
    ok: verdict !== "rejected",
    concentrationTop: Math.round(concentrationTop * 1e4) / 1e4,
    hhi: Math.round(hhi * 1e4) / 1e4,
    weightedVol: Math.round(weightedVol * 1e4) / 1e4,
    weightedLiquidity: Math.round(weightedLiquidity * 10) / 10,
    var95: Math.round(var95 * 1e4) / 1e4,
    breaches,
    verdict,
    notes,
  };
}
