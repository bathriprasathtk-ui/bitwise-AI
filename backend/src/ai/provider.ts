import { env } from "../env.js";
import { callGemini } from "./geminiProvider.js";
import { callOpenAI } from "./openaiProvider.js";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AIProvider {
  /** Send a system prompt + conversation, get back a single assistant reply. */
  chat(systemPrompt: string, messages: ChatMessage[]): Promise<string>;
}

const providers: Record<string, AIProvider> = {
  gemini: { chat: callGemini },
  openai: { chat: callOpenAI },
};

/**
 * Swapping AI providers is a one-line .env change (AI_PROVIDER=gemini|openai) —
 * nothing else in the app talks to Gemini or OpenAI directly, only this file.
 */
export function getAIProvider(): AIProvider {
  const provider = providers[env.aiProvider];
  if (!provider) {
    throw new Error(`Unknown AI_PROVIDER "${env.aiProvider}". Expected "gemini" or "openai".`);
  }
  return provider;
}
