import { useState } from "react";
import { Sparkles, SlidersHorizontal } from "lucide-react";
import { api } from "../lib/api";
import { formatCurrency, formatPct } from "../lib/finance";
import type { SimulationResponse } from "../types";
import { Card, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Label } from "../components/ui/Input";

function Slider({
  id,
  label,
  value,
  onChange,
  min = -50,
  max = 50,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <Label htmlFor={id} className="mb-0">{label}</Label>
        <span className="text-sm font-semibold text-primary">{formatPct(value)}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );
}

export function Simulator() {
  const [priceChangePct, setPriceChangePct] = useState(0);
  const [volumeChangePct, setVolumeChangePct] = useState(0);
  const [costChangePct, setCostChangePct] = useState(0);
  const [expenseChangePct, setExpenseChangePct] = useState(0);
  const [saveScenario, setSaveScenario] = useState(false);
  const [scenarioName, setScenarioName] = useState("");

  const [result, setResult] = useState<SimulationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(explain: boolean) {
    setError(null);
    explain ? setExplaining(true) : setLoading(true);
    try {
      const res = await api.runSimulation({
        priceChangePct,
        volumeChangePct,
        costChangePct,
        expenseChangePct,
        explain,
        save: saveScenario,
        name: scenarioName.trim() || undefined,
      });
      setResult(res);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setExplaining(false);
    }
  }

  function reset() {
    setPriceChangePct(0);
    setVolumeChangePct(0);
    setCostChangePct(0);
    setExpenseChangePct(0);
    setSaveScenario(false);
    setScenarioName("");
    setResult(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-ink dark:text-slate-100">
          <SlidersHorizontal size={20} className="text-primary" /> What-if Simulator
        </h1>
        <p className="text-sm text-ink-secondary">
          Adjust price, volume, and costs to see how a decision would affect your bottom line.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="space-y-6">
          <CardHeader>
            <CardTitle>Scenario inputs</CardTitle>
          </CardHeader>

          <Slider id="price-change" label="Price change" value={priceChangePct} onChange={setPriceChangePct} />
          <Slider id="volume-change" label="Sales volume change" value={volumeChangePct} onChange={setVolumeChangePct} />
          <Slider id="cost-change" label="Cost of goods change" value={costChangePct} onChange={setCostChangePct} />
          <Slider id="expense-change" label="Operating expense change" value={expenseChangePct} onChange={setExpenseChangePct} />

          <div className="rounded-lg border border-border p-3 dark:border-slate-800">
            <label className="flex items-center gap-2 text-sm font-medium text-ink dark:text-slate-100">
              <input
                type="checkbox"
                checked={saveScenario}
                onChange={(e) => setSaveScenario(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              Save this scenario to Reports
            </label>
            {saveScenario && (
              <input
                aria-label="Scenario name"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                placeholder="Scenario name (optional)"
                className="mt-3 h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-[#0F1729] dark:text-slate-100"
              />
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={() => run(false)} disabled={loading}>
              {loading ? "Calculating…" : "Run simulation"}
            </Button>
            <Button variant="secondary" onClick={() => run(true)} disabled={explaining}>
              <Sparkles size={14} /> {explaining ? "Writing summary…" : "Explain with AI"}
            </Button>
            <Button variant="ghost" onClick={reset}>
              Reset
            </Button>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Projected outcome</CardTitle>
          </CardHeader>

          {!result && <p className="text-sm text-ink-secondary">Run a simulation to see the projected impact here.</p>}

          {result && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <ComparisonBlock title="Net profit" before={result.before.netProfit} after={result.after.netProfit} isCurrency />
                <ComparisonBlock title="Net margin" before={result.before.netMarginPct} after={result.after.netMarginPct} suffix="%" />
                <ComparisonBlock title="Projected revenue" before={0} after={result.projected.revenue} isCurrency singleValueLabel="Projected" />
                <ComparisonBlock title="Health score" before={result.before.healthScore} after={result.after.healthScore} />
              </div>

              <div
                className={`rounded-lg p-3 text-sm font-medium ${
                  result.profitDelta >= 0 ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                }`}
              >
                {result.profitDelta >= 0 ? "Profit increases by " : "Profit decreases by "}
                {formatCurrency(Math.abs(result.profitDelta))} ({formatPct(result.profitDeltaPct)})
              </div>

              {result.aiSummary && (
                <div className="rounded-lg bg-slate-50 p-3 text-sm text-ink dark:bg-slate-800/50 dark:text-slate-200">
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-primary">
                    <Sparkles size={12} /> AI summary
                  </div>
                  {result.aiSummary}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function ComparisonBlock({
  title,
  before,
  after,
  isCurrency,
  suffix,
  singleValueLabel,
}: {
  title: string;
  before: number;
  after: number;
  isCurrency?: boolean;
  suffix?: string;
  singleValueLabel?: string;
}) {
  const fmt = (v: number) => (isCurrency ? formatCurrency(v) : `${v.toFixed(1)}${suffix ?? ""}`);
  return (
    <div className="rounded-lg border border-border p-3 dark:border-slate-800">
      <div className="text-xs font-medium text-ink-secondary">{title}</div>
      {singleValueLabel ? (
        <div className="mt-1 text-lg font-semibold text-ink dark:text-slate-100">{fmt(after)}</div>
      ) : (
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-xs text-ink-secondary line-through">{fmt(before)}</span>
          <span className="text-lg font-semibold text-ink dark:text-slate-100">{fmt(after)}</span>
        </div>
      )}
    </div>
  );
}
