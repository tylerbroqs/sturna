// Deterministic, seedable RNG + geometric-brownian-motion price paths.
// Deterministic so the demo universe is stable across restarts but still "alive".

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box–Muller standard normal from a uniform generator. */
export function gaussian(rand: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export interface GbmOptions {
  start: number;
  drift: number; // annualized
  vol: number; // annualized
  days: number;
  seed: number;
  stepMs?: number;
}

/** Generate a geometric brownian motion price path (daily steps by default). */
export function gbmPath(opts: GbmOptions): { t: number; price: number }[] {
  const rand = mulberry32(opts.seed);
  const dt = 1 / 252;
  const stepMs = opts.stepMs ?? 24 * 60 * 60 * 1000;
  const now = Date.now();
  const bars: { t: number; price: number }[] = [];
  let price = opts.start;
  for (let i = opts.days; i >= 0; i--) {
    const shock = gaussian(rand);
    const growth = (opts.drift - 0.5 * opts.vol * opts.vol) * dt + opts.vol * Math.sqrt(dt) * shock;
    price = Math.max(0.01, price * Math.exp(growth));
    bars.push({ t: now - i * stepMs, price: round2(price) });
  }
  return bars;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function pick<T>(rand: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)]!;
}
