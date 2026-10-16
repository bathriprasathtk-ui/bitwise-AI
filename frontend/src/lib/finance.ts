/**
 * Mirrors backend/src/services/finance.ts so the UI can show instant, optimistic
 * previews (e.g. while typing in the simulator) without a round trip. The backend
 * copy is the source of truth for anything persisted or shown after a save.
 */

export interface FinancialInputs {
  revenue: number;
  cogs: number;
  operatingExpenses: number;
  cashOnHand: number;
}

export interface FinancialMetrics {
  grossProfit: number;
  grossMarginPct: number;
  netProfit: number;
  netMarginPct: number;
  totalExpenses: number;
  burnRatePerMonth: number;
  runwayMonths: number | null;
  healthScore: number;
  healthLabel: "Critical" | "At Risk" | "Stable" | "Healthy" | "Excellent";
}

export function calculateMetrics(inputs: FinancialInputs): FinancialMetrics {
  const { revenue, cogs, operatingExpenses, cashOnHand } = inputs;

  const grossProfit = revenue - cogs;
  const grossMarginPct = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

  const totalExpenses = cogs + operatingExpenses;
  const netProfit = revenue - totalExpenses;
  const netMarginPct = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  const burnRatePerMonth = netProfit < 0 ? Math.abs(netProfit) : 0;
  const runwayMonths = burnRatePerMonth > 0 ? Math.max(cashOnHand / burnRatePerMonth, 0) : null;

  const healthScore = computeHealthScore({ grossMarginPct, netMarginPct, runwayMonths });

  return {
    grossProfit,
    grossMarginPct,
    netProfit,
    netMarginPct,
    totalExpenses,
    burnRatePerMonth,
    runwayMonths,
    healthScore,
    healthLabel: labelForScore(healthScore),
  };
}

function computeHealthScore({
  grossMarginPct,
  netMarginPct,
  runwayMonths,
}: {
  grossMarginPct: number;
  netMarginPct: number;
  runwayMonths: number | null;
}): number {
  const netScore = clamp(mapRange(netMarginPct, -20, 30), 0, 100);
  const grossScore = clamp(mapRange(grossMarginPct, 0, 70), 0, 100);
  const runwayScore = runwayMonths === null ? 100 : clamp(mapRange(runwayMonths, 0, 12), 0, 100);
  return Math.round(clamp(netScore * 0.4 + grossScore * 0.3 + runwayScore * 0.3, 0, 100));
}

function mapRange(value: number, min: number, max: number): number {
  if (max === min) return 0;
  return ((value - min) / (max - min)) * 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function labelForScore(score: number): FinancialMetrics["healthLabel"] {
  if (score < 30) return "Critical";
  if (score < 50) return "At Risk";
  if (score < 70) return "Stable";
  if (score < 85) return "Healthy";
  return "Excellent";
}

export function formatCurrency(value: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

export function formatPct(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}
