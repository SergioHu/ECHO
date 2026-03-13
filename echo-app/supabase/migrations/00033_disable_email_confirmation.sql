-- Disable email confirmation (handled via supabase config push — config.toml
-- [auth.email] enable_confirmations = false pushed to production).
--
-- This migration backfills any existing users who signed up but never
-- confirmed their email so they can log in immediately.

UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, created_at),
    updated_at         = now()
WHERE email_confirmed_at IS NULL
  AND deleted_at IS NULL;
