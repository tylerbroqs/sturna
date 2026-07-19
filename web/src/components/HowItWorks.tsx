import { motion } from "framer-motion";
import { Radar, Brain, Blocks, ShieldCheck, Send, Activity } from "lucide-react";

const STEPS = [
  { icon: Radar, name: "Scout", role: "Sourcing", color: "#C4F03A",
    desc: "Ingests every tokenized asset on-chain and enforces custody, liquidity and token-maturity gates." },
  { icon: Brain, name: "Analyst", role: "Research", color: "#66D9EF",
    desc: "Scores each name on a five-factor model — growth, quality, momentum, liquidity and thesis-fit." },
  { icon: Blocks, name: "Architect", role: "Construction", color: "#AE81FF",
    desc: "Builds conviction-weighted targets with a volatility penalty, sector caps and an RWA ballast floor." },
  { icon: ShieldCheck, name: "Sentinel", role: "Risk", color: "#FD971F",
    desc: "Independent circuit-breaker: concentration, HHI, weighted vol and 1-day VaR. Can halt the cycle." },
  { icon: Send, name: "Executor", role: "Execution", color: "#A6E22E",
    desc: "Diffs target vs. book and routes minimal-turnover orders through Robinhood MCP or a Chain DEX." },
  { icon: Activity, name: "Steward", role: "Monitoring", color: "#F92672",
    desc: "Marks the book to market between cycles and flags drift beyond tolerance for the next rebalance." },
];

export function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-7xl px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <span className="chip border-iris-400/20 bg-iris-400/[0.06] text-iris-400">The swarm</span>
        <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Six agents. One continuous investment loop.
        </h2>
        <p className="mt-4 text-slate-400">
          Each agent owns one decision and hands off to the next. Every step is inspectable — and Sentinel
          can stop the whole desk before a single order is placed.
        </p>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((s, i) => (
          <motion.div
            key={s.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
            className="glass glass-hover group relative overflow-hidden p-6"
          >
            <div
              className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-40"
              style={{ background: s.color }}
            />
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.03]"
                   style={{ color: s.color }}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="mono text-xs uppercase tracking-wider" style={{ color: s.color }}>{`0${i + 1}`}</div>
                <div className="text-base font-semibold text-white">{s.name}</div>
              </div>
              <span className="ml-auto text-[11px] uppercase tracking-wide text-slate-500">{s.role}</span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">{s.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
