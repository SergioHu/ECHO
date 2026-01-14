-- ============================================================
-- Migration 025: FIX get_nearby_requests Function
-- ============================================================
-- This migration ensures the get_nearby_requests function:
-- 1. Shows user's own open requests (with is_own flag)
-- 2. Handles NULL expires_at (never expires)
-- 3. Returns status column
-- ============================================================

-- Drop existing function (required because return type changes)
DROP FUNCTION IF EXISTS public.get_nearby_requests(NUMERIC, NUMERIC, INTEGER, INTEGER);

-- Create fixed function
CREATE OR REPLACE FUNCTION public.get_nearby_requests(
    p_latitude NUMERIC,
    p_longitude NUMERIC,
    p_radius_meters INTEGER DEFAULT 5000,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    creator_id UUID,
    creator_name TEXT,
    latitude NUMERIC,
    longitude NUMERIC,
    location_name TEXT,
    description TEXT,
    category TEXT,
    price_cents INTEGER,
    status TEXT,
    distance_meters NUMERIC,
    created_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    is_own BOOLEAN
) AS $$
DECLARE
    v_point GEOGRAPHY;
    v_user_id UUID;
BEGIN
    v_point := ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography;
    v_user_id := auth.uid();

    RETURN QUERY
    SELECT
        r.id,
        r.creator_id,
        p.display_name AS creator_name,
        r.latitude,
        r.longitude,
        r.location_name,
        r.description,
        r.category,
        r.price_cents,
        r.status::TEXT,
        ST_Distance(r.location, v_point)::NUMERIC AS distance_meters,
        r.created_at,
        r.expires_at,
        (r.creator_id = v_user_id) AS is_own
    FROM public.requests r
    JOIN public.profiles p ON p.id = r.creator_id
    WHERE r.status = 'open'
      AND (r.expires_at IS NULL OR r.expires_at > NOW())  -- NULL = never expires
      AND ST_DWithin(r.location, v_point, p_radius_meters)
    ORDER BY
        (r.creator_id = v_user_id) DESC,  -- Own requests first
        distance_meters ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also ensure lock_request allows self-accept (for testing)
CREATE OR REPLACE FUNCTION public.lock_request(
    p_request_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_locked BOOLEAN := false;
BEGIN
    -- Lock the request (only if still open)
    -- NOTE: No creator_id check to allow self-testing
    UPDATE public.requests
    SET
        agent_id = auth.uid(),
        status = 'locked',
        locked_at = NOW(),
        expires_at = NOW() + INTERVAL '30 minutes'
    WHERE id = p_request_id
      AND status = 'open'
      AND agent_id IS NULL;

    v_locked := FOUND;

    RETURN v_locked;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_nearby_requests IS 'Get open requests within radius, including own requests with is_own flag';
COMMENT ON FUNCTION public.lock_request IS 'Atomically locks a request for the calling agent (allows self-accept for testing)';

