// Quick end-to-end smoke test of the swarm from the terminal:  npm run cycle
import { Engine } from "./core/engine.js";

const engine = new Engine(1_000_000);
console.log("\n=== Sturna swarm — running 3 cycles ===\n");

for (let i = 0; i < 3; i++) {
  const r = await engine.runOnce();
  console.log(`Cycle ${i + 1}: ${r.summary}`);
  for (const e of r.events) console.log(`   • [${e.agent}] ${e.title}`);
  console.log();
}

const m = engine.metrics();
console.log("=== Final book ===");
console.log(`NAV $${m.nav.toLocaleString()}  |  total ${m.totalReturnPct}%  |  alpha ${m.alphaPct}%  |  Sharpe ${m.sharpe}  |  maxDD ${m.maxDrawdownPct}%`);
console.log(`Positions (${engine.basket.positions.length}):`);
for (const p of engine.basket.positions) {
  console.log(`   ${p.ticker.padEnd(10)} ${(p.currentWeight * 100).toFixed(1).padStart(5)}%  $${p.marketValue.toLocaleString().padStart(12)}  PnL ${p.unrealizedPnlPct}%  [${p.conviction}]`);
}
console.log(`\nAdapter: ${JSON.stringify(engine.adapterStatus())}\n`);
