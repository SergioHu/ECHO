-- Migration: Admin Analytics
-- Date: 2025-12-24
-- Description: RPC functions for analytics dashboard with period filtering

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_admin_analytics(TEXT);

-- Get analytics data with period filtering
CREATE OR REPLACE FUNCTION get_admin_analytics(p_period TEXT DEFAULT 'week')
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_date TIMESTAMPTZ;
    v_prev_start_date TIMESTAMPTZ;
    v_result JSON;
    v_revenue_current NUMERIC;
    v_revenue_previous NUMERIC;
    v_revenue_change NUMERIC;
    v_jobs_created INT;
    v_jobs_completed INT;
    v_jobs_disputed INT;
    v_jobs_expired INT;
    v_users_new INT;
    v_users_active INT;
    v_users_banned INT;
    v_success_rate NUMERIC;
    v_avg_completion_minutes NUMERIC;
    v_avg_rating NUMERIC;
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'reviewer')
    ) THEN
        RETURN json_build_object('error', 'Unauthorized');
    END IF;

    -- Calculate date ranges based on period
    CASE p_period
        WHEN 'today' THEN
            v_start_date := date_trunc('day', NOW());
            v_prev_start_date := v_start_date - INTERVAL '1 day';
        WHEN 'week' THEN
            v_start_date := date_trunc('week', NOW());
            v_prev_start_date := v_start_date - INTERVAL '1 week';
        WHEN 'month' THEN
            v_start_date := date_trunc('month', NOW());
            v_prev_start_date := v_start_date - INTERVAL '1 month';
        ELSE -- 'all'
            v_start_date := '1970-01-01'::TIMESTAMPTZ;
            v_prev_start_date := '1970-01-01'::TIMESTAMPTZ;
    END CASE;

	    -- Revenue calculations (platform fees from fulfilled requests)
    SELECT COALESCE(SUM(platform_fee_cents), 0) / 100.0
    INTO v_revenue_current
    FROM requests
	    WHERE status = 'fulfilled'
    AND fulfilled_at >= v_start_date;

    SELECT COALESCE(SUM(platform_fee_cents), 0) / 100.0
    INTO v_revenue_previous
    FROM requests
	    WHERE status = 'fulfilled'
    AND fulfilled_at >= v_prev_start_date
    AND fulfilled_at < v_start_date;

    -- Calculate revenue change percentage
    IF v_revenue_previous > 0 THEN
        v_revenue_change := ((v_revenue_current - v_revenue_previous) / v_revenue_previous) * 100;
    ELSE
        v_revenue_change := 0;
    END IF;

    -- Jobs statistics
    SELECT COUNT(*) INTO v_jobs_created
    FROM requests WHERE created_at >= v_start_date;

	    SELECT COUNT(*) INTO v_jobs_completed
	    FROM requests WHERE status = 'fulfilled' AND fulfilled_at >= v_start_date;

    SELECT COUNT(*) INTO v_jobs_disputed
    FROM disputes WHERE created_at >= v_start_date;

    SELECT COUNT(*) INTO v_jobs_expired
    FROM requests WHERE status = 'expired' AND updated_at >= v_start_date;

    -- Users statistics
    SELECT COUNT(*) INTO v_users_new
    FROM profiles WHERE created_at >= v_start_date;

    SELECT COUNT(DISTINCT creator_id) + COUNT(DISTINCT agent_id) INTO v_users_active
    FROM requests WHERE created_at >= v_start_date;

    SELECT COUNT(*) INTO v_users_banned
    FROM profiles WHERE role = 'banned';

    -- Success rate (completed / (completed + disputed + expired))
    IF (v_jobs_completed + v_jobs_disputed + v_jobs_expired) > 0 THEN
        v_success_rate := (v_jobs_completed::NUMERIC / (v_jobs_completed + v_jobs_disputed + v_jobs_expired)::NUMERIC) * 100;
    ELSE
        v_success_rate := 100;
    END IF;

    -- Average completion time (in minutes)
	    SELECT COALESCE(
	        AVG(EXTRACT(EPOCH FROM (fulfilled_at - created_at)) / 60), 
	        0
	    ) INTO v_avg_completion_minutes
	    FROM requests
	    WHERE status = 'fulfilled' AND fulfilled_at >= v_start_date;

    -- Average rating
    SELECT COALESCE(AVG(reputation_score), 4.5) INTO v_avg_rating
    FROM profiles WHERE reputation_score IS NOT NULL;

    -- Build result JSON
    v_result := json_build_object(
        'revenue', json_build_object(
            'total', ROUND(v_revenue_current, 2),
            'change', ROUND(v_revenue_change, 1)
        ),
        'jobs', json_build_object(
            'created', v_jobs_created,
            'completed', v_jobs_completed,
            'disputed', v_jobs_disputed,
            'expired', v_jobs_expired
        ),
        'users', json_build_object(
            'new', v_users_new,
            'active', v_users_active,
            'banned', v_users_banned
        ),
        'quickStats', json_build_object(
            'successRate', ROUND(v_success_rate, 0),
            'avgCompletionMinutes', ROUND(v_avg_completion_minutes, 1),
            'avgRating', ROUND(v_avg_rating, 1)
        )
    );

    RETURN v_result;
END;
$$;

-- Get top photographers for analytics
CREATE OR REPLACE FUNCTION get_top_photographers(p_limit INT DEFAULT 5)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'reviewer')
    ) THEN
        RETURN '[]'::JSON;
    END IF;

    RETURN (
        SELECT json_agg(row_to_json(t))
        FROM (
	            SELECT 
                p.id,
                COALESCE(p.display_name, 'User ' || LEFT(p.id::TEXT, 8)) as name,
                COUNT(r.id) as jobs,
                COALESCE(SUM(r.price_cents - r.platform_fee_cents), 0) / 100.0 as earnings
            FROM profiles p
	            LEFT JOIN requests r ON r.agent_id = p.id AND r.status = 'fulfilled'
            WHERE p.is_agent = true
            GROUP BY p.id, p.display_name
            ORDER BY earnings DESC
            LIMIT p_limit
        ) t
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_admin_analytics(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_photographers(INT) TO authenticated;

