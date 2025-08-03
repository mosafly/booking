-- Complete Coach System Migration
-- Combines and simplifies the coach system from previous migration attempts

-- Create coach types enum
DO $$ BEGIN
    CREATE TYPE public.coach_type AS ENUM (
      'fitness',
      'yoga', 
      'danse',
      'padel'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create class types enum
DO $$ BEGIN
    CREATE TYPE public.class_type AS ENUM (
      'fitness',
      'yoga',
      'danse',
      'cardio',
      'musculation',
      'crossfit'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create booking status enum
DO $$ BEGIN
    CREATE TYPE public.booking_status AS ENUM (
      'scheduled',
      'in_progress',
      'completed',
      'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create coach profiles table
CREATE TABLE IF NOT EXISTS public.coach_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  coach_type public.coach_type NOT NULL,
  bio TEXT,
  phone VARCHAR(20),
  avatar_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create gym bookings table
CREATE TABLE IF NOT EXISTS public.gym_bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID REFERENCES public.coach_profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  class_type public.class_type NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  max_participants INTEGER DEFAULT 10,
  price_cents INTEGER DEFAULT 0,
  status public.booking_status DEFAULT 'scheduled',
  lomi_product_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create gym booking participants table
CREATE TABLE IF NOT EXISTS public.gym_booking_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.gym_bookings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(booking_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_coach_profiles_user_id ON public.coach_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_gym_bookings_coach_id ON public.gym_bookings(coach_id);
CREATE INDEX IF NOT EXISTS idx_gym_bookings_start_time ON public.gym_bookings(start_time);
CREATE INDEX IF NOT EXISTS idx_gym_bookings_status ON public.gym_bookings(status);
CREATE INDEX IF NOT EXISTS idx_gym_booking_participants_booking_id ON public.gym_booking_participants(booking_id);
CREATE INDEX IF NOT EXISTS idx_gym_booking_participants_user_id ON public.gym_booking_participants(user_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS handle_coach_profiles_updated_at ON public.coach_profiles;
CREATE TRIGGER handle_coach_profiles_updated_at
  BEFORE UPDATE ON public.coach_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_gym_bookings_updated_at ON public.gym_bookings;
CREATE TRIGGER handle_gym_bookings_updated_at
  BEFORE UPDATE ON public.gym_bookings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Update existing gym bookings with default product IDs
UPDATE public.gym_bookings 
SET lomi_product_id = '' 
WHERE lomi_product_id IS NULL;

-- Enable RLS
ALTER TABLE public.coach_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_booking_participants ENABLE ROW LEVEL SECURITY;

-- Coach profiles policies
CREATE POLICY "coach_profiles_select_all" ON public.coach_profiles
  FOR SELECT USING (true);

CREATE POLICY "coach_profiles_insert_own" ON public.coach_profiles
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "coach_profiles_update_own" ON public.coach_profiles
  FOR UPDATE USING ((select auth.uid()) = user_id);

-- Gym bookings policies
CREATE POLICY "gym_bookings_select_all" ON public.gym_bookings
  FOR SELECT USING (true);

CREATE POLICY "gym_bookings_insert_coach_only" ON public.gym_bookings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coach_profiles 
      WHERE coach_profiles.user_id = (select auth.uid())
    )
  );

CREATE POLICY "gym_bookings_update_own_coach" ON public.gym_bookings
  FOR UPDATE USING (
    coach_id = (
      SELECT id FROM public.coach_profiles 
      WHERE coach_profiles.user_id = (select auth.uid())
    )
  );

CREATE POLICY "gym_bookings_delete_own_coach" ON public.gym_bookings
  FOR DELETE USING (
    coach_id = (
      SELECT id FROM public.coach_profiles 
      WHERE coach_profiles.user_id = (select auth.uid())
    )
  );

-- Gym booking participants policies
CREATE POLICY "gym_booking_participants_select_all" ON public.gym_booking_participants
  FOR SELECT USING (true);

CREATE POLICY "gym_booking_participants_insert_auth" ON public.gym_booking_participants
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "gym_booking_participants_delete_own" ON public.gym_booking_participants
  FOR DELETE USING ((select auth.uid()) = user_id);

COMMENT ON TABLE public.coach_profiles IS 'Profiles for coaches offering various fitness and wellness services';
COMMENT ON TABLE public.gym_bookings IS 'Bookings for gym classes, training sessions, and wellness activities';
COMMENT ON TABLE public.gym_booking_participants IS 'Participants enrolled in gym bookings';