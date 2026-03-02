ALTER TABLE campaign_drafts
  ADD COLUMN IF NOT EXISTS last_campaign_id TEXT;
