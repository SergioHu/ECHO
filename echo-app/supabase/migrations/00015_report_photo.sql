-- ============================================================
-- Migration 015: Report Photo Function
-- ============================================================
-- Function to report a photo and create a dispute.
-- Changes request status to 'disputed' and creates entry in disputes table.
-- ============================================================

-- Function to report a photo
CREATE OR REPLACE FUNCTION public.report_photo(
    p_photo_id UUID,
    p_reason public.dispute_reason,
    p_description TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_photo RECORD;
    v_request RECORD;
    v_user_id UUID;
    v_dispute_id UUID;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Not authenticated'
        );
    END IF;
    
    -- Get photo details
    SELECT p.*, r.id as request_id, r.creator_id, r.agent_id, r.status as request_status
    INTO v_photo
    FROM public.photos p
    JOIN public.requests r ON r.id = p.request_id
    WHERE p.id = p_photo_id;
    
    IF v_photo IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Photo not found'
        );
    END IF;
    
    -- Verify the user is the creator of the request
    IF v_photo.creator_id != v_user_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Only the request creator can report this photo'
        );
    END IF;
    
    -- Check if photo is already reported/disputed
    IF v_photo.request_status = 'disputed' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'This photo has already been reported'
        );
    END IF;
    
    -- Check if request is in a valid state to be disputed
    IF v_photo.request_status NOT IN ('locked', 'fulfilled') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Cannot report photo in current state'
        );
    END IF;
    
    -- Create dispute entry
    INSERT INTO public.disputes (
        photo_id,
        request_id,
        creator_id,
        agent_id,
        reason,
        description,
        status
    ) VALUES (
        p_photo_id,
        v_photo.request_id,
        v_user_id,
        v_photo.agent_id,
        p_reason,
        p_description,
        'open'
    )
    RETURNING id INTO v_dispute_id;
    
    -- Update photo as reported
    UPDATE public.photos
    SET is_reported = true
    WHERE id = p_photo_id;
    
    -- Update request status to disputed
    UPDATE public.requests
    SET status = 'disputed'
    WHERE id = v_photo.request_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'dispute_id', v_dispute_id,
        'message', 'Photo reported successfully. Our team will review it shortly.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.report_photo TO authenticated;

-- Comments
COMMENT ON FUNCTION public.report_photo IS 'Report a photo and create a dispute for admin review';

