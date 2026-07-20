// Example: embedding the Sturna engine in the browser.
//
// The core engine has zero framework dependencies and no Node-only APIs, so
// the entire swarm runs client-side. This file is bundled to app.js by:
//
//   npm run example:browser
//
// then open examples/browser-embed/index.html in a browser (no server needed).

import { Engine, AGENTS } from "../../src/index.js";

const engine = new Engine(1_000_000);

const $ = (id: string) => document.getElementById(id)!;

function fmtUsd(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

function render(): void {
  const m = engine.metrics();
  $("nav").textContent = fmtUsd(m.nav);
  $("ret").textContent = (m.totalReturnPct >= 0 ? "+" : "") + m.totalReturnPct.toFixed(2) + "%";
  $("ret").className = "v " + (m.totalReturnPct >= 0 ? "pos" : "neg");
  $("cycles").textContent = String(m.cyclesRun);

  const rows = engine.basket.positions
    .map(
      (p) =>
        `<tr><td>${p.ticker}</td><td>${(p.currentWeight * 100).toFixed(1)}%</td>` +
        `<td>${fmtUsd(p.marketValue)}</td><td>${p.conviction}</td></tr>`
    )
    .join("");
  $("positions").innerHTML = rows || `<tr><td colspan="4">No positions yet — run a cycle.</td></tr>`;

  const feed = engine.activity
    .slice(0, 12)
    .map((e) => {
      const color = AGENTS.find((a) => a.name === e.agent)?.color ?? "#888";
      return `<li><span class="agent" style="color:${color}">${e.agent}</span> ${e.title}</li>`;
    })
    .join("");
  $("activity").innerHTML = feed;
}

async function runCycleOnce(): Promise<void> {
  const btn = $("run") as HTMLButtonElement;
  btn.disabled = true;
  btn.textContent = "Running swarm...";
  await engine.runOnce();
  render();
  btn.disabled = false;
  btn.textContent = "Run one cycle";
}

$("run").addEventListener("click", () => void runCycleOnce());
render();
