// Backtest CLI — run the swarm over simulated history and print a report.
//
//   npm run backtest                             all mandates, one year weekly
//   npm run backtest -- --mandate ai-frontier    a single mandate
//   npm run backtest -- --cycles 104 --steps 5   two simulated years
//   npm run backtest -- --seed 7                 a different world
//
// Same seed, same numbers: results are fully reproducible.

import { runBacktest, type BacktestResult } from "./core/backtest.js";
import { MANDATES } from "./core/agents/analyst.js";

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  const v = i >= 0 ? process.argv[i + 1] : undefined;
  return v ?? fallback;
}

const mandateArg = arg("mandate", "all");
const cycles = Number(arg("cycles", "52"));
const steps = Number(arg("steps", "5"));
const seed = Number(arg("seed", "42"));
const capital = Number(arg("capital", "1000000"));

const keys =
  mandateArg === "all" ? (Object.keys(MANDATES) as (keyof typeof MANDATES)[]) : [mandateArg as keyof typeof MANDATES];

const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

function printReport(r: BacktestResult): void {
  console.log(`\n=== ${r.mandateName} (${r.mandateKey}) ===`);
  console.log(`${r.cycles} rebalances over ${r.days} simulated trading days, seed ${r.seed}`);
  console.log(`  Final NAV        $${r.finalNav.toLocaleString("en-US")}`);
  console.log(`  Total return     ${pct(r.totalReturnPct)}   (benchmark ${pct(r.benchReturnPct)}, alpha ${pct(r.alphaPct)})`);
  console.log(`  Annualized       ${pct(r.annualizedReturnPct)} at ${r.annualizedVolPct.toFixed(1)}% vol   Sharpe ${r.sharpe.toFixed(2)}`);
  console.log(`  Max drawdown     ${r.maxDrawdownPct.toFixed(2)}%`);
  console.log(`  Turnover/rebal   ${r.avgTurnoverPct.toFixed(1)}%   orders ${r.orders}   fees $${r.totalFeesUsd.toLocaleString("en-US")}`);
  console.log(`  Sentinel halts   ${r.halts}`);
  console.log(`  Final book       ${r.finalPositions.map((p) => `${p.ticker} ${p.weightPct.toFixed(1)}%`).join("  ")}`);
}

const results: BacktestResult[] = [];
for (const key of keys) {
  results.push(await runBacktest({ mandateKey: key, cycles, stepsPerCycle: steps, seed, startingCapital: capital }));
}

for (const r of results) printReport(r);

if (results.length > 1) {
  console.log("\n=== Comparison ===");
  const w = Math.max(...results.map((r) => r.mandateName.length)) + 2;
  console.log(
    `${"Mandate".padEnd(w)}${"Return".padStart(9)}${"Alpha".padStart(9)}${"Sharpe".padStart(8)}${"MaxDD".padStart(9)}${"Turnover".padStart(10)}`
  );
  for (const r of results) {
    console.log(
      `${r.mandateName.padEnd(w)}${pct(r.totalReturnPct).padStart(9)}${pct(r.alphaPct).padStart(9)}` +
        `${r.sharpe.toFixed(2).padStart(8)}${(r.maxDrawdownPct.toFixed(1) + "%").padStart(9)}${(r.avgTurnoverPct.toFixed(1) + "%").padStart(10)}`
    );
  }
}
console.log();
