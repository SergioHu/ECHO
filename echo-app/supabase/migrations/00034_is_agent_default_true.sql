-- Set is_agent = true by default for new users.
-- During testing, all users need to be able to act as both requester and agent.
-- The toggle in ProfileScreen lets anyone switch it off if they want.

ALTER TABLE public.profiles
    ALTER COLUMN is_agent SET DEFAULT true;

-- Also enable is_agent for all existing users who have it false
-- so current testers don't need to manually toggle it on.
UPDATE public.profiles
SET is_agent = true
WHERE is_agent = false;
