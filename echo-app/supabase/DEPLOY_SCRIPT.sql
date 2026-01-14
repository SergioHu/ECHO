-- ============================================================
-- ECHO APP - DEPLOY SQL SCRIPT
-- Copia e cola este script no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1. Adicionar 'rejected' ao enum (se não existir)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum WHERE enumlabel = 'rejected' AND enumtypid = 'public.photo_status'::regtype
    ) THEN
        ALTER TYPE public.photo_status ADD VALUE 'rejected';
    END IF;
END $$;

-- 2. Adicionar coluna rejection_reason
ALTER TABLE public.photos ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 3. get_admin_disputes (com description)
CREATE OR REPLACE FUNCTION public.get_admin_disputes(p_status TEXT DEFAULT NULL)
RETURNS TABLE (
    dispute_id UUID, request_id UUID, photo_id UUID, creator_id UUID, agent_id UUID,
    reason TEXT, description TEXT, status TEXT, created_at TIMESTAMPTZ, resolved_at TIMESTAMPTZ,
    photo_url TEXT, request_price INTEGER, distance_meters FLOAT
) AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'reviewer')) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;
    RETURN QUERY
    SELECT d.id AS dispute_id, d.request_id, d.photo_id, d.creator_id, d.agent_id, d.reason::TEXT, d.description,
        d.status::TEXT, d.created_at, d.resolved_at, p.storage_path AS photo_url, r.price_cents AS request_price,
        CASE WHEN p.location IS NOT NULL AND r.location IS NOT NULL THEN ST_Distance(r.location, p.location) ELSE NULL END AS distance_meters
    FROM public.disputes d
    JOIN public.requests r ON d.request_id = r.id
    LEFT JOIN public.photos p ON d.photo_id = p.id
    WHERE (p_status IS NULL OR d.status::TEXT = p_status)
    ORDER BY d.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. admin_reject_photo
CREATE OR REPLACE FUNCTION public.admin_reject_photo(p_photo_id UUID, p_reason TEXT)
RETURNS JSONB AS $$
DECLARE v_photo RECORD;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'reviewer')) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;
    SELECT p.*, r.id as request_id INTO v_photo FROM public.photos p JOIN public.requests r ON r.id = p.request_id WHERE p.id = p_photo_id;
    IF v_photo IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Photo not found'); END IF;
    IF v_photo.status NOT IN ('pending', 'validated') THEN RETURN jsonb_build_object('success', false, 'error', 'Cannot reject'); END IF;
    UPDATE public.photos SET status = 'rejected', rejection_reason = p_reason, updated_at = NOW() WHERE id = p_photo_id;
    UPDATE public.requests SET status = 'open', agent_id = NULL, locked_at = NULL, fulfilled_at = NULL, updated_at = NOW() WHERE id = v_photo.request_id;
    RETURN jsonb_build_object('success', true, 'message', 'Photo rejected');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. admin_approve_photo (timer starts when creator opens, not when admin approves)
CREATE OR REPLACE FUNCTION public.admin_approve_photo(p_photo_id UUID)
RETURNS JSONB AS $$
DECLARE v_photo RECORD;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'reviewer')) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;
    SELECT p.*, r.id as request_id INTO v_photo FROM public.photos p JOIN public.requests r ON r.id = p.request_id WHERE p.id = p_photo_id;
    IF v_photo IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Photo not found'); END IF;
    IF v_photo.status NOT IN ('pending', 'validated') THEN RETURN jsonb_build_object('success', false, 'error', 'Cannot approve'); END IF;
    -- Set status to validated but DON'T start session - let start_view_session handle it
    UPDATE public.photos SET status = 'validated', is_location_valid = true, validated_at = NOW(),
        view_session_started_at = NULL, view_session_expires_at = NULL, updated_at = NOW()
    WHERE id = p_photo_id;
    RETURN jsonb_build_object('success', true, 'message', 'Photo approved');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. resolve_dispute (timer starts when creator opens, not when admin approves)
