-- Add plan column to profiles
alter table public.profiles
  add column if not exists plan text not null default 'free'
  check (plan in ('free', 'starter', 'pro'));

-- Add generation_mode column to emails for tracking AI vs standard
alter table public.emails
  add column if not exists generation_mode text;
