export const usd = (n: number, max = 0) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: max });

export const usdCompact = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 2 });

export const pct = (n: number, digits = 2) => `${n >= 0 ? "+" : ""}${n.toFixed(digits)}%`;
export const pctPlain = (n: number, digits = 1) => `${(n * 100).toFixed(digits)}%`;

export const timeAgo = (t: number) => {
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
};

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

export const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export const classLabel: Record<string, string> = {
  "pre-ipo": "Pre-IPO",
  "rwa-credit": "Private Credit",
  "rwa-realestate": "Real Estate",
  "rwa-treasury": "Treasury",
  "private-fund": "Private Fund",
};
