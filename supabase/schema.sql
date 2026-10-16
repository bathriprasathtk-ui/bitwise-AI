-- BizWise AI — Supabase schema
-- Run this in the Supabase SQL editor (Project → SQL Editor → New query)

-- 1. Businesses: one profile per user (a user could own more than one business later)
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null default 'My Business',
  industry text,
  currency text not null default 'USD',
  created_at timestamptz not null default now()
);

-- 2. Financial entries: one row per period (e.g. per month) of raw inputs
create table if not exists public.financial_entries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  period_label text not null,           -- e.g. "2026-08"
  revenue numeric not null default 0,
  cogs numeric not null default 0,       -- cost of goods sold
  operating_expenses numeric not null default 0,
  cash_on_hand numeric not null default 0,
  created_at timestamptz not null default now()
);

-- 3. Simulations: saved what-if scenarios
create table if not exists public.simulations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null default 'Untitled scenario',
  inputs jsonb not null,                 -- { priceChangePct, volumeChangePct, costChangePct, ... }
  results jsonb not null,                -- computed projection, cached
  ai_summary text,
  created_at timestamptz not null default now()
);

-- 4. Chat messages: AI advisor conversation history
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_financial_entries_business on public.financial_entries(business_id);
create index if not exists idx_simulations_business on public.simulations(business_id);
create index if not exists idx_chat_messages_business on public.chat_messages(business_id);

-- Row Level Security: every table is scoped to the owning user
alter table public.businesses enable row level security;
alter table public.financial_entries enable row level security;
alter table public.simulations enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "own businesses" on public.businesses;
create policy "own businesses" on public.businesses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own financial entries" on public.financial_entries;
create policy "own financial entries" on public.financial_entries
  for all using (
    exists (select 1 from public.businesses b where b.id = business_id and b.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.businesses b where b.id = business_id and b.user_id = auth.uid())
  );

drop policy if exists "own simulations" on public.simulations;
create policy "own simulations" on public.simulations
  for all using (
    exists (select 1 from public.businesses b where b.id = business_id and b.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.businesses b where b.id = business_id and b.user_id = auth.uid())
  );

drop policy if exists "own chat messages" on public.chat_messages;
create policy "own chat messages" on public.chat_messages
  for all using (
    exists (select 1 from public.businesses b where b.id = business_id and b.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.businesses b where b.id = business_id and b.user_id = auth.uid())
  );

-- Auto-create a business profile the moment a user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.businesses (user_id, name)
  values (new.id, 'My Business')
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = '';

-- This function only needs to be called by the auth trigger, never by API roles.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
