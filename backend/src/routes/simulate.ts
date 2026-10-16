import { Router } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../supabaseAdmin.js";
import { verifyAuth, type AuthedRequest } from "../middleware/auth.js";
import { runSimulation, revenueNeededForTargetProfit } from "../services/finance.js";
import { getAIProvider } from "../ai/provider.js";

export const simulateRouter = Router();
simulateRouter.use(verifyAuth);

const simSchema = z.object({
  priceChangePct: z.number().min(-90).max(500),
  volumeChangePct: z.number().min(-90).max(500),
  costChangePct: z.number().min(-90).max(500),
  expenseChangePct: z.number().min(-90).max(500),
  targetProfit: z.number().optional(),
  explain: z.boolean().optional(), // whether to ask the AI for a written summary
  save: z.boolean().optional(),
  name: z.string().optional(),
});

/** POST /api/simulate — run a what-if scenario against the latest entry */
simulateRouter.post("/", async (req: AuthedRequest, res) => {
  const parsed = simSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("id")
    .eq("user_id", req.userId)
    .single();
  if (!business) return res.status(404).json({ error: "No business profile found" });

  const { data: entries } = await supabaseAdmin
    .from("financial_entries")
    .select("*")
    .eq("business_id", business.id)
    .order("created_at", { ascending: true });

  const latest = entries?.[entries.length - 1];
  if (!latest) return res.status(400).json({ error: "Add a financial entry before simulating" });

  const base = {
    revenue: Number(latest.revenue),
    cogs: Number(latest.cogs),
    operatingExpenses: Number(latest.operating_expenses),
    cashOnHand: Number(latest.cash_on_hand),
  };

  const result = runSimulation({
    base,
    priceChangePct: parsed.data.priceChangePct,
    volumeChangePct: parsed.data.volumeChangePct,
    costChangePct: parsed.data.costChangePct,
    expenseChangePct: parsed.data.expenseChangePct,
  });

  const revenueNeeded =
    parsed.data.targetProfit !== undefined ? revenueNeededForTargetProfit(base, parsed.data.targetProfit) : undefined;

  let aiSummary: string | undefined;
  if (parsed.data.explain) {
    try {
      const provider = getAIProvider();
      const systemPrompt = `You are a business advisor. In 2-4 plain-English sentences, explain
what this what-if scenario means for the owner and whether it's a good idea. Reference the
actual numbers. No markdown, no bullet points, just sentences.`;
      const userPrompt = `Price change: ${parsed.data.priceChangePct}%, Volume change: ${parsed.data.volumeChangePct}%, Cost change: ${parsed.data.costChangePct}%, Expense change: ${parsed.data.expenseChangePct}%.
Before: revenue ${result.before.grossProfit + base.cogs}, net profit ${result.before.netProfit.toFixed(2)}, margin ${result.before.netMarginPct.toFixed(1)}%.
After: revenue ${result.projected.revenue.toFixed(2)}, net profit ${result.after.netProfit.toFixed(2)}, margin ${result.after.netMarginPct.toFixed(1)}%.
Profit change: ${result.profitDelta.toFixed(2)} (${result.profitDeltaPct.toFixed(1)}%).`;
      aiSummary = await provider.chat(systemPrompt, [{ role: "user", content: userPrompt }]);
    } catch (err: any) {
      aiSummary = undefined; // Don't fail the whole simulation if the AI call fails.
    }
  }

  if (parsed.data.save) {
    await supabaseAdmin.from("simulations").insert({
      business_id: business.id,
      name: parsed.data.name ?? "Untitled scenario",
      inputs: parsed.data,
      results: result,
      ai_summary: aiSummary ?? null,
    });
  }

  res.json({ ...result, revenueNeeded, aiSummary });
});

/** GET /api/simulate/history — previously saved scenarios */
simulateRouter.get("/history", async (req: AuthedRequest, res) => {
  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("id")
    .eq("user_id", req.userId)
    .single();
  if (!business) return res.json({ simulations: [] });

  const { data: simulations, error } = await supabaseAdmin
    .from("simulations")
    .select("*")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ simulations });
});
