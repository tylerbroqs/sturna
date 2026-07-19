// The investable universe: tokenized private-market & real-world assets as they
// would appear on Robinhood Chain (permissionless EVM L2 for tokenized RWAs).
//
// NOTE: valuations, prices and on-chain metrics below are SIMULATED for a paper
// portfolio. Wire `RobinhoodChainAdapter` to live token contracts / a quotes
// feed to replace the seeded marks with real data.

import type { Asset, AssetClass } from "./types";
import { gbmPath, mulberry32, round2 } from "./rng";

interface Seed {
  ticker: string;
  name: string;
  cls: AssetClass;
  sector: string;
  valuationB: number; // implied enterprise / pool valuation $B
  tokenPrice: number; // $/token starting mark
  drift: number; // annualized expected return
  vol: number; // annualized vol
  revGrowth: number;
  margin: number;
  yieldApy: number | null;
  liquidity: number; // 0..100
  tvlM: number;
  custodian: string;
  inceptionDays: number;
  thesis: string;
}

const SEEDS: Seed[] = [
  {
    ticker: "oSPACEX", name: "SpaceX (tokenized)", cls: "pre-ipo", sector: "Aerospace & Defense",
    valuationB: 350, tokenPrice: 212.4, drift: 0.34, vol: 0.52, revGrowth: 0.58, margin: 0.31,
    yieldApy: null, liquidity: 74, tvlM: 128, custodian: "BitGo Trust", inceptionDays: 190,
    thesis: "Starlink cash-flow inflection + reusable-launch monopoly; pre-IPO scarcity premium.",
  },
  {
    ticker: "oOPENAI", name: "OpenAI (tokenized)", cls: "pre-ipo", sector: "Artificial Intelligence",
    valuationB: 500, tokenPrice: 318.9, drift: 0.41, vol: 0.68, revGrowth: 1.9, margin: 0.18,
    yieldApy: null, liquidity: 81, tvlM: 205, custodian: "BitGo Trust", inceptionDays: 150,
    thesis: "Frontier-model demand curve + enterprise API attach; highest-beta AI exposure on-chain.",
  },
  {
    ticker: "oSTRIPE", name: "Stripe (tokenized)", cls: "pre-ipo", sector: "Fintech Infrastructure",
    valuationB: 95, tokenPrice: 41.2, drift: 0.22, vol: 0.38, revGrowth: 0.29, margin: 0.44,
    yieldApy: null, liquidity: 77, tvlM: 96, custodian: "BitGo Trust", inceptionDays: 240,
    thesis: "Payments primitive of the internet economy; durable take-rate + stablecoin optionality.",
  },
  {
    ticker: "oDBRX", name: "Databricks (tokenized)", cls: "pre-ipo", sector: "Data & Analytics",
    valuationB: 62, tokenPrice: 58.7, drift: 0.27, vol: 0.44, revGrowth: 0.5, margin: 0.4,
    yieldApy: null, liquidity: 69, tvlM: 74, custodian: "BitGo Trust", inceptionDays: 210,
    thesis: "Lakehouse consolidation + AI training workloads; pre-IPO with clear public comps.",
  },
  {
    ticker: "oANTH", name: "Anthropic (tokenized)", cls: "pre-ipo", sector: "Artificial Intelligence",
    valuationB: 183, tokenPrice: 142.5, drift: 0.38, vol: 0.63, revGrowth: 2.4, margin: 0.2,
    yieldApy: null, liquidity: 72, tvlM: 141, custodian: "BitGo Trust", inceptionDays: 120,
    thesis: "Enterprise-safe frontier models; fastest revenue ramp in the cohort.",
  },
  {
    ticker: "oCHIME", name: "Chime (tokenized)", cls: "pre-ipo", sector: "Consumer Fintech",
    valuationB: 25, tokenPrice: 19.8, drift: 0.16, vol: 0.4, revGrowth: 0.24, margin: 0.35,
    yieldApy: null, liquidity: 58, tvlM: 40, custodian: "BitGo Trust", inceptionDays: 300,
    thesis: "Neobank primary-account growth; interchange engine with improving unit economics.",
  },
  {
    ticker: "oRAMP", name: "Ramp (tokenized)", cls: "pre-ipo", sector: "Fintech Infrastructure",
    valuationB: 22, tokenPrice: 27.4, drift: 0.31, vol: 0.47, revGrowth: 0.9, margin: 0.38,
    yieldApy: null, liquidity: 55, tvlM: 33, custodian: "BitGo Trust", inceptionDays: 160,
    thesis: "Spend-management + AI back-office; high net-revenue retention.",
  },
  {
    ticker: "oCANVA", name: "Canva (tokenized)", cls: "pre-ipo", sector: "Creative Software",
    valuationB: 40, tokenPrice: 33.1, drift: 0.19, vol: 0.36, revGrowth: 0.4, margin: 0.55,
    yieldApy: null, liquidity: 61, tvlM: 47, custodian: "BitGo Trust", inceptionDays: 280,
    thesis: "Prosumer design at scale + AI features; profitable growth, IPO-ready.",
  },
  {
    ticker: "oREVOLUT", name: "Revolut (tokenized)", cls: "pre-ipo", sector: "Consumer Fintech",
    valuationB: 45, tokenPrice: 36.6, drift: 0.24, vol: 0.43, revGrowth: 0.62, margin: 0.33,
    yieldApy: null, liquidity: 60, tvlM: 52, custodian: "BitGo Trust", inceptionDays: 220,
    thesis: "Global super-app expansion; multi-product cross-sell across 40M+ users.",
  },
  {
    ticker: "oEPIC", name: "Epic Games (tokenized)", cls: "pre-ipo", sector: "Interactive Media",
    valuationB: 32, tokenPrice: 24.9, drift: 0.14, vol: 0.49, revGrowth: 0.18, margin: 0.3,
    yieldApy: null, liquidity: 53, tvlM: 29, custodian: "BitGo Trust", inceptionDays: 320,
    thesis: "Unreal Engine platform tax + Fortnite metaverse rails; regulatory optionality vs app stores.",
  },
  // --- Real-world asset sleeves ---
  {
    ticker: "oTBILL", name: "Tokenized US T-Bill Ladder", cls: "rwa-treasury", sector: "Government Credit",
    valuationB: 0, tokenPrice: 100.6, drift: 0.048, vol: 0.012, revGrowth: 0, margin: 1,
    yieldApy: 0.0485, liquidity: 92, tvlM: 640, custodian: "BitGo / Chainlink PoR", inceptionDays: 400,
    thesis: "On-chain cash proxy; ~4.85% risk-free carry with daily liquidity — the swarm's ballast.",
  },
  {
    ticker: "oPCRED", name: "Private Credit Pool A", cls: "rwa-credit", sector: "Private Credit",
    valuationB: 0, tokenPrice: 101.9, drift: 0.11, vol: 0.06, revGrowth: 0, margin: 1,
    yieldApy: 0.108, liquidity: 66, tvlM: 210, custodian: "BitGo / attested", inceptionDays: 260,
    thesis: "Senior-secured mid-market loans; double-digit yield, low correlation to equity beta.",
  },
  {
    ticker: "oREIT", name: "Tokenized Logistics RE", cls: "rwa-realestate", sector: "Real Estate",
    valuationB: 0, tokenPrice: 52.3, drift: 0.07, vol: 0.14, revGrowth: 0.05, margin: 0.7,
    yieldApy: 0.062, liquidity: 49, tvlM: 88, custodian: "BitGo / appraised", inceptionDays: 350,
    thesis: "Last-mile warehouse income; inflation-linked rents as a real-asset hedge.",
  },
  {
    ticker: "oVCFUND", name: "Seed-Stage VC Index", cls: "private-fund", sector: "Venture Capital",
    valuationB: 0, tokenPrice: 68.4, drift: 0.21, vol: 0.34, revGrowth: 0, margin: 1,
    yieldApy: null, liquidity: 44, tvlM: 61, custodian: "BitGo / NAV-attested", inceptionDays: 300,
    thesis: "Diversified early-stage exposure; power-law upside without single-name risk.",
  },
];

