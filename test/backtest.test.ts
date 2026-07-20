import { describe, it, expect } from "vitest";
import { runBacktest } from "../src/core/backtest.js";

// Small configs keep the suite fast; determinism makes them exact.
const SMALL = { cycles: 6, stepsPerCycle: 2, seed: 42 } as const;

describe("runBacktest", () => {
  it("is fully deterministic for a given seed", async () => {
    const a = await runBacktest({ mandateKey: "ai-frontier", ...SMALL });
    const b = await runBacktest({ mandateKey: "ai-frontier", ...SMALL });
    expect(b.finalNav).toBe(a.finalNav);
    expect(b.totalReturnPct).toBe(a.totalReturnPct);
    expect(b.sharpe).toBe(a.sharpe);
    expect(b.navCurve.map((p) => p.nav)).toEqual(a.navCurve.map((p) => p.nav));
    expect(b.finalPositions).toEqual(a.finalPositions);
  });

  it("produces a different world for a different seed", async () => {
    const a = await runBacktest({ mandateKey: "ai-frontier", ...SMALL });
    const b = await runBacktest({ mandateKey: "ai-frontier", ...SMALL, seed: 7 });
    expect(b.finalNav).not.toBe(a.finalNav);
  });

  it("returns finite, well-formed statistics", async () => {
    const r = await runBacktest({ mandateKey: "balanced-private", ...SMALL });
    for (const v of [
      r.finalNav, r.totalReturnPct, r.benchReturnPct, r.alphaPct,
      r.annualizedReturnPct, r.annualizedVolPct, r.sharpe,
      r.maxDrawdownPct, r.avgTurnoverPct, r.totalFeesUsd,
    ]) {
      expect(Number.isFinite(v)).toBe(true);
    }
    expect(r.finalNav).toBeGreaterThan(0);
    expect(r.maxDrawdownPct).toBeLessThanOrEqual(0);
    expect(r.avgTurnoverPct).toBeGreaterThanOrEqual(0);
    expect(r.totalFeesUsd).toBeGreaterThanOrEqual(0);
    expect(r.halts).toBeGreaterThanOrEqual(0);
    expect(r.finalPositions.length).toBeGreaterThan(0);
  });

  it("tracks one nav point per simulated day plus the funding point", async () => {
    const r = await runBacktest({ mandateKey: "ai-frontier", ...SMALL });
    expect(r.days).toBe(SMALL.cycles * SMALL.stepsPerCycle);
    expect(r.navCurve).toHaveLength(r.days + 1);
    expect(r.navCurve[0]!.nav).toBe(r.startingCapital);
    expect(r.navCurve[0]!.benchmark).toBe(r.startingCapital);
  });

  it("runs every mandate", async () => {
    for (const key of ["ai-frontier", "balanced-private", "income-rwa"] as const) {
      const r = await runBacktest({ mandateKey: key, cycles: 2, stepsPerCycle: 2, seed: 1 });
      expect(r.mandateKey).toBe(key);
      expect(r.cycles).toBe(2);
    }
  });

  it("rejects an unknown mandate and bad dimensions", async () => {
    await expect(runBacktest({ mandateKey: "nope" as never })).rejects.toThrow(/Unknown mandate/);
    await expect(runBacktest({ mandateKey: "ai-frontier", cycles: 0 })).rejects.toThrow(/>= 1/);
  });

  it("steady-state turnover excludes the initial buy-in", async () => {
    const r = await runBacktest({ mandateKey: "ai-frontier", cycles: 8, stepsPerCycle: 2, seed: 42 });
    // the funding cycle is ~100% one-way turnover; steady-state should be far lower
    expect(r.avgTurnoverPct).toBeLessThan(60);
  });
});
