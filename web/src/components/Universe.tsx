import type { UniverseAsset } from "../api";
import { classLabel, cx, shortAddr } from "../lib/format";
import { Sparkline } from "./Sparkline";

const classTint: Record<string, string> = {
  "pre-ipo": "text-iris-400 border-iris-400/25 bg-iris-400/[0.07]",
  "rwa-credit": "text-mint-400 border-mint-400/25 bg-mint-400/[0.07]",
  "rwa-realestate": "text-amber-400 border-amber-400/25 bg-amber-400/[0.07]",
  "rwa-treasury": "text-emerald-400 border-emerald-400/25 bg-emerald-400/[0.07]",
  "private-fund": "text-grape-400 border-grape-400/25 bg-grape-400/[0.07]",
};

export function Universe({ assets }: { assets: UniverseAsset[] }) {
  return (
    <div>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Investable universe</h3>
          <p className="text-xs text-slate-500">Tokenized private &amp; real-world assets on Robinhood Chain</p>
        </div>
        <span className="mono text-xs text-slate-500">{assets.length} contracts</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {assets.map((a) => (
          <div key={a.id} className="glass glass-hover group p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="mono text-sm font-semibold text-white">{a.ticker}</div>
                <div className="text-xs text-slate-500">{a.name.replace(" (tokenized)", "")}</div>
              </div>
              <span className={cx("chip", classTint[a.class])}>{classLabel[a.class] ?? a.class}</span>
            </div>

            <div className="mt-3 flex items-end justify-between">
              <div>
                <div className="mono text-lg font-semibold text-white">${a.price.toFixed(2)}</div>
                <div className="text-[11px] text-slate-500">
                  {a.yieldApy != null
                    ? `${(a.yieldApy * 100).toFixed(1)}% APY`
                    : `${(a.revenueGrowth * 100).toFixed(0)}% rev growth`}
                </div>
              </div>
              <Sparkline data={a.spark} width={90} height={30} />
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 border-t hairline pt-3 text-center">
              <Stat label="Liquidity" value={`${a.liquidityScore}`} />
              <Stat label="TVL" value={`$${a.onchainTvlM}M`} />
              <Stat label="Vol" value={`${(a.volatility * 100).toFixed(0)}%`} />
            </div>

            <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-600">
              <span className="mono">{shortAddr(a.contract)}</span>
              <span className="opacity-40">·</span>
              <span className="truncate">{a.custodian}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mono text-xs font-medium text-slate-200">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-slate-600">{label}</div>
    </div>
  );
}
