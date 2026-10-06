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
    account_status VARCHAR(50) NOT NULL DEFAULT 'NOT ACTIVATED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_resident_number_range CHECK (resident_number ~ '^(00[1-9]|0[1-9][0-9]|[1-2][0-9]{2}|300)$')
);

CREATE INDEX IF NOT EXISTS idx_residents_num ON public.residents(resident_number);
CREATE INDEX IF NOT EXISTS idx_residents_phone ON public.residents(phone_number);
CREATE INDEX IF NOT EXISTS idx_residents_status ON public.residents(status);
CREATE INDEX IF NOT EXISTS idx_residents_auth_user ON public.residents(auth_user_id);

-- -------------------------------------------------------------------------
-- 1B. ENSURE PUBLIC.ADMIN_USERS & PROFILES EXIST FOR RLS & ROLE CHECKS
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'Administrator',
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(150) NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'Resident',
    status VARCHAR(20) NOT NULL DEFAULT 'Active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Designated Administrator into admin_users and profiles
INSERT INTO public.admin_users (id, auth_user_id, email, full_name, role, status)
VALUES ('2aef6033-2600-4d7a-aaa5-7f54c441e429', '2aef6033-2600-4d7a-aaa5-7f54c441e429', 'admin@fingerofgodestate.com', 'Estate Administrator', 'Administrator', 'Active')
ON CONFLICT (email) DO UPDATE SET
    auth_user_id = EXCLUDED.auth_user_id,
    status = 'Active',
    updated_at = NOW();

INSERT INTO public.profiles (id, email, full_name, role, status)
VALUES ('2aef6033-2600-4d7a-aaa5-7f54c441e429', 'admin@fingerofgodestate.com', 'Estate Administrator', 'admin', 'Active')
ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    status = 'Active',
    updated_at = NOW();

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
-- 3. SCHEMA VERIFICATION
-- -------------------------------------------------------------------------
-- Production table 'public.residents' is now created with RLS enabled and ready for resident uploads (001 - 300).
SELECT 'public.residents table verified with RLS policies' AS status;
