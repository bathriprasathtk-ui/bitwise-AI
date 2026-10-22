/**
 * Auth + data-flow integration test: drives the REAL @supabase/supabase-js
 * client and the REAL backend through signup → login → session → dashboard
 * data → financial entry → persistence → per-user isolation, with only the
 * Supabase service itself replaced by scripts/mock-supabase.mjs.
 *
 * Prerequisites (both must already be running):
 *   node scripts/mock-supabase.mjs 54321
 *   npx tsx src/index.ts            (with .env pointing at the mock)
 *
 * Usage:  node scripts/auth-flow-test.mjs
 *
 * This verifies application wiring (client config, token transport, backend
 * auth middleware, per-user scoping, persistence round-trips). RLS policy
 * ENFORCEMENT lives inside real Supabase and is verified there, not here.
 */
import { createClient } from "@supabase/supabase-js";

const MOCK_URL = process.env.MOCK_URL ?? "http://127.0.0.1:54321";
const API = process.env.API_URL ?? "http://127.0.0.1:4000";

const supabase = createClient(MOCK_URL, "mock-anon-key", {
  auth: { persistSession: false, autoRefreshToken: false },
});

let pass = 0;
let fail = 0;
function check(name, cond, detail = "") {
  if (cond) {
    pass++;
    console.log(`✔ ${name}`);
  } else {
    fail++;
    console.log(`✘ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function apiGet(path, token) {
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}
async function apiPost(path, token, body) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body ?? {}),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

const stamp = Date.now();
const userA = { email: `alice-${stamp}@example.com`, password: "passwordA123" };
const userB = { email: `bob-${stamp}@example.com`, password: "passwordB123" };

console.log("--- prerequisites ---");
try {
  const h = await fetch(`${API}/health`);
  check("backend reachable", h.status === 200);
} catch {
  console.error("Backend is not running. Start it first: npx tsx src/index.ts");
  process.exit(1);
}
try {
  const m = await fetch(`${MOCK_URL}/auth/v1/user`);
  check("mock supabase reachable", m.status === 401); // 401 without token = alive
} catch {
  console.error("Mock is not running. Start it first: node scripts/mock-supabase.mjs 54321");
  process.exit(1);
}

console.log("--- signup (real supabase-js client) ---");
const { data: signedUp, error: signUpError } = await supabase.auth.signUp(userA);
check("signup returns session (email confirmation off)", !signUpError && !!signedUp.session, signUpError?.message);
const tokenA = signedUp.session?.access_token;

console.log("--- business profile auto-created (DB trigger equivalent) ---");
if (tokenA) {
  const { body } = await apiGet("/api/business", tokenA);
  check(
    "GET /api/business returns auto-created profile",
    body.business?.name === "My Business" && body.business?.user_id === signedUp.user?.id,
    JSON.stringify(body).slice(0, 120)
  );
  check("no financial entries yet", body.metrics === null && body.history?.length === 0);
}

console.log("--- financial entry creation + persistence ---");
if (tokenA) {
  const entry = { periodLabel: "2026-11", revenue: 5000, cogs: 2000, operatingExpenses: 1500, cashOnHand: 7500 };
  const created = await apiPost("/api/business/entries", tokenA, entry);
  check("POST /entries → 201", created.status === 201, JSON.stringify(created.body).slice(0, 120));
  check(
    "entry metrics computed correctly (net 1500, margin 30%)",
    created.body.metrics?.netProfit === 1500 && created.body.metrics?.netMarginPct === 30,
    JSON.stringify(created.body.metrics)
  );

  const { body: after } = await apiGet("/api/business", tokenA);
  check("entry persisted across requests", after.history?.length === 1 && after.latest?.period_label === "2026-11");
  check("dashboard metrics from persisted data", after.metrics?.netProfit === 1500 && after.metrics?.healthScore >= 0);
}

console.log("--- login (password grant) ---");
const { data: loggedIn, error: loginError } = await supabase.auth.signInWithPassword(userA);
check("login returns session", !loginError && !!loggedIn.session, loginError?.message);
if (loggedIn.session) {
  const { status } = await apiGet("/api/business", loggedIn.session.access_token);
  check("logged-in session can access API", status === 200);
}

console.log("--- per-user isolation ---");
const { data: signedUpB, error: signUpErrorB } = await supabase.auth.signUp(userB);
check("second user signup works", !signUpErrorB && !!signedUpB.session, signUpErrorB?.message);
if (signedUpB.session) {
  const tokenB = signedUpB.session.access_token;
  const { body: businessB } = await apiGet("/api/business", tokenB);
  check("user B gets their own business profile", businessB.business?.user_id === signedUpB.user?.id);
  check("user B sees ZERO entries from user A", businessB.history?.length === 0 && businessB.metrics === null, JSON.stringify(businessB).slice(0, 120));

  const entryB = { periodLabel: "2026-11", revenue: 100, cogs: 50, operatingExpenses: 25, cashOnHand: 10 };
  const createdB = await apiPost("/api/business/entries", tokenB, entryB);
  check("user B can create their own entry", createdB.status === 201);

  const { body: recheckA } = await apiGet("/api/business", tokenA);
  check("user A's data unchanged by user B", recheckA.history?.length === 1 && recheckA.metrics?.netProfit === 1500);
}

console.log("--- bad credentials / bad tokens ---");
const { error: badLogin } = await supabase.auth.signInWithPassword({ email: userA.email, password: "wrong-password" });
check("wrong password rejected", !!badLogin);
const { status: noTokenStatus } = await apiGet("/api/business", null);
check("API without token → 401", noTokenStatus === 401);
const { status: badTokenStatus } = await apiGet("/api/business", "Bearer made-up-token");
check("API with unknown token → 401", badTokenStatus === 401);

console.log("--- chat + insights error handling with invalid AI key ---");
if (tokenA) {
  const chat = await apiPost("/api/ai/chat", tokenA, { message: "How is my business doing?" });
  check("chat with invalid AI key → 502, no fabricated reply", chat.status === 502 && !chat.body.reply, JSON.stringify(chat.body).slice(0, 100));
  const { status: chatHistoryStatus, body: chatHistory } = await apiGet("/api/ai/chat", tokenA);
  check("user message persisted in chat history", chatHistoryStatus === 200 && chatHistory.messages?.some((m) => m.role === "user"));
}

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
