import { supabase } from "./supabaseClient";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) ?? "http://localhost:4000";

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    "Content-Type": "application/json",
    ...(await authHeaders()),
    ...(options.headers ?? {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ? JSON.stringify(body.error) : `Request failed (${res.status})`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  getBusiness: () => request<import("../types").BusinessResponse>("/api/business"),

  addEntry: (entry: {
    periodLabel: string;
    revenue: number;
    cogs: number;
    operatingExpenses: number;
    cashOnHand: number;
  }) => request("/api/business/entries", { method: "POST", body: JSON.stringify(entry) }),

  getInsights: () =>
    request<{ insights: string[] }>("/api/business/insights", { method: "POST" }),

  runSimulation: (input: {
    priceChangePct: number;
    volumeChangePct: number;
    costChangePct: number;
    expenseChangePct: number;
    targetProfit?: number;
    explain?: boolean;
    save?: boolean;
    name?: string;
  }) => request<import("../types").SimulationResponse>("/api/simulate", { method: "POST", body: JSON.stringify(input) }),

  getSimulationHistory: () => request<{ simulations: any[] }>("/api/simulate/history"),

  getChatHistory: () => request<{ messages: { role: "user" | "assistant"; content: string; id: string }[] }>(
    "/api/ai/chat"
  ),

  sendChatMessage: (message: string) =>
    request<{ reply: string }>("/api/ai/chat", { method: "POST", body: JSON.stringify({ message }) }),
};
