/**
 * Minimal offline Supabase stand-in for smoke-testing the backend without real
 * credentials or network access. It implements just enough of the two APIs the
 * backend actually uses:
 *
 *   - GoTrue auth:  GET  /auth/v1/user          (verifyAuth middleware)
 *   - PostgREST:    GET  /rest/v1/<table>       with ?select=*&<col>=eq.<v>
 *                   POST /rest/v1/<table>       (insert, ?select=... honoured)
 *
 * In-memory tables are seeded with one business + two financial entries so the
 * business/insights/simulate/chat routes all have data to work with.
 *
 * Usage:  node scripts/mock-supabase.mjs [port]     (default 54321)
 *
 * This is a DEVELOPMENT/TEST tool only. It grants no real security: any bearer
 * token maps to the seeded user. Never run it anywhere public.
 */
import http from "node:http";
import { randomUUID } from "node:crypto";

const port = Number(process.argv[2] ?? 54321);
const USER_ID = "11111111-1111-4111-8111-111111111111";
const BUSINESS_ID = "22222222-2222-4222-8222-222222222222";

const now = () => new Date().toISOString();

const tables = {
  businesses: [
    { id: BUSINESS_ID, user_id: USER_ID, name: "Mock Coffee Co", industry: "Cafe", currency: "USD", created_at: now() },
  ],
  financial_entries: [
    { id: randomUUID(), business_id: BUSINESS_ID, period_label: "2026-08", revenue: 10000, cogs: 4000, operating_expenses: 3000, cash_on_hand: 50000, created_at: now() },
    { id: randomUUID(), business_id: BUSINESS_ID, period_label: "2026-09", revenue: 12000, cogs: 4800, operating_expenses: 3200, cash_on_hand: 55000, created_at: now() },
  ],
  simulations: [],
  chat_messages: [],
};

/** Parse a PostgREST query into filters + flags. */
function parseQuery(searchParams) {
  const filters = [];
  let select = null;
  let single = false;
  let returnRep = false;
  for (const [key, raw] of searchParams.entries()) {
    const value = raw.replace(/^eq\./, "");
    if (key === "select") select = value;
    else if (raw.startsWith("eq.")) filters.push([key, value]);
  }
  return { filters, select, single, returnRep };
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  const send = (status, body) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  };

  // GoTrue: the backend verifies every bearer token through this endpoint.
  if (url.pathname === "/auth/v1/user") {
    const auth = req.headers.authorization ?? "";
    if (!auth.startsWith("Bearer ") || auth === "Bearer invalid") {
      return send(401, { message: "invalid token", error_description: "invalid token" });
    }
    return send(200, { id: USER_ID, aud: "authenticated", role: "authenticated", email: "mock@example.com", app_metadata: {}, user_metadata: {}, created_at: now() });
  }

  // PostgREST: /rest/v1/<table>
  if (url.pathname.startsWith("/rest/v1/")) {
    const table = url.pathname.slice("/rest/v1/".length).split("?")[0];
    const rows = tables[table];
    if (!rows) return send(404, { message: `relation \"public.${table}\" does not exist` });

    const { filters } = parseQuery(url.searchParams);
    const single = (req.headers.accept ?? "").includes("vnd.pgrst.object+json");

    if (req.method === "GET") {
      let matched = rows.filter((r) => filters.every(([k, v]) => String(r[k]) === v));
      // The backend orders chat/entries by created_at; honour "order" for realism.
      const order = url.searchParams.get("order");
      if (order) {
        const [col, dir] = order.split(".");
        matched = [...matched].sort((a, b) => {
          const cmp = String(a[col]).localeCompare(String(b[col]));
          return dir === "desc" ? -cmp : cmp;
        });
      }
      const limit = Number(url.searchParams.get("limit") ?? 0);
      if (limit > 0) matched = matched.slice(0, limit);
      if (single) {
        if (matched.length === 0) return send(406, { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned", details: `The result contains ${matched.length} rows`, hint: null });
        return send(200, matched[0]);
      }
      return send(200, matched);
    }

    if (req.method === "POST") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        let payload;
        try {
          payload = JSON.parse(body || "[]");
        } catch {
          return send(400, { message: "invalid JSON body" });
        }
        const inserted = (Array.isArray(payload) ? payload : [payload]).map((row) => ({
          id: randomUUID(),
          created_at: now(),
          ...row,
        }));
        rows.push(...inserted);
        const prefer = req.headers.prefer ?? "";
        if (prefer.includes("return=representation")) {
          return send(single ? 201 : 201, single ? inserted[0] : inserted);
        }
        res.writeHead(201, { "Content-Type": "application/json" });
        res.end();
      });
      return;
    }

    return send(405, { message: "method not allowed" });
  }

  send(404, { message: "not found" });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`mock supabase listening on http://127.0.0.1:${port} (user ${USER_ID}, business ${BUSINESS_ID})`);
});
