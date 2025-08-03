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

-- Create a function to ensure user profiles exist and are properly created
CREATE OR REPLACE FUNCTION public.ensure_user_profile(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    existing_role TEXT;
    is_first_user BOOLEAN;
    user_exists BOOLEAN;
BEGIN
    -- Check if profile already exists
    SELECT role INTO existing_role FROM public.profiles WHERE id = user_id;
    
    IF FOUND THEN
        RETURN existing_role;
    END IF;
    
    -- CRITICAL: Check if user exists in auth.users table first
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = user_id) INTO user_exists;
    
    IF NOT user_exists THEN
        RAISE EXCEPTION 'User with ID % does not exist in auth.users table', user_id;
    END IF;
    
    -- Check if this would be the first user
    SELECT NOT EXISTS(SELECT 1 FROM public.profiles) INTO is_first_user;
    
    -- Insert new profile (this should work since we verified user exists)
    INSERT INTO public.profiles (id, role)
    VALUES (user_id, CASE WHEN is_first_user THEN 'super_admin' ELSE 'client' END)
    ON CONFLICT (id) DO NOTHING;
    
    -- Return the assigned role
    SELECT role INTO existing_role FROM public.profiles WHERE id = user_id;
    RETURN COALESCE(existing_role, 'client');
    
EXCEPTION
    WHEN foreign_key_violation THEN
        RAISE EXCEPTION 'Foreign key violation: User ID % not found in auth.users table', user_id;
    WHEN others THEN
        RAISE EXCEPTION 'Error creating profile for user %: % - %', user_id, SQLSTATE, SQLERRM;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.ensure_user_profile(UUID) TO authenticated;

-- Create a debug function to check user authentication status
CREATE OR REPLACE FUNCTION public.debug_user_auth()
RETURNS TABLE (
    current_user_id UUID,
    user_exists_in_auth BOOLEAN,
    profile_exists BOOLEAN,
    profile_role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_id UUID;
BEGIN
    -- Get current authenticated user ID
    SELECT auth.uid() INTO user_id;
    
    RETURN QUERY
    SELECT 
        user_id as current_user_id,
        EXISTS(SELECT 1 FROM auth.users WHERE id = user_id) as user_exists_in_auth,
        EXISTS(SELECT 1 FROM public.profiles WHERE id = user_id) as profile_exists,
        (SELECT role FROM public.profiles WHERE id = user_id) as profile_role;
END;
$$;

-- Grant execute permission for debugging
GRANT EXECUTE ON FUNCTION public.debug_user_auth() TO authenticated;

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
