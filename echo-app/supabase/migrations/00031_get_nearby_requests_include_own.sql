-- Migration 00031: get_nearby_requests — always include creator's own open jobs
--
-- Root cause: get_nearby_requests filters by ST_DWithin(r.location, user_GPS, radius).
-- If the requester pins a job at location X that is more than `radius` meters from
-- their current GPS position (e.g. they pin a location in another city), every
-- silentRefetch replaces the state with RPC results that exclude the job → job
-- disappears from the radar map without any apparent reason.
--
-- Fix: add "OR r.creator_id = v_user_id" so own jobs are always returned regardless
-- of distance. Agents still only see jobs within the radius (agent must physically
-- reach the location, so distance filtering is meaningful for them). Requesters
-- should always be able to see their own open jobs on the map.

CREATE OR REPLACE FUNCTION public.get_nearby_requests(
    p_latitude  NUMERIC,
    p_longitude NUMERIC,
    p_radius_meters INTEGER DEFAULT 5000,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    id              UUID,
    creator_id      UUID,
    creator_name    TEXT,
    latitude        NUMERIC,
    longitude       NUMERIC,
    location_name   TEXT,
    description     TEXT,
    category        TEXT,
    price_cents     INTEGER,
    status          TEXT,
    distance_meters NUMERIC,
    created_at      TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    is_own          BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
    v_point   GEOGRAPHY;
    v_user_id UUID;
BEGIN
    v_point   := ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography;
    v_user_id := (SELECT auth.uid());

    RETURN QUERY
    SELECT
        r.id,
        r.creator_id,
        p.display_name                              AS creator_name,
        r.latitude,
        r.longitude,
        r.location_name,
        r.description,
        r.category,
        r.price_cents,
        r.status::TEXT,
        ST_Distance(r.location, v_point)::NUMERIC   AS distance_meters,
        r.created_at,
        r.expires_at,
        (r.creator_id = v_user_id)                  AS is_own
    FROM public.requests r
    JOIN public.profiles p ON p.id = r.creator_id
    WHERE r.status = 'open'
      AND (r.expires_at IS NULL OR r.expires_at > NOW())
      AND (
          -- Nearby jobs any agent can potentially accept
          ST_DWithin(r.location, v_point, p_radius_meters)
          -- OR this is the requester's own job — always show regardless of distance
          OR r.creator_id = v_user_id
      )
    ORDER BY
        (r.creator_id = v_user_id) DESC,  -- own requests first
        distance_meters ASC
    LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.get_nearby_requests IS
    'Open requests within radius + own requests regardless of distance. '
    'Agents see jobs they can physically reach; requesters always see their own pins.';
