-- ENUM types
CREATE TYPE public.court_status AS ENUM ('available', 'reserved', 'maintenance');
CREATE TYPE public.reservation_status AS ENUM ('pending', 'confirmed', 'cancelled');

-- PROFILES table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'admin', 'super_admin')),
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- COURTS table
CREATE TABLE IF NOT EXISTS public.courts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price_per_hour NUMERIC NOT NULL CHECK (price_per_hour >= 0),
  image_url TEXT,
  status public.court_status DEFAULT 'available',
  lomi_product_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RESERVATIONS table
CREATE TABLE IF NOT EXISTS public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- Made nullable for users without accounts
  court_id UUID NOT NULL REFERENCES public.courts(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  total_price NUMERIC NOT NULL CHECK (total_price >= 0),
  status public.reservation_status DEFAULT 'pending',
  -- User information (for users without accounts)
  user_name TEXT,
  user_email TEXT,
  user_phone TEXT,
  email_dispatch_status TEXT DEFAULT 'NOT_INITIATED' NOT NULL,
  email_dispatch_attempts INTEGER DEFAULT 0 NOT NULL,
  email_last_dispatch_attempt_at TIMESTAMPTZ,
  email_dispatch_error TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  verification_id UUID UNIQUE,
  verification_used_at TIMESTAMPTZ,
  verified_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT reservations_timeframe_check CHECK (end_time > start_time),
  CONSTRAINT reservations_user_info_check CHECK (
    (user_id IS NOT NULL) OR 
    (user_name IS NOT NULL AND user_email IS NOT NULL)
  )
);

-- PAYMENTS table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID REFERENCES public.reservations(id) ON DELETE CASCADE,
  sale_id UUID, -- Will add foreign key constraint after sales table is created
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Made nullable for anonymous payments
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'XOF',
  payment_method TEXT NOT NULL CHECK (payment_method IN ('online', 'on_spot')),
  payment_provider TEXT,
  provider_payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_url TEXT,
  payment_date TIMESTAMP WITH TIME ZONE,
  lomi_event_payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- INDEXES for PAYMENTS table
CREATE INDEX IF NOT EXISTS payments_reservation_id_idx ON public.payments(reservation_id);
CREATE INDEX IF NOT EXISTS payments_sale_id_idx ON public.payments(sale_id);
CREATE INDEX IF NOT EXISTS payments_user_id_idx ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS payments_status_idx ON public.payments(status);

-- INDEXES for RESERVATIONS table (for foreign keys)
CREATE INDEX IF NOT EXISTS reservations_user_id_idx ON public.reservations(user_id);
CREATE INDEX IF NOT EXISTS reservations_court_id_idx ON public.reservations(court_id);
CREATE INDEX IF NOT EXISTS idx_reservations_email_dispatch_status ON public.reservations(email_dispatch_status);
CREATE INDEX IF NOT EXISTS reservations_verification_id_idx ON public.reservations(verification_id);

-- Function and Trigger to HANDLE NEW USER (create profile)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  is_first_user BOOLEAN;
  assigned_role TEXT;
BEGIN
  -- Check if this is the first user
  SELECT NOT EXISTS(SELECT 1 FROM public.profiles) INTO is_first_user;
  
  -- Assign role based on whether this is first user
  assigned_role := CASE WHEN is_first_user THEN 'super_admin' ELSE 'client' END;
  
  -- Insert the profile
  INSERT INTO public.profiles (id, role)
  VALUES (NEW.id, assigned_role)
  ON CONFLICT (id) DO NOTHING;
  
  -- Log the action for debugging
  RAISE LOG 'Created profile for user % with role %', NEW.id, assigned_role;
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log any errors but don't fail the user creation
    RAISE LOG 'Error creating profile for user %: % - %', NEW.id, SQLSTATE, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function and Trigger to UPDATE 'updated_at' timestamp on PAYMENTS table
CREATE OR REPLACE FUNCTION public.update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

CREATE TRIGGER update_payments_updated_at_trigger
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_payments_updated_at();

-- Function and Trigger to UPDATE RESERVATION STATUS when PAYMENT is completed
CREATE OR REPLACE FUNCTION public.update_reservation_status_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE public.reservations
    SET status = 'confirmed'
    WHERE id = NEW.reservation_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

CREATE TRIGGER update_reservation_status_on_payment_trigger
AFTER UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_reservation_status_on_payment();

-- Procedure to FIX MISSING PROFILES (definition only, call it from seed.sql)
CREATE OR REPLACE PROCEDURE public.fix_missing_profiles()
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  SELECT u.id, 'client' FROM auth.users u
  WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
  ON CONFLICT (id) DO NOTHING;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin') THEN
    UPDATE public.profiles
    SET role = 'admin'
    WHERE id = (
      SELECT u_inner.id FROM auth.users u_inner 
      ORDER BY u_inner.created_at 
      LIMIT 1
    );
  END IF;
END;
$$
SET search_path = public;

-- Create a simpler function to check admin status without circular dependency
CREATE OR REPLACE FUNCTION public.is_admin_simple(user_uuid uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role IN ('admin', 'super_admin') FROM public.profiles WHERE id = user_uuid),
    false
  );
$$;

