import { describe, it, expect } from "vitest";
import { runCycle, seedBasket } from "../src/core/orchestrator.js";
import { buildUniverse } from "../src/core/universe.js";
import type { AgentName } from "../src/core/types.js";

const universe = buildUniverse();

describe("runCycle", () => {
  it("runs the full six-agent handoff and returns a populated book", async () => {
    const prior = seedBasket("AI Frontier Growth", 1_000_000);
    const result = await runCycle(universe, prior, { mandateKey: "ai-frontier", mode: "paper" });

    expect(result.risk.ok).toBe(true);
    expect(result.basket.positions.length).toBeGreaterThan(0);
    expect(result.scores.length).toBe(universe.length);
    expect(result.orders.length).toBeGreaterThan(0);
    expect(result.summary).toContain("positions");
  });

  it("emits events from every agent, in pipeline order", async () => {
    const prior = seedBasket("AI Frontier Growth", 1_000_000);
    const { events } = await runCycle(universe, prior, { mandateKey: "ai-frontier", mode: "paper" });
    const agentsSeen = events.map((e) => e.agent);
    const expected: AgentName[] = ["Scout", "Analyst", "Architect", "Sentinel", "Executor", "Steward"];
    for (const a of expected) expect(agentsSeen).toContain(a);
    // Scout is first, Steward is last
    expect(agentsSeen[0]).toBe("Scout");
    expect(agentsSeen[agentsSeen.length - 1]).toBe("Steward");
  });

  it("halts before execution when Sentinel rejects (tight limits)", async () => {
    const prior = seedBasket("AI Frontier Growth", 1_000_000);
    const result = await runCycle(universe, prior, {
      mandateKey: "ai-frontier",
      mode: "paper",
      // force a rejection: an absurdly low VaR budget no book can meet
      limits: {
        maxConcentration: 0.01,
        maxHhi: 0.01,
        maxWeightedVol: 0.001,
        minWeightedLiquidity: 100,
        maxVar95: 0.0001,
      },
    });
    expect(result.risk.ok).toBe(false);
    expect(result.risk.verdict).toBe("rejected");
    expect(result.orders).toHaveLength(0);
    expect(result.selected).toBe(0);
    expect(result.summary).toContain("HALTED");
    // the retained book is the prior (no trades placed)
    expect(result.basket).toBe(prior);
  });

  it("assigns a unique cycle id per run", async () => {
    const prior = seedBasket("AI Frontier Growth", 1_000_000);
    const a = await runCycle(universe, prior, { mandateKey: "ai-frontier", mode: "paper" });
    const b = await runCycle(universe, prior, { mandateKey: "ai-frontier", mode: "paper" });
    expect(a.cycleId).not.toBe(b.cycleId);
  });
});
