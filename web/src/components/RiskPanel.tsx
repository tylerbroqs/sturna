import { ShieldCheck, ShieldAlert, Plug, Radio } from "lucide-react";
import type { Overview } from "../api";
import { cx, pctPlain } from "../lib/format";

function Gauge({ label, value, max, danger }: { label: string; value: number; max: number; danger: boolean }) {
  const frac = Math.min(1, value / max);
  return (
    <div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-slate-500">{label}</span>
        <span className={cx("mono", danger ? "text-amber-400" : "text-slate-300")}>{(value * 100).toFixed(1)}%</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={cx("h-full rounded-full", danger ? "bg-amber-400" : "grad-mint")}
          style={{ width: `${frac * 100}%` }}
        />
      </div>
    </div>
  );
}

export function RiskPanel({ overview }: { overview: Overview }) {
  const risk = overview.risk;
  const drift = overview.drift;
  const adapter = overview.adapter;
  const approved = risk?.verdict !== "rejected";

  return (
    <div className="flex h-full flex-col gap-4">
      {/* risk card */}
      <div className="glass p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Risk & controls</h3>
            <p className="text-xs text-slate-500">Sentinel circuit-breaker</p>
          </div>
          <span
            className={cx(
              "chip",
              approved ? "border-mint-400/30 bg-mint-400/10 text-mint-400" : "border-pink-500/30 bg-pink-500/10 text-pink-400"
            )}
          >
            {approved ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
            {risk?.verdict ?? "—"}
          </span>
        </div>

        {risk && (
          <div className="space-y-3">
            <Gauge label="Top position" value={risk.concentrationTop} max={0.25} danger={risk.concentrationTop > 0.22} />
            <Gauge label="Concentration (HHI)" value={risk.hhi} max={0.22} danger={risk.hhi > 0.2} />
            <Gauge label="Weighted vol" value={risk.weightedVol} max={0.5} danger={risk.weightedVol > 0.45} />
            <Gauge label="1-day 95% VaR" value={risk.var95} max={0.09} danger={risk.var95 > 0.08} />
            <div className="flex items-center justify-between border-t hairline pt-3 text-[11px]">
              <span className="text-slate-500">Book drift</span>
              <span className={cx("mono", drift.rebalanceRecommended ? "text-amber-400" : "text-slate-300")}>
                max {pctPlain(drift.maxDrift)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* MCP connection card */}
      <div className="glass relative overflow-hidden p-5">
        <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-mint-400 opacity-10 blur-2xl" />
        <div className="flex items-center gap-2">
          <Plug className="h-4 w-4 text-mint-400" />
          <h3 className="text-sm font-semibold text-white">Execution venue</h3>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className={cx("h-2 w-2 rounded-full", adapter.ready ? "bg-mint-400 animate-pulse" : "bg-amber-400")} />
          <span className="text-sm font-medium text-white capitalize">{adapter.mode.replace("-", " ")}</span>
          <span className="ml-auto chip border-white/10 bg-white/[0.03] text-slate-400">
            {adapter.ready ? "ready" : "arm token"}
          </span>
        </div>
        <div className="mt-3 rounded-lg border hairline bg-black/30 p-3">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500">
            <Radio className="h-3 w-3" /> Robinhood Trading MCP
          </div>
          <div className="mono mt-1 truncate text-xs text-mint-400">{overview.endpoints.trading}</div>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-slate-500">{adapter.note}</p>
      </div>
    </div>
  );
}
