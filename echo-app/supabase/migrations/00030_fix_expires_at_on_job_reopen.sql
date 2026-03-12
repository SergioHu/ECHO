-- Migration 00030: Fix expires_at when jobs are returned to 'open'
--
-- Root cause: lock_request sets expires_at = NOW() + 30 minutes (the lock window).
-- When a job is returned to 'open' via resolve_dispute, admin_reject_photo, or
-- unlock_request, expires_at was never reset. get_nearby_requests filters
-- WHERE expires_at IS NULL OR expires_at > NOW(), so the reopened job was
-- immediately excluded from all subsequent fetches and disappeared from the map.
-- Fix: reset expires_at = NOW() + 24 hours on every transition back to 'open'.

-- ============================================================
-- 1. resolve_dispute — reject path (dispute admin decision)
-- ============================================================
CREATE OR REPLACE FUNCTION public.resolve_dispute(
    p_dispute_id uuid,
    p_resolution text,
    p_reject boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
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
        -- CRITICAL: reset expires_at to fresh 24h window so get_nearby_requests
        -- includes this job in all subsequent fetches.
        UPDATE public.requests
        SET status = v_request_status,
            agent_id = NULL,
            locked_at = NULL,
            fulfilled_at = NULL,
            expires_at = NOW() + INTERVAL '24 hours',
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
$$;

-- ============================================================
-- 2. admin_reject_photo — direct admin rejection (no dispute)
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_reject_photo(p_photo_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
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

    -- Return request to open with fresh 24h window
    -- CRITICAL: reset expires_at so get_nearby_requests includes this job again.
    UPDATE public.requests
    SET status = 'open',
        agent_id = NULL,
        locked_at = NULL,
        fulfilled_at = NULL,
        expires_at = NOW() + INTERVAL '24 hours',
        updated_at = NOW()
    WHERE id = v_photo.request_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Photo rejected, request returned to map'
    );
END;
$$;

-- ============================================================
-- 3. unlock_request — agent back-press before photo submitted
-- ============================================================
CREATE OR REPLACE FUNCTION public.unlock_request(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
    v_request requests%ROWTYPE;
    v_photo_count INTEGER;
BEGIN
    -- Fetch the request
    SELECT * INTO v_request
    FROM requests
    WHERE id = p_request_id;

    IF v_request IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Request not found');
    END IF;

    -- Only the agent who locked it can unlock it
    IF v_request.agent_id != auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authorised to unlock this request');
    END IF;

    -- Only unlock if status is 'locked' (not yet fulfilled/disputed/etc.)
    IF v_request.status != 'locked' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Request is not in locked state');
    END IF;

    -- Refuse to unlock if a photo has already been submitted
    SELECT COUNT(*) INTO v_photo_count
    FROM photos
    WHERE request_id = p_request_id
      AND agent_id = auth.uid();

    IF v_photo_count > 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Photo already submitted — cannot unlock');
    END IF;

    -- Release the request back to open with fresh 24h window
    -- CRITICAL: reset expires_at so get_nearby_requests includes this job again.
    UPDATE requests
    SET
        status     = 'open',
        agent_id   = NULL,
        locked_at  = NULL,
        expires_at = NOW() + INTERVAL '24 hours',
        updated_at = NOW()
    WHERE id = p_request_id;

    RETURN jsonb_build_object('success', true);
END;
$$;
