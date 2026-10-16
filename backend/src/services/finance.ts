/**
 * Pure financial calculation functions. No I/O, no side effects — this is the
 * "source of truth" math, mirrored on the frontend (frontend/src/lib/finance.ts)
 * for instant UI previews. Keep the two in sync if you change formulas here.
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
  burnRatePerMonth: number; // negative net profit, or 0 if profitable
  runwayMonths: number | null; // null = profitable / infinite runway
  healthScore: number; // 0-100
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
  // Weighted blend, each clamped to [0, 100] before combining:
  // 40% net margin, 30% gross margin, 30% runway safety.
  const netScore = clamp(mapRange(netMarginPct, -20, 30), 0, 100);
  const grossScore = clamp(mapRange(grossMarginPct, 0, 70), 0, 100);
  const runwayScore = runwayMonths === null ? 100 : clamp(mapRange(runwayMonths, 0, 12), 0, 100);

  const blended = netScore * 0.4 + grossScore * 0.3 + runwayScore * 0.3;
  return Math.round(clamp(blended, 0, 100));
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

// ---------- What-if simulator ----------

export interface SimulationInputs {
  base: FinancialInputs;
  priceChangePct: number; // e.g. 10 = +10% price
  volumeChangePct: number; // e.g. -5 = -5% units sold
  costChangePct: number; // applied to COGS
  expenseChangePct: number; // applied to operating expenses
}

export interface SimulationResult {
  before: FinancialMetrics;
  after: FinancialMetrics;
  projected: FinancialInputs;
  profitDelta: number;
  profitDeltaPct: number;
}

export function runSimulation(sim: SimulationInputs): SimulationResult {
  const { base, priceChangePct, volumeChangePct, costChangePct, expenseChangePct } = sim;

  // Revenue moves with price AND volume together (compounded, not additive),
  // since a 10% price rise and a 10% volume rise together isn't a flat +20%.
  const revenueMultiplier = (1 + priceChangePct / 100) * (1 + volumeChangePct / 100);
  const projectedRevenue = base.revenue * revenueMultiplier;

  // COGS scales with volume (more units = more cost) and with the explicit cost change.
  const projectedCogs = base.cogs * (1 + volumeChangePct / 100) * (1 + costChangePct / 100);
  const projectedOpEx = base.operatingExpenses * (1 + expenseChangePct / 100);

  const projected: FinancialInputs = {
    revenue: round2(projectedRevenue),
    cogs: round2(projectedCogs),
    operatingExpenses: round2(projectedOpEx),
    cashOnHand: base.cashOnHand,
  };

  const before = calculateMetrics(base);
  const after = calculateMetrics(projected);

  const profitDelta = after.netProfit - before.netProfit;
  const profitDeltaPct = before.netProfit !== 0 ? (profitDelta / Math.abs(before.netProfit)) * 100 : 0;

  return { before, after, projected, profitDelta: round2(profitDelta), profitDeltaPct: round2(profitDeltaPct) };
}

/** How much extra revenue (at current margins) is needed to hit a target net profit. */
export function revenueNeededForTargetProfit(base: FinancialInputs, targetProfit: number): number {
  const currentMargin = base.revenue > 0 ? (base.revenue - base.cogs - base.operatingExpenses) / base.revenue : 0;
  if (currentMargin <= 0) return NaN; // can't solve with a non-positive margin
  return round2(targetProfit / currentMargin);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
