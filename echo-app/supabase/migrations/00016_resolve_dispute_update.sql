-- ============================================================
-- Migration 016: Update resolve_dispute function
-- ============================================================
-- Fixes the resolve_dispute function to also update the request status
-- after a dispute is resolved.
-- ============================================================

-- First drop the old function (return type changed from BOOLEAN to JSONB)
DROP FUNCTION IF EXISTS public.resolve_dispute(uuid, text, boolean);

-- Create the improved function
CREATE OR REPLACE FUNCTION public.resolve_dispute(
    p_dispute_id UUID,
    p_resolution TEXT,
    p_refund BOOLEAN DEFAULT false
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

    -- Get dispute with related request
    SELECT d.*, r.id as req_id, r.price_cents, r.agent_id as req_agent_id
    INTO v_dispute
    FROM public.disputes d
    JOIN public.requests r ON r.id = d.request_id
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

    -- Determine new status based on resolution
    -- 'resolved_agent' = photographer was right, gets paid
    -- 'resolved_creator' = creator was right, gets refund
    IF p_refund THEN
        v_new_status := 'resolved_creator';
        v_request_status := 'cancelled'; -- Refund to creator
    ELSE
        v_new_status := 'resolved_agent';
        v_request_status := 'fulfilled'; -- Payment to agent
    END IF;

    -- Update dispute
    UPDATE public.disputes
    SET status = v_new_status,
        resolved_at = NOW(),
        resolved_by = auth.uid(),
        resolution_notes = p_resolution,
        refund_amount_cents = CASE WHEN p_refund THEN v_dispute.price_cents ELSE NULL END,
        refund_processed_at = CASE WHEN p_refund THEN NOW() ELSE NULL END
    WHERE id = p_dispute_id;

    -- Update request status
    UPDATE public.requests
    SET status = v_request_status,
        fulfilled_at = CASE WHEN NOT p_refund THEN NOW() ELSE NULL END
    WHERE id = v_dispute.request_id;

    -- Handle ledger entries for payment/refund
    IF p_refund THEN
        -- Refund to creator - add ledger entry
        INSERT INTO public.ledger_entries (profile_id, amount_cents, entry_type, description, request_id)
        VALUES (
            v_dispute.creator_id,
            v_dispute.price_cents,
            'refund',
            'Dispute resolved in creator favor - refund',
            v_dispute.request_id
        );
    ELSE
        -- Pay agent - add ledger entry (minus platform fee)
        INSERT INTO public.ledger_entries (profile_id, amount_cents, entry_type, description, request_id)
        VALUES (
            v_dispute.req_agent_id,
            (v_dispute.price_cents * 80) / 100, -- 80% to agent
            'earning',
            'Dispute resolved in agent favor - payment released',
            v_dispute.request_id
        );

        -- Update agent balance
        UPDATE public.profiles
        SET balance_cents = balance_cents + ((v_dispute.price_cents * 80) / 100)
        WHERE id = v_dispute.req_agent_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'resolution', v_new_status::TEXT,
        'refunded', p_refund
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment
COMMENT ON FUNCTION public.resolve_dispute IS 'Resolve a dispute - approves or refunds based on admin decision';

