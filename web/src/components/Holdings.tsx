import type { Basket, UniverseAsset } from "../api";
import { cx, pct, usd } from "../lib/format";
import { Sparkline } from "./Sparkline";

const convStyle: Record<string, string> = {
  high: "border-mint-400/30 bg-mint-400/10 text-mint-400",
  medium: "border-iris-400/30 bg-iris-400/10 text-iris-400",
  low: "border-slate-500/30 bg-slate-500/10 text-slate-400",
};

export function Holdings({ basket, universe }: { basket: Basket; universe: UniverseAsset[] }) {
  const sparkOf = (id: string) => universe.find((u) => u.id === id)?.spark ?? [];
  const maxW = Math.max(...basket.positions.map((p) => p.currentWeight), 0.01);

  return (
    <div className="glass overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Basket holdings</h3>
          <p className="text-xs text-slate-500">{basket.positions.length} tokenized positions · marked live</p>
        </div>
        <span className="chip border-white/10 bg-white/[0.03] text-slate-400">{basket.strategy}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y hairline text-[11px] uppercase tracking-wider text-slate-500">
              <th className="px-5 py-2.5 text-left font-medium">Asset</th>
              <th className="px-3 py-2.5 text-right font-medium">Weight</th>
              <th className="px-3 py-2.5 text-right font-medium hidden sm:table-cell">Mark</th>
              <th className="px-3 py-2.5 text-right font-medium">Value</th>
              <th className="px-3 py-2.5 text-right font-medium">P&amp;L</th>
              <th className="px-3 py-2.5 text-center font-medium hidden md:table-cell">Conviction</th>
              <th className="px-5 py-2.5 text-right font-medium hidden lg:table-cell">30d</th>
            </tr>
          </thead>
          <tbody>
            {basket.positions.map((p) => (
              <tr key={p.assetId} className="border-b hairline transition-colors hover:bg-white/[0.02]">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-white/[0.04] mono text-[10px] text-mint-400">
                      {p.ticker.replace("o", "").slice(0, 3)}
                    </div>
                    <div>
                      <div className="mono text-[13px] font-medium text-white">{p.ticker}</div>
                      <div className="text-xs text-slate-500">{p.name.replace(" (tokenized)", "")}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-right">
                  <div className="mono text-white">{(p.currentWeight * 100).toFixed(1)}%</div>
                  <div className="mt-1 ml-auto h-1 w-16 overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="h-full grad-mint" style={{ width: `${(p.currentWeight / maxW) * 100}%` }} />
                  </div>
                </td>
                <td className="px-3 py-3 text-right mono text-slate-300 hidden sm:table-cell">${p.markPrice.toFixed(2)}</td>
                <td className="px-3 py-3 text-right mono text-slate-200">{usd(p.marketValue)}</td>
                <td className={cx("px-3 py-3 text-right mono", p.unrealizedPnlPct >= 0 ? "text-mint-400" : "text-pink-400")}>
                  {pct(p.unrealizedPnlPct)}
                </td>
                <td className="px-3 py-3 text-center hidden md:table-cell">
                  <span className={cx("chip", convStyle[p.conviction])}>{p.conviction}</span>
                </td>
                <td className="px-5 py-3 hidden lg:table-cell">
                  <div className="flex justify-end">
                    <Sparkline data={sparkOf(p.assetId)} width={84} height={26} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
