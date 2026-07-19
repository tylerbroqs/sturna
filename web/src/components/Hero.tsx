import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Boxes, Cpu } from "lucide-react";

const BOOT: { tag: string; color: string; text: string }[] = [
  { tag: "scout", color: "#C4F03A", text: "scanning 14 tokenized assets … 14 eligible" },
  { tag: "analyst", color: "#66D9EF", text: "scoring · mandate = ai-frontier-growth" },
  { tag: "architect", color: "#AE81FF", text: "target book · 8 names · rwa ballast 15%" },
  { tag: "sentinel", color: "#FD971F", text: "risk OK · var95 3.2% · hhi 0.13" },
  { tag: "executor", color: "#A6E22E", text: "routed 8 orders → agent.robinhood.com/mcp" },
  { tag: "steward", color: "#F92672", text: "nav $1.02M · drift 0.4% · monitoring" },
];

function Terminal() {
  return (
    <div className="glass scanlines relative overflow-hidden">
      <div className="term-bar">
        <span className="term-dot" style={{ background: "#3a4034" }} />
        <span className="term-dot" style={{ background: "#3a4034" }} />
        <span className="term-dot" style={{ background: "#C4F03A" }} />
        <span className="ml-2 text-xs text-[#6f7a66]">sturna@robinhood-chain: ~/desk</span>
      </div>
      <div className="space-y-1.5 p-5 text-[13px] leading-relaxed">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="text-[#c3d0b6]"
        >
          <span className="text-mint-400">› </span>sturna init --chain robinhood --mode paper
        </motion.div>
        {BOOT.map((l, i) => (
          <motion.div
            key={l.tag}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 + i * 0.28, duration: 0.25 }}
            className="flex gap-2"
          >
            <span className="w-[92px] shrink-0" style={{ color: l.color }}>
              [{l.tag}]
            </span>
            <span className="text-[#8b967e]">{l.text}</span>
          </motion.div>
        ))}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 + BOOT.length * 0.28 + 0.2 }}
          className="pt-1 text-mint-400"
        >
          &gt; desk live<span className="cursor" />
        </motion.div>
      </div>
    </div>
  );
}

export function Hero({ onEnter }: { onEnter: () => void }) {
  return (
    <section className="relative overflow-hidden">
      <div className="grid-noise absolute inset-0" />
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-16 pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:pb-24 lg:pt-20">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="chip border-mint-400/20 bg-mint-400/[0.06] text-mint-400"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-mint-400" />
            </span>
            live on robinhood chain · agentic mcp
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05 }}
            className="mt-6 font-display text-5xl font-extrabold leading-[1.04] tracking-tight text-white sm:text-6xl lg:text-[4.1rem]"
          >
            The autonomous
            <br />
            <span className="grad-text">private-markets desk.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.12 }}
            className="mt-6 max-w-xl text-[15px] leading-relaxed text-[#8b967e]"
          >
            A swarm of six AI agents sources, scores, constructs and rebalances a basket of
            tokenized pre-IPO &amp; real-world assets — settling on Robinhood Chain and routing
            through the official Robinhood agentic trading MCP.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <button onClick={onEnter} className="btn-primary">
              Enter the live desk <ArrowRight className="h-4 w-4" />
            </button>
            <a href="#how" className="btn-ghost">./how-the-swarm-works</a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.35 }}
            className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-[13px] text-[#6f7a66]"
          >
            <span className="inline-flex items-center gap-2"><Boxes className="h-4 w-4 text-mint-400" /> 14 tokenized assets</span>
            <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-iris-400" /> risk circuit-breaker</span>
            <span className="inline-flex items-center gap-2"><Cpu className="h-4 w-4 text-grape-400" /> six specialized agents</span>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          <Terminal />
        </motion.div>
      </div>
    </section>
  );
}
