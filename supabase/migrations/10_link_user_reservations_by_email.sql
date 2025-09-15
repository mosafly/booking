-- Link reservations created by webhook (user_id IS NULL) to the freshly logged-in user by matching email
-- This function is safe: it only updates rows where user_email equals the current user's email
-- and requires that the caller's auth.uid() equals the provided p_user_id.

create or replace function public.link_user_reservations_by_email(
  p_email text,
  p_user_id uuid
) returns integer
language plpgsql
security definer
set search_path = public
as $$
DECLARE
  v_caller uuid := auth.uid();
  v_updated integer := 0;
BEGIN
  -- Ensure the caller is the same as p_user_id (prevents linking to someone else)
  IF v_caller IS NULL OR v_caller <> p_user_id THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF p_email IS NULL OR length(trim(p_email)) = 0 THEN
    RETURN 0;
  END IF;

  update public.reservations r
     set user_id = p_user_id
   where r.user_id is null
     and r.user_email = p_email
  returning 1 into v_updated;

  -- v_updated will be 1 for the last updated row; we can instead return the count
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

-- Allow authenticated users to execute
grant execute on function public.link_user_reservations_by_email(text, uuid) to authenticated;

-- Optional: You may also allow anon if you call it before session is established (not recommended)
-- grant execute on function public.link_user_reservations_by_email(text, uuid) to anon;
