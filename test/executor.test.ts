import { describe, it, expect } from "vitest";
import { runExecutor, DEFAULT_EXEC } from "../src/core/agents/executor";
import { RobinhoodAdapter } from "../src/core/mcp/robinhoodAdapter";
import { seedBasket } from "../src/core/orchestrator";
import { buildUniverse } from "../src/core/universe";
import type { Basket } from "../src/core/types";

const universe = buildUniverse();
const adapter = new RobinhoodAdapter({ mode: "paper" });

function emptyBook(): Basket {
  return seedBasket("Test", 1_000_000);
}

const targets = [
  { assetId: "oANTH", weight: 0.4 },
  { assetId: "oTBILL", weight: 0.35 },
  { assetId: "oSTRIPE", weight: 0.25 },
];

describe("runExecutor (paper)", () => {
  it("buys into every target from an empty book", async () => {
    const out = await runExecutor(universe, emptyBook(), targets, adapter, DEFAULT_EXEC);
    expect(out.orders.length).toBe(targets.length);
    expect(out.orders.every((o) => o.side === "buy")).toBe(true);
    expect(out.basket.positions.length).toBe(targets.length);
  });

  it("records a fill for every order", async () => {
    const out = await runExecutor(universe, emptyBook(), targets, adapter, DEFAULT_EXEC);
    expect(out.fills.length).toBe(out.orders.length);
    for (const f of out.fills) {
      expect(f.txHash).toMatch(/^0x[0-9a-f]{64}$/);
      expect(f.feeUsd).toBeGreaterThanOrEqual(0);
    }
  });

  it("respects the no-trade band when already on target", async () => {
    const first = await runExecutor(universe, emptyBook(), targets, adapter, DEFAULT_EXEC);
    // re-running against the freshly built book (same marks) should not churn
    const second = await runExecutor(universe, first.basket, targets, adapter, DEFAULT_EXEC);
    expect(second.orders.length).toBeLessThan(first.orders.length);
  });

  it("orders sells before buys", async () => {
    const book = emptyBook();
    // give the book an oversized position to force a sell on rebalance
    const seeded = await runExecutor(universe, book, [{ assetId: "oANTH", weight: 0.9 }], adapter, DEFAULT_EXEC);
    const rebal = await runExecutor(universe, seeded.basket, targets, adapter, DEFAULT_EXEC);
    const sides = rebal.orders.map((o) => o.side);
    const firstBuy = sides.indexOf("buy");
    const lastSell = sides.lastIndexOf("sell");
    if (firstBuy !== -1 && lastSell !== -1) expect(lastSell).toBeLessThan(firstBuy);
  });

  it("keeps NAV finite and positive", async () => {
    const out = await runExecutor(universe, emptyBook(), targets, adapter, DEFAULT_EXEC);
    expect(Number.isFinite(out.basket.nav)).toBe(true);
    expect(out.basket.nav).toBeGreaterThan(0);
  });
});
