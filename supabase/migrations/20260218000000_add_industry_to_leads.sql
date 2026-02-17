-- Add industry column to leads
alter table public.leads
  add column if not exists industry text;
