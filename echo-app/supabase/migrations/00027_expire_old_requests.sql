-- Migration: Expire old open requests created before 2026-01-27
-- This ensures the get_nearby_requests RPC function does not return stale test jobs
-- The function filters by expires_at > NOW(), so setting expires_at to the past removes them

UPDATE requests
SET expires_at = NOW() - INTERVAL '1 hour'
WHERE status = 'open'
AND created_at < '2026-01-27';
