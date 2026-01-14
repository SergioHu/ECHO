-- ============================================================
-- Migration 019: Fix get_admin_disputes to show resolved disputes
-- ============================================================
-- Problem: Using JOIN on photos table means rejected disputes
-- (where photo was deleted) won't appear in the list.
-- Solution: Use LEFT JOIN so disputes still appear even without photo.
-- ============================================================

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
        CASE 
            WHEN p.location IS NOT NULL AND r.location IS NOT NULL 
            THEN ST_Distance(r.location, p.location)
            ELSE NULL
        END as distance_meters
    FROM public.disputes d
    JOIN public.requests r ON d.request_id = r.id
    LEFT JOIN public.photos p ON d.photo_id = p.id  -- LEFT JOIN so deleted photos don't hide disputes
    WHERE (p_status IS NULL OR d.status::TEXT = p_status)
    ORDER BY d.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment
COMMENT ON FUNCTION public.get_admin_disputes IS 'Get all disputes for admin review - uses LEFT JOIN to show disputes even after photo deletion';

