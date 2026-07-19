import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { NavPoint } from "../api";
import { usdCompact } from "../lib/format";

export function NavChart({ data }: { data: NavPoint[] }) {
  const chart = data.map((p) => ({
    t: p.t,
    nav: p.nav,
    benchmark: p.benchmark,
  }));
  const first = data[0]?.nav ?? 0;
  const min = Math.min(...data.map((d) => Math.min(d.nav, d.benchmark)), first);
  const max = Math.max(...data.map((d) => Math.max(d.nav, d.benchmark)), first);
  const pad = (max - min) * 0.15 || 1000;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chart} margin={{ top: 8, right: 6, left: 6, bottom: 0 }}>
        <defs>
          <linearGradient id="navFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C4F03A" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#C4F03A" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 6" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis dataKey="t" hide />
        <YAxis
          domain={[min - pad, max + pad]}
          width={52}
          tick={{ fill: "#64748b", fontSize: 11 }}
          tickFormatter={(v) => usdCompact(v)}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: "rgba(10,12,17,0.95)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            fontSize: 12,
          }}
          labelFormatter={() => ""}
          formatter={(v: number, name) => [usdCompact(v), name === "nav" ? "Sturna NAV" : "Equal-wt benchmark"]}
        />
        <Area
          type="monotone"
          dataKey="benchmark"
          stroke="#475569"
          strokeWidth={1.4}
          strokeDasharray="4 4"
          fill="none"
          dot={false}
          isAnimationActive={false}
        />
        <Area
          type="monotone"
          dataKey="nav"
          stroke="#C4F03A"
          strokeWidth={2.2}
          fill="url(#navFill)"
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