-- Function to verify registration PIN (allows public access for signup)
CREATE OR REPLACE FUNCTION public.verify_registration_pin(p_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    stored_pin TEXT;
BEGIN
    -- Get the stored registration PIN from config
    SELECT config_value INTO stored_pin
    FROM public.verification_config
    WHERE config_key = 'admin_registration_pin';
    
    -- Return true if PIN matches
    RETURN (stored_pin = p_pin);
END;
$$;

-- Function to check if the current user is an admin
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin_simple((select auth.uid()));
$$;

-- Enable ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- POLICIES for PROFILES table
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    -- Users can read their own profile
    id = (select auth.uid())
    OR
    -- Admins can read all profiles (use security definer function to avoid recursion)
    public.is_admin_simple((select auth.uid()))
  );

CREATE POLICY "profiles_insert_policy" ON public.profiles
  FOR INSERT TO authenticated 
  WITH CHECK (
    -- Users can only insert their own profile with client role
    id = (select auth.uid()) AND role = 'client'
  );

CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    -- Users can update their own profile
    id = (select auth.uid())
    OR
    -- Admins can update any profile (use security definer function to avoid recursion)
    public.is_admin_simple((select auth.uid()))
  );

-- POLICIES for COURTS table
CREATE POLICY "courts_select_policy" ON public.courts
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "courts_insert_policy" ON public.courts
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_simple((select auth.uid())));

CREATE POLICY "courts_update_policy" ON public.courts
  FOR UPDATE TO authenticated
  USING (public.is_admin_simple((select auth.uid())));

CREATE POLICY "courts_delete_policy" ON public.courts
  FOR DELETE TO authenticated
  USING (public.is_admin_simple((select auth.uid())));

-- POLICIES for RESERVATIONS table
CREATE POLICY "Admin users can read all reservations"
  ON public.reservations FOR SELECT TO authenticated
  USING (public.is_current_user_admin());
CREATE POLICY "Users can read their own reservations"
  ON public.reservations FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);
CREATE POLICY "Anyone can create reservations"
  ON public.reservations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Authenticated users can create reservations"
  ON public.reservations FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id OR user_id IS NULL);
CREATE POLICY "Admin users can update all reservations"
  ON public.reservations FOR UPDATE TO authenticated
  USING (public.is_current_user_admin());
CREATE POLICY "Users can update their own pending reservations"
  ON public.reservations FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id AND status = 'pending');

-- POLICIES for PAYMENTS table
CREATE POLICY "Admin users can view all payments"
  ON public.payments FOR SELECT TO authenticated
  USING (public.is_current_user_admin());
CREATE POLICY "Users can view their own payments"
  ON public.payments FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));
CREATE POLICY "Anyone can create payments"
  ON public.payments FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Authenticated users can create payments"
  ON public.payments FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()) OR user_id IS NULL);
CREATE POLICY "Admins can update all payments"
  ON public.payments FOR UPDATE TO authenticated USING (public.is_current_user_admin());

-- GRANTS (Example for courts, adjust as needed)
GRANT SELECT ON public.courts TO authenticated;
GRANT SELECT ON public.courts TO anon; -- Courts should be publicly readable
GRANT INSERT ON public.reservations TO anon; -- Allow users without accounts to create reservations
GRANT INSERT ON public.payments TO anon; -- Allow users without accounts to create payments
GRANT USAGE ON SCHEMA public TO anon;

-- Create verification config table for storing secure settings
CREATE TABLE IF NOT EXISTS public.verification_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key TEXT UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on the verification_config table
ALTER TABLE public.verification_config ENABLE ROW LEVEL SECURITY;

-- Policy for admins to access config
CREATE POLICY "Allow admin access on verification_config"
ON public.verification_config
FOR ALL
TO authenticated
USING (public.is_admin_simple(auth.uid()))
WITH CHECK (public.is_admin_simple(auth.uid()));

-- Insert the verification PIN (can be updated later)
INSERT INTO public.verification_config (config_key, config_value) 
VALUES ('staff_verification_pin', '2025') -- Default PIN, should be changed in Supabase dashboard
ON CONFLICT (config_key) DO UPDATE SET 
    config_value = EXCLUDED.config_value,
    updated_at = NOW();

-- Insert the registration PIN for admin signup (different from verification PIN)
INSERT INTO public.verification_config (config_key, config_value) 
VALUES ('admin_registration_pin', '1704') -- Default registration PIN, should be changed in Supabase dashboard
ON CONFLICT (config_key) DO UPDATE SET 
    config_value = EXCLUDED.config_value,
    updated_at = NOW();

-- Grant permissions for registration PIN function
GRANT EXECUTE ON FUNCTION public.verify_registration_pin(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_registration_pin(TEXT) TO authenticated;

-- Comments for new columns
COMMENT ON COLUMN public.reservations.email_dispatch_status IS 'Tracks the status of the booking confirmation email dispatch process.';
COMMENT ON COLUMN public.reservations.email_dispatch_attempts IS 'Number of times an attempt was made to dispatch the email.';
COMMENT ON COLUMN public.reservations.email_last_dispatch_attempt_at IS 'Timestamp of the last email dispatch attempt.';
COMMENT ON COLUMN public.reservations.email_dispatch_error IS 'Stores any error message from the last failed dispatch attempt.';

COMMENT ON FUNCTION public.verify_registration_pin IS 'Verifies the registration PIN for admin signup.';

DO $$
BEGIN
  RAISE NOTICE 'Consolidated initial schema migration complete.';
END $$; 
