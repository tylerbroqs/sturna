import { describe, it, expect } from "vitest";
import { runScout, DEFAULT_SCOUT } from "../src/core/agents/scout";
import { buildUniverse } from "../src/core/universe";
import type { Asset } from "../src/core/types";

function assetWith(overrides: Partial<Asset>): Asset {
  const base = buildUniverse()[0]!;
  return { ...base, ...overrides };
}

describe("runScout", () => {
  it("passes every eligible name in the default universe", () => {
    const { eligible, rejected } = runScout(buildUniverse(), DEFAULT_SCOUT);
    expect(eligible.length + rejected.length).toBe(buildUniverse().length);
    // the seeded universe is designed to clear the default gates
    expect(eligible.length).toBe(buildUniverse().length);
    expect(rejected).toHaveLength(0);
  });

  it("rejects a name below the liquidity floor", () => {
    const thin = assetWith({ id: "oTHIN", ticker: "oTHIN", liquidityScore: 10 });
    const { eligible, rejected } = runScout([thin], DEFAULT_SCOUT);
    expect(eligible).toHaveLength(0);
    expect(rejected[0]!.reason).toMatch(/liquidity/);
  });

  it("rejects a token younger than the maturity floor", () => {
    const fresh = assetWith({ id: "oNEW", ticker: "oNEW", inceptionDays: 5 });
    const { rejected } = runScout([fresh], DEFAULT_SCOUT);
    expect(rejected[0]!.reason).toMatch(/age/);
  });

  it("rejects a name below the TVL floor", () => {
    const small = assetWith({ id: "oSMALL", ticker: "oSMALL", onchainTvlM: 1 });
    const { rejected } = runScout([small], DEFAULT_SCOUT);
    expect(rejected[0]!.reason).toMatch(/TVL/);
  });

  it("honors custom, stricter config", () => {
    const strict = { minLiquidity: 99, minInceptionDays: 90, minTvlM: 25 };
    const { eligible } = runScout(buildUniverse(), strict);
    expect(eligible.length).toBeLessThan(buildUniverse().length);
  });
});
