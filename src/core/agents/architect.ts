// Architect — portfolio construction agent.
// Turns Analyst scores into target weights using conviction-weighting with a
// volatility penalty (a pragmatic risk-adjusted tilt), then applies mandate
// constraints: max position, min position, sector caps, and an RWA ballast
// floor so the book is never 100% high-beta pre-IPO.

import type { Asset, AssetScore } from "../types.js";

export interface ConstructionConfig {
  targetPositions: number; // how many names to hold
  maxWeight: number; // per-name cap
  minWeight: number; // dust floor for an included name
  maxSectorWeight: number;
  rwaBallastFloor: number; // min combined weight in yield/RWA sleeves
}

export const DEFAULT_CONSTRUCTION: ConstructionConfig = {
  targetPositions: 8,
  maxWeight: 0.22,
  minWeight: 0.03,
  maxSectorWeight: 0.4,
  rwaBallastFloor: 0.15,
};

export interface TargetWeight {
  assetId: string;
  weight: number;
}

function normalize(weights: Map<string, number>): void {
  const total = [...weights.values()].reduce((s, w) => s + w, 0);
  if (total <= 0) return;
  for (const [k, v] of weights) weights.set(k, v / total);
}

export function runArchitect(
  assets: Asset[],
  scores: AssetScore[],
  cfg: ConstructionConfig = DEFAULT_CONSTRUCTION
): { targets: TargetWeight[]; notes: string[] } {
  const byId = new Map(assets.map((a) => [a.id, a]));
  const notes: string[] = [];

  // 1. seed selection: top-N by composite, but guarantee some RWA ballast names.
  const ranked = [...scores].sort((a, b) => b.composite - a.composite);
  const isRwa = (id: string) => {
    const a = byId.get(id);
    return !!a && (a.yieldApy != null || a.class.startsWith("rwa") || a.class === "private-fund");
  };

  const chosen: AssetScore[] = [];
  for (const s of ranked) {
    if (chosen.length >= cfg.targetPositions) break;
    chosen.push(s);
  }
  // ensure at least one RWA ballast name is present
  if (!chosen.some((s) => isRwa(s.assetId))) {
    const rwa = ranked.find((s) => isRwa(s.assetId));
    if (rwa) {
      chosen[chosen.length - 1] = rwa;
      notes.push("Forced RWA ballast name into the book to satisfy stability floor.");
    }
  }

  // 2. raw conviction weight with vol penalty.
  const weights = new Map<string, number>();
  for (const s of chosen) {
    const a = byId.get(s.assetId)!;
    const volPenalty = 1 / (1 + a.volatility); // lower vol -> higher weight
    const raw = Math.pow(s.composite / 100, 1.5) * volPenalty;
    weights.set(s.assetId, raw);
  }
  normalize(weights);

  // 3. RWA ballast floor.
  const rwaTotal = () => [...weights].filter(([id]) => isRwa(id)).reduce((s, [, w]) => s + w, 0);
  if (rwaTotal() < cfg.rwaBallastFloor) {
    const deficit = cfg.rwaBallastFloor - rwaTotal();
    const rwaIds = [...weights.keys()].filter(isRwa);
    if (rwaIds.length) {
      const bump = deficit / rwaIds.length;
      for (const id of rwaIds) weights.set(id, (weights.get(id) ?? 0) + bump);
      normalize(weights);
      notes.push(`Raised RWA ballast to ${(cfg.rwaBallastFloor * 100).toFixed(0)}% floor for downside protection.`);
    }
  }

  // 4. per-name cap (iterate to redistribute overflow).
  for (let iter = 0; iter < 6; iter++) {
    let overflow = 0;
    const capped: string[] = [];
    for (const [id, w] of weights) {
      if (w > cfg.maxWeight) {
        overflow += w - cfg.maxWeight;
        weights.set(id, cfg.maxWeight);
        capped.push(id);
      }
    }
    if (overflow <= 1e-6) break;
    const receivers = [...weights.keys()].filter((id) => !capped.includes(id));
    const recvTotal = receivers.reduce((s, id) => s + (weights.get(id) ?? 0), 0);
    if (recvTotal <= 0) break;
    for (const id of receivers) {
      weights.set(id, (weights.get(id) ?? 0) + overflow * ((weights.get(id) ?? 0) / recvTotal));
    }
  }

  // 5. sector cap.
  const sectorOf = (id: string) => byId.get(id)?.sector ?? "Other";
  for (let iter = 0; iter < 4; iter++) {
    const sectorTotals = new Map<string, number>();
    for (const [id, w] of weights) sectorTotals.set(sectorOf(id), (sectorTotals.get(sectorOf(id)) ?? 0) + w);
    let trimmed = false;
    for (const [sector, total] of sectorTotals) {
      if (total > cfg.maxSectorWeight) {
        const scale = cfg.maxSectorWeight / total;
        for (const [id, w] of weights) if (sectorOf(id) === sector) weights.set(id, w * scale);
        trimmed = true;
        notes.push(`Trimmed ${sector} exposure to ${(cfg.maxSectorWeight * 100).toFixed(0)}% sector cap.`);
      }
    }
    normalize(weights);
    if (!trimmed) break;
  }

  // 6. drop dust below min weight, renormalize.
  for (const [id, w] of weights) if (w < cfg.minWeight) weights.delete(id);
  normalize(weights);

  const targets: TargetWeight[] = [...weights.entries()]
    .map(([assetId, weight]) => ({ assetId, weight: Math.round(weight * 1e4) / 1e4 }))
    .sort((a, b) => b.weight - a.weight);

  return { targets, notes };
}
