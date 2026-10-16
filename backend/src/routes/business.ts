import { Router } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../supabaseAdmin.js";
import { verifyAuth, type AuthedRequest } from "../middleware/auth.js";
import { calculateMetrics } from "../services/finance.js";
import { getAIProvider } from "../ai/provider.js";

export const businessRouter = Router();
businessRouter.use(verifyAuth);

const entrySchema = z.object({
  periodLabel: z.string().min(1),
  revenue: z.number().min(0),
  cogs: z.number().min(0),
  operatingExpenses: z.number().min(0),
  cashOnHand: z.number().min(0),
});

/** GET /api/business — profile + latest entry + computed metrics + history */
businessRouter.get("/", async (req: AuthedRequest, res) => {
  const { data: business, error: bizError } = await supabaseAdmin
    .from("businesses")
    .select("*")
    .eq("user_id", req.userId)
    .single();

  if (bizError || !business) {
    return res.status(404).json({ error: "No business profile found" });
  }

  const { data: entries, error: entriesError } = await supabaseAdmin
    .from("financial_entries")
    .select("*")
    .eq("business_id", business.id)
    .order("created_at", { ascending: true });

  if (entriesError) {
    return res.status(500).json({ error: entriesError.message });
  }

  const latest = entries?.[entries.length - 1] ?? null;
  const metrics = latest
    ? calculateMetrics({
        revenue: Number(latest.revenue),
        cogs: Number(latest.cogs),
        operatingExpenses: Number(latest.operating_expenses),
        cashOnHand: Number(latest.cash_on_hand),
      })
    : null;

  const history = (entries ?? []).map((e) => ({
    periodLabel: e.period_label,
    revenue: Number(e.revenue),
    cogs: Number(e.cogs),
    operatingExpenses: Number(e.operating_expenses),
    cashOnHand: Number(e.cash_on_hand),
    ...calculateMetrics({
      revenue: Number(e.revenue),
      cogs: Number(e.cogs),
      operatingExpenses: Number(e.operating_expenses),
      cashOnHand: Number(e.cash_on_hand),
    }),
  }));

  res.json({ business, latest, metrics, history });
});

/** POST /api/business/entries — add a new period's financial entry */
businessRouter.post("/entries", async (req: AuthedRequest, res) => {
  const parsed = entrySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("id")
    .eq("user_id", req.userId)
    .single();

  if (!business) return res.status(404).json({ error: "No business profile found" });

  const { periodLabel, revenue, cogs, operatingExpenses, cashOnHand } = parsed.data;

  const { data: entry, error } = await supabaseAdmin
    .from("financial_entries")
    .insert({
      business_id: business.id,
      period_label: periodLabel,
      revenue,
      cogs,
      operating_expenses: operatingExpenses,
      cash_on_hand: cashOnHand,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.status(201).json({ entry, metrics: calculateMetrics({ revenue, cogs, operatingExpenses, cashOnHand }) });
});

/** POST /api/business/insights — AI-generated, grounded in the latest real numbers */
businessRouter.post("/insights", async (req: AuthedRequest, res) => {
  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("*")
    .eq("user_id", req.userId)
    .single();

  const { data: entries } = await supabaseAdmin
    .from("financial_entries")
    .select("*")
    .eq("business_id", business?.id ?? "")
    .order("created_at", { ascending: true });

  const latest = entries?.[entries.length - 1];
  if (!business || !latest) {
    return res.status(400).json({ error: "Add at least one financial entry before requesting insights" });
  }

  const metrics = calculateMetrics({
    revenue: Number(latest.revenue),
    cogs: Number(latest.cogs),
    operatingExpenses: Number(latest.operating_expenses),
    cashOnHand: Number(latest.cash_on_hand),
  });

  const systemPrompt = `You are a plain-spoken business advisor for a small-business owner who
may have no finance background. Given their real numbers, return 3-5 short, specific,
actionable insights as a JSON array of strings — no preamble, no markdown, just the JSON
array. Each insight should name a concrete number from the data and a concrete action.
Avoid generic advice like "reduce expenses" without saying which ones or by how much.`;

  const userPrompt = `Business: ${business.name} (${business.industry ?? "industry not specified"})
Period: ${latest.period_label}
Revenue: ${latest.revenue}
COGS: ${latest.cogs}
Operating expenses: ${latest.operating_expenses}
Cash on hand: ${latest.cash_on_hand}
Gross margin: ${metrics.grossMarginPct.toFixed(1)}%
Net margin: ${metrics.netMarginPct.toFixed(1)}%
Net profit: ${metrics.netProfit.toFixed(2)}
Runway: ${metrics.runwayMonths === null ? "profitable, no burn" : `${metrics.runwayMonths.toFixed(1)} months`}
Health score: ${metrics.healthScore}/100 (${metrics.healthLabel})`;

  try {
    const provider = getAIProvider();
    const raw = await provider.chat(systemPrompt, [{ role: "user", content: userPrompt }]);
    const cleaned = raw.replace(/```json|```/g, "").trim();
    let insights: string[];
    try {
      insights = JSON.parse(cleaned);
    } catch {
      // Model didn't return clean JSON — fall back to splitting by line.
      insights = cleaned.split("\n").map((l) => l.replace(/^[-*\d.]+\s*/, "").trim()).filter(Boolean);
    }
    res.json({ insights, metrics });
  } catch (err: any) {
    res.status(502).json({ error: `AI provider error: ${err.message}` });
  }
});
