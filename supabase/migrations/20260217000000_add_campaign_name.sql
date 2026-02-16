-- Add campaign_name column to emails table
alter table public.emails add column if not exists campaign_name text;
