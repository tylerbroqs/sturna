import { describe, it, expect } from "vitest";
import { mulberry32, gaussian, gbmPath, pick } from "../src/core/rng.js";

describe("mulberry32", () => {
  it("is deterministic for a given seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = [a(), a(), a()];
    const seqB = [b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it("produces values in [0, 1)", () => {
    const r = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("gives different streams for different seeds", () => {
    expect(mulberry32(1)()).not.toEqual(mulberry32(2)());
  });
});

describe("gaussian", () => {
  it("has an approximately standard-normal mean over many draws", () => {
    const r = mulberry32(123);
    let sum = 0;
    const n = 20_000;
    for (let i = 0; i < n; i++) sum += gaussian(r);
    expect(Math.abs(sum / n)).toBeLessThan(0.05); // mean near 0
  });
});

describe("gbmPath", () => {
  it("returns days+1 bars, all positive, with a deterministic price path", () => {
    const opts = { start: 100, drift: 0.1, vol: 0.3, days: 30, seed: 5 };
    const path = gbmPath(opts);
    expect(path).toHaveLength(31);
    expect(path.every((b) => b.price > 0)).toBe(true);
    // prices are seed-deterministic (only the timestamps track wall-clock time)
    expect(gbmPath(opts).map((b) => b.price)).toEqual(path.map((b) => b.price));
  });
});

describe("pick", () => {
  it("always returns a member of the array", () => {
    const r = mulberry32(9);
    const arr = ["a", "b", "c"] as const;
    for (let i = 0; i < 50; i++) expect(arr).toContain(pick(r, arr));
  });
});
