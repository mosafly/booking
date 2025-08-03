-- Add pricing settings table for lomi integration
-- This table controls whether to use dynamic pricing or product-based pricing

CREATE TABLE IF NOT EXISTS public.pricing_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    use_dynamic_pricing BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings (dynamic pricing enabled by default)
INSERT INTO public.pricing_settings (use_dynamic_pricing) 
VALUES (true) 
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE public.pricing_settings ENABLE ROW LEVEL SECURITY;

-- Allow service_role to read pricing settings (needed for Supabase functions)
CREATE POLICY "Allow service_role read access on pricing_settings"
ON public.pricing_settings
FOR SELECT
TO service_role
USING (true);

-- Allow admins to update pricing settings
CREATE POLICY "Allow admin update access on pricing_settings"
ON public.pricing_settings
FOR UPDATE
TO authenticated
USING (public.is_admin_simple(auth.uid()));

-- Allow admins to select pricing settings
CREATE POLICY "Allow admin select access on pricing_settings"
ON public.pricing_settings
FOR SELECT
TO authenticated
USING (public.is_admin_simple(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER handle_pricing_settings_updated_at
  BEFORE UPDATE ON public.pricing_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Grant table permissions
GRANT SELECT ON public.pricing_settings TO service_role;
GRANT SELECT, UPDATE ON public.pricing_settings TO authenticated;

COMMENT ON TABLE public.pricing_settings IS 'Settings for controlling pricing behavior in lomi integration';
COMMENT ON COLUMN public.pricing_settings.use_dynamic_pricing IS 'When true, uses amount-based pricing. When false, uses product-based pricing with lomi_product_id from courts table';