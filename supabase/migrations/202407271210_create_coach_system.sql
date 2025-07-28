-- Create coach types enum
CREATE TYPE public.coach_type AS ENUM (
  'fitness',
  'yoga', 
  'danse',
  'padel'
);

-- Create coach profiles table
CREATE TABLE public.coach_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  coach_type public.coach_type NOT NULL,
  bio TEXT,
  phone TEXT,
  avatar_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create gym bookings table for coaches
CREATE TABLE public.gym_bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID REFERENCES public.coach_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  class_type public.coach_type NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  max_participants INTEGER DEFAULT 20,
  current_participants INTEGER DEFAULT 0,
  price_cents INTEGER DEFAULT 0,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create gym booking participants table
CREATE TABLE public.gym_booking_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.gym_bookings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(booking_id, user_id)
);

-- Enable RLS
ALTER TABLE public.coach_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_booking_participants ENABLE ROW LEVEL SECURITY;

-- Coach profiles RLS
CREATE POLICY "Users can view coach profiles" ON public.coach_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can create their own coach profile" ON public.coach_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Coaches can update their own profile" ON public.coach_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Gym bookings RLS
CREATE POLICY "Anyone can view gym bookings" ON public.gym_bookings
  FOR SELECT USING (true);

CREATE POLICY "Coaches can create gym bookings" ON public.gym_bookings
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.coach_profiles WHERE id = coach_id)
  );

CREATE POLICY "Coaches can update their own bookings" ON public.gym_bookings
  FOR UPDATE USING (
    auth.uid() IN (SELECT user_id FROM public.coach_profiles WHERE id = coach_id)
  );

-- Gym booking participants RLS
CREATE POLICY "Anyone can view participants" ON public.gym_booking_participants
  FOR SELECT USING (true);

CREATE POLICY "Users can join gym classes" ON public.gym_booking_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can cancel their participation" ON public.gym_booking_participants
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_coach_profiles_user_id ON public.coach_profiles(user_id);
CREATE INDEX idx_gym_bookings_coach_id ON public.gym_bookings(coach_id);
CREATE INDEX idx_gym_bookings_start_time ON public.gym_bookings(start_time);
CREATE INDEX idx_gym_booking_participants_booking_id ON public.gym_booking_participants(booking_id);
CREATE INDEX idx_gym_booking_participants_user_id ON public.gym_booking_participants(user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_coach_profiles_updated_at
  BEFORE UPDATE ON public.coach_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_gym_bookings_updated_at
  BEFORE UPDATE ON public.gym_bookings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_gym_booking_participants_updated_at
  BEFORE UPDATE ON public.gym_booking_participants
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE coach_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_booking_participants ENABLE ROW LEVEL SECURITY;

-- Coach profiles policies
CREATE POLICY "Users can view coach profiles" ON coach_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can create their own coach profile" ON coach_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own coach profile" ON coach_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Gym bookings policies
CREATE POLICY "Anyone can view gym bookings" ON gym_bookings
  FOR SELECT USING (true);

CREATE POLICY "Coaches can create gym bookings" ON gym_bookings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM coach_profiles 
      WHERE coach_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can update their own bookings" ON gym_bookings
  FOR UPDATE USING (
    coach_id = (
      SELECT id FROM coach_profiles 
      WHERE coach_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can delete their own bookings" ON gym_bookings
  FOR DELETE USING (
    coach_id = (
      SELECT id FROM coach_profiles 
      WHERE coach_profiles.user_id = auth.uid()
    )
  );

-- Gym booking participants policies
CREATE POLICY "Anyone can view participants" ON gym_booking_participants
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can join bookings" ON gym_booking_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can cancel their own participation" ON gym_booking_participants
  FOR DELETE USING (auth.uid() = user_id);

-- Insert sample coach type enum values
INSERT INTO coach_type_enum (type) VALUES 
  ('fitness'),
  ('yoga'),
  ('danse'),
  ('padel')
ON CONFLICT (type) DO NOTHING;

-- Insert sample class type enum values
INSERT INTO class_type_enum (type) VALUES 
  ('fitness'),
  ('yoga'),
  ('danse'),
  ('cardio'),
  ('musculation'),
  ('crossfit')
ON CONFLICT (type) DO NOTHING;
