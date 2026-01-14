-- ============================================================
-- Migration 009: Nearby Requests Query Function
-- ============================================================
-- Optimized function to find open requests near a location.
-- Uses PostGIS spatial index for performance.
-- ============================================================

-- Get open requests within a radius (in meters)
CREATE OR REPLACE FUNCTION public.get_nearby_requests(
    p_latitude NUMERIC,
    p_longitude NUMERIC,
    p_radius_meters INTEGER DEFAULT 5000,  -- Default 5km
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
    distance_meters NUMERIC,
    created_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
) AS $$
DECLARE
    v_point GEOGRAPHY;
BEGIN
    -- Create point from input coordinates
    v_point := ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography;
    
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
        ST_Distance(r.location, v_point)::NUMERIC AS distance_meters,
        r.created_at,
        r.expires_at
    FROM public.requests r
    JOIN public.profiles p ON p.id = r.creator_id
    WHERE r.status = 'open'
      AND r.expires_at > NOW()
      AND ST_DWithin(r.location, v_point, p_radius_meters)
      AND r.creator_id != COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
    ORDER BY distance_meters ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's own requests (created by them)
CREATE OR REPLACE FUNCTION public.get_my_requests(
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    latitude NUMERIC,
    longitude NUMERIC,
    location_name TEXT,
    description TEXT,
    category TEXT,
    price_cents INTEGER,
    status public.request_status,
    agent_id UUID,
    agent_name TEXT,
    photo_id UUID,
    created_at TIMESTAMPTZ,
    fulfilled_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.latitude,
        r.longitude,
        r.location_name,
        r.description,
        r.category,
        r.price_cents,
        r.status,
        r.agent_id,
        p.display_name AS agent_name,
        ph.id AS photo_id,
        r.created_at,
        r.fulfilled_at
    FROM public.requests r
    LEFT JOIN public.profiles p ON p.id = r.agent_id
    LEFT JOIN public.photos ph ON ph.request_id = r.id AND ph.status != 'pending'
    WHERE r.creator_id = auth.uid()
    ORDER BY r.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get jobs accepted by agent (user)
CREATE OR REPLACE FUNCTION public.get_my_jobs(
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    request_id UUID,
    latitude NUMERIC,
    longitude NUMERIC,
    location_name TEXT,
    description TEXT,
    category TEXT,
    price_cents INTEGER,
    status public.request_status,
    creator_id UUID,
    creator_name TEXT,
    locked_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.id AS request_id,
        r.latitude,
        r.longitude,
        r.location_name,
        r.description,
        r.category,
        r.price_cents,
        r.status,
        r.creator_id,
        p.display_name AS creator_name,
        r.locked_at,
        r.expires_at
    FROM public.requests r
    JOIN public.profiles p ON p.id = r.creator_id
    WHERE r.agent_id = auth.uid()
    ORDER BY r.locked_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON FUNCTION public.get_nearby_requests IS 'Get open requests within radius, excluding own requests';
COMMENT ON FUNCTION public.get_my_requests IS 'Get requests created by the authenticated user';
COMMENT ON FUNCTION public.get_my_jobs IS 'Get jobs accepted by the authenticated user (agent)';

