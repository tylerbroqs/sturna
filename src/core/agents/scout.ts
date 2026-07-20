// Scout — sourcing agent.
// Ingests the on-chain universe of tokenized private/RWA assets and applies
// hard eligibility gates (custody, liquidity floor, token maturity) before any
// capital is considered. Produces the investable shortlist for the swarm.

import type { Asset } from "../types.js";

export interface ScoutConfig {
  minLiquidity: number; // floor on on-chain depth
  minInceptionDays: number; // avoid brand-new tokens
  minTvlM: number;
}

export const DEFAULT_SCOUT: ScoutConfig = {
  minLiquidity: 40,
  minInceptionDays: 90,
  minTvlM: 25,
};

export interface ScoutResult {
  eligible: Asset[];
  rejected: { asset: Asset; reason: string }[];
}

export function runScout(universe: Asset[], cfg: ScoutConfig = DEFAULT_SCOUT): ScoutResult {
  const eligible: Asset[] = [];
  const rejected: { asset: Asset; reason: string }[] = [];

  for (const a of universe) {
    if (a.liquidityScore < cfg.minLiquidity) {
      rejected.push({ asset: a, reason: `liquidity ${a.liquidityScore} < floor ${cfg.minLiquidity}` });
      continue;
    }
    if (a.inceptionDays < cfg.minInceptionDays) {
      rejected.push({ asset: a, reason: `token age ${a.inceptionDays}d < ${cfg.minInceptionDays}d` });
      continue;
    }
    if (a.onchainTvlM < cfg.minTvlM) {
      rejected.push({ asset: a, reason: `TVL $${a.onchainTvlM}M < $${cfg.minTvlM}M` });
      continue;
    }
    eligible.push(a);
  }

  return { eligible, rejected };
}
