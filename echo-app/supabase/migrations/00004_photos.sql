-- ============================================================
-- Migration 004: Photos Table
-- ============================================================
-- Photos submitted by agents with location validation,
-- signed URLs, and 3-minute expiration for viewing.
-- ============================================================

-- Photo status enum
CREATE TYPE public.photo_status AS ENUM (
    'pending',       -- Uploaded, waiting for location validation
    'validated',     -- Location validated (within 10m), ready for viewing
    'viewed',        -- Creator has started viewing (3-min timer started)
    'expired',       -- View session expired
    'approved',      -- Creator approved, payment released
    'disputed'       -- Creator disputed the photo
);

CREATE TABLE IF NOT EXISTS public.photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Linked request
    request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
    
    -- Agent who took the photo
    agent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Storage info
    storage_path TEXT NOT NULL,  -- Path in Supabase Storage
    signed_url TEXT,             -- Temporary signed URL for viewing
    signed_url_expires_at TIMESTAMPTZ,
    
    -- Photo location (where it was actually taken)
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    
    -- Distance from request location (calculated on submit)
    distance_from_request_meters NUMERIC(10, 2),
    
    -- Validation
    is_location_valid BOOLEAN DEFAULT false,
    validated_at TIMESTAMPTZ,
    
    -- View session (3-minute rule)
    view_session_started_at TIMESTAMPTZ,
    view_session_expires_at TIMESTAMPTZ,
    
    -- Status
    status public.photo_status NOT NULL DEFAULT 'pending',
    
    -- Metadata
    device_info JSONB,  -- Camera info, orientation, etc.
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for request's photos
CREATE INDEX IF NOT EXISTS idx_photos_request ON public.photos(request_id);

-- Index for agent's photos
CREATE INDEX IF NOT EXISTS idx_photos_agent ON public.photos(agent_id, created_at DESC);

-- Index for pending validation
CREATE INDEX IF NOT EXISTS idx_photos_pending ON public.photos(status) WHERE status = 'pending';

-- Spatial index
CREATE INDEX IF NOT EXISTS idx_photos_location ON public.photos USING GIST (location);

-- Trigger for updated_at
CREATE TRIGGER photos_updated_at
    BEFORE UPDATE ON public.photos
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Comments
COMMENT ON TABLE public.photos IS 'Photos submitted by agents with location validation';
COMMENT ON COLUMN public.photos.signed_url IS 'Temporary signed URL (regenerated for each view session)';
COMMENT ON COLUMN public.photos.view_session_expires_at IS '3-minute expiration from when creator starts viewing';
COMMENT ON COLUMN public.photos.distance_from_request_meters IS 'Calculated distance from request location';

