import { describe, it, expect } from "vitest";
import { runArchitect, DEFAULT_CONSTRUCTION } from "../src/core/agents/architect.js";
import { runAnalyst, MANDATES } from "../src/core/agents/analyst.js";
import { runScout } from "../src/core/agents/scout.js";
import { buildUniverse } from "../src/core/universe.js";

const universe = buildUniverse();
const eligible = runScout(universe).eligible;
const scores = runAnalyst(eligible, MANDATES["ai-frontier"]!);

describe("runArchitect", () => {
  const { targets } = runArchitect(eligible, scores, DEFAULT_CONSTRUCTION);

  it("produces at most targetPositions names", () => {
    expect(targets.length).toBeGreaterThan(0);
    expect(targets.length).toBeLessThanOrEqual(DEFAULT_CONSTRUCTION.targetPositions);
  });

  it("returns weights that sum to ~1", () => {
    const sum = targets.reduce((s, t) => s + t.weight, 0);
    expect(sum).toBeCloseTo(1, 2);
  });

  it("drops dust: every kept name is at least the min weight", () => {
    for (const t of targets) {
      expect(t.weight).toBeGreaterThanOrEqual(DEFAULT_CONSTRUCTION.minWeight - 1e-6);
      expect(t.weight).toBeLessThan(1);
    }
  });

  it("is sorted by weight descending", () => {
    for (let i = 1; i < targets.length; i++) {
      expect(targets[i - 1]!.weight).toBeGreaterThanOrEqual(targets[i]!.weight);
    }
  });

  it("includes at least one RWA/yield ballast name", () => {
    const byId = new Map(universe.map((a) => [a.id, a]));
    const hasBallast = targets.some((t) => {
      const a = byId.get(t.assetId);
      return !!a && (a.yieldApy != null || a.class.startsWith("rwa") || a.class === "private-fund");
    });
    expect(hasBallast).toBe(true);
  });

  it("keeps the RWA sleeve at or above the ballast floor", () => {
    const byId = new Map(universe.map((a) => [a.id, a]));
    const isRwa = (id: string) => {
      const a = byId.get(id);
      return !!a && (a.yieldApy != null || a.class.startsWith("rwa") || a.class === "private-fund");
    };
    const rwaWeight = targets.filter((t) => isRwa(t.assetId)).reduce((s, t) => s + t.weight, 0);
    expect(rwaWeight).toBeGreaterThanOrEqual(DEFAULT_CONSTRUCTION.rwaBallastFloor - 0.02);
  });
});
