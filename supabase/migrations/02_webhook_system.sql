-- Supabase migration for Padel App webhook system

-- Function to record a Lomi payment and update relevant Padel app tables.
-- This function is called by the Padel app's Lomi webhook handler.
CREATE OR REPLACE FUNCTION public.record_padel_lomi_payment(
    p_reservation_id UUID,
    p_lomi_payment_id TEXT, -- Lomi's transaction_id (can be null if only checkout_session_id is available)
    p_lomi_checkout_session_id TEXT, -- Lomi's checkout_session_id (can be null if not a checkout event)
    p_amount_paid NUMERIC,
    p_currency_paid TEXT,
    p_lomi_event_payload JSONB -- The full event payload from Lomi for auditing/reference
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public -- Explicitly set search_path to public schema
AS $$
DECLARE
    v_user_id UUID;
    v_reservation_exists BOOLEAN;
    v_payment_id UUID;
BEGIN
    -- 0. Currency validation/casting is removed as payments.currency is TEXT.
    -- If payments.currency were an ENUM, casting would be needed here.

    -- 1. Get user_id from the reservation
    SELECT user_id, EXISTS(SELECT 1 FROM public.reservations WHERE id = p_reservation_id)
    INTO v_user_id, v_reservation_exists
    FROM public.reservations
    WHERE id = p_reservation_id;

    IF NOT v_reservation_exists THEN
        RAISE EXCEPTION 'Padel reservation with ID % not found.', p_reservation_id;
        RETURN;
    END IF;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID not found for Padel reservation ID %.', p_reservation_id;
        RETURN;
    END IF;

    -- 2. Insert or Update payment record
    INSERT INTO public.payments (
        reservation_id,
        user_id,
        amount,
        currency, -- Using p_currency_paid directly as payments.currency is TEXT
        payment_method,
        payment_provider,
        provider_payment_id,
        status,
        payment_date
        -- Add a metadata column to public.payments if you want to store p_lomi_event_payload
        -- metadata
    )
    VALUES (
        p_reservation_id,
        v_user_id,
        p_amount_paid,
        p_currency_paid, -- Directly use the TEXT input
        'online', -- Payment method
        'lomi',   -- Payment provider
        COALESCE(p_lomi_payment_id, p_lomi_checkout_session_id, 'N/A'), -- Lomi's unique ID for the payment
        'completed', -- Set status to completed
        NOW()      -- Payment date
        -- p_lomi_event_payload -- Store Lomi payload if you have a metadata column
    )
    RETURNING id INTO v_payment_id;

    RAISE LOG 'Recorded Lomi payment. Padel Payment ID: %, Lomi Payment/Checkout ID: % for Reservation ID: %', 
                v_payment_id, 
                COALESCE(p_lomi_payment_id, p_lomi_checkout_session_id, 'N/A'), 
                p_reservation_id;

    -- The trigger 'update_reservation_status_on_payment' defined in 01_db_init.sql
    -- should automatically update the reservation status to 'confirmed' when
    -- the payment status is updated to 'completed'.

EXCEPTION
    WHEN others THEN
        RAISE EXCEPTION 'Error in record_padel_lomi_payment RPC: % - %', SQLSTATE, SQLERRM;
END;
$$;

-- Grant execute permission to the service_role (used by Supabase functions/backend calls)
GRANT EXECUTE ON FUNCTION public.record_padel_lomi_payment(UUID, TEXT, TEXT, NUMERIC, TEXT, JSONB) TO service_role;

COMMENT ON FUNCTION public.record_padel_lomi_payment IS 'Records a successful payment processed via Lomi for a Padel court reservation and updates related tables.';
