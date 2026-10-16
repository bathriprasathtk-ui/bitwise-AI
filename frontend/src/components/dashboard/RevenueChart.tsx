import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { HistoryPoint } from "../../types";
import { formatCurrency } from "../../lib/finance";

export function RevenueChart({ history }: { history: HistoryPoint[] }) {
  if (history.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-ink-secondary">
        Add a financial entry to see your trend here.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={history} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563EB" stopOpacity={0.18} />
            <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#16A34A" stopOpacity={0.18} />
            <stop offset="100%" stopColor="#16A34A" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#E2E8F0" vertical={false} />
        <XAxis dataKey="periodLabel" tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 12, fill: "#64748B" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => formatCurrency(v)}
          width={72}
        />
        <Tooltip
          formatter={(value: number, name: string) => [formatCurrency(value), name === "revenue" ? "Revenue" : "Net profit"]}
          contentStyle={{ borderRadius: 8, borderColor: "#E2E8F0", fontSize: 13 }}
        />
        <Area type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2} fill="url(#revenueFill)" />
        <Area type="monotone" dataKey="netProfit" stroke="#16A34A" strokeWidth={2} fill="url(#profitFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
