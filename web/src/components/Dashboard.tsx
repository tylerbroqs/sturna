import { forwardRef, useState } from "react";
import { motion } from "framer-motion";
import { Play, Loader2, TrendingUp, Gauge, Coins, Percent, ArrowDownRight } from "lucide-react";
import { api, usePoll } from "../api";
import { cx, pct, usd, usdCompact, pctPlain } from "../lib/format";
import { NavChart } from "./NavChart";
import { Holdings } from "./Holdings";
import { ActivityFeed } from "./ActivityFeed";
import { Universe } from "./Universe";
import { AgentGrid } from "./AgentGrid";
import { RiskPanel } from "./RiskPanel";

export const Dashboard = forwardRef<HTMLDivElement>((_, ref) => {
  const overview = usePoll(api.overview, 4000);
  const basket = usePoll(api.basket, 4000);
  const nav = usePoll(api.nav, 4000);
  const activity = usePoll(api.activity, 3000);
  const universe = usePoll(api.universe, 6000);
  const [running, setRunning] = useState(false);

  const refreshAll = () => {
    overview.refresh(); basket.refresh(); nav.refresh(); activity.refresh(); universe.refresh();
  };

  const runCycle = async () => {
    setRunning(true);
    try {
      await api.runCycle();
      // give the feed a beat, then pull fresh state
      setTimeout(refreshAll, 250);
      setTimeout(refreshAll, 900);
    } finally {
      setTimeout(() => setRunning(false), 1100);
    }
  };

  const setMandate = async (key: string) => {
    setRunning(true);
    try {
      await api.setMandate(key);
      setTimeout(refreshAll, 250);
    } finally {
      setTimeout(() => setRunning(false), 900);
    }
  };

  const m = overview.data?.metrics;

  return (
    <section ref={ref} id="desk" className="mx-auto max-w-7xl scroll-mt-20 px-6 py-14">
      {/* control bar */}
      <div className="glass mb-6 flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl grad-mint text-ink-950">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white">Sturna Flagship</h2>
              <span className="chip border-mint-400/20 bg-mint-400/[0.06] text-mint-400">
                <span className="h-1.5 w-1.5 rounded-full bg-mint-400 animate-pulse" />
                {overview.data?.mode ?? "paper"} · live
              </span>
            </div>
            <p className="text-xs text-slate-500">{overview.data?.mandate.name ?? "…"} mandate</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {overview.data?.mandates.map((md) => (
            <button
              key={md.key}
              onClick={() => setMandate(md.key)}
              disabled={running}
              className={cx(
                "rounded-lg border px-3 py-2 text-xs font-medium transition-all disabled:opacity-50",
                overview.data?.mandate.key === md.key
                  ? "border-mint-400/40 bg-mint-400/10 text-mint-400"
                  : "border-white/10 bg-white/[0.02] text-slate-400 hover:text-white"
              )}
            >
              {md.name}
            </button>
          ))}
          <button onClick={runCycle} disabled={running} className="btn-primary ml-1">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {running ? "Running swarm…" : "Run cycle"}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Kpi label="Net asset value" value={m ? usd(m.nav) : "—"} sub={m ? `${m.cyclesRun} cycles run` : ""} icon={Coins} accent="#C4F03A" big />
        <Kpi label="Total return" value={m ? pct(m.totalReturnPct) : "—"} sub="since inception" icon={TrendingUp} accent={m && m.totalReturnPct >= 0 ? "#C4F03A" : "#F92672"} positive={m ? m.totalReturnPct >= 0 : undefined} />
        <Kpi label="Alpha vs bench" value={m ? pct(m.alphaPct) : "—"} sub={m ? `bench ${pct(m.benchReturnPct)}` : ""} icon={Percent} accent="#66D9EF" positive={m ? m.alphaPct >= 0 : undefined} />
        <Kpi label="Sharpe" value={m ? m.sharpe.toFixed(2) : "—"} sub="annualized" icon={Gauge} accent="#AE81FF" />
        <Kpi label="Max drawdown" value={m ? pct(m.maxDrawdownPct) : "—"} sub="peak-to-trough" icon={ArrowDownRight} accent="#FD971F" />
      </div>

      {/* main grid */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="glass p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Equity curve</h3>
                <p className="text-xs text-slate-500">Sturna NAV vs. equal-weight benchmark</p>
              </div>
              <div className="text-right">
                <div className="mono text-lg font-semibold text-white">{m ? usdCompact(m.nav) : "—"}</div>
                <div className={cx("text-xs mono", m && m.totalReturnPct >= 0 ? "text-mint-400" : "text-pink-400")}>
                  {m ? pct(m.totalReturnPct) : ""}
                </div>
              </div>
            </div>
            <div className="h-[240px]">{nav.data && <NavChart data={nav.data} />}</div>
          </div>
        </div>
        <div>{activity.data && <ActivityFeed events={activity.data} />}</div>
      </div>

      {/* agents */}
      <div className="mt-4">
        {overview.data && <AgentGrid agents={overview.data.agents} running={running} />}
      </div>

      {/* holdings + risk */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">{basket.data && universe.data && <Holdings basket={basket.data} universe={universe.data} />}</div>
        <div>{overview.data && <RiskPanel overview={overview.data} />}</div>
      </div>

      {/* universe */}
      <div className="mt-10">{universe.data && <Universe assets={universe.data} />}</div>
    </section>
  );
});
Dashboard.displayName = "Dashboard";

function Kpi({
  label, value, sub, icon: Icon, accent, positive, big,
}: {
  label: string; value: string; sub: string; icon: any; accent: string; positive?: boolean; big?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cx("glass glass-hover relative overflow-hidden p-4", big && "col-span-2 lg:col-span-1")}
    >
      <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full opacity-20 blur-2xl" style={{ background: accent }} />
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-slate-500">{label}</span>
        <Icon className="h-4 w-4" style={{ color: accent }} />
      </div>
      <div
        className={cx("mono mt-2 font-semibold tabular-nums", big ? "text-2xl" : "text-xl",
          positive === undefined ? "text-white" : positive ? "text-mint-400" : "text-pink-400")}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[11px] text-slate-500">{sub}</div>
    </motion.div>
  );
}
