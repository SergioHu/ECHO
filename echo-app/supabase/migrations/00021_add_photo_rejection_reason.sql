-- ============================================================
-- Migration 021: COMPLETE FIX - Photo rejection + Dispute resolution
-- ============================================================
-- This migration consolidates all fixes:
-- 1. Adds 'rejected' status to photo_status enum (if missing)
-- 2. Adds rejection_reason column to photos table
-- 3. Updates resolve_dispute function with all fixes
-- 4. Adds admin_reject_photo for direct photo rejection
-- ============================================================

-- ============================================================
-- STEP 1: Ensure 'rejected' status exists in photo_status enum
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'rejected'
        AND enumtypid = 'public.photo_status'::regtype
    ) THEN
        ALTER TYPE public.photo_status ADD VALUE 'rejected';
    END IF;
END $$;

-- ============================================================
-- STEP 2: Add rejection_reason column to photos
-- ============================================================
ALTER TABLE public.photos
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

COMMENT ON COLUMN public.photos.rejection_reason IS
'Admin-provided reason when a photo is rejected';

-- ============================================================
-- STEP 3: Function to directly reject a photo (for PhotoReviewer)
-- Used when admin rejects a pending photo (not from dispute)
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_reject_photo(
    p_photo_id UUID,
    p_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_photo RECORD;
BEGIN
    -- Only allow admin/reviewer roles
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'reviewer')
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Unauthorized: Admin access required'
        );
    END IF;

    -- Get photo and related request
    SELECT
        p.*,
        r.id as request_id,
        r.status as request_status
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

    -- Can only reject pending/validated photos
    IF v_photo.status NOT IN ('pending', 'validated') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Photo cannot be rejected (status: ' || v_photo.status || ')'
        );
    END IF;

    -- Mark photo as rejected with reason
    UPDATE public.photos
    SET status = 'rejected',
        rejection_reason = p_reason,
        updated_at = NOW()
    WHERE id = p_photo_id;

    -- Return request to open so other agents can take it
    UPDATE public.requests
    SET status = 'open',
        agent_id = NULL,
        locked_at = NULL,
        fulfilled_at = NULL,
        updated_at = NOW()
    WHERE id = v_photo.request_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Photo rejected, request returned to map'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.admin_reject_photo IS
'Admin rejects a pending photo with reason. Request returns to open status.';

-- ============================================================
-- STEP 4: Function to approve a photo (for PhotoReviewer)
-- Used when admin approves a pending photo directly
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_approve_photo(
    p_photo_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_photo RECORD;
BEGIN
    -- Only allow admin/reviewer roles
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'reviewer')
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Unauthorized: Admin access required'
        );
    END IF;

    -- Get photo and related request
    SELECT
        p.*,
        r.id as request_id,
        r.price_cents,
        r.agent_id as req_agent_id
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

    -- Can only approve pending/validated photos
    IF v_photo.status NOT IN ('pending', 'validated') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Photo cannot be approved (status: ' || v_photo.status || ')'
        );
    END IF;

    -- Mark photo as validated and start view session
    UPDATE public.photos
    SET status = 'validated',
        is_location_valid = true,
        validated_at = NOW(),
        view_session_started_at = NOW(),
        view_session_expires_at = NOW() + INTERVAL '3 minutes',
        updated_at = NOW()
    WHERE id = p_photo_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Photo approved and ready for viewing'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.admin_approve_photo IS
'Admin approves a pending photo. Photo becomes validated for viewing.';

-- ============================================================
-- STEP 5: Updated resolve_dispute (for dispute resolution)
-- Handles disputes with proper rejection_reason
-- ============================================================
CREATE OR REPLACE FUNCTION public.resolve_dispute(
    p_dispute_id UUID,
    p_resolution TEXT,
    p_reject BOOLEAN DEFAULT false
)
RETURNS JSONB AS $$
DECLARE
    v_dispute RECORD;
    v_new_status public.dispute_status;
    v_request_status public.request_status;
