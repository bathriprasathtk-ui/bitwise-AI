import type { FinancialMetrics } from "../../lib/finance";

const LABEL_COLOR: Record<FinancialMetrics["healthLabel"], string> = {
  Critical: "#DC2626",
  "At Risk": "#F59E0B",
  Stable: "#2563EB",
  Healthy: "#16A34A",
  Excellent: "#16A34A",
};

export function HealthScoreGauge({ score, label }: { score: number; label: FinancialMetrics["healthLabel"] }) {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);
  const color = LABEL_COLOR[label];

  return (
    <div className="flex flex-col items-center">
      <svg width={160} height={160} viewBox="0 0 160 160" className="-rotate-90">
        <circle cx="80" cy="80" r={radius} fill="none" stroke="#E2E8F0" strokeWidth="12" />
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="-mt-24 flex flex-col items-center">
        <span className="text-3xl font-bold text-ink dark:text-slate-100">{score}</span>
        <span className="text-xs font-medium" style={{ color }}>
          {label}
        </span>
      </div>
      <div className="mt-16" />
    </div>
  );
}
