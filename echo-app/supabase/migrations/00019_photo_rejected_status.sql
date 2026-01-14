-- ============================================================
-- Migration 019: Add 'rejected' status to photo_status enum
-- ============================================================
-- When admin rejects a photo during dispute:
-- - Photo status becomes 'rejected' (not deleted)
-- - Agent can see rejection feedback in Activity
-- - Request returns to 'open' for other agents
-- ============================================================

-- Add 'rejected' to the photo_status enum
ALTER TYPE public.photo_status ADD VALUE IF NOT EXISTS 'rejected';

-- Update resolve_dispute function to mark photo as rejected instead of deleting
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
    -- Mark photo as 'rejected' so agent can see feedback
    -- ============================================================
    IF p_reject THEN
        v_new_status := 'resolved_creator';
        v_request_status := 'open';  -- Job returns to map!

        -- Update dispute
        UPDATE public.disputes
        SET status = v_new_status,
            resolved_at = NOW(),
            resolved_by = auth.uid(),
            resolution_notes = p_resolution
        WHERE id = p_dispute_id;

        -- Mark photo as rejected (don't delete - agent needs to see feedback)
        IF v_dispute.photo_id IS NOT NULL THEN
            UPDATE public.photos
            SET status = 'rejected',
                is_reported = false
            WHERE id = v_dispute.photo_id;
        END IF;

        -- Reset request: clear agent, set status to open
        UPDATE public.requests
        SET status = v_request_status,
            agent_id = NULL,
            locked_at = NULL,
            fulfilled_at = NULL
        WHERE id = v_dispute.request_id;

        RETURN jsonb_build_object(
            'success', true,
            'resolution', 'rejected',
            'action', 'Photo marked as rejected, job returned to map'
        );

    -- ============================================================
    -- APPROVE: Photo acceptable, pay photographer, restore viewing
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

        -- Mark photo as no longer reported and restore view session
        IF v_dispute.photo_id IS NOT NULL THEN
            UPDATE public.photos
            SET is_reported = false,
                status = 'viewed',
                view_session_started_at = NOW(),
                view_session_expires_at = NOW() + INTERVAL '3 minutes'
            WHERE id = v_dispute.photo_id;
        END IF;

        -- Update request to fulfilled
        UPDATE public.requests
        SET status = v_request_status,
            fulfilled_at = NOW()
        WHERE id = v_dispute.request_id;

        -- Pay agent via ledger entry (80% after platform fee)
        PERFORM public.add_ledger_entry(
            v_dispute.req_agent_id,
            'earning',
            (v_dispute.price_cents * 80) / 100,
            v_dispute.request_id,
            v_dispute.photo_id,
            p_dispute_id,
            'Dispute resolved - photo approved, payment released'
        );

        RETURN jsonb_build_object(
            'success', true,
            'resolution', 'approved',
            'action', 'Photo restored for viewing, photographer paid'
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.resolve_dispute IS 'Resolve dispute: APPROVE pays photographer, REJECT marks photo as rejected and returns job to map';

