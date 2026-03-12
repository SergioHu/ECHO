-- Auto-confirm new user signups so email confirmation is not required
ALTER TABLE auth.users ALTER COLUMN email_confirmed_at SET DEFAULT now();
