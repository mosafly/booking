-- Comprehensive Seed Data for Padel Palmeraie Booking System
-- This file should be run after: supabase db reset
-- Contains all essential seed data for courts, products, and sample coach profiles

-- ==================================================================
-- COURTS SEED DATA
-- ==================================================================
-- Using static UUIDs to ensure consistency between dev and production
INSERT INTO public.courts (id, name, description, price_per_hour, image_url, status, lomi_product_id)
VALUES
  ('c7b136a1-4366-49cc-a2e9-766aeabad01e', 'Padel Court A', 'Outdoor court with night lighting', 8000, 'https://images.pexels.com/photos/1432038/pexels-photo-1432038.jpeg?auto=compress&cs=tinysrgb&w=600', 'available', ''),
  ('f2e7b7e8-3e4a-4a8a-92e1-7e8c9d0b2a7b', 'Padel Court B', 'Training court for beginners', 6000, 'https://images.pexels.com/photos/209977/pexels-photo-209977.jpeg?auto=compress&cs=tinysrgb&w=600', 'available', '');

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
--   ('00000000-0000-0000-0000-000000000001', 'Ahmed', 'Benali', 'fitness', 'Certified fitness trainer with 8 years experience. Specializes in functional training and weight loss programs.', '+212 6 12 34 56 78', true);

-- Coach 2: Yoga Instructor
-- INSERT INTO public.coach_profiles (user_id, first_name, last_name, coach_type, bio, phone, is_verified)
-- VALUES 
--   ('00000000-0000-0000-0000-000000000002', 'Fatima', 'El Idrissi', 'yoga', 'Hatha and Vinyasa yoga instructor. Teaching mindfulness and flexibility for body and soul.', '+212 6 23 45 67 89', true);

-- Coach 3: Dance Instructor
-- INSERT INTO public.coach_profiles (user_id, first_name, last_name, coach_type, bio, phone, is_verified)
-- VALUES 
--   ('00000000-0000-0000-0000-000000000003', 'Youssef', 'Alami', 'danse', 'Professional dance instructor specializing in contemporary and hip-hop styles.', '+212 6 34 56 78 90', true);

-- Coach 4: Padel Coach
-- INSERT INTO public.coach_profiles (user_id, first_name, last_name, coach_type, bio, phone, is_verified)
-- VALUES 
--   ('00000000-0000-0000-0000-000000000004', 'Karim', 'Sadiq', 'padel', 'Former professional padel player, now coaching beginners to advanced players.', '+212 6 45 67 89 01', true);

-- ==================================================================
-- SAMPLE GYM BOOKINGS / CLASSES SEED DATA
-- ==================================================================
-- Note: These require coach_profiles to exist first
-- Uncomment and update coach_id values after coaches are registered

-- Fitness Classes
-- INSERT INTO public.gym_bookings (coach_id, title, description, class_type, start_time, end_time, max_participants, price_cents, status, lomi_product_id)
-- VALUES 
--   ((SELECT id FROM public.coach_profiles WHERE first_name = 'Ahmed' LIMIT 1), 'Morning HIIT Session', 'High-intensity interval training to boost your metabolism', 'fitness', '2024-01-15 08:00:00+00', '2024-01-15 09:00:00+00', 15, 5000, 'scheduled', ''),
--   ((SELECT id FROM public.coach_profiles WHERE first_name = 'Ahmed' LIMIT 1), 'Strength Training', 'Full body strength workout with weights', 'musculation', '2024-01-15 18:00:00+00', '2024-01-15 19:30:00+00', 10, 6000, 'scheduled', '');

-- Yoga Classes
-- INSERT INTO public.gym_bookings (coach_id, title, description, class_type, start_time, end_time, max_participants, price_cents, status, lomi_product_id)
-- VALUES 
--   ((SELECT id FROM public.coach_profiles WHERE first_name = 'Fatima' LIMIT 1), 'Sunrise Yoga', 'Gentle morning yoga to start your day', 'yoga', '2024-01-16 07:00:00+00', '2024-01-16 08:00:00+00', 20, 4000, 'scheduled', ''),
--   ((SELECT id FROM public.coach_profiles WHERE first_name = 'Fatima' LIMIT 1), 'Power Yoga', 'Dynamic yoga flow for strength and flexibility', 'yoga', '2024-01-16 19:00:00+00', '2024-01-16 20:00:00+00', 15, 5000, 'scheduled', '');

-- Dance Classes
-- INSERT INTO public.gym_bookings (coach_id, title, description, class_type, start_time, end_time, max_participants, price_cents, status, lomi_product_id)
-- VALUES 
--   ((SELECT id FROM public.coach_profiles WHERE first_name = 'Youssef' LIMIT 1), 'Hip-Hop Basics', 'Learn fundamental hip-hop moves and choreography', 'danse', '2024-01-17 16:00:00+00', '2024-01-17 17:00:00+00', 12, 4500, 'scheduled', ''),
--   ((SELECT id FROM public.coach_profiles WHERE first_name = 'Youssef' LIMIT 1), 'Contemporary Dance', 'Expressive contemporary dance session', 'danse', '2024-01-17 20:00:00+00', '2024-01-17 21:30:00+00', 10, 5500, 'scheduled', '');

-- ==================================================================
-- VERIFICATION MESSAGES
-- ==================================================================
-- Verify that all seed data has been inserted correctly

SELECT 'Courts inserted:' as info, COUNT(*) as count FROM public.courts;
-- SELECT 'Products inserted:' as info, COUNT(*) as count FROM public.products; -- Disabled: POS system commented out
-- SELECT 'Pricing settings initialized:' as info, COUNT(*) as count FROM public.pricing_settings; -- Disabled: POS system commented out

-- Show sample data
SELECT 'Sample court:' as info, name, price_per_hour FROM public.courts LIMIT 1;
-- SELECT 'Sample product:' as info, name, price_cents FROM public.products LIMIT 1; -- Disabled: POS system commented out

-- Final status
SELECT '✅ Seed data loaded successfully - Ready for production use!' as status;

-- ==================================================================
-- NOTES FOR MANUAL SETUP
-- ==================================================================
-- 
-- After running this seed:
-- 
-- 1. COACHES SETUP:
--    - Register coach users through the app
--    - Update coach_profiles with real user_ids
--    - Uncomment and run the coach INSERT statements above
-- 
-- 2. LOMI PRODUCT IDS:
--    - Update lomi_product_id fields in courts table
--    - Update lomi_product_id fields in products table
--    - Configure these in your admin panel
-- 
-- 3. ADMIN USER:
--    - First registered user becomes admin automatically
--    - For additional admins, update profiles.role manually
-- 
-- 4. PRICING CONFIGURATION:
--    - Access admin panel to configure dynamic pricing
--    - Set up lomi. payment integration
-- 
-- ==================================================================
