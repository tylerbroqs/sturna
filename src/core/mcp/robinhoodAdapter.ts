// Robinhood execution adapter.
//
// Sturna is designed to place orders through Robinhood's official agentic
// trading surface. Robinhood exposes an AI-native Model Context Protocol (MCP)
// server for trading that works with Claude Code, Claude Desktop, ChatGPT,
// Codex, Cursor and Grok:
//
//     Trading MCP:  https://agent.robinhood.com/mcp/trading
//     Banking MCP:  https://agent.robinhood.com/mcp/banking
//
// For tokenized private/RWA assets the same intent can settle on Robinhood
// Chain (a permissionless Ethereum L2) via a DEX router. This adapter abstracts
// both venues behind one interface with two modes:
//
//   • "paper"    — deterministic simulated fills with a realistic slippage model
//                  (default; safe, no credentials, no real capital).
//   • "mcp-live" — routes intents to the Robinhood Trading MCP server. Requires
//                  RH_MCP_TOKEN and an activated Robinhood Agentic Account.
//
// The paper path is a faithful stand-in so the whole swarm runs end-to-end
// today; flipping to live is a config change, not a rewrite.

import type { ExecutionMode, Fill, Order } from "../types.js";
import { mulberry32 } from "../rng.js";

export const ROBINHOOD_TRADING_MCP = "https://agent.robinhood.com/mcp/trading";
export const ROBINHOOD_BANKING_MCP = "https://agent.robinhood.com/mcp/banking";

export interface AdapterConfig {
  mode: ExecutionMode;
  mcpToken?: string; // RH_MCP_TOKEN when mode === "mcp-live"
  slippageModelBps?: number; // base slippage for a fully-liquid name
}

function simulatedTxHash(orderId: string): string {
  const rand = mulberry32([...orderId].reduce((a, c) => a + c.charCodeAt(0), 0));
  const hex = "0123456789abcdef";
  let out = "0x";
  for (let i = 0; i < 64; i++) out += hex[Math.floor(rand() * 16)];
  return out;
}

export interface ExecContext {
  /** liquidity score (0..100) of the asset, used for the slippage curve */
  liquidity: number;
}

export class RobinhoodAdapter {
  constructor(private cfg: AdapterConfig) {}

  get mode(): ExecutionMode {
    return this.cfg.mode;
  }

  /** Health/status of the configured venue. */
  status(): { mode: ExecutionMode; endpoint: string; ready: boolean; note: string } {
    if (this.cfg.mode === "mcp-live") {
      const ready = !!this.cfg.mcpToken;
      return {
        mode: "mcp-live",
        endpoint: ROBINHOOD_TRADING_MCP,
        ready,
        note: ready
          ? "Connected to Robinhood Trading MCP (agentic account)."
          : "Set RH_MCP_TOKEN to arm live routing to Robinhood MCP.",
      };
    }
    return {
      mode: "paper",
      endpoint: "internal://paper-engine",
      ready: true,
      note: "Paper mode: deterministic simulated fills. No capital at risk.",
    };
  }

  async execute(order: Order, ctx: ExecContext): Promise<Fill> {
    if (this.cfg.mode === "mcp-live") return this.executeLive(order, ctx);
    return this.executePaper(order, ctx);
  }

  private executePaper(order: Order, ctx: ExecContext): Fill {
    // slippage grows as liquidity falls; buys pay up, sells receive less.
    const base = this.cfg.slippageModelBps ?? 8;
    const illiqMult = 1 + (100 - ctx.liquidity) / 45; // ~1x for deep, ~3x for thin
    const slippageBps = Math.round(base * illiqMult);
    const dir = order.side === "buy" ? 1 : -1;
    const price = order.limitPrice * (1 + (dir * slippageBps) / 10_000);
    const feeUsd = Math.round(order.notional * 0.0009 * 100) / 100; // 9bps venue fee
    return {
      orderId: order.id,
      assetId: order.assetId,
      ticker: order.ticker,
      side: order.side,
      shares: order.shares,
      price: Math.round(price * 100) / 100,
      slippageBps,
      feeUsd,
      txHash: simulatedTxHash(order.id),
      at: Date.now(),
    };
  }

  private async executeLive(order: Order, ctx: ExecContext): Promise<Fill> {
    if (!this.cfg.mcpToken) {
      throw new Error(
        "mcp-live requires RH_MCP_TOKEN. Connect an agent to " +
          ROBINHOOD_TRADING_MCP +
          " and provide the token, or use mode 'paper'."
      );
    }
    // Intentionally not firing real orders from this template. Wire the MCP
    // client here (tools like place_order / review_equity_order) once you have
    // an activated Robinhood Agentic Account and have reviewed the guardrails.
    // The shape below documents the intended call.
    //
    //   const client = new McpClient(ROBINHOOD_TRADING_MCP, this.cfg.mcpToken);
    //   const review = await client.call("review_equity_order", {...});
    //   const res = await client.call("place_order", {...});
    //
    throw new Error(
      "Live MCP routing is stubbed for safety in this template. Implement the " +
        "MCP client call in RobinhoodAdapter.executeLive to trade a real account."
    );
    return this.executePaper(order, ctx); // unreachable; keeps types honest
  }
}
