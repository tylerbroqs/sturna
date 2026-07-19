import { describe, it, expect } from "vitest";
import { Engine, AGENTS } from "../src/core/engine";

describe("Engine", () => {
  it("seeds a book at starting capital before any cycle", () => {
    const e = new Engine(1_000_000);
    expect(e.basket.nav).toBe(1_000_000);
    expect(e.basket.positions).toHaveLength(0);
    expect(e.metrics().cyclesRun).toBe(0);
  });

  it("builds a live book after one cycle", async () => {
    const e = new Engine(1_000_000);
    await e.runOnce();
    expect(e.basket.positions.length).toBeGreaterThan(0);
    expect(e.cycles).toHaveLength(1);
    expect(e.activity.length).toBeGreaterThan(0);
    expect(e.navHistory.length).toBeGreaterThan(1);
  });

  it("exposes exactly the six named agents", () => {
    expect(AGENTS.map((a) => a.name)).toEqual([
      "Scout", "Analyst", "Architect", "Sentinel", "Executor", "Steward",
    ]);
  });

  it("returns a well-formed metrics object", async () => {
    const e = new Engine(1_000_000);
    await e.runOnce();
    const m = e.metrics();
    for (const k of ["nav", "totalReturnPct", "alphaPct", "sharpe", "maxDrawdownPct"]) {
      expect(Number.isFinite(m[k as keyof typeof m] as number)).toBe(true);
    }
    expect(m.positions).toBe(e.basket.positions.length);
    expect(m.startingCapital).toBe(1_000_000);
  });

  it("switches mandates and rejects unknown keys", async () => {
    const e = new Engine(1_000_000);
    expect(e.setMandate("income-rwa")).toBe(true);
    expect(e.mandateKey).toBe("income-rwa");
    expect(e.setMandate("does-not-exist")).toBe(false);
    expect(e.mandateKey).toBe("income-rwa"); // unchanged on failure
    await e.runOnce();
    expect(e.basket.strategy).toBe("Real-World Income");
  });

  it("reports adapter status as ready paper mode by default", () => {
    const e = new Engine(1_000_000);
    const st = e.adapterStatus();
    expect(st.mode).toBe("paper");
    expect(st.ready).toBe(true);
  });

  it("keeps the cycle history bounded", async () => {
    const e = new Engine(1_000_000);
    for (let i = 0; i < 45; i++) await e.runOnce();
    expect(e.cycles.length).toBeLessThanOrEqual(40);
  });
});
