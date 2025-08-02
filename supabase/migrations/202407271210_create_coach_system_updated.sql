-- Migration complète du système coach - version corrigée
-- Éviter les conflits de politiques existantes

-- Créer les types enum
CREATE TYPE coach_type_enum AS ENUM ('fitness', 'yoga', 'danse', 'padel');
CREATE TYPE class_type_enum AS ENUM ('fitness', 'yoga', 'danse', 'cardio', 'musculation', 'crossfit');
CREATE TYPE booking_status_enum AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');

-- Table coach_profiles
CREATE TABLE IF NOT EXISTS public.coach_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  coach_type coach_type_enum NOT NULL,
  bio TEXT,
  phone VARCHAR(20),
  avatar_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table gym_bookings
CREATE TABLE IF NOT EXISTS public.gym_bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID REFERENCES public.coach_profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  class_type class_type_enum NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  max_participants INTEGER DEFAULT 10,
  price_cents INTEGER DEFAULT 0,
  status booking_status_enum DEFAULT 'scheduled',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table gym_booking_participants
CREATE TABLE IF NOT EXISTS public.gym_booking_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.gym_bookings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(booking_id, user_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_coach_profiles_user_id ON public.coach_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_gym_bookings_coach_id ON public.gym_bookings(coach_id);
CREATE INDEX IF NOT EXISTS idx_gym_bookings_start_time ON public.gym_bookings(start_time);
CREATE INDEX IF NOT EXISTS idx_gym_bookings_status ON public.gym_bookings(status);
CREATE INDEX IF NOT EXISTS idx_gym_booking_participants_booking_id ON public.gym_booking_participants(booking_id);
CREATE INDEX IF NOT EXISTS idx_gym_booking_participants_user_id ON public.gym_booking_participants(user_id);

-- Fonction pour updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER IF NOT EXISTS handle_coach_profiles_updated_at
  BEFORE UPDATE ON public.coach_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER IF NOT EXISTS handle_gym_bookings_updated_at
  BEFORE UPDATE ON public.gym_bookings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER IF NOT EXISTS handle_gym_booking_participants_updated_at
  BEFORE UPDATE ON public.gym_booking_participants
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Supprimer les politiques existantes si elles existent
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'coach_profiles' AND policyname = 'Users can view coach profiles') THEN
    EXECUTE 'DROP POLICY "Users can view coach profiles" ON public.coach_profiles';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'coach_profiles' AND policyname = 'Users can create their own coach profile') THEN
    EXECUTE 'DROP POLICY "Users can create their own coach profile" ON public.coach_profiles';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'coach_profiles' AND policyname = 'Users can update their own coach profile') THEN
    EXECUTE 'DROP POLICY "Users can update their own coach profile" ON public.coach_profiles';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gym_bookings' AND policyname = 'Anyone can view gym bookings') THEN
    EXECUTE 'DROP POLICY "Anyone can view gym bookings" ON public.gym_bookings';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gym_bookings' AND policyname = 'Coaches can create gym bookings') THEN
    EXECUTE 'DROP POLICY "Coaches can create gym bookings" ON public.gym_bookings';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gym_bookings' AND policyname = 'Coaches can update their own bookings') THEN
    EXECUTE 'DROP POLICY "Coaches can update their own bookings" ON public.gym_bookings';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gym_bookings' AND policyname = 'Coaches can delete their own bookings') THEN
    EXECUTE 'DROP POLICY "Coaches can delete their own bookings" ON public.gym_bookings';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gym_booking_participants' AND policyname = 'Anyone can view participants') THEN
    EXECUTE 'DROP POLICY "Anyone can view participants" ON public.gym_booking_participants';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gym_booking_participants' AND policyname = 'Authenticated users can join bookings') THEN
    EXECUTE 'DROP POLICY "Authenticated users can join bookings" ON public.gym_booking_participants';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gym_booking_participants' AND policyname = 'Users can cancel their own participation') THEN
    EXECUTE 'DROP POLICY "Users can cancel their own participation" ON public.gym_booking_participants';
  END IF;
END $$;

-- Politiques de sécurité
ALTER TABLE coach_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_booking_participants ENABLE ROW LEVEL SECURITY;

-- Coach profiles policies
CREATE POLICY "coach_profiles_select_all" ON public.coach_profiles
  FOR SELECT USING (true);

CREATE POLICY "coach_profiles_insert_own" ON public.coach_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "coach_profiles_update_own" ON public.coach_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Gym bookings policies
CREATE POLICY "gym_bookings_select_all" ON public.gym_bookings
  FOR SELECT USING (true);

CREATE POLICY "gym_bookings_insert_coach_only" ON public.gym_bookings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM coach_profiles 
      WHERE coach_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "gym_bookings_update_own_coach" ON public.gym_bookings
  FOR UPDATE USING (
    coach_id = (
      SELECT id FROM coach_profiles 
      WHERE coach_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "gym_bookings_delete_own_coach" ON public.gym_bookings
  FOR DELETE USING (
    coach_id = (
      SELECT id FROM coach_profiles 
      WHERE coach_profiles.user_id = auth.uid()
    )
  );

-- Gym booking participants policies
CREATE POLICY "gym_booking_participants_select_all" ON public.gym_booking_participants
  FOR SELECT USING (true);

CREATE POLICY "gym_booking_participants_insert_auth" ON public.gym_booking_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "gym_booking_participants_delete_own" ON public.gym_booking_participants
  FOR DELETE USING (auth.uid() = user_id);
