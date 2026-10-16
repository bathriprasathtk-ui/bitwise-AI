# BizWise AI

**Your AI-powered business decision assistant.**

A full-stack SaaS app for small-business owners: log financial data, see auto-calculated
health metrics, get AI-generated insights, chat with an AI advisor, and run "what-if"
simulations on pricing, costs, and revenue.

```
bizwise-ai/
├── frontend/     React + TypeScript + Vite + Tailwind
├── backend/      Node + Express + TypeScript (AI provider proxy)
└── supabase/     Database schema + RLS policies
```

## 1. Set up Supabase

1. Create a project at https://supabase.com.
2. In the SQL editor, run `supabase/schema.sql`. This creates the tables
   (`businesses`, `financial_entries`, `simulations`, `chat_messages`) and
   Row Level Security policies so users can only ever see their own data.
3. Grab three values from **Project Settings → API**:
   - Project URL
   - `anon` public key
   - `service_role` secret key (backend only — never ship this to the browser)
4. In **Authentication → Providers**, email/password is enabled by default.
   Optionally enable Google OAuth there too.

## 2. Backend

```bash
cd backend
cp .env.example .env      # fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, AI_API_KEY, AI_PROVIDER
npm install
npm run dev                # http://localhost:4000
```

## 3. Frontend

```bash
cd frontend
cp .env.example .env      # fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_BASE_URL
npm install
npm run dev                # http://localhost:5173
```

## 4. AI provider

The backend never exposes `AI_API_KEY` to the browser — every AI call goes through
`backend/src/routes/ai.ts`, which calls `backend/src/ai/provider.ts`. That file picks
between Gemini and OpenAI based on `AI_PROVIDER` in `.env`, so swapping providers is a
one-line config change, not a rewrite.

## What's implemented

- Email/password signup, login, logout, session persistence, forgot/reset password,
  protected routes (Supabase Auth)
- Landing page, dashboard, business analysis, AI advisor chat, what-if simulator,
  reports, settings — all wired to real data, no dead links
- Financial metrics engine (margins, burn rate, runway, health score) shared by
  frontend (instant preview) and backend (source of truth for AI context)
- AI advisor: backend endpoint that feeds the business's real numbers + conversation
  history to Gemini/OpenAI and returns grounded, specific advice
- What-if simulator: adjust price, volume, costs and see projected profit/margin/
  health score recalculated live, with an optional AI-written summary of the scenario
- Responsive sidebar-on-desktop / bottom-nav-on-mobile layout, dark mode

## What you still need to do

- Run `npm install` in both folders (this container has no network access, so
  dependencies aren't pre-installed or verified against a live Supabase project)
- Fill in your real Supabase + AI keys in both `.env` files
- Deploy (e.g. frontend on Vercel, backend on Render/Fly/Railway) and set
  `VITE_API_BASE_URL` to your deployed backend URL

## Before deployment

- Set the Supabase Auth **Site URL** and allowed redirect URLs for your deployed
  frontend URL. This is required for email confirmation and password reset links.
- Configure the backend's `CORS_ORIGIN` to the exact deployed frontend URL, and
  configure the frontend's `VITE_API_BASE_URL` to the backend's HTTPS URL.
- Keep `SUPABASE_SERVICE_ROLE_KEY` and `AI_API_KEY` only in the backend host's
  secret manager. Do not add them to the frontend environment or commit a `.env` file.
- The schema is safe to rerun for its policies and auth trigger. Run it before
  creating production users so every account receives its business profile.
