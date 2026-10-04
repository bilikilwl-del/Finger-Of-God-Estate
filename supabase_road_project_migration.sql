-- =========================================================================
-- FINGER OF GOD ESTATE MANAGEMENT SYSTEM
-- OFFICIAL ROAD MODERNIZATION PROJECT DATABASE MIGRATION SCRIPT
-- =========================================================================
-- Target Database: PostgreSQL 15+ / Supabase
-- Target Schema: public
-- File: /supabase_road_project_migration.sql
-- 
-- DESCRIPTION:
-- Complete, self-contained, production-grade database migration for the
-- Finger of God Estate Road Modernization Project financial ledger.
--
-- GUARANTEES:
-- 1. Permanent Persistence: Transactions and contributions are stored permanently
--    in Supabase PostgreSQL, persisting across server restarts and Render redeployments.
-- 2. Strict Idempotency: Enforces UNIQUE constraint on transaction references.
-- 3. Transparent Public Access: Public read access for VERIFIED records via RLS.
-- 4. Audit & Verification: Tracks Paystack provider references, channel, and verification timestamps.
-- =========================================================================

-- Enable core extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -------------------------------------------------------------------------
-- 1. ROAD MODERNIZATION PROJECT TRANSACTIONS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.road_project_transactions (
    id TEXT PRIMARY KEY,
    reference VARCHAR(120) NOT NULL UNIQUE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    type VARCHAR(10) NOT NULL CHECK (type IN ('CREDIT', 'DEBIT')),
    source VARCHAR(50) NOT NULL DEFAULT 'Paystack' CHECK (source IN ('Paystack', 'Bank Transfer', 'Bank API', 'Admin-authorized expenditure')),
    description TEXT NOT NULL,
    category VARCHAR(80) NOT NULL DEFAULT 'Building Contribution',
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
    payment_status VARCHAR(20) NOT NULL DEFAULT 'success',
    running_balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    payer_or_vendor TEXT NOT NULL,
    contributor_display_name TEXT,
    resident_id UUID,
    resident_number VARCHAR(30),
    building_number VARCHAR(30),
    is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    phone VARCHAR(50),
    email VARCHAR(150),
    approved_by TEXT NOT NULL DEFAULT 'Server Verified Gateway',
    receipt_or_invoice_ref VARCHAR(100),
    provider_transaction_id VARCHAR(100),
    paystack_reference VARCHAR(120),
    project_type VARCHAR(50) NOT NULL DEFAULT 'road_modernization',
    project_name VARCHAR(150) NOT NULL DEFAULT 'Finger of God Estate Road Modernization Project',
    notes TEXT,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'VERIFIED' CHECK (status IN ('VERIFIED', 'PENDING_AUDIT', 'REJECTED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Essential Performance Indexes
CREATE INDEX IF NOT EXISTS idx_rd_tx_date ON public.road_project_transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_rd_tx_type ON public.road_project_transactions(type);
CREATE INDEX IF NOT EXISTS idx_rd_tx_ref ON public.road_project_transactions(reference);
CREATE INDEX IF NOT EXISTS idx_rd_tx_bldg ON public.road_project_transactions(building_number);
CREATE INDEX IF NOT EXISTS idx_rd_tx_status ON public.road_project_transactions(status);

-- -------------------------------------------------------------------------
-- 2. ROAD MODERNIZATION PROJECT CONTRIBUTIONS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.road_project_contributions (
    id TEXT PRIMARY KEY,
    reference VARCHAR(120) NOT NULL UNIQUE,
    paystack_reference VARCHAR(120) UNIQUE,
    resident_number VARCHAR(30),
    contributor_name VARCHAR(150) NOT NULL,
    contributor_display_name VARCHAR(150) NOT NULL DEFAULT 'Anonymous Contributor',
    is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    payment_channel VARCHAR(50) NOT NULL DEFAULT 'paystack',
    status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'PENDING', 'FAILED')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rd_contrib_ref ON public.road_project_contributions(reference);
CREATE INDEX IF NOT EXISTS idx_rd_contrib_paystack ON public.road_project_contributions(paystack_reference);
CREATE INDEX IF NOT EXISTS idx_rd_contrib_bldg ON public.road_project_contributions(resident_number);

-- -------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- -------------------------------------------------------------------------
ALTER TABLE public.road_project_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.road_project_contributions ENABLE ROW LEVEL SECURITY;

-- Public Transparency Policy: Anyone can read confirmed/verified road transactions
DROP POLICY IF EXISTS "Public read on road transactions" ON public.road_project_transactions;
CREATE POLICY "Public read on road transactions"
    ON public.road_project_transactions FOR SELECT
    USING (status = 'VERIFIED');

DROP POLICY IF EXISTS "Public read on road contributions" ON public.road_project_contributions;
CREATE POLICY "Public read on road contributions"
    ON public.road_project_contributions FOR SELECT
    USING (status = 'COMPLETED');

-- Service Role Full Access: Server backend with service_role key has full read/write
DROP POLICY IF EXISTS "Service role full access on road transactions" ON public.road_project_transactions;
CREATE POLICY "Service role full access on road transactions"
    ON public.road_project_transactions FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on road contributions" ON public.road_project_contributions;
CREATE POLICY "Service role full access on road contributions"
    ON public.road_project_contributions FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Anonymous API key write permission (for server API client with anon key)
DROP POLICY IF EXISTS "Anon insert on road transactions" ON public.road_project_transactions;
CREATE POLICY "Anon insert on road transactions"
    ON public.road_project_transactions FOR INSERT
    TO anon
    WITH CHECK (status = 'VERIFIED');

DROP POLICY IF EXISTS "Anon insert on road contributions" ON public.road_project_contributions;
CREATE POLICY "Anon insert on road contributions"
    ON public.road_project_contributions FOR INSERT
    TO anon
    WITH CHECK (status = 'COMPLETED');

-- -------------------------------------------------------------------------
-- 4. GRANT PERMISSIONS
-- -------------------------------------------------------------------------
GRANT SELECT, INSERT ON public.road_project_transactions TO anon, authenticated;
GRANT ALL ON public.road_project_transactions TO service_role;

GRANT SELECT, INSERT ON public.road_project_contributions TO anon, authenticated;
GRANT ALL ON public.road_project_contributions TO service_role;

-- -------------------------------------------------------------------------
-- 5. SEED GENUINE VERIFIED TRANSACTION (IDEMPOTENT)
-- Ingest Chiedu John's verified ₦100 contribution completed on Paystack
-- -------------------------------------------------------------------------
INSERT INTO public.road_project_transactions (
    id,
    reference,
    date,
    type,
    source,
    description,
    category,
    amount,
    currency,
    payment_status,
    running_balance,
    payer_or_vendor,
    contributor_display_name,
    resident_number,
    building_number,
    is_anonymous,
    approved_by,
    receipt_or_invoice_ref,
    provider_transaction_id,
    paystack_reference,
    project_type,
    notes,
    verified_at,
    paid_at,
    status
) VALUES (
    'rd-tx-1791065740307-ea4c',
    'FOG-RD-PAY-1791065740307-EA4C73',
    '2026-10-03',
    'CREDIT',
    'Paystack',
    'Resident 013 Road Modernization Contribution',
    'Landlord Levy',
    100.00,
    'NGN',
    'success',
    100.00,
    'Chiedu John',
    'Chiedu John',
    '013',
    '013',
    FALSE,
    'Paystack Automated Gateway (Server Verified)',
    'RCP-RD-PSTK-EA4C73',
    '6622341443',
    'FOG-RD-PAY-1791065740307-EA4C73',
    'road_modernization',
    'Verified online contribution via Paystack (card). Auth code: AUTH_4l17c6t39j',
    '2026-10-03T22:17:04.000Z',
    '2026-10-03T22:17:04.000Z',
    'VERIFIED'
) ON CONFLICT (reference) DO NOTHING;
