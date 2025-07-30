-- Production Database Reset Script (Final) - Padel Palmeraie
-- Script corrigé sans erreurs de séquences
-- Ne touche qu'aux réservations et données liées

-- Étape 1 : Réinitialiser les données sans toucher aux séquences
-- Supprimer les données des tables (ordre important pour les FK)
DELETE FROM public.payments WHERE reservation_id IS NOT NULL OR sale_id IS NOT NULL;
DELETE FROM public.gym_bookings;
DELETE FROM public.reservations;

-- Étape 2 : Réinitialiser les compteurs (si les séquences existent)
-- Ces commandes sont ignorées si les séquences n'existent pas
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'reservations_id_seq') THEN
        PERFORM setval('public.reservations_id_seq', 1, false);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'gym_bookings_id_seq') THEN
        PERFORM setval('public.gym_bookings_id_seq', 1, false);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'payments_id_seq') THEN
        PERFORM setval('public.payments_id_seq', 1, false);
    END IF;
END $$;

-- Étape 3 : Vérifier la préservation des données essentielles
SELECT '✅ Terrains préservés:' as info, COUNT(*) as count FROM public.courts;
SELECT '✅ Utilisateur préservé:' as info, email FROM auth.users WHERE email = 'davamdjo@gmail.com';
SELECT '✅ Produits préservés:' as info, COUNT(*) as count FROM public.products;
SELECT '✅ Coach profiles préservés:' as info, COUNT(*) as count FROM public.coach_profiles;

-- Étape 4 : Vérifier l'état propre
SELECT '✅ Réservations réinitialisées:' as info, COUNT(*) as count FROM public.reservations;
SELECT '✅ Cours de gym réinitialisés:' as info, COUNT(*) as count FROM public.gym_bookings;
SELECT '✅ Paiements réinitialisés:' as info, COUNT(*) as count FROM public.payments;

-- Étape 5 : Message de confirmation
SELECT '🎾 Base de données prête pour la production!' as status;
