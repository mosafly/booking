-- Seed Data for Padel Palmeraie Booking System
-- This file should be run after: supabase db reset --linked
-- Contains essential seed data for courts and example coach/gym booking data

-- NOTE: Coach profiles and gym bookings are commented out because they require
-- actual user accounts to exist first. To use them:
-- 1. Register users through the app UI
-- 2. Get their user IDs from the auth.users table  
-- 3. Update the user_id values in the commented INSERT statements below
-- 4. Uncomment and run the coach and gym booking inserts

-- ==================================================================
-- COURTS SEED DATA
-- ==================================================================
-- Using static UUIDs to ensure consistency between dev and production
INSERT INTO public.courts (id, name, description, price_per_hour, image_url, status, lomi_product_id)
VALUES
  ('c7b136a1-4366-49cc-a2e9-766aeabad01e', 'Terrain Padel A', 'Terrain extérieur avec éclairage nocturne', 8000, 'https://images.pexels.com/photos/1432038/pexels-photo-1432038.jpeg?auto=compress&cs=tinysrgb&w=600', 'available', ''),
  ('f2e7b7e8-3e4a-4a8a-92e1-7e8c9d0b2a7b', 'Terrain Padel B', 'Terrain d''entraînement pour débutants', 6000, 'https://images.pexels.com/photos/209977/pexels-photo-209977.jpeg?auto=compress&cs=tinysrgb&w=600', 'available', '');

-- ==================================================================
-- SAMPLE COACH PROFILES SEED DATA
-- ==================================================================
-- Note: These will be linked to actual users after user registration
-- For now, these are templates that can be updated with real user_ids

-- Insert sample coach profiles (will need real user_ids after users register)
-- These are examples - update user_id values when real coaches register

-- Coach 1: Fitness Coach
-- INSERT INTO public.coach_profiles (user_id, first_name, last_name, coach_type, bio, phone, is_verified)
-- VALUES 
--   ('00000000-0000-0000-0000-000000000001', 'Ahmed', 'Benali', 'fitness', 'Coach fitness certifié avec 8 ans d''expérience. Spécialisé en entraînement fonctionnel et programmes de perte de poids.', '+225 77 123 45 67', true);

-- Coach 2: Yoga Instructor
-- INSERT INTO public.coach_profiles (user_id, first_name, last_name, coach_type, bio, phone, is_verified)
-- VALUES 
--   ('00000000-0000-0000-0000-000000000002', 'Fatima', 'El Idrissi', 'yoga', 'Instructrice de yoga Hatha et Vinyasa. Enseigne la pleine conscience et la flexibilité pour le corps et l''esprit.', '+225 77 234 56 78', true);

-- Coach 3: Dance Instructor
-- INSERT INTO public.coach_profiles (user_id, first_name, last_name, coach_type, bio, phone, is_verified)
-- VALUES 
--   ('00000000-0000-0000-0000-000000000003', 'Youssef', 'Alami', 'danse', 'Instructeur de danse professionnel spécialisé en danse contemporaine et hip-hop.', '+225 77 345 67 89', true);

-- Coach 4: Padel Coach
-- INSERT INTO public.coach_profiles (user_id, first_name, last_name, coach_type, bio, phone, is_verified)
-- VALUES 
--   ('00000000-0000-0000-0000-000000000004', 'Karim', 'Sadiq', 'padel', 'Ancien joueur de padel professionnel, maintenant coach pour débutants et joueurs avancés.', '+225 77 456 78 90', true);

-- ==================================================================
-- SAMPLE GYM BOOKINGS / CLASSES SEED DATA
-- ==================================================================
-- Note: These require coach_profiles to exist first
-- Uncomment and update coach_id values after coaches are registered

