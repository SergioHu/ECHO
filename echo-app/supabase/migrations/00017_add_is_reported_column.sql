-- ============================================================
-- Migration 017: Add is_reported column to photos table
-- ============================================================
-- Adds the is_reported flag that the report_photo function
-- expects to update when a photo is reported.
-- ============================================================

-- Add is_reported column to photos table
ALTER TABLE public.photos
ADD COLUMN IF NOT EXISTS is_reported BOOLEAN DEFAULT false;

-- Add index for quick filtering of reported photos
CREATE INDEX IF NOT EXISTS idx_photos_reported 
ON public.photos(is_reported) 
WHERE is_reported = true;

-- Comment
COMMENT ON COLUMN public.photos.is_reported IS 'Flag indicating if this photo has been reported/disputed';

