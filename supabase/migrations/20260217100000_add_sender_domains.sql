-- Track domain ownership per user (one user per domain)
create table if not exists public.sender_domains (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  domain text not null,
  created_at timestamptz default now(),
  unique (domain)
);

-- RLS
alter table public.sender_domains enable row level security;

create policy "Users can view their own domains"
  on public.sender_domains for select
  using (auth.uid() = user_id);

create policy "Users can insert their own domains"
  on public.sender_domains for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own domains"
  on public.sender_domains for delete
  using (auth.uid() = user_id);