function contractAddr(seed: number): string {
  const rand = mulberry32(seed * 2654435761);
  const hex = "0123456789abcdef";
  let out = "0x";
  for (let i = 0; i < 40; i++) out += hex[Math.floor(rand() * 16)];
  return out;
}

export function buildUniverse(): Asset[] {
  return SEEDS.map((s, i) => {
    const history = gbmPath({
      start: s.tokenPrice,
      drift: s.drift,
      vol: s.vol,
      days: 120,
      seed: 1000 + i * 37,
    });
    const last = history[history.length - 1]!.price;
    return {
      id: s.ticker,
      name: s.name,
      ticker: s.ticker,
      class: s.cls,
      sector: s.sector,
      chain: "Robinhood Chain",
      contract: contractAddr(i + 1),
      lastValuation: last,
      impliedValuationB: s.valuationB,
      revenueGrowth: s.revGrowth,
      grossMargin: s.margin,
      yieldApy: s.yieldApy,
      liquidityScore: s.liquidity,
      volatility: s.vol,
      onchainTvlM: s.tvlM,
      custodian: s.custodian,
      inceptionDays: s.inceptionDays,
      thesis: s.thesis,
      history,
    } satisfies Asset;
  });
}

export function priceReturn(asset: Asset, lookbackDays: number): number {
  const h = asset.history;
  if (h.length < 2) return 0;
  const end = h[h.length - 1]!.price;
  const startIdx = Math.max(0, h.length - 1 - lookbackDays);
  const start = h[startIdx]!.price;
  return round2(((end - start) / start) * 100) / 100;
}
