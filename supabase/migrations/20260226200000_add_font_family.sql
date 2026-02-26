ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS font_family text NOT NULL DEFAULT 'Arial';
