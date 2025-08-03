-- Create a security-definer function to fetch all courts, bypassing RLS.
-- This ensures that any user can view the courts without permission issues.

CREATE OR REPLACE FUNCTION public.get_all_courts()
RETURNS SETOF public.courts
LANGUAGE sql
SECURITY DEFINER
-- Set a secure search path to prevent hijacking.
SET search_path = public
AS $$
    SELECT * FROM public.courts ORDER BY name;
$$;

-- Grant execute permission to authenticated users and anonymous users
GRANT EXECUTE ON FUNCTION public.get_all_courts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_courts() TO anon;

COMMENT ON FUNCTION public.get_all_courts() IS 'Fetches all courts, bypassing RLS for public viewing.';

-- As a safety measure, let's also ensure the SELECT policy on the courts table is permissive.
-- This is redundant since we are using an RPC, but it is good practice.
-- We will drop any existing select policy and create a simple, permissive one.
DO $$
BEGIN
   IF EXISTS (
       SELECT 1
       FROM pg_policies
       WHERE schemaname = 'public'
       AND tablename = 'courts'
       AND policyname = 'courts_select_policy'
   ) THEN
      DROP POLICY "courts_select_policy" ON public.courts;
   END IF;
END
$$;

CREATE POLICY "Allow public read access on courts"
ON public.courts
FOR SELECT
TO anon, authenticated
USING (true);
