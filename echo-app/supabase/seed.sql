-- ============================================================
-- Echo App - Seed Data
-- ============================================================
-- Sample data for development and testing.
-- NOTE: This assumes test users already exist in auth.users
-- ============================================================

-- This file can be run after creating test users in Supabase Auth
-- The profiles will be auto-created by the trigger, but we can update them

-- Example: Update test profiles with sample data
-- (Uncomment and modify after creating users)

/*
-- Update test user profiles
UPDATE public.profiles
SET 
    display_name = 'Test Creator',
    balance_cents = 10000,  -- 100 EUR
    is_agent = false
WHERE id = 'YOUR_TEST_CREATOR_UUID';

UPDATE public.profiles
SET 
    display_name = 'Test Agent',
    balance_cents = 5000,  -- 50 EUR
    is_agent = true,
    agent_verified_at = NOW()
WHERE id = 'YOUR_TEST_AGENT_UUID';

-- Create sample requests (Lisbon area for testing)
INSERT INTO public.requests (
    creator_id, latitude, longitude, location,
    location_name, description, price_cents, category
) VALUES 
(
    'YOUR_TEST_CREATOR_UUID',
    38.7223, -9.1393,
    ST_SetSRID(ST_MakePoint(-9.1393, 38.7223), 4326)::geography,
    'Praça do Comércio, Lisboa',
    'Photo of Praça do Comércio from the river side',
    150, 'landmark'
),
(
    'YOUR_TEST_CREATOR_UUID',
    38.7139, -9.1334,
    ST_SetSRID(ST_MakePoint(-9.1334, 38.7139), 4326)::geography,
    'Castelo de São Jorge',
    'View from the castle walls',
    200, 'landmark'
),
(
    'YOUR_TEST_CREATOR_UUID',
    38.6916, -9.2160,
    ST_SetSRID(ST_MakePoint(-9.2160, 38.6916), 4326)::geography,
    'Torre de Belém',
    'Photo of the tower at sunset',
    250, 'landmark'
);
*/

-- Helper: View current schema
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

