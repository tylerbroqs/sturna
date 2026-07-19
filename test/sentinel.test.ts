import { describe, it, expect } from "vitest";
import { runSentinel, DEFAULT_LIMITS } from "../src/core/agents/sentinel";
import { runArchitect } from "../src/core/agents/architect";
import { runAnalyst, MANDATES } from "../src/core/agents/analyst";
import { runScout } from "../src/core/agents/scout";
import { buildUniverse } from "../src/core/universe";

const universe = buildUniverse();
const eligible = runScout(universe).eligible;
const scores = runAnalyst(eligible, MANDATES["ai-frontier"]!);
const { targets } = runArchitect(eligible, scores);

describe("runSentinel", () => {
  it("approves a diversified, constrained book", () => {
    const risk = runSentinel(eligible, targets, DEFAULT_LIMITS);
    expect(risk.ok).toBe(true);
    expect(["approved", "approved-with-flags"]).toContain(risk.verdict);
    expect(risk.hhi).toBeGreaterThan(0);
    expect(risk.hhi).toBeLessThanOrEqual(1);
  });

  it("rejects a hyper-concentrated book (hard breach)", () => {
    const single = [{ assetId: eligible[0]!.id, weight: 0.95 }];
    const risk = runSentinel(eligible, single, DEFAULT_LIMITS);
    expect(risk.ok).toBe(false);
    expect(risk.verdict).toBe("rejected");
    expect(risk.breaches.length).toBeGreaterThan(0);
  });

  it("computes HHI as the sum of squared weights", () => {
    const book = [
      { assetId: eligible[0]!.id, weight: 0.5 },
      { assetId: eligible[1]!.id, weight: 0.5 },
    ];
    const risk = runSentinel(eligible, book, DEFAULT_LIMITS);
    expect(risk.hhi).toBeCloseTo(0.5, 3); // 0.5^2 + 0.5^2
  });

  it("reports a top concentration equal to the largest weight", () => {
    const book = [
      { assetId: eligible[0]!.id, weight: 0.2 },
      { assetId: eligible[1]!.id, weight: 0.15 },
    ];
    const risk = runSentinel(eligible, book, DEFAULT_LIMITS);
    expect(risk.concentrationTop).toBeCloseTo(0.2, 3);
  });
});
