-- ============================================================
-- Migration 002: Profiles Table
-- ============================================================
-- User profiles linked to Supabase Auth.
-- Stores balance, reputation, agent status, and Stripe info.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Display info
    display_name TEXT,
    avatar_url TEXT,
    
    -- Balance & earnings (in cents to avoid floating point issues)
    balance_cents INTEGER NOT NULL DEFAULT 0,
    total_earned_cents INTEGER NOT NULL DEFAULT 0,
    total_spent_cents INTEGER NOT NULL DEFAULT 0,
    
    -- Reputation
    reputation_score NUMERIC(3,2) DEFAULT 5.00,
    completed_jobs INTEGER NOT NULL DEFAULT 0,
    created_requests INTEGER NOT NULL DEFAULT 0,
    
    -- Agent status
    is_agent BOOLEAN NOT NULL DEFAULT false,
    agent_verified_at TIMESTAMPTZ,
    
    -- Stripe integration (for future)
    stripe_customer_id TEXT,
    stripe_account_id TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for Stripe lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON public.profiles(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_account ON public.profiles(stripe_account_id) WHERE stripe_account_id IS NOT NULL;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Comments
COMMENT ON TABLE public.profiles IS 'User profiles with balance, reputation, and agent status';
COMMENT ON COLUMN public.profiles.balance_cents IS 'Current balance in cents (1 EUR = 100 cents)';
COMMENT ON COLUMN public.profiles.is_agent IS 'Whether user can accept and fulfill photo requests';