-- Fitness Classes (COMMENTED OUT - Requires coach profiles to exist first)
-- INSERT INTO public.gym_bookings (coach_id, title, description, class_type, start_time, end_time, max_participants, price_cents, status, lomi_product_id)
-- VALUES 
--   ((SELECT id FROM public.coach_profiles WHERE first_name = 'Ahmed' LIMIT 1), 'Séance HIIT Matinale', 'Entraînement par intervalles haute intensité pour booster votre métabolisme', 'fitness', '2025-02-15 08:00:00+00', '2025-02-15 09:00:00+00', 15, 5000, 'scheduled', ''),
--   ((SELECT id FROM public.coach_profiles WHERE first_name = 'Ahmed' LIMIT 1), 'Musculation Corps Complet', 'Entraînement complet du corps avec poids et haltères', 'musculation', '2025-02-15 18:00:00+00', '2025-02-15 19:30:00+00', 10, 6000, 'scheduled', ''),
--   ((SELECT id FROM public.coach_profiles WHERE first_name = 'Ahmed' LIMIT 1), 'Cardio Intense', 'Séance cardio dynamique pour améliorer votre endurance', 'cardio', '2025-02-16 09:00:00+00', '2025-02-16 10:00:00+00', 12, 4500, 'scheduled', ''),
--   ((SELECT id FROM public.coach_profiles WHERE first_name = 'Ahmed' LIMIT 1), 'CrossFit Challenge', 'Entraînement CrossFit varié et challengeant', 'crossfit', '2025-02-16 17:00:00+00', '2025-02-16 18:00:00+00', 8, 7000, 'scheduled', '');

-- Yoga Classes (COMMENTED OUT - Requires coach profiles to exist first)
-- INSERT INTO public.gym_bookings (coach_id, title, description, class_type, start_time, end_time, max_participants, price_cents, status, lomi_product_id)
-- VALUES 
--   ((SELECT id FROM public.coach_profiles WHERE first_name = 'Fatima' LIMIT 1), 'Yoga du Lever du Soleil', 'Yoga doux matinal pour bien commencer votre journée', 'yoga', '2025-02-17 07:00:00+00', '2025-02-17 08:00:00+00', 20, 4000, 'scheduled', ''),
--   ((SELECT id FROM public.coach_profiles WHERE first_name = 'Fatima' LIMIT 1), 'Power Yoga', 'Flow de yoga dynamique pour force et flexibilité', 'yoga', '2025-02-17 19:00:00+00', '2025-02-17 20:00:00+00', 15, 5000, 'scheduled', '');

-- Dance Classes (COMMENTED OUT - Requires coach profiles to exist first)
-- INSERT INTO public.gym_bookings (coach_id, title, description, class_type, start_time, end_time, max_participants, price_cents, status, lomi_product_id)
-- VALUES 
--   ((SELECT id FROM public.coach_profiles WHERE first_name = 'Youssef' LIMIT 1), 'Hip-Hop Débutant', 'Apprenez les mouvements de base et chorégraphies hip-hop', 'danse', '2025-02-18 16:00:00+00', '2025-02-18 17:00:00+00', 12, 4500, 'scheduled', ''),
--   ((SELECT id FROM public.coach_profiles WHERE first_name = 'Youssef' LIMIT 1), 'Danse Contemporaine', 'Séance de danse contemporaine expressive et créative', 'danse', '2025-02-18 20:00:00+00', '2025-02-18 21:30:00+00', 10, 5500, 'scheduled', '');

-- Padel Classes (COMMENTED OUT - Requires coach profiles to exist first)
-- INSERT INTO public.gym_bookings (coach_id, title, description, class_type, start_time, end_time, max_participants, price_cents, status, lomi_product_id)
-- VALUES 
--   ((SELECT id FROM public.coach_profiles WHERE first_name = 'Karim' LIMIT 1), 'Initiation Padel', 'Découvrez les bases du padel avec un coach expérimenté', 'fitness', '2025-02-19 10:00:00+00', '2025-02-19 11:30:00+00', 6, 8000, 'scheduled', ''),
--   ((SELECT id FROM public.coach_profiles WHERE first_name = 'Karim' LIMIT 1), 'Perfectionnement Padel', 'Améliorez votre technique et stratégie de jeu', 'fitness', '2025-02-19 15:00:00+00', '2025-02-19 16:30:00+00', 4, 10000, 'scheduled', '');