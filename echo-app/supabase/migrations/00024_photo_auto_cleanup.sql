-- ============================================================
-- Migration 020: Automatic Photo Cleanup After Expiry
-- ============================================================
-- Photos are permanently deleted from storage after the 3-minute
-- viewing period expires. This ensures privacy - once viewed,
-- photos are gone forever.
--
-- Two approaches available:
-- 1. Edge Function with Cron (requires pg_cron extension)
-- 2. Database trigger-based cleanup
--
-- This migration uses approach 2 (trigger-based) for simplicity.
-- ============================================================

-- Function to delete expired photo from storage
-- Called automatically when photo expires
CREATE OR REPLACE FUNCTION public.cleanup_expired_photo()
RETURNS TRIGGER AS $$
BEGIN
    -- When a photo's view session expires, schedule cleanup
    -- The actual storage deletion happens via Edge Function
    -- This trigger just marks photos for cleanup
    
    IF NEW.view_session_expires_at IS NOT NULL 
       AND NEW.view_session_expires_at < NOW() 
       AND NEW.storage_path IS NOT NULL
       AND OLD.storage_path IS NOT NULL THEN
        -- Photo has just expired - mark for cleanup
        NEW.status := 'expired';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: For automatic storage deletion, you need to:
-- 1. Deploy the Edge Function: supabase functions deploy cleanup-expired-photos
-- 2. Set up a cron job in Supabase Dashboard:
--    - Go to Database → Extensions → Enable pg_cron
--    - Then run:
--
-- SELECT cron.schedule(
--     'cleanup-expired-photos',  -- job name
--     '* * * * *',               -- every minute
--     $$
--     SELECT net.http_post(
--         url := 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/cleanup-expired-photos',
--         headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
--         body := '{}'::jsonb
--     ) as request_id;
--     $$
-- );

-- Alternative: Simple view to find photos ready for cleanup
CREATE OR REPLACE VIEW public.photos_pending_cleanup AS
SELECT 
    id,
    storage_path,
    status,
    view_session_expires_at,
    NOW() - view_session_expires_at as expired_for
FROM public.photos
WHERE storage_path IS NOT NULL
  AND view_session_expires_at < NOW()
  AND status IN ('viewed', 'expired', 'approved')
ORDER BY view_session_expires_at ASC;

COMMENT ON VIEW public.photos_pending_cleanup IS 'Photos that have expired and need storage cleanup';

-- Grant access to the view for the service role
GRANT SELECT ON public.photos_pending_cleanup TO service_role;

