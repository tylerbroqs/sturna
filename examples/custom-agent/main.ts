// Example: writing a custom agent and inserting it into the swarm pipeline.
//
// The stock pipeline is Scout -> Analyst -> Architect -> Sentinel -> Executor
// -> Steward. Every stage is an exported, pure function, so you can compose
// your own cycle and insert extra stages anywhere. Here we add a "Curator"
// between the Analyst and the Architect: it vetoes names whose volatility
// exceeds a budget and boosts yield-bearing sleeves.
//
// Run it from the repo root:
//
//   npm run example:agent
//
// (or: npx tsx examples/custom-agent/main.ts)

import {
  buildUniverse,
  runScout,
  runAnalyst,
  runArchitect,
  runSentinel,
  runExecutor,
  runSteward,
  seedBasket,
  RobinhoodAdapter,
  MANDATES,
  type Asset,
  type AssetScore,
} from "../../src/index.js";

// ---------------------------------------------------------------------------
// The custom agent. An agent is just a function: typed inputs in, typed
// outputs out, plus a human-readable note for the activity feed.
// ---------------------------------------------------------------------------

interface CuratorConfig {
  maxVolatility: number; // veto anything more volatile than this (annualized)
  yieldBoost: number; // composite bonus for yield-bearing sleeves
}

interface CuratorResult {
  scores: AssetScore[];
  vetoed: { ticker: string; reason: string }[];
  note: string;
}

function runCurator(assets: Asset[], scores: AssetScore[], cfg: CuratorConfig): CuratorResult {
  const byId = new Map(assets.map((a) => [a.id, a]));
  const vetoed: CuratorResult["vetoed"] = [];
  const kept: AssetScore[] = [];

  for (const s of scores) {
    const a = byId.get(s.assetId);
    if (!a) continue;
    if (a.volatility > cfg.maxVolatility) {
      vetoed.push({ ticker: a.ticker, reason: `vol ${(a.volatility * 100).toFixed(0)}% > ${(cfg.maxVolatility * 100).toFixed(0)}% budget` });
      continue;
    }
    // boost carry names so the book tilts toward income
    const boosted = a.yieldApy != null ? { ...s, composite: Math.min(100, s.composite + cfg.yieldBoost) } : s;
    kept.push(boosted);
  }

  kept.sort((a, b) => b.composite - a.composite);
  return {
    scores: kept,
    vetoed,
    note: `Curator kept ${kept.length}/${scores.length} names, vetoed ${vetoed.length} on volatility.`,
  };
}

// ---------------------------------------------------------------------------
// A hand-rolled cycle with the Curator spliced in.
// ---------------------------------------------------------------------------

const universe = buildUniverse();
const mandate = MANDATES["balanced-private"]!;
const basket = seedBasket(mandate.name, 1_000_000);
const adapter = new RobinhoodAdapter({ mode: "paper" });

// 1. Scout: eligibility gates
const scout = runScout(universe);
console.log(`Scout     ${scout.eligible.length}/${universe.length} eligible`);

// 2. Analyst: five-factor scores
const scores = runAnalyst(scout.eligible, mandate);
console.log(`Analyst   top: ${scores.slice(0, 3).map((s) => `${s.assetId} ${s.composite}`).join(", ")}`);

// 3. Curator (custom): volatility veto + yield tilt
const curated = runCurator(scout.eligible, scores, { maxVolatility: 0.55, yieldBoost: 6 });
console.log(`Curator   ${curated.note}`);
for (const v of curated.vetoed) console.log(`          vetoed ${v.ticker}: ${v.reason}`);

// 4. Architect: construct target weights from the curated scores
const eligibleAfterCurator = scout.eligible.filter((a) => curated.scores.some((s) => s.assetId === a.id));
const { targets } = runArchitect(eligibleAfterCurator, curated.scores);
console.log(`Architect ${targets.length}-name book, top weight ${(targets[0]!.weight * 100).toFixed(1)}%`);

// 5. Sentinel: independent risk check — can still halt the cycle
const risk = runSentinel(eligibleAfterCurator, targets);
console.log(`Sentinel  ${risk.verdict} (HHI ${risk.hhi}, wVol ${(risk.weightedVol * 100).toFixed(0)}%)`);
if (!risk.ok) {
  console.log("Cycle halted by Sentinel — no orders placed.");
  process.exit(0);
}

// 6. Executor + Steward: trade to target, then verify the book
const outcome = await runExecutor(eligibleAfterCurator, basket, targets, adapter);
const drift = runSteward(outcome.basket);
console.log(`Executor  ${outcome.orders.length} orders filled, NAV $${outcome.basket.nav.toLocaleString()}`);
console.log(`Steward   ${drift.reason}`);

console.log("\nFinal positions:");
for (const p of outcome.basket.positions) {
  console.log(`  ${p.ticker.padEnd(10)} ${(p.currentWeight * 100).toFixed(1).padStart(5)}%  $${p.marketValue.toLocaleString()}`);
}
