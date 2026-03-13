-- Auto-confirm new user signups.
-- NOTE: ALTER TABLE auth.users is not permitted (Supabase owns the table).
-- The actual fix is in migration 00033 which updates auth.config at the row level.
-- This migration is retained as a marker in the history table.
SELECT 1;
