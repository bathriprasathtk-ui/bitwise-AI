import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, DollarSign, TrendingUp, Wallet, AlertCircle } from "lucide-react";
import { api } from "../lib/api";
import { formatCurrency, formatPct } from "../lib/finance";
import type { BusinessResponse } from "../types";
import { Card, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { MetricCard } from "../components/dashboard/MetricCard";
import { HealthScoreGauge } from "../components/dashboard/HealthScoreGauge";
import { RevenueChart } from "../components/dashboard/RevenueChart";

export function Dashboard() {
  const [data, setData] = useState<BusinessResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<string[] | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getBusiness()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function loadInsights() {
    setInsightsLoading(true);
    setInsightsError(null);
    try {
      const res = await api.getInsights();
      setInsights(res.insights);
    } catch (e: any) {
      setInsightsError(e.message);
    } finally {
      setInsightsLoading(false);
    }
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-ink-secondary">Loading your dashboard…</div>;
  }

  if (error || !data) {
    return <div className="text-sm text-danger">Couldn't load your business data: {error}</div>;
  }

  const { business, metrics, history } = data;

  if (!metrics) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="mb-2 text-xl font-semibold text-ink dark:text-slate-100">Welcome to {business.name}</h1>
        <p className="mb-6 text-sm text-ink-secondary">
          Add your first financial entry to see your dashboard come to life.
        </p>
        <Link to="/app/analysis">
          <Button>Add financial data</Button>
        </Link>
      </div>
    );
  }

  const prev = history.length > 1 ? history[history.length - 2] : null;
  const revenueTrend = prev
    ? { pct: ((history[history.length - 1].revenue - prev.revenue) / Math.max(prev.revenue, 1)) * 100 }
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold text-ink dark:text-slate-100">{business.name}</h1>
          <p className="text-sm text-ink-secondary">Here's how your business is doing right now.</p>
        </div>
        <Link to="/app/analysis">
          <Button variant="secondary">Update numbers</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Revenue"
          value={formatCurrency(data.latest!.revenue, business.currency)}
          icon={<DollarSign size={16} className="text-ink-secondary" />}
          trend={
            revenueTrend
              ? { direction: revenueTrend.pct >= 0 ? "up" : "down", label: `${formatPct(revenueTrend.pct)} vs last period`, good: revenueTrend.pct >= 0 }
              : undefined
          }
        />
        <MetricCard
          label="Net Profit"
          value={formatCurrency(metrics.netProfit, business.currency)}
          icon={<TrendingUp size={16} className="text-ink-secondary" />}
          trend={{ direction: metrics.netProfit >= 0 ? "up" : "down", label: `${metrics.netMarginPct.toFixed(1)}% margin`, good: metrics.netProfit >= 0 }}
        />
        <MetricCard
          label="Cash on Hand"
          value={formatCurrency(data.latest!.cash_on_hand, business.currency)}
          icon={<Wallet size={16} className="text-ink-secondary" />}
          trend={
            metrics.runwayMonths !== null
              ? { direction: "down", label: `${metrics.runwayMonths.toFixed(1)} mo runway`, good: metrics.runwayMonths > 6 }
              : { direction: "up", label: "Profitable — no burn", good: true }
          }
        />
        <MetricCard
          label="Gross Margin"
          value={`${metrics.grossMarginPct.toFixed(1)}%`}
          icon={<Sparkles size={16} className="text-ink-secondary" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue &amp; profit trend</CardTitle>
          </CardHeader>
          <RevenueChart history={history} />
        </Card>

        <Card className="flex flex-col items-center justify-center">
          <CardHeader className="w-full text-center">
            <CardTitle>Business Health Score</CardTitle>
          </CardHeader>
          <HealthScoreGauge score={metrics.healthScore} label={metrics.healthLabel} />
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-ink dark:text-slate-100">
            <Sparkles size={16} className="text-primary" /> AI Insights
          </CardTitle>
          <Button size="sm" variant="secondary" onClick={loadInsights} disabled={insightsLoading}>
            {insightsLoading ? "Thinking…" : insights ? "Refresh" : "Generate insights"}
          </Button>
        </CardHeader>

        {insightsError && (
          <p className="flex items-center gap-2 text-sm text-danger">
            <AlertCircle size={14} /> {insightsError}
          </p>
        )}

        {insights && (
          <ul className="space-y-3">
            {insights.map((insight, i) => (
              <li key={i} className="flex gap-3 rounded-lg bg-slate-50 p-3 text-sm text-ink dark:bg-slate-800/50 dark:text-slate-200">
                <Sparkles size={14} className="mt-0.5 shrink-0 text-primary" />
                {insight}
              </li>
            ))}
          </ul>
        )}

        {!insights && !insightsError && !insightsLoading && (
          <p className="text-sm text-ink-secondary">
            Get specific, AI-generated recommendations based on your real numbers.
          </p>
        )}
      </Card>
    </div>
  );
}
