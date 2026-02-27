CREATE TABLE IF NOT EXISTS campaign_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Uten navn',
  contact_ids uuid[] NOT NULL DEFAULT '{}',
  tone text NOT NULL DEFAULT 'professional',
  goal text NOT NULL DEFAULT 'sales',
  language text NOT NULL DEFAULT 'no',
  template_subject text NOT NULL DEFAULT '',
  template_body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE campaign_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own drafts"
  ON campaign_drafts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
