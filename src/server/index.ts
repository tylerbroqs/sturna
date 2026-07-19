// Sturna API server (Hono).
// Serves the live engine state and exposes control endpoints for API clients.

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { Engine, AGENTS } from "../core/engine";

// Load a local .env if present (e.g. RH_MCP_TOKEN, PORT) using Node's built-in
// loader — no dependency. Missing file is fine; paper mode needs no config.
try {
  (process as NodeJS.Process & { loadEnvFile?: (path?: string) => void }).loadEnvFile?.(".env");
} catch {
  /* no .env file — running on process environment only */
}
import { MANDATES } from "../core/agents/analyst";
import { ROBINHOOD_TRADING_MCP, ROBINHOOD_BANKING_MCP } from "../core/mcp/robinhoodAdapter";

const engine = new Engine(1_000_000);

// Bootstrap: run a couple of cycles so the API opens with a live book.
await engine.runOnce();
await engine.runOnce();

// Keep NAV breathing so the equity curve is alive even when idle.
setInterval(() => engine.refreshMarks(), 5000);

const app = new Hono();
app.use("/api/*", cors());

app.get("/api/health", (c) => c.json({ ok: true, service: "sturna", ts: Date.now() }));

app.get("/api/overview", (c) =>
  c.json({
    metrics: engine.metrics(),
    mandate: { key: engine.mandateKey, ...MANDATES[engine.mandateKey]! },
    mandates: Object.entries(MANDATES).map(([key, m]) => ({ key, name: m.name })),
    adapter: engine.adapterStatus(),
    mode: engine.mode,
    agents: AGENTS,
    drift: engine.driftReport(),
    risk: engine.cycles[0]?.risk ?? null,
    endpoints: { trading: ROBINHOOD_TRADING_MCP, banking: ROBINHOOD_BANKING_MCP },
  })
);

app.get("/api/basket", (c) => c.json(engine.basket));
app.get("/api/nav", (c) => c.json(engine.navHistory));
app.get("/api/activity", (c) => c.json(engine.activity.slice(0, 60)));
app.get("/api/cycles", (c) => c.json(engine.cycles.map((cy) => ({
  cycleId: cy.cycleId, startedAt: cy.startedAt, finishedAt: cy.finishedAt,
  selected: cy.selected, verdict: cy.risk.verdict, orders: cy.orders.length,
  navAfter: cy.navAfter, summary: cy.summary,
}))));
app.get("/api/cycles/:id", (c) => {
  const cy = engine.cycles.find((x) => x.cycleId === c.req.param("id"));
  return cy ? c.json(cy) : c.json({ error: "not found" }, 404);
});
app.get("/api/universe", (c) =>
  c.json(
    engine.universe.map((a) => ({
      id: a.id, ticker: a.ticker, name: a.name, class: a.class, sector: a.sector,
      contract: a.contract, price: a.lastValuation, impliedValuationB: a.impliedValuationB,
      revenueGrowth: a.revenueGrowth, grossMargin: a.grossMargin, yieldApy: a.yieldApy,
      liquidityScore: a.liquidityScore, volatility: a.volatility, onchainTvlM: a.onchainTvlM,
      custodian: a.custodian, thesis: a.thesis,
      spark: a.history.slice(-40).map((b) => b.price),
    }))
  )
);
app.get("/api/scores", (c) => c.json(engine.cycles[0]?.scores ?? []));

app.post("/api/run-cycle", async (c) => {
  const result = await engine.runOnce();
  return c.json({ ok: true, cycleId: result.cycleId, summary: result.summary, events: result.events });
});

app.post("/api/mandate", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { key?: string };
  if (!body.key || !engine.setMandate(body.key)) return c.json({ error: "unknown mandate" }, 400);
  const result = await engine.runOnce();
  return c.json({ ok: true, mandate: engine.mandateKey, cycleId: result.cycleId });
});

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`\n  Sturna API live on http://localhost:${info.port}`);
  console.log(`      mode=${engine.mode}  mandate=${engine.mandateKey}  NAV=$${engine.metrics().nav.toLocaleString()}`);
  console.log(`      Robinhood Trading MCP target: ${ROBINHOOD_TRADING_MCP}\n`);
});
