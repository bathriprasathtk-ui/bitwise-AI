/**
 * Minimal offline Supabase stand-in for smoke-testing the backend and the
 * signup→login→data flow without real credentials or network access. It
 * implements just enough of the APIs the app actually uses:
 *
 *   - GoTrue auth:  POST /auth/v1/signup                 (creates user + session)
 *                   POST /auth/v1/token?grant_type=password
 *                   POST /auth/v1/token?grant_type=refresh_token
 *                   POST /auth/v1/logout
 *                   GET  /auth/v1/user                   (verifyAuth middleware)
 *   - PostgREST:    GET  /rest/v1/<table>       with ?select=*&<col>=eq.<v>
 *                   POST /rest/v1/<table>       (insert, ?select=... honoured)
 *
 * Signup mirrors the real schema's `handle_new_user` trigger: a business
 * profile row is auto-created for each new user. Tables are in-memory and
 * seeded with the historical smoke-test user + two financial entries so the
 * existing 14-check smoke suite keeps passing unchanged.
 *
 * Usage:  node scripts/mock-supabase.mjs [port]     (default 54321)
 *
 * This is a DEVELOPMENT/TEST tool only. It grants no real security: passwords
 * are stored in plain text in memory and any non-expired token maps to a user.
 * Never run it anywhere public.
 */
import http from "node:http";
import { randomUUID } from "node:crypto";

const port = Number(process.argv[2] ?? 54321);
const USER_ID = "11111111-1111-4111-8111-111111111111";
const BUSINESS_ID = "22222222-2222-4222-8222-222222222222";

const now = () => new Date().toISOString();

// ---------- in-memory "database" ----------
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

// ---------- GoTrue state ----------
// Seeded user keeps the historical "smoke-test-token" working for the
// existing smoke suite; signups add users at runtime.
const users = [
  {
    id: USER_ID,
    aud: "authenticated",
    role: "authenticated",
    email: "mock@example.com",
    app_metadata: { provider: "email" },
    user_metadata: {},
    created_at: now(),
    encrypted_password: "seeded-password",
  },
];

/** token -> user id. The seeded static token maps to the seeded user. */
const sessions = new Map([["smoke-test-token", USER_ID]]);
/** refresh token -> access token. */
const refreshTokens = new Map();

function publicUser(u) {
  const { encrypted_password: _pw, ...rest } = u;
  return rest;
}

function issueSession(userId) {
  const accessToken = `mock-access-${randomUUID()}`;
  const refreshToken = `mock-refresh-${randomUUID()}`;
  sessions.set(accessToken, userId);
  refreshTokens.set(refreshToken, accessToken);
  return {
    access_token: accessToken,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: refreshToken,
    user: publicUser(users.find((u) => u.id === userId)),
  };
}

/** Mirrors the schema's handle_new_user trigger: auto-create a business. */
function createBusinessFor(userId) {
  const business = {
    id: randomUUID(),
    user_id: userId,
    name: "My Business",
    industry: null,
    currency: "USD",
    created_at: now(),
  };
  tables.businesses.push(business);
  return business;
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        resolve({ ok: true, json: JSON.parse(body || "{}") });
      } catch {
        resolve({ ok: false, json: null });
      }
    });
  });
}

