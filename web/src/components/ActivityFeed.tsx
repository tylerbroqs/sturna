import { AnimatePresence, motion } from "framer-motion";
import type { AgentEvent } from "../api";
import { cx, timeAgo } from "../lib/format";

const agentColor: Record<string, string> = {
  Scout: "#C4F03A", Analyst: "#66D9EF", Architect: "#AE81FF",
  Sentinel: "#FD971F", Executor: "#A6E22E", Steward: "#F92672",
};
const levelDot: Record<string, string> = {
  info: "bg-slate-500", decision: "bg-iris-400", warn: "bg-amber-400", success: "bg-mint-400",
};

export function ActivityFeed({ events }: { events: AgentEvent[] }) {
  return (
    <div className="glass flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Agent activity</h3>
          <p className="text-xs text-slate-500">Live reasoning stream</p>
        </div>
        <span className="chip border-mint-400/20 bg-mint-400/[0.06] text-mint-400">
          <span className="h-1.5 w-1.5 rounded-full bg-mint-400 animate-pulse" /> streaming
        </span>
      </div>
      <div className="relative max-h-[460px] flex-1 overflow-y-auto px-5 pb-4">
        <div className="absolute bottom-0 left-[34px] top-0 w-px bg-white/[0.06]" />
        <AnimatePresence initial={false}>
          {events.slice(0, 24).map((e) => (
            <motion.div
              key={e.id}
              layout
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="relative flex gap-3 py-2.5"
            >
              <div className="relative z-10 mt-1">
                <span
                  className="grid h-[18px] w-[18px] place-items-center rounded-full border border-white/10 bg-ink-900"
                  style={{ boxShadow: `0 0 10px -2px ${agentColor[e.agent] ?? "#fff"}` }}
                >
                  <span className={cx("h-1.5 w-1.5 rounded-full", levelDot[e.level])} />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="mono text-[11px] font-semibold" style={{ color: agentColor[e.agent] }}>
                    {e.agent}
                  </span>
                  <span className="text-[10px] text-slate-600">{timeAgo(e.at)}</span>
                </div>
                <div className="text-[13px] font-medium text-slate-200">{e.title}</div>
                <div className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-500">{e.detail}</div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
