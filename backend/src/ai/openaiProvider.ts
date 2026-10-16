import { env } from "../env.js";
import type { ChatMessage } from "./provider.js";

export async function callOpenAI(systemPrompt: string, messages: ChatMessage[]): Promise<string> {
  const url = "https://api.openai.com/v1/chat/completions";

  const body = {
    model: env.openaiModel,
    temperature: 0.4,
    max_tokens: 1024,
    messages: [{ role: "system", content: systemPrompt }, ...messages],
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.aiApiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI API error (${res.status}): ${text}`);
  }

  const data = (await res.json()) as any;
  const reply = data?.choices?.[0]?.message?.content ?? "";
  if (!reply) throw new Error("OpenAI returned an empty response");
  return reply;
}
