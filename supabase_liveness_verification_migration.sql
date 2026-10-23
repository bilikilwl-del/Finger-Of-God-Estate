-- =============================================================================
-- FINGER OF GOD ESTATE (FOGES) — RESIDENT LIVENESS VERIFICATION & PRIVATE PHOTO STORAGE
-- Migration: 20261023_resident_liveness_verification.sql
-- =============================================================================
-- Purpose:
--   1. Adds profile photo and liveness verification metadata columns to public.residents
--   2. Creates public.resident_liveness_sessions for server-bound, single-use liveness sessions
--   3. Creates public.resident_liveness_audit_logs for compliance & NDPA 2023 audit trail
--   4. Configures private Supabase Storage bucket 'resident-profile-photos' (public = false)
--      with strict Row-Level Security (RLS) policies.
-- =============================================================================

BEGIN;

-- 1. Extend public.residents with Liveness & Profile Photo columns
ALTER TABLE public.residents
  ADD COLUMN IF NOT EXISTS profile_photo_path TEXT,
  ADD COLUMN IF NOT EXISTS profile_photo_sha256 TEXT,
  ADD COLUMN IF NOT EXISTS profile_photo_uploaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS liveness_status TEXT DEFAULT 'NOT_VERIFIED',
  ADD COLUMN IF NOT EXISTS liveness_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS liveness_provider TEXT,
  ADD COLUMN IF NOT EXISTS liveness_session_id TEXT,
  ADD COLUMN IF NOT EXISTS liveness_confidence NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS liveness_review_notes TEXT,
  ADD COLUMN IF NOT EXISTS liveness_reviewed_by TEXT;

-- 2. Create public.resident_liveness_sessions table
CREATE TABLE IF NOT EXISTS public.resident_liveness_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  resident_number TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'ACTIVATION' CHECK (purpose IN ('ACTIVATION', 'PHOTO_REPLACEMENT')),
  challenge_nonce TEXT NOT NULL,
  challenge_sequence JSONB NOT NULL DEFAULT '[]'::jsonb,
  provider TEXT NOT NULL DEFAULT 'unconfigured',
  provider_session_id TEXT,
  status TEXT NOT NULL DEFAULT 'INITIATED' CHECK (
    status IN (
      'INITIATED',
      'LIVENESS_VERIFIED',
      'SPOOF_DETECTED',
      'INCONCLUSIVE',
      'PROVIDER_UNCONFIGURED',
      'PROVIDER_UNAVAILABLE',
      'PENDING_MANUAL_REVIEW',
      'MANUAL_REVIEW_APPROVED',
      'REJECTED',
      'EXPIRED'
    )
  ),
  is_live BOOLEAN NOT NULL DEFAULT FALSE,
  confidence_score NUMERIC(5,2),
  spoof_reason TEXT,
  photo_storage_path TEXT,
  photo_sha256 TEXT,
  photo_mime_type TEXT,
  photo_size_bytes INTEGER,
  manual_review_reason TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  consent_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  consent_timestamp TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_liveness_sessions_resident_number
  ON public.resident_liveness_sessions(resident_number);

CREATE INDEX IF NOT EXISTS idx_liveness_sessions_session_id
  ON public.resident_liveness_sessions(session_id);

-- 3. Create public.resident_liveness_audit_logs table
CREATE TABLE IF NOT EXISTS public.resident_liveness_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_number TEXT NOT NULL,
  session_id TEXT,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('RESIDENT', 'ADMIN', 'SYSTEM')),
  actor_identifier TEXT NOT NULL,
  event_type TEXT NOT NULL,
  outcome TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_liveness_audit_resident_number
  ON public.resident_liveness_audit_logs(resident_number);

-- 4. Enable Row Level Security (RLS) on liveness tables
ALTER TABLE public.resident_liveness_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resident_liveness_audit_logs ENABLE ROW LEVEL SECURITY;

-- Service role has full access; anonymous/public access is strictly blocked
DROP POLICY IF EXISTS "Service role full access on resident_liveness_sessions" ON public.resident_liveness_sessions;
CREATE POLICY "Service role full access on resident_liveness_sessions"
  ON public.resident_liveness_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on resident_liveness_audit_logs" ON public.resident_liveness_audit_logs;
CREATE POLICY "Service role full access on resident_liveness_audit_logs"
  ON public.resident_liveness_audit_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. Provision Private Supabase Storage Bucket: 'resident-profile-photos'
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resident-profile-photos',
  'resident-profile-photos',
  false,
  5242880, -- 5 MB max file size
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 6. Storage RLS Policies: Block all public access; only service_role and verified admins can read/write
DROP POLICY IF EXISTS "Deny public access to resident profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Service role full access to resident profile photos" ON storage.objects;
CREATE POLICY "Service role full access to resident profile photos"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'resident-profile-photos')
  WITH CHECK (bucket_id = 'resident-profile-photos');

COMMIT;