/** Parse a PostgREST query into filters + flags. */
function parseQuery(searchParams) {
  const filters = [];
  for (const [key, raw] of searchParams.entries()) {
    if (key === "select") continue;
    if (raw.startsWith("eq.")) filters.push([key, raw.slice(3)]);
  }
  return { filters };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  const send = (status, body) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  };

  // ---------- GoTrue ----------
  if (url.pathname === "/auth/v1/signup" && req.method === "POST") {
    const { ok, json } = await readBody(req);
    if (!ok || !json?.email || !json?.password) {
      return send(400, { code: 400, msg: "email and password are required" });
    }
    if (users.some((u) => u.email === json.email)) {
      // Real GoTrue is ambiguous here; match its user-visible behaviour.
      return send(200, { id: randomUUID(), aud: "authenticated", email: json.email, app_metadata: {}, user_metadata: {}, created_at: now() });
    }
    const user = {
      id: randomUUID(),
      aud: "authenticated",
      role: "authenticated",
      email: json.email,
      app_metadata: { provider: "email" },
      user_metadata: {},
      created_at: now(),
      encrypted_password: json.password,
    };
    users.push(user);
    createBusinessFor(user.id); // the DB trigger's job in the real project
    return send(200, issueSession(user.id));
  }

  if (url.pathname === "/auth/v1/token" && req.method === "POST") {
    const { ok, json } = await readBody(req);
    if (!ok) return send(400, { code: 400, msg: "invalid body" });
    const grant = url.searchParams.get("grant_type");

    if (grant === "password") {
      const user = users.find((u) => u.email === json?.email && u.encrypted_password === json?.password);
      if (!user) return send(400, { error: "invalid_grant", error_description: "Invalid login credentials" });
      return send(200, issueSession(user.id));
    }

    if (grant === "refresh_token") {
      const access = refreshTokens.get(json?.refresh_token);
      const userId = access ? sessions.get(access) : undefined;
      if (!userId) return send(400, { error: "invalid_grant", error_description: "Invalid refresh token" });
      refreshTokens.delete(json.refresh_token);
      return send(200, issueSession(userId));
    }

    return send(400, { code: 400, msg: `unsupported grant_type ${grant}` });
  }

  if (url.pathname === "/auth/v1/logout" && req.method === "POST") {
    const auth = req.headers.authorization ?? "";
    if (auth.startsWith("Bearer ")) sessions.delete(auth.slice(7));
    return send(204, {});
  }

  if (url.pathname === "/auth/v1/user" && req.method === "GET") {
    const auth = req.headers.authorization ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    const userId = token ? sessions.get(token) : undefined;
    const user = userId ? users.find((u) => u.id === userId) : undefined;
    if (!user) return send(401, { message: "invalid token", error_description: "invalid token" });
    return send(200, publicUser(user));
  }

  // ---------- PostgREST ----------
  if (url.pathname.startsWith("/rest/v1/")) {
    const table = url.pathname.slice("/rest/v1/".length).split("?")[0];
    const rows = tables[table];
    if (!rows) return send(404, { message: `relation "public.${table}" does not exist` });

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
        if (matched.length === 0) {
          return send(406, { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned", details: `The result contains ${matched.length} rows`, hint: null });
        }
        return send(200, matched[0]);
      }
      return send(200, matched);
    }

    if (req.method === "POST") {
      const { ok, json } = await readBody(req);
      if (!ok) return send(400, { message: "invalid JSON body" });
      const payload = Array.isArray(json) ? json : [json];
      const inserted = payload.map((row) => ({ id: randomUUID(), created_at: now(), ...row }));
      rows.push(...inserted);
      const prefer = req.headers.prefer ?? "";
      if (prefer.includes("return=representation")) {
        return send(201, single ? inserted[0] : inserted);
      }
      res.writeHead(201, { "Content-Type": "application/json" });
      res.end();
      return;
    }

    // The Settings page updates the business profile through PostgREST.
    if (req.method === "PATCH") {
      const { ok, json } = await readBody(req);
      if (!ok) return send(400, { message: "invalid JSON body" });
      const matched = rows.filter((r) => filters.every(([k, v]) => String(r[k]) === v));
      for (const row of matched) Object.assign(row, json);
      if (single) return send(200, matched[0] ?? null);
      return send(200, matched);
    }

    return send(405, { message: "method not allowed" });
  }

  send(404, { message: "not found" });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`mock supabase listening on http://127.0.0.1:${port}`);
  console.log(`  seeded user: mock@example.com (token smoke-test-token, business ${BUSINESS_ID})`);
  console.log("  signup creates users + auto-creates their business (mirrors the DB trigger)");
});
