-- CMS schema for pages, sections, and storage policies
-- Create tables
CREATE TABLE IF NOT EXISTS public.cms_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.cms_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.cms_pages(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  type TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'fr',
  content JSONB NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cms_sections_page_sort ON public.cms_sections(page_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_cms_sections_locale ON public.cms_sections(locale);
CREATE INDEX IF NOT EXISTS idx_cms_pages_slug ON public.cms_pages(slug);

-- RLS
ALTER TABLE public.cms_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_sections ENABLE ROW LEVEL SECURITY;

-- Policies: public read
CREATE POLICY "cms_pages_select_public"
ON public.cms_pages FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "cms_sections_select_public"
ON public.cms_sections FOR SELECT TO anon, authenticated
USING (true);

-- Policies: admin write
CREATE POLICY "cms_pages_admin_write"
ON public.cms_pages FOR INSERT TO authenticated
WITH CHECK (public.is_admin_simple((select auth.uid())));

CREATE POLICY "cms_pages_admin_update"
ON public.cms_pages FOR UPDATE TO authenticated
USING (public.is_admin_simple((select auth.uid())));

CREATE POLICY "cms_pages_admin_delete"
ON public.cms_pages FOR DELETE TO authenticated
USING (public.is_admin_simple((select auth.uid())));

CREATE POLICY "cms_sections_admin_insert"
ON public.cms_sections FOR INSERT TO authenticated
WITH CHECK (public.is_admin_simple((select auth.uid())));

CREATE POLICY "cms_sections_admin_update"
ON public.cms_sections FOR UPDATE TO authenticated
USING (public.is_admin_simple((select auth.uid())));

CREATE POLICY "cms_sections_admin_delete"
ON public.cms_sections FOR DELETE TO authenticated
USING (public.is_admin_simple((select auth.uid())));

-- Triggers to maintain updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_cms_pages ON public.cms_pages;
CREATE TRIGGER set_updated_at_cms_pages
BEFORE UPDATE ON public.cms_pages
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_cms_sections ON public.cms_sections;
CREATE TRIGGER set_updated_at_cms_sections
BEFORE UPDATE ON public.cms_sections
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed landing page structure minimal
INSERT INTO public.cms_pages (slug, title)
VALUES ('landing', 'Page d''accueil')
ON CONFLICT (slug) DO NOTHING;

-- Example hero section seed (safe if not duplicated)
INSERT INTO public.cms_sections (page_id, key, type, locale, content, sort_order)
SELECT id, 'hero', 'hero', 'fr',
  jsonb_build_object(
    'title', 'Découvrez le padel à la Palmeraie',
    'subtitle', 'Réservez votre terrain facilement',
    'image', null
  ),
  0
FROM public.cms_pages WHERE slug = 'landing'
ON CONFLICT DO NOTHING;

-- Create buckets if missing (insert with upsert)
INSERT INTO storage.buckets (id, name, public)
VALUES ('landing', 'landing', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('courts', 'courts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (read public, write admin)
CREATE POLICY "landing_public_read"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'landing');

CREATE POLICY "landing_admin_write"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'landing' AND public.is_admin_simple((select auth.uid())));

CREATE POLICY "landing_admin_update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'landing' AND public.is_admin_simple((select auth.uid())));

CREATE POLICY "landing_admin_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'landing' AND public.is_admin_simple((select auth.uid())));

CREATE POLICY "courts_public_read"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'courts');

CREATE POLICY "courts_admin_write"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'courts' AND public.is_admin_simple((select auth.uid())));

CREATE POLICY "courts_admin_update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'courts' AND public.is_admin_simple((select auth.uid())));

CREATE POLICY "courts_admin_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'courts' AND public.is_admin_simple((select auth.uid())));
