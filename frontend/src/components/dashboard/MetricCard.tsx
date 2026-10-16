import { type ReactNode } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "../../lib/utils";

interface MetricCardProps {
  label: string;
  value: string;
  trend?: { direction: "up" | "down"; label: string; good: boolean };
  icon?: ReactNode;
}

export function MetricCard({ label, value, trend, icon }: MetricCardProps) {
  return (
    <div className="rounded-card border border-border bg-surface p-5 shadow-card dark:bg-[#0F1729] dark:border-slate-800">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-ink-secondary">{label}</span>
        {icon}
      </div>
      <div className="text-2xl font-bold tracking-tight text-ink dark:text-slate-100">{value}</div>
      {trend && (
        <div
          className={cn(
            "mt-2 flex items-center gap-1 text-xs font-medium",
            trend.good ? "text-success" : "text-danger"
          )}
        >
          {trend.direction === "up" ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
          {trend.label}
        </div>
      )}
    </div>
  );
}
