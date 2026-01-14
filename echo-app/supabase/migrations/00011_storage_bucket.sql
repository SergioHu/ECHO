-- ============================================================
-- Migration 011: Storage Bucket for Photos
-- ============================================================
-- Creates the 'echo-photos' bucket for storing job photos.
-- Photos are stored temporarily (cleaned up after expiration).
-- ============================================================

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'echo-photos',
    'echo-photos',
    false, -- Not public (requires signed URLs)
    5242880, -- 5MB limit per file
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STORAGE POLICIES
-- ============================================================

-- Policy: Authenticated users can upload photos
CREATE POLICY "Agents can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'echo-photos'
    AND (storage.foldername(name))[1] IS NOT NULL -- Must be in a folder (request_id)
);

-- Policy: Photo owners (agents) can read their uploads
CREATE POLICY "Agents can view their uploads"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'echo-photos'
    AND auth.uid()::text = (storage.foldername(name))[2] -- folder structure: request_id/user_id_timestamp.jpg
);

-- Policy: Request creators can view photos for their requests
CREATE POLICY "Creators can view request photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'echo-photos'
    AND EXISTS (
        SELECT 1 FROM public.requests r
        WHERE r.id::text = (storage.foldername(name))[1]
        AND r.creator_id = auth.uid()
    )
);

-- Policy: Service role can do anything (for backend cleanup)
CREATE POLICY "Service role full access"
ON storage.objects
TO service_role
USING (bucket_id = 'echo-photos')
WITH CHECK (bucket_id = 'echo-photos');

-- ============================================================
-- Note: To enable signed URLs for photo viewing, the bucket
-- must allow signed URL generation. This is configured in
-- the Supabase dashboard under Storage > Policies.
-- ============================================================

