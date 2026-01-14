-- ============================================================
-- Migration 003: Requests Table
-- ============================================================
-- Echo requests (photo jobs) with location, pricing, and status.
-- Uses PostGIS geography type for accurate distance calculations.
-- ============================================================

-- Request status enum
CREATE TYPE public.request_status AS ENUM (
    'open',           -- Waiting for an agent to accept
    'locked',         -- An agent has accepted, waiting for photo
    'fulfilled',      -- Photo submitted and approved
    'expired',        -- No agent accepted in time
    'cancelled',      -- Creator cancelled
    'disputed'        -- Photo disputed by creator
);

CREATE TABLE IF NOT EXISTS public.requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Creator (who wants the photo)
    creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Agent (who takes the photo) - NULL until accepted
    agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    
    -- Location (PostGIS geography for accurate distance)
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    location_name TEXT,  -- Human-readable address
    
    -- Convenience columns for querying (duplicated from geography)
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    
    -- Request details
    description TEXT,
    category TEXT DEFAULT 'general',
    
    -- Pricing (in cents)
    price_cents INTEGER NOT NULL DEFAULT 100,  -- Default 1 EUR
    platform_fee_cents INTEGER NOT NULL DEFAULT 20,  -- 20% fee
    
    -- Status & timing
    status public.request_status NOT NULL DEFAULT 'open',
    locked_at TIMESTAMPTZ,      -- When agent accepted
    fulfilled_at TIMESTAMPTZ,   -- When photo was approved
    expires_at TIMESTAMPTZ,     -- When request expires if not fulfilled
    
    -- Validation radius (in meters)
    validation_radius_meters INTEGER NOT NULL DEFAULT 10,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Spatial index for nearby queries (critical for performance)
CREATE INDEX IF NOT EXISTS idx_requests_location ON public.requests USING GIST (location);

-- Index for open requests (most common query)
CREATE INDEX IF NOT EXISTS idx_requests_open ON public.requests(status, created_at DESC) 
    WHERE status = 'open';

-- Index for user's requests
CREATE INDEX IF NOT EXISTS idx_requests_creator ON public.requests(creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_agent ON public.requests(agent_id, created_at DESC) 
    WHERE agent_id IS NOT NULL;

-- Trigger for updated_at
CREATE TRIGGER requests_updated_at
    BEFORE UPDATE ON public.requests
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Function to create request with geography from lat/lng
CREATE OR REPLACE FUNCTION public.create_request(
    p_creator_id UUID,
    p_latitude NUMERIC,
    p_longitude NUMERIC,
    p_location_name TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_price_cents INTEGER DEFAULT 100,
    p_category TEXT DEFAULT 'general'
)
RETURNS UUID AS $$
DECLARE
    v_request_id UUID;
    v_fee INTEGER;
BEGIN
    -- Calculate 20% platform fee
    v_fee := (p_price_cents * 20) / 100;
    
    INSERT INTO public.requests (
        creator_id, latitude, longitude, location, location_name,
        description, price_cents, platform_fee_cents, category,
        expires_at
    ) VALUES (
        p_creator_id, p_latitude, p_longitude,
        ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
        p_location_name, p_description, p_price_cents, v_fee, p_category,
        NOW() + INTERVAL '24 hours'  -- Requests expire after 24h
    )
    RETURNING id INTO v_request_id;
    
    RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE public.requests IS 'Photo requests with location and pricing';
COMMENT ON COLUMN public.requests.location IS 'PostGIS geography point for accurate distance queries';
COMMENT ON COLUMN public.requests.validation_radius_meters IS 'Photo must be taken within this radius (default 10m)';

