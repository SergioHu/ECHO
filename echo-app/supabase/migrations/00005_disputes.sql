-- ============================================================
-- Migration 005: Disputes Table
-- ============================================================
-- Dispute handling when creator reports a photo.
-- Tracks resolution and refund status.
-- ============================================================

-- Dispute status enum
CREATE TYPE public.dispute_status AS ENUM (
    'open',          -- Dispute submitted, waiting for review
    'under_review',  -- Admin is reviewing
    'resolved_creator',  -- Resolved in creator's favor (refund)
    'resolved_agent',    -- Resolved in agent's favor (payment released)
    'closed'         -- Dispute closed without action
);

-- Dispute reason enum
CREATE TYPE public.dispute_reason AS ENUM (
    'wrong_location',    -- Photo not at requested location
    'poor_quality',      -- Photo quality too low
    'wrong_subject',     -- Photo doesn't show requested subject
    'inappropriate',     -- Inappropriate content
    'other'              -- Other reason
);

CREATE TABLE IF NOT EXISTS public.disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Related entities
    photo_id UUID NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
    request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
    
    -- Parties
    creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Dispute details
    reason public.dispute_reason NOT NULL,
    description TEXT,
    
    -- Evidence
    creator_evidence JSONB,  -- Screenshots, etc.
    agent_response TEXT,
    agent_evidence JSONB,
    
    -- Resolution
    status public.dispute_status NOT NULL DEFAULT 'open',
    resolved_by UUID REFERENCES public.profiles(id),
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,
    
    -- Refund info
    refund_amount_cents INTEGER,
    refund_processed_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_disputes_photo ON public.disputes(photo_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON public.disputes(status) WHERE status IN ('open', 'under_review');
CREATE INDEX IF NOT EXISTS idx_disputes_creator ON public.disputes(creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_disputes_agent ON public.disputes(agent_id, created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER disputes_updated_at
    BEFORE UPDATE ON public.disputes
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Comments
COMMENT ON TABLE public.disputes IS 'Photo disputes between creators and agents';
COMMENT ON COLUMN public.disputes.reason IS 'Primary reason for dispute';

