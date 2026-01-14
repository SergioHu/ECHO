-- ============================================================
-- Migration 010: Submit Photo Function
-- ============================================================
-- Complete flow for submitting a photo:
-- 1. Create photo record
-- 2. Validate location (10m rule)
-- 3. If valid, update request status and process payment
-- ============================================================

-- Submit a photo for a locked request
CREATE OR REPLACE FUNCTION public.submit_photo(
    p_request_id UUID,
    p_storage_path TEXT,
    p_latitude NUMERIC,
    p_longitude NUMERIC,
    p_device_info JSONB DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    photo_id UUID,
    is_location_valid BOOLEAN,
    distance_meters NUMERIC,
    error_message TEXT
) AS $$
DECLARE
    v_request RECORD;
    v_photo_id UUID;
    v_photo_location GEOGRAPHY;
    v_distance NUMERIC;
    v_is_valid BOOLEAN;
    v_agent_earning INTEGER;
BEGIN
    -- Get and validate request
    SELECT * INTO v_request
    FROM public.requests
    WHERE id = p_request_id
      AND agent_id = auth.uid()
      AND status = 'locked';
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::UUID, false, NULL::NUMERIC, 
            'Request not found or not locked by you'::TEXT;
        RETURN;
    END IF;
    
    -- Create photo location
    v_photo_location := ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography;
    
    -- Calculate distance
    v_distance := ST_Distance(v_photo_location, v_request.location);
    v_is_valid := v_distance <= v_request.validation_radius_meters;
    
    -- Insert photo record
    INSERT INTO public.photos (
        request_id, agent_id, storage_path,
        location, latitude, longitude,
        distance_from_request_meters, is_location_valid, validated_at,
        status, device_info
    ) VALUES (
        p_request_id, auth.uid(), p_storage_path,
        v_photo_location, p_latitude, p_longitude,
        v_distance, v_is_valid, 
        CASE WHEN v_is_valid THEN NOW() ELSE NULL END,
        CASE WHEN v_is_valid THEN 'validated' ELSE 'pending' END,
        p_device_info
    )
    RETURNING id INTO v_photo_id;
    
    -- If valid, update request and process payment
    IF v_is_valid THEN
        -- Update request to fulfilled
        UPDATE public.requests
        SET status = 'fulfilled',
            fulfilled_at = NOW()
        WHERE id = p_request_id;
        
        -- Calculate agent earning (price - platform fee)
        v_agent_earning := v_request.price_cents - v_request.platform_fee_cents;
        
        -- Credit agent's balance
        PERFORM public.add_ledger_entry(
            auth.uid(),
            'earning',
            v_agent_earning,
            p_request_id,
            v_photo_id,
            NULL,
            'Earning for photo submission'
        );
        
        -- Update agent stats
        UPDATE public.profiles
        SET completed_jobs = completed_jobs + 1
        WHERE id = auth.uid();
    END IF;
    
    RETURN QUERY SELECT true, v_photo_id, v_is_valid, v_distance, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Approve a photo (by creator) - releases any held funds
CREATE OR REPLACE FUNCTION public.approve_photo(
    p_photo_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_photo RECORD;
BEGIN
    -- Get photo and verify ownership
    SELECT ph.*, r.creator_id, r.id as request_id
    INTO v_photo
    FROM public.photos ph
    JOIN public.requests r ON r.id = ph.request_id
    WHERE ph.id = p_photo_id;
    
    IF v_photo.creator_id != auth.uid() THEN
        RAISE EXCEPTION 'Not authorized to approve this photo';
    END IF;
    
    -- Update photo status
    UPDATE public.photos
    SET status = 'approved'
    WHERE id = p_photo_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON FUNCTION public.submit_photo IS 'Submit photo, validate location, and process payment if valid';
COMMENT ON FUNCTION public.approve_photo IS 'Creator approves photo, confirming job completion';

