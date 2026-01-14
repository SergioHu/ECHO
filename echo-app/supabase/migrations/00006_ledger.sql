-- ============================================================
-- Migration 006: Ledger Entries Table
-- ============================================================
-- Transaction ledger for all balance changes.
-- Provides audit trail for payments, earnings, refunds.
-- ============================================================

-- Transaction type enum
CREATE TYPE public.ledger_type AS ENUM (
    'deposit',           -- User added funds
    'withdrawal',        -- User withdrew funds
    'payment',           -- Creator paid for request
    'earning',           -- Agent earned from photo
    'platform_fee',      -- Platform fee deducted
    'refund',            -- Refund to creator
    'refund_clawback',   -- Clawback from agent after refund
    'bonus',             -- Promotional bonus
    'adjustment'         -- Manual adjustment by admin
);

CREATE TABLE IF NOT EXISTS public.ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User whose balance changed
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Transaction details
    type public.ledger_type NOT NULL,
    amount_cents INTEGER NOT NULL,  -- Positive for credit, negative for debit
    
    -- Balance after this transaction
    balance_after_cents INTEGER NOT NULL,
    
    -- Related entities (optional)
    request_id UUID REFERENCES public.requests(id) ON DELETE SET NULL,
    photo_id UUID REFERENCES public.photos(id) ON DELETE SET NULL,
    dispute_id UUID REFERENCES public.disputes(id) ON DELETE SET NULL,
    
    -- Stripe reference (for deposits/withdrawals)
    stripe_payment_intent_id TEXT,
    stripe_transfer_id TEXT,
    
    -- Metadata
    description TEXT,
    metadata JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ledger_user ON public.ledger_entries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_request ON public.ledger_entries(request_id) WHERE request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ledger_type ON public.ledger_entries(type, created_at DESC);

-- Function to add ledger entry and update balance atomically
CREATE OR REPLACE FUNCTION public.add_ledger_entry(
    p_user_id UUID,
    p_type public.ledger_type,
    p_amount_cents INTEGER,
    p_request_id UUID DEFAULT NULL,
    p_photo_id UUID DEFAULT NULL,
    p_dispute_id UUID DEFAULT NULL,
    p_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_entry_id UUID;
    v_new_balance INTEGER;
BEGIN
    -- Update balance and get new value
    UPDATE public.profiles
    SET balance_cents = balance_cents + p_amount_cents,
        total_earned_cents = CASE 
            WHEN p_amount_cents > 0 AND p_type = 'earning' 
            THEN total_earned_cents + p_amount_cents 
            ELSE total_earned_cents 
        END,
        total_spent_cents = CASE 
            WHEN p_amount_cents < 0 AND p_type = 'payment' 
            THEN total_spent_cents + ABS(p_amount_cents) 
            ELSE total_spent_cents 
        END
    WHERE id = p_user_id
    RETURNING balance_cents INTO v_new_balance;
    
    -- Create ledger entry
    INSERT INTO public.ledger_entries (
        user_id, type, amount_cents, balance_after_cents,
        request_id, photo_id, dispute_id, description
    ) VALUES (
        p_user_id, p_type, p_amount_cents, v_new_balance,
        p_request_id, p_photo_id, p_dispute_id, p_description
    )
    RETURNING id INTO v_entry_id;
    
    RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE public.ledger_entries IS 'Immutable transaction ledger for all balance changes';
COMMENT ON COLUMN public.ledger_entries.amount_cents IS 'Positive = credit, Negative = debit';
COMMENT ON COLUMN public.ledger_entries.balance_after_cents IS 'User balance after this transaction';

