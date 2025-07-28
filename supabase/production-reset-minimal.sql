-- Production Database Reset Script (Minimal) - Padel Palmeraie
-- This script ONLY resets reservations, gym bookings, and payments
-- Preserves: users, profiles, courts, products, coach profiles, and their prices

-- Step 1: Backup user data (davamdjo@gmail.com) - just for verification
CREATE TEMPORARY TABLE temp_preserved_user AS
SELECT * FROM auth.users WHERE email = 'davamdjo@gmail.com';

-- Step 2: Truncate only reservation-related data
-- Order matters due to foreign key constraints
TRUNCATE TABLE public.payments CASCADE;
TRUNCATE TABLE public.gym_bookings CASCADE;
TRUNCATE TABLE public.reservations CASCADE;

-- Step 3: Reset only reservation-related sequences
ALTER SEQUENCE public.reservations_id_seq RESTART WITH 1;
ALTER SEQUENCE public.gym_bookings_id_seq RESTART WITH 1;
ALTER SEQUENCE public.payments_id_seq RESTART WITH 1;

-- Step 4: Verify preservation of essential data
SELECT 'User preserved:' as info, email FROM auth.users WHERE email = 'davamdjo@gmail.com';
SELECT 'Courts preserved:' as info, COUNT(*) as count FROM public.courts;
SELECT 'Products preserved:' as info, COUNT(*) as count FROM public.products;
SELECT 'Coach profiles preserved:' as info, COUNT(*) as count FROM public.coach_profiles;
SELECT 'Profiles preserved:' as info, COUNT(*) as count FROM public.profiles;

-- Step 5: Verify clean state
SELECT 'Reservations reset:' as info, COUNT(*) as count FROM public.reservations;
SELECT 'Gym bookings reset:' as info, COUNT(*) as count FROM public.gym_bookings;
SELECT 'Payments reset:' as info, COUNT(*) as count FROM public.payments;

-- Step 6: Clean up temporary tables
DROP TABLE IF EXISTS temp_preserved_user;

-- Step 7: Final verification
SELECT 'Database reset completed - only reservations and related data were reset' as status;
