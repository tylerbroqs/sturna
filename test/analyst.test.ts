import { describe, it, expect } from "vitest";
import { runAnalyst, MANDATES } from "../src/core/agents/analyst.js";
import { buildUniverse } from "../src/core/universe.js";

const universe = buildUniverse();

describe("runAnalyst", () => {
  it("scores every asset with all factors bounded to 0..100", () => {
    const scores = runAnalyst(universe, MANDATES["ai-frontier"]!);
    expect(scores).toHaveLength(universe.length);
    for (const s of scores) {
      for (const f of [s.growth, s.quality, s.momentum, s.liquidity, s.thesisFit, s.composite]) {
        expect(f).toBeGreaterThanOrEqual(0);
        expect(f).toBeLessThanOrEqual(100);
      }
      expect(["high", "medium", "low"]).toContain(s.conviction);
    }
  });

  it("returns scores sorted by composite descending", () => {
    const scores = runAnalyst(universe, MANDATES["ai-frontier"]!);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i - 1]!.composite).toBeGreaterThanOrEqual(scores[i]!.composite);
    }
  });

  it("assigns conviction consistently with the composite thresholds", () => {
    const scores = runAnalyst(universe, MANDATES["ai-frontier"]!);
    for (const s of scores) {
      if (s.composite >= 72) expect(s.conviction).toBe("high");
      else if (s.composite >= 58) expect(s.conviction).toBe("medium");
      else expect(s.conviction).toBe("low");
    }
  });

  it("is deterministic on the seeded universe", () => {
    const a = runAnalyst(universe, MANDATES["ai-frontier"]!);
    const b = runAnalyst(buildUniverse(), MANDATES["ai-frontier"]!);
    expect(a.map((s) => [s.assetId, s.composite])).toEqual(b.map((s) => [s.assetId, s.composite]));
  });

  it("reflects the mandate: the AI mandate ranks a frontier-AI name at the top", () => {
    const scores = runAnalyst(universe, MANDATES["ai-frontier"]!);
    const aiTickers = ["oANTH", "oOPENAI"];
    expect(aiTickers).toContain(scores[0]!.assetId);
  });

  it("income mandate lifts a yield sleeve's thesis-fit above the growth mandate", () => {
    const tbillId = "oTBILL";
    const income = runAnalyst(universe, MANDATES["income-rwa"]!).find((s) => s.assetId === tbillId)!;
    const growth = runAnalyst(universe, MANDATES["ai-frontier"]!).find((s) => s.assetId === tbillId)!;
    expect(income.thesisFit).toBeGreaterThan(growth.thesisFit);
  });
});
