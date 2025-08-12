-- Court Unavailability Support
-- Creates a table to store unavailability periods for courts (terrains)
-- Adds RLS policies and a trigger to prevent reservations during unavailable periods

-- Table: court_unavailabilities
CREATE TABLE IF NOT EXISTS public.court_unavailabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id UUID NOT NULL REFERENCES public.courts(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT court_unavailabilities_timeframe_check CHECK (end_time > start_time)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_court_unavailabilities_court_id ON public.court_unavailabilities(court_id);
CREATE INDEX IF NOT EXISTS idx_court_unavailabilities_time ON public.court_unavailabilities(start_time, end_time);

-- Enable RLS
ALTER TABLE public.court_unavailabilities ENABLE ROW LEVEL SECURITY;

-- Policies
-- Readable by everyone (clients need to view to compute available slots)
DROP POLICY IF EXISTS "court_unavailabilities_select" ON public.court_unavailabilities;
CREATE POLICY "court_unavailabilities_select"
  ON public.court_unavailabilities
  FOR SELECT TO anon, authenticated
  USING (true);

-- Only admins can insert/update/delete
DROP POLICY IF EXISTS "court_unavailabilities_admin_insert" ON public.court_unavailabilities;
CREATE POLICY "court_unavailabilities_admin_insert"
  ON public.court_unavailabilities
  FOR INSERT TO authenticated
  WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "court_unavailabilities_admin_update" ON public.court_unavailabilities;
CREATE POLICY "court_unavailabilities_admin_update"
  ON public.court_unavailabilities
  FOR UPDATE TO authenticated
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "court_unavailabilities_admin_delete" ON public.court_unavailabilities;
CREATE POLICY "court_unavailabilities_admin_delete"
  ON public.court_unavailabilities
  FOR DELETE TO authenticated
  USING (public.is_current_user_admin());

-- Optional: prevent overlapping unavailability entries per court
CREATE OR REPLACE FUNCTION public.prevent_overlapping_court_unavailability()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.court_unavailabilities cu
    WHERE cu.court_id = NEW.court_id
      AND tstzrange(cu.start_time, cu.end_time, '[)') && tstzrange(NEW.start_time, NEW.end_time, '[)')
      AND (TG_OP = 'INSERT' OR cu.id <> NEW.id)
  ) THEN
    RAISE EXCEPTION 'Overlapping unavailability exists for this court';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_prevent_overlap_court_unavailability ON public.court_unavailabilities;
CREATE TRIGGER trg_prevent_overlap_court_unavailability
BEFORE INSERT OR UPDATE ON public.court_unavailabilities
FOR EACH ROW EXECUTE FUNCTION public.prevent_overlapping_court_unavailability();

-- Enforce at reservation time: prevent creating reservations during unavailability
CREATE OR REPLACE FUNCTION public.check_reservation_not_in_unavailability()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.court_unavailabilities cu
    WHERE cu.court_id = NEW.court_id
      AND tstzrange(cu.start_time, cu.end_time, '[)') && tstzrange(NEW.start_time, NEW.end_time, '[)')
  ) THEN
    RAISE EXCEPTION 'Court is unavailable during the selected time window';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_reservation_block_unavailability ON public.reservations;
CREATE TRIGGER trg_reservation_block_unavailability
BEFORE INSERT OR UPDATE ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.check_reservation_not_in_unavailability();

COMMENT ON TABLE public.court_unavailabilities IS 'Stores unavailability windows for courts/terrains to block reservations.';
COMMENT ON COLUMN public.court_unavailabilities.reason IS 'Optional reason (maintenance, private event, etc.)';
COMMENT ON FUNCTION public.check_reservation_not_in_unavailability IS 'Blocks reservation insert/update if it overlaps with a court unavailability.';
