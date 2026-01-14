-- ============================================================
-- Migration 001: Enable Required Extensions
-- ============================================================
-- Enables PostGIS for geolocation queries (10m validation)
-- and other useful extensions for the Echo app.
-- ============================================================

-- Enable PostGIS in public schema so geography type is directly available
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;

-- Enable UUID generation (usually already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_trgm for text search (useful for location names)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

