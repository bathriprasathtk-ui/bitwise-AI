import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "../lib/api";
import { calculateMetrics, formatCurrency } from "../lib/finance";
import type { BusinessResponse } from "../types";
import { Card, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input, Label, FieldError } from "../components/ui/Input";

const entrySchema = z.object({
  periodLabel: z.string().min(1, "Required, e.g. 2026-09"),
  revenue: z.coerce.number().min(0, "Must be 0 or more"),
  cogs: z.coerce.number().min(0, "Must be 0 or more"),
  operatingExpenses: z.coerce.number().min(0, "Must be 0 or more"),
  cashOnHand: z.coerce.number().min(0, "Must be 0 or more"),
});
type EntryForm = z.infer<typeof entrySchema>;

export function BusinessAnalysis() {
  const [data, setData] = useState<BusinessResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<EntryForm>({
    resolver: zodResolver(entrySchema),
    defaultValues: { periodLabel: "", revenue: 0, cogs: 0, operatingExpenses: 0, cashOnHand: 0 },
  });

  useEffect(() => {
    api.getBusiness().then((res) => {
      setData(res);
      if (res.latest) {
        reset({
          periodLabel: "",
          revenue: res.latest.revenue,
          cogs: res.latest.cogs,
          operatingExpenses: res.latest.operating_expenses,
          cashOnHand: res.latest.cash_on_hand,
        });
      }
    });
  }, [reset]);

  const watched = watch();
  const preview = calculateMetrics({
    revenue: Number(watched.revenue) || 0,
    cogs: Number(watched.cogs) || 0,
    operatingExpenses: Number(watched.operatingExpenses) || 0,
    cashOnHand: Number(watched.cashOnHand) || 0,
  });

  async function onSubmit(values: EntryForm) {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.addEntry(values);
      const refreshed = await api.getBusiness();
      setData(refreshed);
      reset({ ...values, periodLabel: "" });
    } catch (e: any) {
      setSubmitError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  const currency = data?.business.currency ?? "USD";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink dark:text-slate-100">Business Analysis</h1>
        <p className="text-sm text-ink-secondary">Enter a period's numbers and see the full breakdown update live.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Add a financial entry</CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="periodLabel">Period</Label>
              <Input id="periodLabel" placeholder="e.g. 2026-09" {...register("periodLabel")} />
              <FieldError message={errors.periodLabel?.message} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="revenue">Revenue</Label>
                <Input id="revenue" type="number" step="0.01" {...register("revenue")} />
                <FieldError message={errors.revenue?.message} />
              </div>
              <div>
                <Label htmlFor="cogs">Cost of goods sold</Label>
                <Input id="cogs" type="number" step="0.01" {...register("cogs")} />
                <FieldError message={errors.cogs?.message} />
              </div>
              <div>
                <Label htmlFor="operatingExpenses">Operating expenses</Label>
                <Input id="operatingExpenses" type="number" step="0.01" {...register("operatingExpenses")} />
                <FieldError message={errors.operatingExpenses?.message} />
              </div>
              <div>
                <Label htmlFor="cashOnHand">Cash on hand</Label>
                <Input id="cashOnHand" type="number" step="0.01" {...register("cashOnHand")} />
                <FieldError message={errors.cashOnHand?.message} />
              </div>
            </div>
            <FieldError message={submitError ?? undefined} />
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Saving…" : "Save entry"}
            </Button>
          </form>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Live breakdown</CardTitle>
          </CardHeader>
          <dl className="space-y-3 text-sm">
            <Row label="Gross profit" value={formatCurrency(preview.grossProfit, currency)} />
            <Row label="Gross margin" value={`${preview.grossMarginPct.toFixed(1)}%`} />
            <Row label="Total expenses" value={formatCurrency(preview.totalExpenses, currency)} />
            <Row
              label="Net profit"
              value={formatCurrency(preview.netProfit, currency)}
              tone={preview.netProfit >= 0 ? "success" : "danger"}
            />
            <Row label="Net margin" value={`${preview.netMarginPct.toFixed(1)}%`} />
            <Row
              label="Monthly burn"
              value={preview.burnRatePerMonth > 0 ? formatCurrency(preview.burnRatePerMonth, currency) : "None — profitable"}
            />
            <Row
              label="Runway"
              value={preview.runwayMonths === null ? "N/A (profitable)" : `${preview.runwayMonths.toFixed(1)} months`}
              tone={preview.runwayMonths !== null && preview.runwayMonths < 3 ? "danger" : undefined}
            />
            <Row label="Health score" value={`${preview.healthScore}/100 · ${preview.healthLabel}`} />
          </dl>
        </Card>
      </div>

      {data && data.history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>History</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-ink-secondary">
                  <th className="py-2 pr-4 font-medium">Period</th>
                  <th className="py-2 pr-4 font-medium">Revenue</th>
                  <th className="py-2 pr-4 font-medium">Net profit</th>
                  <th className="py-2 pr-4 font-medium">Net margin</th>
                  <th className="py-2 font-medium">Health</th>
                </tr>
              </thead>
              <tbody>
                {[...data.history].reverse().map((h) => (
                  <tr key={h.periodLabel} className="border-b border-border last:border-0">
                    <td className="py-2 pr-4 text-ink dark:text-slate-200">{h.periodLabel}</td>
                    <td className="py-2 pr-4 text-ink dark:text-slate-200">{formatCurrency(h.revenue, currency)}</td>
                    <td className="py-2 pr-4 text-ink dark:text-slate-200">{formatCurrency(h.netProfit, currency)}</td>
                    <td className="py-2 pr-4 text-ink dark:text-slate-200">{h.netMarginPct.toFixed(1)}%</td>
                    <td className="py-2 text-ink dark:text-slate-200">{h.healthScore}/100</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "success" | "danger" }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2 last:border-0 dark:border-slate-800">
      <dt className="text-ink-secondary">{label}</dt>
      <dd
        className={`font-medium ${tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-ink dark:text-slate-100"}`}
      >
        {value}
      </dd>
    </div>
  );
}
