-- =========================================================================
-- FINGER OF GOD ESTATE MANAGEMENT SYSTEM
-- PRODUCTION RESIDENTS TABLE & ROW LEVEL SECURITY (RLS) MIGRATION
-- =========================================================================
-- Target Database: PostgreSQL 15+ / Supabase
-- Target Schema: public
-- File: /supabase_residents_migration.sql
--
-- DESCRIPTION:
-- Self-contained, non-destructive migration to create the official public.residents
-- table, enable Row-Level Security (RLS) policies, and populate the six existing
-- legitimate resident records with their corresponding Supabase Auth user IDs.
-- =========================================================================

-- Enable core cryptographic and UUID extensions if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -------------------------------------------------------------------------
-- 1. CREATE PUBLIC.RESIDENTS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.residents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    resident_number VARCHAR(10) NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone_number VARCHAR(30) NOT NULL UNIQUE,
    additional_phone VARCHAR(30),
    email VARCHAR(150),
    house_number TEXT NOT NULL,
    address TEXT NOT NULL,
    state VARCHAR(50) NOT NULL DEFAULT 'Delta',
    lga VARCHAR(50) NOT NULL DEFAULT 'Oshimili South',
    notes TEXT,
    registration_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Suspended')),
    account_activated BOOLEAN NOT NULL DEFAULT FALSE,
    profile_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_resident_number_range CHECK (resident_number ~ '^(00[1-9]|0[1-9][0-9]|[1-2][0-9]{2}|300)$')
);

CREATE INDEX IF NOT EXISTS idx_residents_num ON public.residents(resident_number);
CREATE INDEX IF NOT EXISTS idx_residents_phone ON public.residents(phone_number);
CREATE INDEX IF NOT EXISTS idx_residents_status ON public.residents(status);
CREATE INDEX IF NOT EXISTS idx_residents_auth_user ON public.residents(auth_user_id);

-- -------------------------------------------------------------------------
-- 2. ENABLE ROW-LEVEL SECURITY (RLS)
-- -------------------------------------------------------------------------
ALTER TABLE public.residents ENABLE ROW LEVEL SECURITY;

-- Drop prior versions if they exist to ensure clean policy definition
DROP POLICY IF EXISTS "Residents can view own profile or Admin" ON public.residents;
DROP POLICY IF EXISTS "Residents can update own contact info" ON public.residents;
DROP POLICY IF EXISTS "Admins can insert residents" ON public.residents;
DROP POLICY IF EXISTS "Admins can delete residents" ON public.residents;

-- POLICY 1: SELECT
-- Unauthenticated users: DENIED (TO authenticated only)
-- Resident A: Can ONLY view own record (auth_user_id = auth.uid())
-- Administrators: Can view all residents
CREATE POLICY "Residents can view own profile or Admin"
ON public.residents FOR SELECT
TO authenticated
USING (
  auth_user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.admin_users WHERE auth_user_id = auth.uid() AND status = 'Active'
  )
);

-- POLICY 2: UPDATE
-- Resident A: Can ONLY update their own record
-- Crucial: resident_number, auth_user_id, status CANNOT be altered by the resident
-- Administrators: Full update access
CREATE POLICY "Residents can update own contact info"
ON public.residents FOR UPDATE
TO authenticated
USING (
  auth_user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.admin_users WHERE auth_user_id = auth.uid() AND status = 'Active'
  )
)
WITH CHECK (
  (
    auth_user_id = auth.uid() 
    AND resident_number = (SELECT r.resident_number FROM public.residents r WHERE r.auth_user_id = auth.uid())
    AND status = (SELECT r.status FROM public.residents r WHERE r.auth_user_id = auth.uid())
  ) OR
  EXISTS (
    SELECT 1 FROM public.admin_users WHERE auth_user_id = auth.uid() AND status = 'Active'
  )
);

-- POLICY 3: INSERT
-- Regular residents: DENIED
-- Administrators: ALLOWED
CREATE POLICY "Admins can insert residents"
ON public.residents FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users WHERE auth_user_id = auth.uid() AND status = 'Active'
  )
);

-- POLICY 4: DELETE
-- Regular residents: DENIED
-- Administrators: ALLOWED
CREATE POLICY "Admins can delete residents"
ON public.residents FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users WHERE auth_user_id = auth.uid() AND status = 'Active'
  )
);

-- -------------------------------------------------------------------------
-- 3. MIGRATE THE SIX REAL PRODUCTION RESIDENT RECORDS
-- -------------------------------------------------------------------------
INSERT INTO public.residents (
    resident_number,
    full_name,
    phone_number,
    additional_phone,
    email,
    house_number,
    address,
    state,
    lga,
    status,
    account_activated,
    profile_completed,
    auth_user_id,
    registration_date
) VALUES
('001', 'Engr. Babatunde Adeleke', '08023456789', NULL, 'babatunde.adeleke@gmail.com', 'Plot 4A, Hibiscus Crescent', 'Phase 1, Finger of God Estate, Iyiaba, Asaba', 'Delta', 'Oshimili South', 'Active', TRUE, TRUE, 'cb033992-eb57-4a0f-800f-d73b303b9d07', '2026-08-15'),
('002', 'Dr. Chioma Nwachukwu', '08098765432', NULL, 'dr.chioma@nwachukwumed.ng', 'Plot 12, Palm View Avenue', 'Phase 1, Finger of God Estate, Iyiaba, Asaba', 'Delta', 'Oshimili South', 'Active', FALSE, FALSE, NULL, '2026-08-20'),
('003', 'Alhaji Usman Danladi', '08123459876', NULL, 'usman.danladi@danladigroup.com', 'Plot 7B, Grace Close', 'Phase 1, Finger of God Estate, Iyiaba, Asaba', 'Delta', 'Oshimili South', 'Active', FALSE, FALSE, NULL, '2026-08-25'),
('004', 'Mrs. Folashade Balogun', '07033445566', NULL, 'folashade.balogun@outlook.com', 'Plot 19, Olive Way', 'Phase 1, Finger of God Estate, Iyiaba, Asaba', 'Delta', 'Oshimili South', 'Inactive', FALSE, FALSE, NULL, '2026-09-01'),
('005', 'Chief Emeka Okonjo', '08011223344', NULL, NULL, 'Plot 3, Harmony Boulevard', 'Phase 1, Finger of God Estate, Iyiaba, Asaba', 'Delta', 'Oshimili South', 'Active', FALSE, FALSE, NULL, '2026-09-05'),
('010', 'Mrs. Isis Nwabueze', '08038383810', NULL, 'isis38f@gmail.com', 'Plot 10, Palm View Avenue', 'Finger of God Estate, Iyiaba, Asaba', 'Delta', 'Oshimili South', 'Active', TRUE, TRUE, 'd1b49d39-12aa-46ad-9196-878d609706f2', '2026-10-04')
ON CONFLICT (resident_number) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    house_number = EXCLUDED.house_number,
    address = EXCLUDED.address,
    status = EXCLUDED.status,
    account_activated = EXCLUDED.account_activated,
    profile_completed = EXCLUDED.profile_completed,
    auth_user_id = EXCLUDED.auth_user_id,
    updated_at = NOW();
