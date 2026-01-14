-- ============================================================
-- Migration 008: Helper Functions
-- ============================================================
-- Core business logic functions:
-- - 10-meter distance validation for photos
-- - 3-minute view session management
-- - Request locking (accept job)
-- ============================================================

-- ============================================================
-- DISTANCE VALIDATION (10 meters)
-- ============================================================

-- Check if photo location is within validation radius of request
CREATE OR REPLACE FUNCTION public.validate_photo_location(
    p_photo_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_distance NUMERIC;
    v_radius INTEGER;
    v_is_valid BOOLEAN;
BEGIN
    -- Calculate distance between photo and request locations
    SELECT 
        ST_Distance(p.location, r.location),
        r.validation_radius_meters
    INTO v_distance, v_radius
    FROM public.photos p
    JOIN public.requests r ON r.id = p.request_id
    WHERE p.id = p_photo_id;
    
    v_is_valid := v_distance <= v_radius;
    
    -- Update photo with validation result
    UPDATE public.photos
    SET 
        distance_from_request_meters = v_distance,
        is_location_valid = v_is_valid,
        validated_at = CASE WHEN v_is_valid THEN NOW() ELSE NULL END,
        status = CASE WHEN v_is_valid THEN 'validated' ELSE 'pending' END
    WHERE id = p_photo_id;
    
    RETURN v_is_valid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3-MINUTE VIEW SESSION
-- ============================================================

-- Start a view session for a photo (returns signed URL info)
CREATE OR REPLACE FUNCTION public.start_view_session(
    p_photo_id UUID
)
RETURNS TABLE (
    photo_id UUID,
    storage_path TEXT,
    expires_at TIMESTAMPTZ,
    already_expired BOOLEAN
) AS $$
DECLARE
    v_photo RECORD;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- Get photo and check ownership
    SELECT ph.*, r.creator_id
    INTO v_photo
    FROM public.photos ph
    JOIN public.requests r ON r.id = ph.request_id
    WHERE ph.id = p_photo_id;
    
    -- Verify caller is the request creator
    IF v_photo.creator_id != auth.uid() THEN
        RAISE EXCEPTION 'Not authorized to view this photo';
    END IF;
    
    -- Check if already expired
    IF v_photo.view_session_expires_at IS NOT NULL 
       AND v_photo.view_session_expires_at < NOW() THEN
        RETURN QUERY SELECT 
            p_photo_id,
            v_photo.storage_path,
            v_photo.view_session_expires_at,
            true;
        RETURN;
    END IF;
    
    -- Start new session or continue existing
    IF v_photo.view_session_started_at IS NULL THEN
        v_expires_at := NOW() + INTERVAL '3 minutes';
        
        UPDATE public.photos
        SET 
            view_session_started_at = NOW(),
            view_session_expires_at = v_expires_at,
            status = 'viewed'
        WHERE id = p_photo_id;
    ELSE
        v_expires_at := v_photo.view_session_expires_at;
    END IF;
    
    RETURN QUERY SELECT 
        p_photo_id,
        v_photo.storage_path,
        v_expires_at,
        false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if view session is still valid
CREATE OR REPLACE FUNCTION public.check_view_session(
    p_photo_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_expires_at TIMESTAMPTZ;
BEGIN
    SELECT view_session_expires_at INTO v_expires_at
    FROM public.photos
    WHERE id = p_photo_id;
    
    RETURN v_expires_at IS NOT NULL AND v_expires_at > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- REQUEST LOCKING (Accept Job)
-- ============================================================

-- Lock a request for an agent (atomic operation)
CREATE OR REPLACE FUNCTION public.lock_request(
    p_request_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_locked BOOLEAN := false;
BEGIN
    -- Try to lock the request (only if still open)
    UPDATE public.requests
    SET 
        agent_id = auth.uid(),
        status = 'locked',
        locked_at = NOW(),
        expires_at = NOW() + INTERVAL '30 minutes'  -- Agent has 30 min to submit photo
    WHERE id = p_request_id
      AND status = 'open'
      AND agent_id IS NULL
      AND creator_id != auth.uid();  -- Can't accept own request
    
    v_locked := FOUND;
    
    RETURN v_locked;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON FUNCTION public.validate_photo_location IS 'Validates photo is within 10m of request location';
COMMENT ON FUNCTION public.start_view_session IS 'Starts 3-minute view session, returns storage path and expiry';
COMMENT ON FUNCTION public.lock_request IS 'Atomically locks a request for the calling agent';

