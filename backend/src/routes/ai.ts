import { Router } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../supabaseAdmin.js";
import { verifyAuth, type AuthedRequest } from "../middleware/auth.js";
import { calculateMetrics } from "../services/finance.js";
import { getAIProvider } from "../ai/provider.js";

export const aiRouter = Router();
aiRouter.use(verifyAuth);

const chatSchema = z.object({
  message: z.string().min(1).max(2000),
});

const ADVISOR_SYSTEM_PROMPT = `You are BizWise AI's business advisor: warm, direct, and specific.
You speak to small-business owners who may have no finance background — avoid jargon, or define
it in one clause the first time you use it. Ground every answer in the real numbers you're given
below; if data is missing, say so and ask for it instead of guessing. Keep answers focused and
skimmable (short paragraphs or a few bullets), not a wall of text.`;

/** GET /api/ai/chat — conversation history */
aiRouter.get("/chat", async (req: AuthedRequest, res) => {
  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("id")
    .eq("user_id", req.userId)
    .single();
  if (!business) return res.json({ messages: [] });

  const { data: messages, error } = await supabaseAdmin
    .from("chat_messages")
    .select("*")
    .eq("business_id", business.id)
    .order("created_at", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ messages });
});

/** POST /api/ai/chat — send a message, get a grounded reply */
aiRouter.post("/chat", async (req: AuthedRequest, res) => {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("*")
    .eq("user_id", req.userId)
    .single();
  if (!business) return res.status(404).json({ error: "No business profile found" });

  const { data: entries } = await supabaseAdmin
    .from("financial_entries")
    .select("*")
    .eq("business_id", business.id)
    .order("created_at", { ascending: true });

  const latest = entries?.[entries.length - 1];
  const metrics = latest
    ? calculateMetrics({
        revenue: Number(latest.revenue),
        cogs: Number(latest.cogs),
        operatingExpenses: Number(latest.operating_expenses),
        cashOnHand: Number(latest.cash_on_hand),
      })
    : null;

  const dataContext = latest
    ? `Current financials for ${business.name} (${latest.period_label}):
Revenue ${latest.revenue}, COGS ${latest.cogs}, Operating expenses ${latest.operating_expenses}, Cash ${latest.cash_on_hand}.
Gross margin ${metrics!.grossMarginPct.toFixed(1)}%, Net margin ${metrics!.netMarginPct.toFixed(1)}%, Net profit ${metrics!.netProfit.toFixed(2)}.
Health score ${metrics!.healthScore}/100 (${metrics!.healthLabel}).`
    : `No financial data has been entered yet for ${business.name}.`;

  // Most recent 20 messages (descending + reverse) — a plain ascending limit
  // would hand the model the *oldest* slice of a long conversation.
  const { data: recentHistory } = await supabaseAdmin
    .from("chat_messages")
    .select("*")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false })
    .limit(20);
  const history = (recentHistory ?? []).reverse();

  const conversation = [
    ...(history ?? []).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user" as const, content: parsed.data.message },
  ];

  await supabaseAdmin.from("chat_messages").insert({
    business_id: business.id,
    role: "user",
    content: parsed.data.message,
  });

  try {
    const provider = getAIProvider();
    const reply = await provider.chat(`${ADVISOR_SYSTEM_PROMPT}\n\n${dataContext}`, conversation);

    await supabaseAdmin.from("chat_messages").insert({
      business_id: business.id,
      role: "assistant",
      content: reply,
    });

    res.json({ reply });
  } catch (err: any) {
    res.status(502).json({ error: `AI provider error: ${err.message}` });
  }
});
