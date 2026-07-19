// Analyst — research & scoring agent.
// Scores each eligible asset on five orthogonal factors, blends them into a
// conviction-weighted composite, and writes a human-readable rationale.
//
// The scoring is a real, deterministic multi-factor model. An optional LLM
// narration layer (see reasoning.ts) can enrich `rationale` when an API key is
// present, but the numbers — and therefore the portfolio — never depend on it.

import type { Asset, AssetScore } from "../types";
import { priceReturn } from "../universe";

export interface Mandate {
  name: string;
  // factor weights (sum ~1)
  growth: number;
  quality: number;
  momentum: number;
  liquidity: number;
  thesisFit: number;
  // thesis tilt: sectors/classes the mandate favors
  favorSectors: string[];
}

export const MANDATES: Record<string, Mandate> = {
  "ai-frontier": {
    name: "AI Frontier Growth",
    growth: 0.34, quality: 0.16, momentum: 0.22, liquidity: 0.12, thesisFit: 0.16,
    favorSectors: ["Artificial Intelligence", "Data & Analytics", "Fintech Infrastructure"],
  },
  "balanced-private": {
    name: "Balanced Private Markets",
    growth: 0.24, quality: 0.26, momentum: 0.16, liquidity: 0.16, thesisFit: 0.18,
    favorSectors: ["Fintech Infrastructure", "Consumer Fintech", "Private Credit"],
  },
  "income-rwa": {
    name: "Real-World Income",
    growth: 0.1, quality: 0.32, momentum: 0.1, liquidity: 0.24, thesisFit: 0.24,
    favorSectors: ["Government Credit", "Private Credit", "Real Estate"],
  },
};

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

function growthScore(a: Asset): number {
  // revenue growth dominates; yield sleeves get a floor from carry.
  if (a.yieldApy != null && a.revenueGrowth === 0) return clamp(30 + a.yieldApy * 300);
  return clamp(a.revenueGrowth * 45 + a.grossMargin * 20);
}

function qualityScore(a: Asset): number {
  const marginPart = a.grossMargin * 55;
  const scalePart = Math.min(35, Math.log10(Math.max(1, a.impliedValuationB + a.onchainTvlM / 10)) * 22);
  const durability = a.yieldApy != null ? 12 : 6;
  return clamp(marginPart + scalePart + durability);
}

function momentumScore(a: Asset): number {
  const r30 = priceReturn(a, 30);
  const r90 = priceReturn(a, 90);
  // blend short and medium term, recenter around 50
  return clamp(50 + r30 * 140 + r90 * 60);
}

function liquidityScore(a: Asset): number {
  const depth = a.liquidityScore;
  const tvlBonus = Math.min(15, a.onchainTvlM / 30);
  return clamp(depth * 0.85 + tvlBonus);
}

function thesisFitScore(a: Asset, m: Mandate): number {
  const base = m.favorSectors.includes(a.sector) ? 78 : 46;
  const growthTilt = m.growth > 0.25 ? a.revenueGrowth * 12 : 0;
  const incomeTilt = m.thesisFit > 0.2 && a.yieldApy != null ? a.yieldApy * 200 : 0;
  return clamp(base + growthTilt + incomeTilt);
}

function convictionFor(composite: number): AssetScore["conviction"] {
  if (composite >= 72) return "high";
  if (composite >= 58) return "medium";
  return "low";
}

export function runAnalyst(assets: Asset[], mandate: Mandate): AssetScore[] {
  return assets
    .map((a) => {
      const growth = growthScore(a);
      const quality = qualityScore(a);
      const momentum = momentumScore(a);
      const liquidity = liquidityScore(a);
      const thesisFit = thesisFitScore(a, mandate);
      const composite = clamp(
        growth * mandate.growth +
          quality * mandate.quality +
          momentum * mandate.momentum +
          liquidity * mandate.liquidity +
          thesisFit * mandate.thesisFit
      );
      const conviction = convictionFor(composite);
      const r30 = Math.round(priceReturn(a, 30) * 100);
      const rationale =
        `${a.ticker}: composite ${composite.toFixed(0)}/100 (${conviction}). ` +
        `Growth ${growth.toFixed(0)}, quality ${quality.toFixed(0)}, 30d momentum ${momentum.toFixed(0)} (${r30 >= 0 ? "+" : ""}${r30}% px). ` +
        (a.yieldApy != null ? `Carry ${(a.yieldApy * 100).toFixed(1)}% APY. ` : "") +
        a.thesis;
      return {
        assetId: a.id,
        growth: Math.round(growth),
        quality: Math.round(quality),
        momentum: Math.round(momentum),
        liquidity: Math.round(liquidity),
        thesisFit: Math.round(thesisFit),
        composite: Math.round(composite),
        conviction,
        rationale,
      } satisfies AssetScore;
    })
    .sort((a, b) => b.composite - a.composite);
}
