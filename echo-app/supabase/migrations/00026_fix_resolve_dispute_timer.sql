-- ============================================================
-- Migration 026: Fix resolve_dispute timer logic
-- ============================================================
-- PROBLEM: When a dispute is approved (photo accepted), the timer
-- was starting immediately (NOW() + 3 minutes). This meant creators
-- could lose viewing time before they even opened the photo.
--
-- SOLUTION: Set view_session_started_at = NULL and view_session_expires_at = NULL
-- when approving. This allows start_view_session to start a fresh 3-minute
-- timer when the creator actually opens the photo.
--
-- ALSO: Ensure status is 'validated' (not 'viewed') so the photo shows
-- as ready to view, and the timer starts only when opened.
-- ============================================================

-- Drop and recreate the function with correct logic
CREATE OR REPLACE FUNCTION public.resolve_dispute(
    p_dispute_id UUID,
    p_resolution TEXT,
    p_reject BOOLEAN DEFAULT false
)
RETURNS JSONB AS $$
DECLARE
    v_dispute RECORD;
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

    -- Get dispute with related request info
    SELECT d.*, r.price_cents, r.agent_id as req_agent_id
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

    IF v_dispute.status NOT IN ('open', 'under_review') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Dispute already resolved'
        );
    END IF;

    -- REJECT: Photo is bad, creator wins
    IF p_reject THEN
        -- Update dispute status
        UPDATE public.disputes
        SET status = 'resolved_creator',
            resolved_at = NOW(),
            resolved_by = auth.uid(),
            resolution_notes = 'rejected: ' || p_resolution
        WHERE id = p_dispute_id;

        -- Mark photo as rejected
        IF v_dispute.photo_id IS NOT NULL THEN
            UPDATE public.photos
            SET status = 'rejected',
                is_reported = false,
                rejection_reason = p_resolution,
                updated_at = NOW()
            WHERE id = v_dispute.photo_id;
        END IF;

        -- Reopen request for new submissions
        UPDATE public.requests
        SET status = 'open',
            agent_id = NULL,
            locked_at = NULL,
            fulfilled_at = NULL,
            updated_at = NOW()
        WHERE id = v_dispute.request_id;

        RETURN jsonb_build_object(
            'success', true,
            'resolution', 'rejected',
            'action', 'Photo rejected, request reopened for new submissions'
        );

    -- APPROVE: Photo is good, agent wins
    ELSE
        -- Update dispute status
        UPDATE public.disputes
        SET status = 'resolved_agent',
            resolved_at = NOW(),
            resolved_by = auth.uid(),
            resolution_notes = 'approved: ' || p_resolution
        WHERE id = p_dispute_id;

        -- Reset photo for fresh viewing session
        -- CRITICAL: Set session fields to NULL so timer starts when creator opens
        IF v_dispute.photo_id IS NOT NULL THEN
            UPDATE public.photos
            SET is_reported = false,
                status = 'validated',
                view_session_started_at = NULL,
                view_session_expires_at = NULL,
                updated_at = NOW()
            WHERE id = v_dispute.photo_id;
        END IF;

        -- Mark request as fulfilled
        UPDATE public.requests
        SET status = 'fulfilled',
            fulfilled_at = NOW(),
            updated_at = NOW()
        WHERE id = v_dispute.request_id;

        -- Pay the agent (80% after platform fee)
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
            'action', 'Photo approved, timer starts when creator opens it'
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.resolve_dispute IS 
'Resolve a dispute: REJECT (p_reject=true) marks photo as rejected and reopens request. APPROVE (p_reject=false) validates photo with fresh 3-min timer when opened.';

