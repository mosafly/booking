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