BEGIN
    -- Only allow admin/reviewer roles
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'reviewer')
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Unauthorized: Admin access required'
        );
    END IF;

    -- Get dispute with related request and photo
    SELECT
        d.*,
        r.id as req_id,
        r.price_cents,
        r.agent_id as req_agent_id,
        r.creator_id as req_creator_id,
        p.id as photo_id,
        p.storage_path
    INTO v_dispute
    FROM public.disputes d
    JOIN public.requests r ON r.id = d.request_id
    LEFT JOIN public.photos p ON p.id = d.photo_id
    WHERE d.id = p_dispute_id;

    IF v_dispute IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Dispute not found'
        );
    END IF;

    -- Already resolved?
    IF v_dispute.status NOT IN ('open', 'under_review') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Dispute already resolved'
        );
    END IF;

    -- ============================================================
    -- REJECT: Photo not acceptable, return job to map
    -- ============================================================
    IF p_reject THEN
        v_new_status := 'resolved_creator';
        v_request_status := 'open';

        -- Update dispute
        UPDATE public.disputes
        SET status = v_new_status,
            resolved_at = NOW(),
            resolved_by = auth.uid(),
            resolution_notes = p_resolution
        WHERE id = p_dispute_id;

        -- Mark photo as rejected with reason
        IF v_dispute.photo_id IS NOT NULL THEN
            UPDATE public.photos
            SET status = 'rejected',
                is_reported = false,
                rejection_reason = p_resolution,
                updated_at = NOW()
            WHERE id = v_dispute.photo_id;
        END IF;

        -- Reset request: clear agent, return to open
        UPDATE public.requests
        SET status = v_request_status,
            agent_id = NULL,
            locked_at = NULL,
            fulfilled_at = NULL,
            updated_at = NOW()
        WHERE id = v_dispute.request_id;

        RETURN jsonb_build_object(
            'success', true,
            'resolution', 'rejected',
            'action', 'Photo rejected, job returned to map'
        );

    -- ============================================================
    -- APPROVE: Photo acceptable, pay photographer
    -- ============================================================
    ELSE
        v_new_status := 'resolved_agent';
        v_request_status := 'fulfilled';

        -- Update dispute
        UPDATE public.disputes
        SET status = v_new_status,
            resolved_at = NOW(),
            resolved_by = auth.uid(),
            resolution_notes = p_resolution
        WHERE id = p_dispute_id;

        -- Restore photo viewing
        IF v_dispute.photo_id IS NOT NULL THEN
            UPDATE public.photos
            SET is_reported = false,
                status = 'viewed',
                view_session_started_at = NOW(),
                view_session_expires_at = NOW() + INTERVAL '3 minutes',
                updated_at = NOW()
            WHERE id = v_dispute.photo_id;
        END IF;

        -- Update request to fulfilled
        UPDATE public.requests
        SET status = v_request_status,
            fulfilled_at = NOW(),
            updated_at = NOW()
        WHERE id = v_dispute.request_id;

        -- Pay agent (80% after platform fee)
        IF v_dispute.req_agent_id IS NOT NULL AND v_dispute.price_cents > 0 THEN
            PERFORM public.add_ledger_entry(
                v_dispute.req_agent_id,
                'earning',
                (v_dispute.price_cents * 80) / 100,
                v_dispute.request_id,
                v_dispute.photo_id,
                p_dispute_id,
                'Dispute resolved - photo approved, payment released'
            );
        END IF;

        RETURN jsonb_build_object(
            'success', true,
            'resolution', 'approved',
            'action', 'Photo approved, photographer paid'
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.resolve_dispute IS
'Resolve dispute: APPROVE pays photographer, REJECT marks photo with reason and returns job to map';

-- ============================================================
-- STEP 6: Grant execute permissions
-- ============================================================
GRANT EXECUTE ON FUNCTION public.admin_reject_photo(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_photo(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_dispute(UUID, TEXT, BOOLEAN) TO authenticated;