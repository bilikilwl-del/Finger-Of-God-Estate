-- ============================================================================
-- FINGER OF GOD ESTATE SECURITY MANAGEMENT SYSTEM
-- Supabase Migration: Persistent Server-Authoritative Resident OTP Challenges
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.resident_otp_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_number VARCHAR(10) NOT NULL,
    challenge_type VARCHAR(20) NOT NULL DEFAULT 'ACTIVATION', -- 'ACTIVATION' or 'LOGIN'
    phone_number VARCHAR(30) NOT NULL,
    pending_email VARCHAR(255),
    otp_hash VARCHAR(64) NOT NULL,
    salt VARCHAR(32) NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    expires_at TIMESTAMPTZ NOT NULL,
    resend_after TIMESTAMPTZ NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast lookup and cleanup
CREATE INDEX IF NOT EXISTS idx_resident_otp_lookup 
    ON public.resident_otp_challenges(resident_number, challenge_type);

CREATE INDEX IF NOT EXISTS idx_resident_otp_expiry 
    ON public.resident_otp_challenges(expires_at);

-- Row Level Security: Server-only (accessible exclusively with service_role key)
ALTER TABLE public.resident_otp_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on resident_otp_challenges" ON public.resident_otp_challenges;
CREATE POLICY "Service role full access on resident_otp_challenges"
    ON public.resident_otp_challenges
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