CREATE OR REPLACE FUNCTION public.resolve_dispute(p_dispute_id UUID, p_resolution TEXT, p_reject BOOLEAN DEFAULT false)
RETURNS JSONB AS $$
DECLARE v_dispute RECORD;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'reviewer')) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;
    SELECT d.*, r.price_cents, r.agent_id as req_agent_id INTO v_dispute
    FROM public.disputes d JOIN public.requests r ON r.id = d.request_id LEFT JOIN public.photos p ON p.id = d.photo_id
    WHERE d.id = p_dispute_id;
    IF v_dispute IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Dispute not found'); END IF;
    IF v_dispute.status NOT IN ('open', 'under_review') THEN RETURN jsonb_build_object('success', false, 'error', 'Already resolved'); END IF;

    IF p_reject THEN
        UPDATE public.disputes SET status = 'resolved_creator', resolved_at = NOW(), resolved_by = auth.uid(), resolution_notes = 'rejected: ' || p_resolution WHERE id = p_dispute_id;
        IF v_dispute.photo_id IS NOT NULL THEN
            UPDATE public.photos SET status = 'rejected', is_reported = false, rejection_reason = p_resolution, updated_at = NOW() WHERE id = v_dispute.photo_id;
        END IF;
        UPDATE public.requests SET status = 'open', agent_id = NULL, locked_at = NULL, fulfilled_at = NULL, updated_at = NOW() WHERE id = v_dispute.request_id;
        RETURN jsonb_build_object('success', true, 'resolution', 'rejected');
    ELSE
        UPDATE public.disputes SET status = 'resolved_agent', resolved_at = NOW(), resolved_by = auth.uid(), resolution_notes = 'approved: ' || p_resolution WHERE id = p_dispute_id;
        IF v_dispute.photo_id IS NOT NULL THEN
            -- Reset session so timer starts fresh when creator opens photo (NULL = not started)
            UPDATE public.photos SET is_reported = false, status = 'validated', view_session_started_at = NULL, view_session_expires_at = NULL, updated_at = NOW() WHERE id = v_dispute.photo_id;
        END IF;
        UPDATE public.requests SET status = 'fulfilled', fulfilled_at = NOW(), updated_at = NOW() WHERE id = v_dispute.request_id;
        IF v_dispute.req_agent_id IS NOT NULL AND v_dispute.price_cents > 0 THEN
            PERFORM public.add_ledger_entry(v_dispute.req_agent_id, 'earning', (v_dispute.price_cents * 80) / 100, v_dispute.request_id, v_dispute.photo_id, p_dispute_id, 'Dispute resolved - photo approved');
        END IF;
        RETURN jsonb_build_object('success', true, 'resolution', 'approved');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Fix start_view_session to properly handle reset sessions
CREATE OR REPLACE FUNCTION public.start_view_session(p_photo_id UUID)
RETURNS TABLE (photo_id UUID, storage_path TEXT, expires_at TIMESTAMPTZ, already_expired BOOLEAN) AS $$
DECLARE
    v_photo RECORD;
    v_expires_at TIMESTAMPTZ;
BEGIN
    SELECT ph.*, r.creator_id INTO v_photo
    FROM public.photos ph
    JOIN public.requests r ON r.id = ph.request_id
    WHERE ph.id = p_photo_id;

    IF v_photo.creator_id != auth.uid() THEN
        RAISE EXCEPTION 'Not authorized to view this photo';
    END IF;

    -- Check if session exists AND has expired
    IF v_photo.view_session_expires_at IS NOT NULL AND v_photo.view_session_expires_at < NOW() THEN
        RETURN QUERY SELECT p_photo_id, v_photo.storage_path, v_photo.view_session_expires_at, true;
        RETURN;
    END IF;

    -- Start new session if not started yet (NULL means admin approved/reset)
    IF v_photo.view_session_started_at IS NULL THEN
        v_expires_at := NOW() + INTERVAL '3 minutes';
        UPDATE public.photos SET
            view_session_started_at = NOW(),
            view_session_expires_at = v_expires_at,
            status = 'viewed'
        WHERE id = p_photo_id;
    ELSE
        v_expires_at := v_photo.view_session_expires_at;
    END IF;

    RETURN QUERY SELECT p_photo_id, v_photo.storage_path, v_expires_at, false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Permissões
GRANT EXECUTE ON FUNCTION public.get_admin_disputes(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_photo(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_photo(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_dispute(UUID, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_view_session(UUID) TO authenticated;

-- FEITO!

