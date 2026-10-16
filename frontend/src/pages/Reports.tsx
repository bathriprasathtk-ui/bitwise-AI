import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { api } from "../lib/api";
import { formatCurrency } from "../lib/finance";
import type { BusinessResponse } from "../types";
import { Card, CardHeader, CardTitle } from "../components/ui/Card";

export function Reports() {
  const [data, setData] = useState<BusinessResponse | null>(null);
  const [simulations, setSimulations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getBusiness(), api.getSimulationHistory()])
      .then(([biz, sims]) => {
        setData(biz);
        setSimulations(sims.simulations ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-ink-secondary">Loading reports…</div>;
  if (!data) return null;

  const currency = data.business.currency;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-ink dark:text-slate-100">
          <FileText size={20} className="text-primary" /> Reports &amp; Insights
        </h1>
        <p className="text-sm text-ink-secondary">A history of your performance and saved scenarios.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance history</CardTitle>
        </CardHeader>
        {data.history.length === 0 ? (
          <p className="text-sm text-ink-secondary">No financial entries yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-ink-secondary">
                  <th className="py-2 pr-4 font-medium">Period</th>
                  <th className="py-2 pr-4 font-medium">Revenue</th>
                  <th className="py-2 pr-4 font-medium">Expenses</th>
                  <th className="py-2 pr-4 font-medium">Net profit</th>
                  <th className="py-2 font-medium">Health score</th>
                </tr>
              </thead>
              <tbody>
                {[...data.history].reverse().map((h) => (
                  <tr key={h.periodLabel} className="border-b border-border last:border-0 dark:border-slate-800">
                    <td className="py-2 pr-4 text-ink dark:text-slate-200">{h.periodLabel}</td>
                    <td className="py-2 pr-4 text-ink dark:text-slate-200">{formatCurrency(h.revenue, currency)}</td>
                    <td className="py-2 pr-4 text-ink dark:text-slate-200">{formatCurrency(h.totalExpenses, currency)}</td>
                    <td className="py-2 pr-4 text-ink dark:text-slate-200">{formatCurrency(h.netProfit, currency)}</td>
                    <td className="py-2 text-ink dark:text-slate-200">{h.healthScore}/100</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Saved what-if scenarios</CardTitle>
        </CardHeader>
        {simulations.length === 0 ? (
          <p className="text-sm text-ink-secondary">
            No saved scenarios yet. Run and save one from the What-if Simulator.
          </p>
        ) : (
          <ul className="space-y-3">
            {simulations.map((sim) => (
              <li key={sim.id} className="rounded-lg border border-border p-3 dark:border-slate-800">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium text-ink dark:text-slate-100">{sim.name}</span>
                  <span className="text-xs text-ink-secondary">{new Date(sim.created_at).toLocaleDateString()}</span>
                </div>
                {sim.ai_summary && <p className="text-sm text-ink-secondary">{sim.ai_summary}</p>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
