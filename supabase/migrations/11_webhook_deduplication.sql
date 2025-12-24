-- Migration: Add webhook deduplication support for booking system
-- This migration adds fields and functions to prevent duplicate webhook processing

-- Add webhook deduplication fields to reservations table
ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS webhook_event_id TEXT,
ADD COLUMN IF NOT EXISTS webhook_processed_at TIMESTAMPTZ;

-- Create unique index to prevent duplicate webhook processing
CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_webhook_event_id
ON public.reservations(webhook_event_id)
WHERE webhook_event_id IS NOT NULL;

-- Function to check if webhook has already been processed
CREATE OR REPLACE FUNCTION public.check_webhook_already_processed(
    p_webhook_event_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.reservations
        WHERE webhook_event_id = p_webhook_event_id
        AND webhook_processed_at IS NOT NULL
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.check_webhook_already_processed(TEXT) TO service_role;

COMMENT ON FUNCTION public.check_webhook_already_processed(TEXT)
IS 'Checks if a webhook event has already been processed to prevent duplicates';

-- Function to mark webhook as processed
CREATE OR REPLACE FUNCTION public.update_reservation_webhook_metadata(
    p_reservation_id UUID,
    p_webhook_event_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.reservations
    SET
        webhook_event_id = p_webhook_event_id,
        webhook_processed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_reservation_id;

    IF NOT FOUND THEN
        RAISE WARNING 'Reservation ID % not found during update_reservation_webhook_metadata', p_reservation_id;
    END IF;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.update_reservation_webhook_metadata(UUID, TEXT) TO service_role;

COMMENT ON FUNCTION public.update_reservation_webhook_metadata(UUID, TEXT)
IS 'Marks a webhook as processed by updating reservation webhook metadata';
