-- ============================================================
-- SendSafe Initial Schema
-- ============================================================

-- 1. PROFILES (1:1 with auth.users, auto-created via trigger)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tone text not null default 'professional' check (tone in ('professional', 'friendly', 'direct')),
  goal text not null default 'sales' check (goal in ('sales', 'partnerships', 'recruiting', 'other')),
  autosend_threshold integer not null default 90 check (autosend_threshold between 50 and 100),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- 2. LEADS (user's imported contacts)
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company text not null,
  contact_email text not null,
  contact_name text,
  status text not null default 'imported' check (status in ('imported', 'skipped')),
  created_at timestamptz not null default now()
);

alter table public.leads enable row level security;

create policy "Users can view own leads"
  on public.leads for select
  using (auth.uid() = user_id);

create policy "Users can insert own leads"
  on public.leads for insert
  with check (auth.uid() = user_id);

create policy "Users can update own leads"
  on public.leads for update
  using (auth.uid() = user_id);

create policy "Users can delete own leads"
  on public.leads for delete
  using (auth.uid() = user_id);

-- 3. EMAILS (drafts, approvals, sent — filtered by status)
create table public.emails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  company text not null,
  contact_name text not null,
  contact_email text not null,
  subject text not null,
  body text not null,
  confidence integer not null default 0 check (confidence between 0 and 100),
  status text not null default 'draft' check (status in ('draft', 'needs_review', 'approved', 'sent')),
  approved boolean not null default false,
  issues text[] not null default '{}',
  suggestions text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.emails enable row level security;

create policy "Users can view own emails"
  on public.emails for select
  using (auth.uid() = user_id);

create policy "Users can insert own emails"
  on public.emails for insert
  with check (auth.uid() = user_id);

create policy "Users can update own emails"
  on public.emails for update
  using (auth.uid() = user_id);

create policy "Users can delete own emails"
  on public.emails for delete
  using (auth.uid() = user_id);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at on profiles
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger emails_updated_at
  before update on public.emails
  for each row execute function public.handle_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
