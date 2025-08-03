-- Add verification system for booking QR codes

-- Add verification fields to reservations table
ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS verification_id UUID UNIQUE,
ADD COLUMN IF NOT EXISTS verification_used_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verified_by TEXT;

-- Create index for faster verification lookups
CREATE INDEX IF NOT EXISTS reservations_verification_id_idx ON public.reservations(verification_id);

-- Function to verify a booking QR code
CREATE OR REPLACE FUNCTION public.verify_booking_qr(
    p_verification_id UUID,
    p_reservation_id UUID,
    p_verified_by TEXT DEFAULT 'system'
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    reservation_id UUID,
    court_name TEXT,
    start_time TIMESTAMPTZ,
    user_email TEXT,
    total_price NUMERIC,
    already_used BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_reservation_record RECORD;
    v_already_used BOOLEAN := FALSE;
BEGIN
    -- Get reservation details
    SELECT 
        r.id,
        r.verification_id,
        r.verification_used_at,
        r.start_time,
        r.total_price,
        c.name as court_name,
        u.email as user_email
    INTO v_reservation_record
    FROM public.reservations r
    JOIN public.courts c ON r.court_id = c.id
    JOIN auth.users u ON r.user_id = u.id
    WHERE r.id = p_reservation_id 
    AND r.verification_id = p_verification_id;

    -- Check if reservation exists with matching verification ID
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            FALSE as success, 
            'Invalid verification code or reservation not found' as message,
            NULL::UUID as reservation_id,
            NULL::TEXT as court_name, 
            NULL::TIMESTAMPTZ as start_time,
            NULL::TEXT as user_email,
            NULL::NUMERIC as total_price,
            FALSE as already_used;
        RETURN;
    END IF;

    -- Check if already used
    IF v_reservation_record.verification_used_at IS NOT NULL THEN
        v_already_used := TRUE;
    END IF;

    -- Mark as used if not already used
    IF NOT v_already_used THEN
        UPDATE public.reservations 
        SET 
            verification_used_at = NOW(),
            verified_by = p_verified_by
        WHERE id = p_reservation_id;
    END IF;

    -- Return verification result
    RETURN QUERY SELECT 
        TRUE as success,
        CASE 
            WHEN v_already_used THEN 'QR code already used'
            ELSE 'Verification successful'
        END as message,
        v_reservation_record.id as reservation_id,
        v_reservation_record.court_name,
        v_reservation_record.start_time,
        v_reservation_record.user_email,
        v_reservation_record.total_price,
        v_already_used;
END;
$$;

-- Function to store verification ID when sending confirmation email
CREATE OR REPLACE FUNCTION public.store_verification_id(
    p_reservation_id UUID,
    p_verification_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.reservations 
    SET verification_id = p_verification_id
    WHERE id = p_reservation_id;
    
    RETURN FOUND;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.verify_booking_qr(UUID, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.store_verification_id(UUID, UUID) TO service_role;

COMMENT ON FUNCTION public.verify_booking_qr IS 'Verifies a booking QR code and marks it as used';
COMMENT ON FUNCTION public.store_verification_id IS 'Stores verification ID for a reservation when sending confirmation email';

-- RPC Function to verify staff PIN
CREATE OR REPLACE FUNCTION public.verify_staff_pin(p_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    stored_pin TEXT;
BEGIN
    -- This function should only be callable by admins/staff
    IF NOT public.is_admin_simple(auth.uid()) THEN
        RAISE EXCEPTION 'Permission denied. Only staff can verify PINs.';
    END IF;

    -- Get the stored PIN from config
    SELECT config_value INTO stored_pin
    FROM public.verification_config
    WHERE config_key = 'staff_verification_pin';
    
    -- Return true if PIN matches
    RETURN (stored_pin = p_pin);
END;
$$;

-- Function to get reservation details for verification without marking it as used
CREATE OR REPLACE FUNCTION public.get_reservation_for_verification(p_verification_id UUID)
RETURNS TABLE (
    reservation_id UUID,
    court_name TEXT,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    total_price NUMERIC,
    user_email TEXT,
    user_name TEXT,
    verification_used_at TIMESTAMPTZ,
    verified_by TEXT,
    status public.reservation_status
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_admin_simple(auth.uid()) THEN
        RAISE EXCEPTION 'Permission denied. Only staff can view verification details.';
    END IF;

    RETURN QUERY
    SELECT 
        r.id as reservation_id,
        c.name as court_name,
        r.start_time,
        r.end_time,
        r.total_price,
        u.email as user_email,
        p.full_name as user_name,
        r.verification_used_at,
        r.verified_by,
        r.status
    FROM public.reservations r
    JOIN public.courts c ON r.court_id = c.id
    JOIN public.profiles p ON r.user_id = p.id
    JOIN auth.users u ON p.id = u.id
    WHERE r.verification_id = p_verification_id;
END;
$$;

-- New function to mark a booking as used
CREATE OR REPLACE FUNCTION public.mark_booking_as_used(
    p_verification_id UUID
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    already_used BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_reservation RECORD;
    v_verifier_email TEXT;
BEGIN
    -- Check permissions
    IF NOT public.is_admin_simple(auth.uid()) THEN
        RAISE EXCEPTION 'Permission denied. Only staff can mark bookings as used.';
    END IF;

    -- Get reservation details
    SELECT * INTO v_reservation
    FROM public.reservations
    WHERE verification_id = p_verification_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Invalid verification ID.', FALSE;
        RETURN;
    END IF;
    
    IF v_reservation.status <> 'confirmed' THEN
        RETURN QUERY SELECT FALSE, 'Booking is not confirmed and cannot be verified.', FALSE;
        RETURN;
    END IF;

    IF v_reservation.verification_used_at IS NOT NULL THEN
        RETURN QUERY SELECT TRUE, 'This booking has already been used.', TRUE;
        RETURN;
    END IF;
    
    -- Get verifier's email for logging
    SELECT email INTO v_verifier_email FROM auth.users WHERE id = auth.uid();

    -- Mark as used
    UPDATE public.reservations
    SET 
        verification_used_at = NOW(),
        verified_by = v_verifier_email
    WHERE id = v_reservation.id;

    RETURN QUERY SELECT TRUE, 'Booking successfully marked as used.', FALSE;
EXCEPTION
    WHEN others THEN
        RAISE LOG 'Error in mark_booking_as_used: % - %', SQLSTATE, SQLERRM;
        RETURN QUERY SELECT FALSE, 'An internal error occurred.', FALSE;
END;
$$;

-- Grant permissions for new functions
GRANT EXECUTE ON FUNCTION public.verify_staff_pin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_reservation_for_verification(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_booking_as_used(UUID) TO authenticated;

COMMENT ON FUNCTION public.verify_staff_pin IS 'Verifies a staff members PIN for secure actions.';
COMMENT ON FUNCTION public.get_reservation_for_verification IS 'Gets booking details for a staff member to review before marking as used.';
COMMENT ON FUNCTION public.mark_booking_as_used IS 'Marks a booking as used after successful verification.';