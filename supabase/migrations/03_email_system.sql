-- Supabase migration to add RPC function for fetching booking confirmation email data

CREATE OR REPLACE FUNCTION public.get_booking_confirmation_email_data(
    p_reservation_id UUID
)
RETURNS TABLE (
    user_email TEXT,
    user_name TEXT, -- Currently, profiles table doesn't have a name, so this might be null or sourced differently if added
    court_name TEXT,
    start_time TIMESTAMPTZ,
    total_price NUMERIC,
    currency TEXT -- Assuming currency is on the reservation or can be derived.
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public -- Explicitly set search_path
AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.email AS user_email,
        p.full_name AS user_name, -- Now using full_name from profiles table
        c.name AS court_name,
        r.start_time,
        r.total_price,
        pay.currency -- Taking currency from the related payment record, as it's most accurate for the transaction.
                     -- Assumes a payment record is created before this function is called.
    FROM 
        public.reservations r
    JOIN 
        public.profiles p ON r.user_id = p.id
    JOIN 
        auth.users u ON p.id = u.id
    JOIN 
        public.courts c ON r.court_id = c.id
    LEFT JOIN LATERAL (
        SELECT p.currency 
        FROM public.payments p
        WHERE p.reservation_id = r.id
        ORDER BY p.created_at DESC
        LIMIT 1
    ) pay ON true
    WHERE 
        r.id = p_reservation_id;

    IF NOT FOUND THEN
        RAISE WARNING 'No reservation or related data found for ID % in get_booking_confirmation_email_data', p_reservation_id;
    END IF;
END;
$$;

-- Grant execute permission to the service_role (used by Supabase functions/backend calls)
GRANT EXECUTE ON FUNCTION public.get_booking_confirmation_email_data(UUID) TO service_role;

COMMENT ON FUNCTION public.get_booking_confirmation_email_data IS 'Fetches all necessary data for a booking confirmation email based on reservation ID.'; 