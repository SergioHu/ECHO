-- ============================================================
-- Migration 007: Row Level Security Policies
-- ============================================================
-- RLS policies for all tables to ensure data isolation
-- and proper access control.
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROFILES POLICIES
-- ============================================================

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

-- Users can read basic info of other profiles (for display)
CREATE POLICY "Users can read public profile info"
    ON public.profiles FOR SELECT
    USING (true);  -- All authenticated users can see profiles

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ============================================================
-- REQUESTS POLICIES
-- ============================================================

-- Anyone can read open requests (for the map/radar)
CREATE POLICY "Anyone can read open requests"
    ON public.requests FOR SELECT
    USING (status = 'open' OR creator_id = auth.uid() OR agent_id = auth.uid());

-- Creators can create requests
CREATE POLICY "Authenticated users can create requests"
    ON public.requests FOR INSERT
    WITH CHECK (auth.uid() = creator_id);

-- Creators can update their own requests (cancel, etc.)
CREATE POLICY "Creators can update own requests"
    ON public.requests FOR UPDATE
    USING (auth.uid() = creator_id)
    WITH CHECK (auth.uid() = creator_id);

-- Agents can update requests they've locked
CREATE POLICY "Agents can update locked requests"
    ON public.requests FOR UPDATE
    USING (auth.uid() = agent_id AND status = 'locked')
    WITH CHECK (auth.uid() = agent_id);

-- ============================================================
-- PHOTOS POLICIES
-- ============================================================

-- Agents can see their own photos
CREATE POLICY "Agents can read own photos"
    ON public.photos FOR SELECT
    USING (auth.uid() = agent_id);

-- Creators can see photos for their requests
CREATE POLICY "Creators can read photos for their requests"
    ON public.photos FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.requests r
            WHERE r.id = request_id AND r.creator_id = auth.uid()
        )
    );

-- Agents can insert photos
CREATE POLICY "Agents can insert photos"
    ON public.photos FOR INSERT
    WITH CHECK (auth.uid() = agent_id);

-- ============================================================
-- DISPUTES POLICIES
-- ============================================================

-- Parties can read disputes they're involved in
CREATE POLICY "Parties can read own disputes"
    ON public.disputes FOR SELECT
    USING (auth.uid() = creator_id OR auth.uid() = agent_id);

-- Creators can create disputes
CREATE POLICY "Creators can create disputes"
    ON public.disputes FOR INSERT
    WITH CHECK (auth.uid() = creator_id);

-- Agents can update disputes (add response)
CREATE POLICY "Agents can respond to disputes"
    ON public.disputes FOR UPDATE
    USING (auth.uid() = agent_id AND status = 'open')
    WITH CHECK (auth.uid() = agent_id);

-- ============================================================
-- LEDGER ENTRIES POLICIES
-- ============================================================

-- Users can only read their own ledger entries
CREATE POLICY "Users can read own ledger entries"
    ON public.ledger_entries FOR SELECT
    USING (auth.uid() = user_id);

-- No direct inserts/updates allowed (only via functions)
-- Inserts happen through add_ledger_entry function with SECURITY DEFINER

