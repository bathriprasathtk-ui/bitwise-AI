# Deploying BizWise AI

Production deployment plan for the frontend (static SPA) and backend (Node API),
with the exact environment variables, CORS settings and Supabase auth redirects
each one needs.

## Architecture

```
Browser ──► Frontend (Vercel/Netlify — static, no server)
   │            │  VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY  (browser ↔ Supabase directly)
   │            │  VITE_API_BASE_URL                            (browser ↔ backend)
   └──────────► Backend (Render/Fly/Railway — Node API)
                    SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY    (server ↔ Supabase, bypasses RLS)
                    AI_PROVIDER / AI_API_KEY                    (server ↔ Gemini/OpenAI)
```

Deploy the **backend first** — the frontend needs its final URL.

## 1. Backend (e.g. Render)

| Setting | Value |
|---|---|
| Build command | `cd backend && npm ci && npm run build` |
| Start command | `cd backend && npm start` |
| Health check path | `/health` |

Environment variables (all required unless noted):

| Variable | Value |
|---|---|
| `SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` secret (**backend only, never in frontend**) |
| `AI_PROVIDER` | `gemini` or `openai` |
| `AI_API_KEY` | Gemini AI Studio or OpenAI platform key (**backend only**) |
| `CORS_ORIGIN` | Exact frontend URL, e.g. `https://your-app.vercel.app` (no trailing slash) |
| `PORT` | Optional; most hosts inject this — the app reads `PORT` and defaults to 4000 |
| `GEMINI_MODEL` | Optional; defaults to `gemini-2.0-flash` |
| `OPENAI_MODEL` | Optional; defaults to `gpt-4o-mini` |

> The backend refuses to boot without `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
> and `AI_API_KEY` — this is intentional (fail loudly at boot, not mid-request).

## 2. Frontend (e.g. Vercel)

| Setting | Value |
|---|---|
| Root directory | `frontend` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Framework preset | Vite |

Environment variables (baked in **at build time** — re-deploy after changing):

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | Same Supabase Project URL as the backend |
| `VITE_SUPABASE_ANON_KEY` | Supabase → API → `anon` **public** key (safe for browsers; RLS is the guard) |
| `VITE_API_BASE_URL` | Backend URL, e.g. `https://your-api.onrender.com` (no trailing slash) |

`frontend/vercel.json` already contains the SPA rewrite (`/* → /index.html`)
so deep links like `/reset-password` work on refresh. For **Netlify** instead,
add `frontend/public/_redirects` with:

```
/*    /index.html   200
```

## 3. Supabase auth redirects (required for password reset)

Supabase → Authentication → URL Configuration:

1. **Site URL** → your frontend URL (`https://your-app.vercel.app`)
2. **Redirect URLs** → add both:
   - `https://your-app.vercel.app`
   - `https://your-app.vercel.app/reset-password`

Without these, the password-reset email links to `localhost` and fails.

Also confirm in Authentication → Providers → Email:
- **Confirm email** ON (default): signup shows "check your inbox", user clicks
  the emailed link before logging in.
- **Confirm email** OFF: signup logs in immediately; the UI still shows the
  inbox screen, then login works right away.

## 4. Database

Run `supabase/schema.sql` in the Supabase SQL editor (see repo README). It is
safe to rerun: `create table if not exists`, `drop policy if exists`, and the
backfill at the end gives any pre-existing accounts their business profile.

## 5. Post-deploy verification checklist

1. `curl https://your-api.onrender.com/health` → `{"status":"ok"}`
2. Open the frontend URL → landing page renders
3. Sign up → confirm email → log in → dashboard loads
4. Add a financial entry → reload → it's still there
5. "Generate insights" → real AI response (needs valid `AI_API_KEY`)
6. AI Advisor → ask a question → grounded reply
7. Password reset email → link lands on `/reset-password` → sets new password
