-- ============================================================
-- Seed Test Data for Echo App - Complete Testing Setup
-- ============================================================
--
-- RUN THIS IN SUPABASE SQL EDITOR (Dashboard > SQL Editor)
--
-- This script helps you set up test users and data for E2E testing.
-- ============================================================

-- ============================================================
-- STEP 1: Create test users via Supabase Auth Dashboard first!
-- ============================================================
-- Go to: Dashboard > Authentication > Users > Add User
-- Create 3 users:
--
-- 1. REQUESTER: requester@echo.test / password123
-- 2. AGENT:     agent@echo.test     / password123
-- 3. ADMIN:     admin@echo.test     / password123
--
-- After creating, come back here and run the queries below.
-- ============================================================

-- ============================================================
-- STEP 2: Set up user roles (after creating users in Auth)
-- ============================================================

-- Set admin role for admin user
UPDATE public.profiles
SET role = 'admin'
WHERE email ILIKE '%admin%' OR email ILIKE '%reviewer%';

-- Verify roles are set
SELECT id, email, display_name, role, balance_cents
FROM public.profiles;

-- ============================================================
-- STEP 3: Create test requests around your location
-- ============================================================

-- Example locations around Lisbon, Portugal
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- Try to get the first user from profiles
    SELECT id INTO test_user_id FROM public.profiles LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE 'No users found! Please create a user first via Auth.';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Creating test requests for user: %', test_user_id;
    
    -- Create test requests around Lisbon
    -- Request 1: Praça do Comércio
    PERFORM public.create_request(
        test_user_id,
        38.7077,
        -9.1365,
        'Praça do Comércio, Lisboa',
        'Foto do Arco da Rua Augusta',
        200,
        'landmark'
    );
    
    -- Request 2: Torre de Belém
    PERFORM public.create_request(
        test_user_id,
        38.6916,
        -9.2160,
        'Torre de Belém, Lisboa',
        'Foto da Torre ao pôr do sol',
        350,
        'landmark'
    );
    
    -- Request 3: LX Factory
    PERFORM public.create_request(
        test_user_id,
        38.7037,
        -9.1783,
        'LX Factory, Lisboa',
        'Foto do mercado de domingo',
        150,
        'event'
    );
    
    -- Request 4: Mercado da Ribeira
    PERFORM public.create_request(
        test_user_id,
        38.7068,
        -9.1459,
        'Time Out Market, Lisboa',
        'Foto da bancada de frutos do mar',
        175,
        'food'
    );
    
    -- Request 5: Miradouro da Senhora do Monte
    PERFORM public.create_request(
        test_user_id,
        38.7202,
        -9.1345,
        'Miradouro da Senhora do Monte',
        'Vista panorâmica da cidade',
        250,
        'view'
    );
    
    RAISE NOTICE 'Created 5 test requests successfully!';
END $$;

-- Verify the requests were created
SELECT 
    id,
    location_name,
    description,
    price_cents / 100.0 as price_eur,
    status,
    created_at
FROM public.requests
ORDER BY created_at DESC
LIMIT 10;

