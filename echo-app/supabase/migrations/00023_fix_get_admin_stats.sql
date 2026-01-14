-- ============================================================
-- Migration 020: Fix get_admin_stats enum value
-- ============================================================
-- Fixes: invalid input value for enum dispute_status: "pending"
-- The dispute_status enum uses 'open' not 'pending'
-- ============================================================

-- Drop and recreate with correct enum value
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
        'disputes', (SELECT COUNT(*) FROM public.disputes WHERE status IN ('open', 'under_review')),
        'total_users', (SELECT COUNT(*) FROM public.profiles),
        'total_jobs', (SELECT COUNT(*) FROM public.requests),
        'completed_jobs', (SELECT COUNT(*) FROM public.requests WHERE status = 'fulfilled'),
        'total_photos', (SELECT COUNT(*) FROM public.photos)
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_admin_stats() TO authenticated;

-- Comment
COMMENT ON FUNCTION public.get_admin_stats() IS 'Get admin dashboard statistics with correct enum values';

