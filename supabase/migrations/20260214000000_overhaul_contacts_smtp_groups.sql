-- ============================================================
-- SendSafe Overhaul: SMTP fields, campaign_id, contact groups
-- ============================================================

-- 1.1 Add SMTP fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN smtp_api_key text,
  ADD COLUMN smtp_sender_email text,
  ADD COLUMN smtp_sender_name text;

-- 1.2 Add campaign_id to emails
ALTER TABLE public.emails ADD COLUMN campaign_id uuid;

-- 1.3 Create contact_groups table
CREATE TABLE public.contact_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contact groups"
  ON public.contact_groups FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contact groups"
  ON public.contact_groups FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contact groups"
  ON public.contact_groups FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own contact groups"
  ON public.contact_groups FOR DELETE
  USING (auth.uid() = user_id);

-- 1.4 Create contact_group_memberships junction table
CREATE TABLE public.contact_group_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.contact_groups(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(contact_id, group_id)
);

ALTER TABLE public.contact_group_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contact group memberships"
  ON public.contact_group_memberships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.leads
      WHERE leads.id = contact_group_memberships.contact_id
      AND leads.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own contact group memberships"
  ON public.contact_group_memberships FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.leads
      WHERE leads.id = contact_group_memberships.contact_id
      AND leads.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own contact group memberships"
  ON public.contact_group_memberships FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.leads
      WHERE leads.id = contact_group_memberships.contact_id
      AND leads.user_id = auth.uid()
    )
  );
