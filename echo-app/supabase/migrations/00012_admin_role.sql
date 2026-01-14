-- ============================================================
-- Migration 012: Admin Role Column
-- ============================================================
-- Adds role column to profiles for admin/reviewer access control.
-- ============================================================

-- Add role column with default 'user'
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
CHECK (role IN ('user', 'agent', 'reviewer', 'admin'));

-- Create index for role lookups (useful for admin queries)
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role) WHERE role != 'user';

-- Comments
COMMENT ON COLUMN public.profiles.role IS 'User role: user (default), agent (can fulfill jobs), reviewer (can review disputes), admin (full access)';

-- ============================================================
-- Admin Helper Functions
-- ============================================================

-- Get admin stats (counts for dashboard)
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- Only allow admin/reviewer roles
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'reviewer')
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;

    SELECT json_build_object(
        'pending_photos', (SELECT COUNT(*) FROM public.photos WHERE status = 'pending'),
        'disputes', (SELECT COUNT(*) FROM public.disputes WHERE status = 'pending'),
        'total_users', (SELECT COUNT(*) FROM public.profiles),
        'total_jobs', (SELECT COUNT(*) FROM public.requests),
        'completed_jobs', (SELECT COUNT(*) FROM public.requests WHERE status = 'completed'),
        'total_photos', (SELECT COUNT(*) FROM public.photos)
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get all disputes for admin review
CREATE OR REPLACE FUNCTION public.get_admin_disputes(p_status TEXT DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    request_id UUID,
    photo_id UUID,
    creator_id UUID,
    agent_id UUID,
    reason TEXT,
    description TEXT,
    status TEXT,
    created_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    photo_url TEXT,
    request_price INTEGER,
    distance_meters FLOAT
) AS $$
BEGIN
    -- Only allow admin/reviewer roles
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'reviewer')
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;

    RETURN QUERY
    SELECT
        d.id,
        d.request_id,
        d.photo_id,
        d.creator_id,
        d.agent_id,
        d.reason::TEXT,
        d.description,
        d.status::TEXT,
        d.created_at,
        d.resolved_at,
        p.storage_path as photo_url,
        r.price_cents as request_price,
        ST_Distance(r.location, p.location) as distance_meters
    FROM public.disputes d
    JOIN public.photos p ON d.photo_id = p.id
    JOIN public.requests r ON d.request_id = r.id
    WHERE (p_status IS NULL OR d.status::TEXT = p_status)
    ORDER BY d.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get all users for admin management
CREATE OR REPLACE FUNCTION public.get_admin_users(p_search TEXT DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    email TEXT,
    display_name TEXT,
    role TEXT,
    balance_cents INTEGER,
    completed_jobs INTEGER,
    created_requests INTEGER,
    reputation_score NUMERIC,
    is_agent BOOLEAN,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    -- Only allow admin roles
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;

    RETURN QUERY
    SELECT 
        p.id,
        u.email,
        p.display_name,
        p.role,
        p.balance_cents,
        p.completed_jobs,
        p.created_requests,
        p.reputation_score,
        p.is_agent,
        p.created_at
    FROM public.profiles p
    JOIN auth.users u ON p.id = u.id
    WHERE (
        p_search IS NULL 
        OR p.display_name ILIKE '%' || p_search || '%'
        OR u.email ILIKE '%' || p_search || '%'
    )
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Resolve a dispute (admin action)
CREATE OR REPLACE FUNCTION public.resolve_dispute(
    p_dispute_id UUID,
    p_resolution TEXT,
    p_refund BOOLEAN DEFAULT false
)
RETURNS BOOLEAN AS $$
DECLARE
    v_dispute RECORD;
BEGIN
    -- Only allow admin/reviewer roles
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'reviewer')
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;

    -- Get dispute
    SELECT * INTO v_dispute FROM public.disputes WHERE id = p_dispute_id;

    IF v_dispute IS NULL THEN
        RAISE EXCEPTION 'Dispute not found';
    END IF;

    -- Update dispute status (cast text to enum)
    UPDATE public.disputes
    SET status = p_resolution::public.dispute_status,
        resolved_at = NOW(),
        resolved_by = auth.uid()
    WHERE id = p_dispute_id;

    -- TODO: Handle refund logic if p_refund = true
    -- This would involve ledger entries and balance updates

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

