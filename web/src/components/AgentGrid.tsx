import { motion } from "framer-motion";
import type { AgentMeta } from "../api";

export function AgentGrid({ agents, running }: { agents: AgentMeta[]; running: boolean }) {
  return (
    <div className="glass p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">The swarm</h3>
          <p className="text-xs text-slate-500">Six specialized agents · handoff pipeline</p>
        </div>
        <span className="mono text-xs text-slate-500">Scout → Analyst → Architect → Sentinel → Executor → Steward</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {agents.map((a, i) => (
          <motion.div
            key={a.name}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="group relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 transition-all hover:border-white/[0.12]"
          >
            <div className="flex items-center justify-between">
              <div className="relative grid h-9 w-9 place-items-center rounded-lg" style={{ background: `${a.color}18` }}>
                <span className="h-2 w-2 rounded-full" style={{ background: a.color }} />
                <motion.span
                  className="absolute inset-0 rounded-lg border"
                  style={{ borderColor: `${a.color}44` }}
                  animate={running ? { opacity: [0.2, 1, 0.2], scale: [1, 1.06, 1] } : { opacity: 0.3 }}
                  transition={{ duration: 1.2, repeat: running ? Infinity : 0, delay: i * 0.15 }}
                />
              </div>
              <span className="text-[10px] uppercase tracking-wider" style={{ color: a.color }}>{a.role}</span>
            </div>
            <div className="mt-2.5 text-sm font-semibold text-white">{a.name}</div>
            <p className="mt-1 text-[11px] leading-snug text-slate-500">{a.blurb}</p>
            <div className="mt-2.5 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-mint-400" />
              <span className="text-[10px] text-slate-500">{running ? "working" : "online"}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
