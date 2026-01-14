-- ============================================================
-- Migration 018: Improved resolve_dispute function
-- ============================================================
-- Business Logic:
-- Payment only occurs AFTER the 3-minute viewing period expires.
-- If user disputes within 3 min, NO payment has been made yet.
--
-- APPROVE (p_reject = false):
--   - Photo was acceptable, photographer gets paid immediately
--   - Request status = 'fulfilled'
--   - Photo view session timer is restored (3 more minutes)
--
-- REJECT (p_reject = true):
--   - Photo was not acceptable, job returns to map
--   - Request status = 'open' (available for other photographers)
--   - Photo is deleted
--   - Agent is cleared from request
--   - NO refund needed (payment wasn't made yet)
-- ============================================================

-- Drop the old function
DROP FUNCTION IF EXISTS public.resolve_dispute(uuid, text, boolean);

-- Create the improved function with correct business logic
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
    -- No refund needed - payment hasn't been made yet
    -- ============================================================
    IF p_reject THEN
        v_new_status := 'resolved_creator';
        v_request_status := 'open';  -- Job returns to map!

        -- Update dispute (no refund fields needed)
        UPDATE public.disputes
        SET status = v_new_status,
            resolved_at = NOW(),
            resolved_by = auth.uid(),
            resolution_notes = p_resolution
        WHERE id = p_dispute_id;

        -- Delete the photo (it was rejected)
        IF v_dispute.photo_id IS NOT NULL THEN
            DELETE FROM public.photos WHERE id = v_dispute.photo_id;
        END IF;

        -- Reset request: clear agent, set status to open
        UPDATE public.requests
        SET status = v_request_status,
            agent_id = NULL,
            locked_at = NULL,
            fulfilled_at = NULL
        WHERE id = v_dispute.request_id;

        -- No refund ledger entry needed - payment wasn't made yet

        RETURN jsonb_build_object(
            'success', true,
            'resolution', 'rejected',
            'action', 'Job returned to map for reassignment'
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
                -- Restore 3-minute viewing timer from NOW
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
        -- Use add_ledger_entry function for proper balance update
        PERFORM public.add_ledger_entry(
            v_dispute.req_agent_id,
            'earning',
            (v_dispute.price_cents * 80) / 100,
            v_dispute.request_id,
            v_dispute.photo_id,
            p_dispute_id,
            'Dispute resolved - photo approved, payment released'
        );

        -- Note: add_ledger_entry already updates the balance

        RETURN jsonb_build_object(
            'success', true,
            'resolution', 'approved',
            'action', 'Photo restored for viewing, photographer paid'
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.resolve_dispute TO authenticated;

-- Comment
COMMENT ON FUNCTION public.resolve_dispute IS 'Resolve dispute: APPROVE pays photographer, REJECT returns job to map (no refund - payment not made yet)';

