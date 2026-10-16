import type { FinancialInputs, FinancialMetrics } from "../lib/finance";

export interface Business {
  id: string;
  user_id: string;
  name: string;
  industry: string | null;
  currency: string;
  created_at: string;
}

export interface FinancialEntry {
  id: string;
  business_id: string;
  period_label: string;
  revenue: number;
  cogs: number;
  operating_expenses: number;
  cash_on_hand: number;
  created_at: string;
}

export interface HistoryPoint extends FinancialMetrics {
  periodLabel: string;
  revenue: number;
  cogs: number;
  operatingExpenses: number;
  cashOnHand: number;
}

export interface BusinessResponse {
  business: Business;
  latest: FinancialEntry | null;
  metrics: FinancialMetrics | null;
  history: HistoryPoint[];
}

export interface SimulationResponse {
  before: FinancialMetrics;
  after: FinancialMetrics;
  projected: FinancialInputs;
  profitDelta: number;
  profitDeltaPct: number;
  revenueNeeded?: number;
  aiSummary?: string;
}
