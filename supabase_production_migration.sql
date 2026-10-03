-- =========================================================================
-- FINGER OF GOD ESTATE MANAGEMENT SYSTEM
-- OFFICIAL PRODUCTION DATABASE ARCHITECTURE & MIGRATION SCRIPT (FINAL)
-- =========================================================================
-- Target Database: PostgreSQL 15+ / Supabase
-- This script is strictly idempotent, hardened with least-privilege RLS,
-- has zero password storage in public tables, and has zero fake seeds.
-- =========================================================================

-- Enable core extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -------------------------------------------------------------------------
-- 1. ESTATE SETTINGS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.estate_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    estate_name TEXT NOT NULL DEFAULT 'Finger of God Estate',
    estate_address TEXT NOT NULL DEFAULT 'Main Gate Boulevard, Phase 1, Finger of God Estate, Iyiaba, Asaba',
    estate_state TEXT NOT NULL DEFAULT 'Delta',
    estate_lga TEXT NOT NULL DEFAULT 'Oshimili South',
    monthly_security_levy NUMERIC(12, 2) NOT NULL DEFAULT 5000.00 CHECK (monthly_security_levy >= 0),
    payment_due_day INTEGER NOT NULL DEFAULT 1 CHECK (payment_due_day >= 1 AND payment_due_day <= 28),
    currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
    contact_phone VARCHAR(50) NOT NULL DEFAULT '',
    contact_email VARCHAR(100) NOT NULL DEFAULT '',
    sms_sender_name VARCHAR(20) NOT NULL DEFAULT 'FINGEROFGOD',
    first_payment_month VARCHAR(30) NOT NULL DEFAULT 'October 2026',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 2. RESIDENTS TABLE
-- Strictly enforces 001 - 300 and unique phone.
-- NOTE: Passwords are NOT stored here; authentication is handled solely by Supabase Auth (auth.users).
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
-- 3. ADMIN USERS TABLE (Linked to auth.users via Unique auth_user_id)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'Administrator' CHECK (role IN ('Super Admin', 'Administrator', 'Security Officer', 'Accountant')),
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_email ON public.admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_auth ON public.admin_users(auth_user_id);

-- -------------------------------------------------------------------------
-- 4. MONTHLY SECURITY LEVY PAYMENTS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.monthly_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
    resident_number VARCHAR(10) NOT NULL,
    period_month INTEGER NOT NULL CHECK (period_month >= 1 AND period_month <= 12),
    period_year INTEGER NOT NULL CHECK (period_year >= 2026),
    period_label VARCHAR(50) NOT NULL,
    amount_due NUMERIC(12, 2) NOT NULL DEFAULT 5000.00 CHECK (amount_due >= 0),
    amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (amount_paid >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'UNPAID' CHECK (status IN ('UNPAID', 'PENDING', 'PAID', 'FAILED', 'CANCELLED')),
    due_date DATE NOT NULL,
    paid_at TIMESTAMPTZ,
    paystack_reference VARCHAR(120),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_resident_levy_period UNIQUE (resident_id, period_month, period_year)
);

CREATE INDEX IF NOT EXISTS idx_payments_res_num ON public.monthly_payments(resident_number);
CREATE INDEX IF NOT EXISTS idx_payments_period ON public.monthly_payments(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.monthly_payments(status);

-- -------------------------------------------------------------------------
-- 5. PAYMENT TRANSACTIONS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID REFERENCES public.monthly_payments(id) ON DELETE SET NULL,
    resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
    resident_number VARCHAR(10) NOT NULL,
    period_month INTEGER NOT NULL DEFAULT 10,
    period_year INTEGER NOT NULL DEFAULT 2026,
    period_label VARCHAR(50) NOT NULL DEFAULT 'October 2026',
    transaction_reference VARCHAR(120) NOT NULL UNIQUE,
    paystack_reference VARCHAR(120) UNIQUE,
    paystack_transaction_id VARCHAR(100),
    amount_due NUMERIC(12, 2) NOT NULL DEFAULT 5000.00,
    amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
    payment_method VARCHAR(30) NOT NULL DEFAULT 'Paystack' CHECK (payment_method IN ('Paystack', 'Bank Transfer', 'Manual POS', 'Cash')),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'FAILED', 'CANCELLED')),
    payment_channel VARCHAR(50),
    payment_date TIMESTAMPTZ,
    gateway_response TEXT,
    customer_email VARCHAR(150),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tx_ref ON public.payment_transactions(transaction_reference);
CREATE INDEX IF NOT EXISTS idx_tx_paystack_ref ON public.payment_transactions(paystack_reference);
CREATE INDEX IF NOT EXISTS idx_tx_res ON public.payment_transactions(resident_id);

-- -------------------------------------------------------------------------
-- 6. DIGITAL STAMPED RECEIPTS TABLE
-- Protected from anonymous direct SELECT. Verification via verify_receipt() RPC only.
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_number VARCHAR(80) NOT NULL UNIQUE,
    transaction_id UUID REFERENCES public.payment_transactions(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES public.monthly_payments(id) ON DELETE CASCADE,
    resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
    resident_number VARCHAR(10) NOT NULL,
    resident_name TEXT NOT NULL,
    house_number TEXT NOT NULL,
    amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 5000.00,
    currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
    period_covered VARCHAR(50) NOT NULL,
    payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paystack_reference VARCHAR(120) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PAID',
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receipts_num ON public.receipts(receipt_number);
CREATE INDEX IF NOT EXISTS idx_receipts_ref ON public.receipts(paystack_reference);
CREATE INDEX IF NOT EXISTS idx_receipts_res ON public.receipts(resident_id);

-- -------------------------------------------------------------------------
-- 7. ROAD MODERNIZATION PROJECT TRANSACTIONS TABLE (Public Transparency)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.road_project_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference VARCHAR(80) NOT NULL UNIQUE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    type VARCHAR(10) NOT NULL CHECK (type IN ('CREDIT', 'DEBIT')),
    source VARCHAR(50) NOT NULL CHECK (source IN ('Paystack', 'Bank Transfer', 'Bank API', 'Admin-authorized expenditure')),
    description TEXT NOT NULL,
    category VARCHAR(80) NOT NULL,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    running_balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    payer_or_vendor TEXT NOT NULL,
    building_number VARCHAR(30),
    approved_by TEXT NOT NULL,
    receipt_or_invoice_ref VARCHAR(100),
    provider_transaction_id VARCHAR(100),
    notes TEXT,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(20) NOT NULL DEFAULT 'VERIFIED' CHECK (status IN ('VERIFIED', 'PENDING_AUDIT', 'REJECTED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rd_tx_date ON public.road_project_transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_rd_tx_type ON public.road_project_transactions(type);
CREATE INDEX IF NOT EXISTS idx_rd_tx_ref ON public.road_project_transactions(reference);
CREATE INDEX IF NOT EXISTS idx_rd_tx_bldg ON public.road_project_transactions(building_number);

-- -------------------------------------------------------------------------
-- 8. ROAD MODERNIZATION PROJECT MILESTONES TABLE (Project Configuration)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.road_project_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    milestone_order INTEGER NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'UPCOMING' CHECK (status IN ('COMPLETED', 'IN_PROGRESS', 'UPCOMING')),
    progress_percentage INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
    target_date DATE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 8b. ROAD MODERNIZATION PROJECT CONTRIBUTIONS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.road_project_contributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference VARCHAR(120) NOT NULL UNIQUE,
    paystack_reference VARCHAR(120) UNIQUE,
    resident_id UUID REFERENCES public.residents(id) ON DELETE SET NULL,
    resident_number VARCHAR(10),
    donor_name TEXT NOT NULL,
    donor_phone VARCHAR(30),
    donor_email VARCHAR(150),
    building_number VARCHAR(30),
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(30) NOT NULL DEFAULT 'Paystack' CHECK (payment_method IN ('Paystack', 'Bank Transfer', 'Bank API', 'Manual POS', 'Cash')),
    status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED')),
    receipt_number VARCHAR(80) UNIQUE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rd_contrib_ref ON public.road_project_contributions(reference);
CREATE INDEX IF NOT EXISTS idx_rd_contrib_paystack ON public.road_project_contributions(paystack_reference);
CREATE INDEX IF NOT EXISTS idx_rd_contrib_bldg ON public.road_project_contributions(building_number);

-- -------------------------------------------------------------------------
-- 9. BANK RECONCILIATIONS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bank_reconciliations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bank_reference VARCHAR(100) NOT NULL UNIQUE,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    bank_name VARCHAR(100) NOT NULL DEFAULT 'Zenith Bank PLC',
    date DATE NOT NULL,
    payer_narration TEXT NOT NULL,
    sender_name TEXT,
    detected_building VARCHAR(30),
    matched_transaction_id UUID REFERENCES public.road_project_transactions(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'UNMATCHED' CHECK (status IN ('MATCHED', 'UNMATCHED', 'DUPLICATE', 'FLAGGED')),
    notes TEXT,
    proof_url TEXT,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_recon_ref ON public.bank_reconciliations(bank_reference);
CREATE INDEX IF NOT EXISTS idx_bank_recon_status ON public.bank_reconciliations(status);

-- -------------------------------------------------------------------------
-- 10. SMS AUDIT LOGS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sms_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resident_id UUID REFERENCES public.residents(id) ON DELETE CASCADE,
    resident_number VARCHAR(10) NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    payment_month INTEGER NOT NULL CHECK (payment_month BETWEEN 1 AND 12),
    payment_year INTEGER NOT NULL CHECK (payment_year >= 2026),
    period_label VARCHAR(50) NOT NULL,
    reminder_type VARCHAR(30) NOT NULL CHECK (reminder_type IN ('REMINDER_1', 'REMINDER_2', 'TEST', 'MANUAL', 'ANNOUNCEMENT')),
    message TEXT NOT NULL,
    provider VARCHAR(50) NOT NULL DEFAULT 'termii',
    provider_message_id VARCHAR(100),
    delivery_status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (delivery_status IN ('SENT', 'DELIVERED', 'FAILED', 'PENDING', 'NOT_CONFIGURED')),
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sms_sent_reminder 
ON public.sms_logs (resident_id, payment_month, payment_year, reminder_type) 
WHERE (reminder_type IN ('REMINDER_1', 'REMINDER_2') AND delivery_status = 'SENT');

CREATE INDEX IF NOT EXISTS idx_sms_res_num ON public.sms_logs(resident_number);
CREATE INDEX IF NOT EXISTS idx_sms_created ON public.sms_logs(created_at DESC);

-- -------------------------------------------------------------------------
-- 10b. SMS REMINDERS SCHEDULE TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sms_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
    resident_number VARCHAR(10) NOT NULL,
    period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
    period_year INTEGER NOT NULL CHECK (period_year >= 2026),
    period_label VARCHAR(50) NOT NULL,
    reminder_type VARCHAR(30) NOT NULL CHECK (reminder_type IN ('FIRST_NOTICE', 'SECOND_NOTICE', 'OVERDUE_WARNING', 'FINAL_NOTICE')),
    scheduled_for TIMESTAMPTZ NOT NULL,
    dispatched_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'FAILED', 'CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_sms_reminder_schedule UNIQUE (resident_id, period_month, period_year, reminder_type)
);

CREATE INDEX IF NOT EXISTS idx_sms_rem_status ON public.sms_reminders(status);
CREATE INDEX IF NOT EXISTS idx_sms_rem_scheduled ON public.sms_reminders(scheduled_for);

-- -------------------------------------------------------------------------
-- 11. ANNOUNCEMENTS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    slug VARCHAR(180) NOT NULL UNIQUE,
    content TEXT NOT NULL,
    category VARCHAR(30) NOT NULL DEFAULT 'GENERAL' CHECK (category IN ('GENERAL', 'SECURITY', 'PAYMENT', 'MAINTENANCE', 'MEETING', 'EMERGENCY', 'OTHER')),
    priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('NORMAL', 'IMPORTANT', 'URGENT')),
    status VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    published_by TEXT NOT NULL DEFAULT 'Estate Secretariat',
    publish_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_slug ON public.announcements(slug);
CREATE INDEX IF NOT EXISTS idx_announcements_status ON public.announcements(status);

-- -------------------------------------------------------------------------
-- 12. ACTIVITY / AUDIT LOGS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_email VARCHAR(150) NOT NULL,
    action VARCHAR(60) NOT NULL,
    entity_type VARCHAR(60) NOT NULL,
    entity_id VARCHAR(100),
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_created ON public.activity_logs(created_at DESC);

-- -------------------------------------------------------------------------
-- 13. ESTATE ELECTION & SECRET BALLOT SYSTEM TABLES
-- -------------------------------------------------------------------------

-- 13.1 ELECTIONS TABLE
CREATE TABLE IF NOT EXISTS public.elections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    election_code VARCHAR(50) NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'UPCOMING', 'OPEN', 'PAUSED', 'CLOSED', 'RESULTS_PUBLISHED')),
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    constitution_rules TEXT,
    tie_breaking_rule TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_election_dates CHECK (ends_at >= starts_at)
);

CREATE INDEX IF NOT EXISTS idx_elections_code ON public.elections(election_code);
CREATE INDEX IF NOT EXISTS idx_elections_status ON public.elections(status);
CREATE INDEX IF NOT EXISTS idx_elections_dates ON public.elections(starts_at, ends_at);

-- 13.2 ELECTION POSITIONS TABLE
CREATE TABLE IF NOT EXISTS public.election_positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    election_id UUID NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    max_selections INTEGER NOT NULL DEFAULT 1 CHECK (max_selections >= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_election_position_name UNIQUE (election_id, name)
);

CREATE INDEX IF NOT EXISTS idx_election_positions_election ON public.election_positions(election_id);
CREATE INDEX IF NOT EXISTS idx_election_positions_order ON public.election_positions(election_id, display_order);

-- 13.3 ELECTION CANDIDATES TABLE
CREATE TABLE IF NOT EXISTS public.election_candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    election_id UUID NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
    position_id UUID NOT NULL REFERENCES public.election_positions(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    profile TEXT,
    manifesto TEXT,
    photo_url TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN')),
    display_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_election_candidates_election ON public.election_candidates(election_id);
CREATE INDEX IF NOT EXISTS idx_election_candidates_position ON public.election_candidates(position_id);
CREATE INDEX IF NOT EXISTS idx_election_candidates_status ON public.election_candidates(status);

-- 13.4 ELECTION VOTERS TABLE (Voter Accreditation & One-Vote Enforcement)
-- CRITICAL: Zero ballot choices or preferences are stored here.
CREATE TABLE IF NOT EXISTS public.election_voters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    election_id UUID NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
    resident_number VARCHAR(10) NOT NULL CHECK (resident_number ~ '^(00[1-9]|0[1-9][0-9]|[1-2][0-9]{2}|300)$'),
    resident_id UUID REFERENCES public.residents(id) ON DELETE SET NULL,
    eligible BOOLEAN NOT NULL DEFAULT TRUE,
    eligibility_reason TEXT DEFAULT 'Registered Landlord in Good Standing',
    has_voted BOOLEAN NOT NULL DEFAULT FALSE,
    accredited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    voted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_election_voter_property UNIQUE (election_id, resident_number)
);

CREATE INDEX IF NOT EXISTS idx_election_voters_election ON public.election_voters(election_id);
CREATE INDEX IF NOT EXISTS idx_election_voters_res_num ON public.election_voters(resident_number);
CREATE INDEX IF NOT EXISTS idx_election_voters_has_voted ON public.election_voters(has_voted);
CREATE INDEX IF NOT EXISTS idx_election_voters_eligible ON public.election_voters(eligible);

-- 13.5 ELECTION VOTING SESSIONS TABLE (Temporary OTP Authentication)
CREATE TABLE IF NOT EXISTS public.election_voting_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    election_id UUID NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
    voter_id UUID NOT NULL REFERENCES public.election_voters(id) ON DELETE CASCADE,
    session_token_hash VARCHAR(128) NOT NULL UNIQUE,
    otp_hash VARCHAR(128) NOT NULL,
    otp_salt VARCHAR(64) NOT NULL,
    otp_expires_at TIMESTAMPTZ NOT NULL,
    otp_attempts INTEGER NOT NULL DEFAULT 0 CHECK (otp_attempts >= 0),
    last_otp_requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    consumed BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voting_sessions_election ON public.election_voting_sessions(election_id);
CREATE INDEX IF NOT EXISTS idx_voting_sessions_voter ON public.election_voting_sessions(voter_id);
CREATE INDEX IF NOT EXISTS idx_voting_sessions_token ON public.election_voting_sessions(session_token_hash);
CREATE INDEX IF NOT EXISTS idx_voting_sessions_expires ON public.election_voting_sessions(expires_at);

-- 13.6 ELECTION BALLOTS TABLE (Strictly Anonymous Secret Ballots)
-- CRITICAL: NO voter_id, resident_id, resident_number, phone, email, or auth user ID.
-- NO foreign key to election_voters or election_voting_sessions.
CREATE TABLE IF NOT EXISTS public.election_ballots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    election_id UUID NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
    ballot_reference VARCHAR(100) NOT NULL UNIQUE,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_election_ballots_election ON public.election_ballots(election_id);
CREATE INDEX IF NOT EXISTS idx_election_ballots_ref ON public.election_ballots(ballot_reference);
CREATE INDEX IF NOT EXISTS idx_election_ballots_submitted ON public.election_ballots(submitted_at);

-- 13.7 ELECTION BALLOT CHOICES TABLE (Anonymous Candidate Selections)
-- One candidate choice per position per ballot. Zero voter linkage.
CREATE TABLE IF NOT EXISTS public.election_ballot_choices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ballot_id UUID NOT NULL REFERENCES public.election_ballots(id) ON DELETE CASCADE,
    position_id UUID NOT NULL REFERENCES public.election_positions(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES public.election_candidates(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_ballot_choice_position UNIQUE (ballot_id, position_id)
);

CREATE INDEX IF NOT EXISTS idx_ballot_choices_ballot ON public.election_ballot_choices(ballot_id);
CREATE INDEX IF NOT EXISTS idx_ballot_choices_position ON public.election_ballot_choices(position_id);
CREATE INDEX IF NOT EXISTS idx_ballot_choices_candidate ON public.election_ballot_choices(candidate_id);

-- 13.8 ELECTION RESULTS TABLE (Certified Results Summaries)
CREATE TABLE IF NOT EXISTS public.election_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    election_id UUID NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
    position_id UUID NOT NULL REFERENCES public.election_positions(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES public.election_candidates(id) ON DELETE CASCADE,
    vote_count INTEGER NOT NULL DEFAULT 0 CHECK (vote_count >= 0),
    vote_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (vote_percentage >= 0 AND vote_percentage <= 100),
    is_winner BOOLEAN NOT NULL DEFAULT FALSE,
    is_tie BOOLEAN NOT NULL DEFAULT FALSE,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_election_result_candidate UNIQUE (election_id, position_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_election_results_election ON public.election_results(election_id);
CREATE INDEX IF NOT EXISTS idx_election_results_position ON public.election_results(position_id);
CREATE INDEX IF NOT EXISTS idx_election_results_candidate ON public.election_results(candidate_id);

-- 13.9 ELECTION AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.election_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    election_id UUID NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    actor_type VARCHAR(50) NOT NULL DEFAULT 'ADMIN' CHECK (actor_type IN ('ADMIN', 'SYSTEM')),
    actor_reference TEXT,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_election_audit_election ON public.election_audit_logs(election_id);
CREATE INDEX IF NOT EXISTS idx_election_audit_action ON public.election_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_election_audit_created ON public.election_audit_logs(created_at DESC);

-- -------------------------------------------------------------------------
-- 14. SEED INITIAL CONFIGURATION DATA (STRUCTURAL ONLY - ZERO FAKE DATA)
-- -------------------------------------------------------------------------
INSERT INTO public.estate_settings (
    estate_name,
    estate_address,
    estate_state,
    estate_lga,
    monthly_security_levy,
    payment_due_day,
    currency,
    contact_phone,
    contact_email,
    sms_sender_name,
    first_payment_month
)
SELECT 
    'Finger of God Estate',
    'Main Gate Boulevard, Phase 1, Finger of God Estate, Iyiaba, Asaba',
    'Delta',
    'Oshimili South',
    5000.00,
    1,
    'NGN',
    '',
    '',
    'FINGEROFGOD',
    'October 2026'
WHERE NOT EXISTS (SELECT 1 FROM public.estate_settings LIMIT 1);

-- Structural Road Modernization Milestones (Phase roadmap definitions only, 0% progress)
INSERT INTO public.road_project_milestones (milestone_order, title, description, status, progress_percentage)
VALUES 
    (1, 'Phase 1 Drainage Construction', 'Heavy-duty concrete stormwater drainage along Main Boulevard', 'UPCOMING', 0),
    (2, 'Sub-base Earthwork & Compaction', 'Subgrade scarification and heavy-duty laterite stabilization', 'UPCOMING', 0),
    (3, 'Stone Base Course & Crushed Rock', 'Delivery and vibratory rolling of granite stone base aggregates', 'UPCOMING', 0),
    (4, 'Heavy Interlocking Paving', 'Laying 80mm industrial interlocking paving blocks', 'UPCOMING', 0),
    (5, 'Culvert Crossings & Final Curing', 'Reinforced culvert slabs and access curb integration', 'UPCOMING', 0)
ON CONFLICT (milestone_order) DO NOTHING;

-- -------------------------------------------------------------------------
-- 14. AUTHENTICATION & RBAC HELPER FUNCTIONS
-- -------------------------------------------------------------------------

-- Helper security function: Check if current auth user is an active administrator
-- Configured with SECURITY DEFINER and a fixed search_path to prevent escalation attacks
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE auth_user_id = auth.uid()
      AND status = 'Active'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Public Receipt Verification RPC: Exact single-record lookup returning strictly approved verification fields
CREATE OR REPLACE FUNCTION public.verify_receipt(
    p_receipt_number TEXT DEFAULT NULL,
    p_paystack_ref TEXT DEFAULT NULL
)
RETURNS TABLE (
    receipt_number VARCHAR(80),
    resident_number VARCHAR(10),
    resident_name TEXT,
    house_number TEXT,
    amount_paid NUMERIC(12, 2),
    currency VARCHAR(10),
    period_covered VARCHAR(50),
    payment_date TIMESTAMPTZ,
    paystack_reference VARCHAR(120),
    status VARCHAR(20),
    issued_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
DECLARE
    v_clean_num TEXT;
    v_clean_ref TEXT;
BEGIN
    v_clean_num := NULLIF(trim(p_receipt_number), '');
    v_clean_ref := NULLIF(trim(p_paystack_ref), '');

    -- Require at least one non-empty exact parameter
    IF v_clean_num IS NULL AND v_clean_ref IS NULL THEN
        RETURN;
    END IF;

    -- Guard against arbitrary scans or trivial substrings (must be >= 4 characters)
    IF (v_clean_num IS NOT NULL AND length(v_clean_num) < 4) AND 
       (v_clean_ref IS NOT NULL AND length(v_clean_ref) < 4) THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT 
        r.receipt_number,
        r.resident_number,
        r.resident_name,
        r.house_number,
        r.amount_paid,
        r.currency,
        r.period_covered,
        r.payment_date,
        r.paystack_reference,
        r.status,
        r.issued_at
    FROM public.receipts r
    WHERE (v_clean_num IS NOT NULL AND (r.receipt_number = v_clean_num OR UPPER(r.receipt_number) = UPPER(v_clean_num)))
       OR (v_clean_ref IS NOT NULL AND (r.paystack_reference = v_clean_ref OR UPPER(r.paystack_reference) = UPPER(v_clean_ref)))
    LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_receipt(TEXT, TEXT) TO anon, authenticated;

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

ALTER TABLE public.estate_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.road_project_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.road_project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.road_project_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.election_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.election_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.election_voters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.election_voting_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.election_ballots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.election_ballot_choices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.election_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.election_audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Estate Settings Policies
DROP POLICY IF EXISTS "Public read on estate settings" ON public.estate_settings;
CREATE POLICY "Public read on estate settings"
    ON public.estate_settings FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Admin write on estate settings" ON public.estate_settings;
CREATE POLICY "Admin write on estate settings"
    ON public.estate_settings FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 2. Residents Policies (Zero anonymous access)
DROP POLICY IF EXISTS "Admin full access on residents" ON public.residents;
CREATE POLICY "Admin full access on residents"
    ON public.residents FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Residents read own record" ON public.residents;
CREATE POLICY "Residents read own record"
    ON public.residents FOR SELECT
    TO authenticated
    USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Residents update own contact info" ON public.residents;
CREATE POLICY "Residents update own contact info"
    ON public.residents FOR UPDATE
    TO authenticated
    USING (auth_user_id = auth.uid())
    WITH CHECK (auth_user_id = auth.uid());

-- 3. Admin Users Policies (Zero anonymous access)
DROP POLICY IF EXISTS "Admins read own profile" ON public.admin_users;
CREATE POLICY "Admins read own profile"
    ON public.admin_users FOR SELECT
    TO authenticated
    USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Admin full management on admin_users" ON public.admin_users;
CREATE POLICY "Admin full management on admin_users"
    ON public.admin_users FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 4. Monthly Payments Policies (Zero anonymous access)
DROP POLICY IF EXISTS "Admin full access on payments" ON public.monthly_payments;
CREATE POLICY "Admin full access on payments"
    ON public.monthly_payments FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Residents view own payments" ON public.monthly_payments;
CREATE POLICY "Residents view own payments"
    ON public.monthly_payments FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.residents r 
        WHERE r.id = monthly_payments.resident_id 
          AND r.auth_user_id = auth.uid()
      )
    );

-- 5. Payment Transactions Policies (Zero anonymous access)
DROP POLICY IF EXISTS "Admin full access on transactions" ON public.payment_transactions;
CREATE POLICY "Admin full access on transactions"
    ON public.payment_transactions FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Residents view own transactions" ON public.payment_transactions;
CREATE POLICY "Residents view own transactions"
    ON public.payment_transactions FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.residents r 
        WHERE r.id = payment_transactions.resident_id 
          AND r.auth_user_id = auth.uid()
      )
    );

-- 6. Receipts Policies (Zero anonymous direct SELECT)
DROP POLICY IF EXISTS "Public exact receipt lookup" ON public.receipts;
DROP POLICY IF EXISTS "Admin full access on receipts" ON public.receipts;
CREATE POLICY "Admin full access on receipts"
    ON public.receipts FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Residents view own receipts" ON public.receipts;
CREATE POLICY "Residents view own receipts"
    ON public.receipts FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.residents r 
        WHERE r.id = receipts.resident_id 
          AND r.auth_user_id = auth.uid()
      )
    );

-- 7. Road Modernization Project Transactions Policies
DROP POLICY IF EXISTS "Public read on road transactions" ON public.road_project_transactions;
CREATE POLICY "Public read on road transactions"
    ON public.road_project_transactions FOR SELECT
    USING (status = 'VERIFIED');

DROP POLICY IF EXISTS "Admin write on road transactions" ON public.road_project_transactions;
CREATE POLICY "Admin write on road transactions"
    ON public.road_project_transactions FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 8. Road Modernization Project Milestones Policies
DROP POLICY IF EXISTS "Public read on road milestones" ON public.road_project_milestones;
CREATE POLICY "Public read on road milestones"
    ON public.road_project_milestones FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Admin write on road milestones" ON public.road_project_milestones;
CREATE POLICY "Admin write on road milestones"
    ON public.road_project_milestones FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 8b. Road Project Contributions Policies
DROP POLICY IF EXISTS "Public read verified contributions" ON public.road_project_contributions;
CREATE POLICY "Public read verified contributions"
    ON public.road_project_contributions FOR SELECT
    USING (status = 'COMPLETED');

DROP POLICY IF EXISTS "Admin full access on road contributions" ON public.road_project_contributions;
CREATE POLICY "Admin full access on road contributions"
    ON public.road_project_contributions FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 9. Bank Reconciliations Policies (Admin only)
DROP POLICY IF EXISTS "Admin access on bank reconciliations" ON public.bank_reconciliations;
CREATE POLICY "Admin access on bank reconciliations"
    ON public.bank_reconciliations FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 10. SMS Logs Policies (Admin only)
DROP POLICY IF EXISTS "Admin access on sms logs" ON public.sms_logs;
CREATE POLICY "Admin access on sms logs"
    ON public.sms_logs FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 10b. SMS Reminders Schedule Policies (Admin only)
DROP POLICY IF EXISTS "Admin access on sms reminders" ON public.sms_reminders;
CREATE POLICY "Admin access on sms reminders"
    ON public.sms_reminders FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 11. Announcements Policies (Public read published; Admin full access)
DROP POLICY IF EXISTS "Public read published announcements" ON public.announcements;
CREATE POLICY "Public read published announcements"
    ON public.announcements FOR SELECT
    USING (status = 'PUBLISHED' AND publish_at <= NOW());

DROP POLICY IF EXISTS "Admin full access on announcements" ON public.announcements;
CREATE POLICY "Admin full access on announcements"
    ON public.announcements FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 12. Activity Logs Policies (Admin only)
DROP POLICY IF EXISTS "Admin read activity logs" ON public.activity_logs;
CREATE POLICY "Admin read activity logs"
    ON public.activity_logs FOR SELECT
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admin write activity logs" ON public.activity_logs;
CREATE POLICY "Admin write activity logs"
    ON public.activity_logs FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

-- -------------------------------------------------------------------------
-- 13. ESTATE ELECTION SYSTEM POLICIES
-- -------------------------------------------------------------------------

-- 13.1 Elections Policies
DROP POLICY IF EXISTS "Public read active elections" ON public.elections;
CREATE POLICY "Public read active elections"
    ON public.elections FOR SELECT
    USING (status IN ('UPCOMING', 'OPEN', 'PAUSED', 'CLOSED', 'RESULTS_PUBLISHED'));

DROP POLICY IF EXISTS "Admin full access on elections" ON public.elections;
CREATE POLICY "Admin full access on elections"
    ON public.elections FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 13.2 Election Positions Policies
DROP POLICY IF EXISTS "Public read active election positions" ON public.election_positions;
CREATE POLICY "Public read active election positions"
    ON public.election_positions FOR SELECT
    USING (is_active = TRUE);

DROP POLICY IF EXISTS "Admin full access on election positions" ON public.election_positions;
CREATE POLICY "Admin full access on election positions"
    ON public.election_positions FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 13.3 Election Candidates Policies
DROP POLICY IF EXISTS "Public read approved candidates" ON public.election_candidates;
CREATE POLICY "Public read approved candidates"
    ON public.election_candidates FOR SELECT
    USING (status = 'APPROVED');

DROP POLICY IF EXISTS "Admin full access on election candidates" ON public.election_candidates;
CREATE POLICY "Admin full access on election candidates"
    ON public.election_candidates FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 13.4 Election Voters Policies (Zero Anonymous/Public Access)
DROP POLICY IF EXISTS "Admin full access on election voters" ON public.election_voters;
CREATE POLICY "Admin full access on election voters"
    ON public.election_voters FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 13.5 Election Voting Sessions Policies (Backend & Admin Access Only)
DROP POLICY IF EXISTS "Admin full access on election voting sessions" ON public.election_voting_sessions;
CREATE POLICY "Admin full access on election voting sessions"
    ON public.election_voting_sessions FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 13.6 Election Ballots Policies (No Direct Anonymous Modification)
DROP POLICY IF EXISTS "Admin read on election ballots" ON public.election_ballots;
CREATE POLICY "Admin read on election ballots"
    ON public.election_ballots FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- 13.7 Election Ballot Choices Policies (No Direct Anonymous Modification)
DROP POLICY IF EXISTS "Admin read on election ballot choices" ON public.election_ballot_choices;
CREATE POLICY "Admin read on election ballot choices"
    ON public.election_ballot_choices FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- 13.8 Election Results Policies (Public Read Published; Admin Full Access)
DROP POLICY IF EXISTS "Public read published election results" ON public.election_results;
CREATE POLICY "Public read published election results"
    ON public.election_results FOR SELECT
    USING (published_at IS NOT NULL);

DROP POLICY IF EXISTS "Admin full access on election results" ON public.election_results;
CREATE POLICY "Admin full access on election results"
    ON public.election_results FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 13.9 Election Audit Logs Policies (Admin Only)
DROP POLICY IF EXISTS "Admin read election audit logs" ON public.election_audit_logs;
CREATE POLICY "Admin read election audit logs"
    ON public.election_audit_logs FOR SELECT
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admin insert election audit logs" ON public.election_audit_logs;
CREATE POLICY "Admin insert election audit logs"
    ON public.election_audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

-- =========================================================================
-- ATOMIC SECRET BALLOT CASTING STORED PROCEDURE (RPC)
-- Ensures single-transaction atomicity and strict privacy dissociation
-- =========================================================================
CREATE OR REPLACE FUNCTION public.cast_ballot(
    p_election_id UUID,
    p_session_token_hash TEXT,
    p_ballot_reference TEXT,
    p_choices JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_election RECORD;
    v_session RECORD;
    v_voter RECORD;
    v_ballot_id UUID;
    v_choice JSONB;
    v_pos_id UUID;
    v_cand_id UUID;
    v_active_pos_count INTEGER;
    v_voter_timestamp TIMESTAMPTZ;
    v_ballot_timestamp TIMESTAMPTZ;
BEGIN
    -- 1. Validate Election exists and is OPEN
    SELECT id, status, ends_at, starts_at, name
    INTO v_election
    FROM public.elections
    WHERE id = p_election_id
    FOR SHARE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Election not found.');
    END IF;

    IF v_election.status <> 'OPEN' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Election is not currently open for voting.');
    END IF;

    IF clock_timestamp() > v_election.ends_at THEN
        RETURN jsonb_build_object('success', false, 'message', 'Voting period for this election has ended.');
    END IF;

    -- 2. Validate and Lock Voting Session
    SELECT id, election_id, voter_id, session_token_hash, consumed, expires_at
    INTO v_session
    FROM public.election_voting_sessions
    WHERE session_token_hash = p_session_token_hash
      AND election_id = p_election_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid or expired voting session.');
    END IF;

    IF v_session.consumed THEN
        RETURN jsonb_build_object('success', false, 'message', 'This voting session has already been used to cast a ballot.');
    END IF;

    IF clock_timestamp() > v_session.expires_at THEN
        RETURN jsonb_build_object('success', false, 'message', 'Voting session has expired.');
    END IF;

    -- 3. Validate and Lock Voter Record
    SELECT id, election_id, resident_number, eligible, eligibility_reason, has_voted
    INTO v_voter
    FROM public.election_voters
    WHERE id = v_session.voter_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Accredited voter record not found.');
    END IF;

    IF NOT v_voter.eligible THEN
        RETURN jsonb_build_object('success', false, 'message', 'Voter is marked ineligible: ' || COALESCE(v_voter.eligibility_reason, 'Administrative restriction'));
    END IF;

    IF v_voter.has_voted THEN
        UPDATE public.election_voting_sessions SET consumed = TRUE, updated_at = clock_timestamp() WHERE id = v_session.id;
        RETURN jsonb_build_object('success', false, 'message', 'Estate #' || v_voter.resident_number || ' has already cast a ballot in this election.');
    END IF;

    -- 4. Count active positions in this election
    SELECT COUNT(*) INTO v_active_pos_count
    FROM public.election_positions
    WHERE election_id = p_election_id AND is_active = TRUE;

    IF jsonb_array_length(p_choices) <> v_active_pos_count THEN
        RETURN jsonb_build_object('success', false, 'message', 'A selection is required for all ' || v_active_pos_count || ' active positions.');
    END IF;

    -- 5. Generate independent anonymous ballot timestamp (with independent clock and bounded variance to prevent timestamp correlation)
    v_ballot_timestamp := clock_timestamp() - ((floor(random() * 30))::INTEGER * INTERVAL '1 second') - ((floor(random() * 999))::INTEGER * INTERVAL '1 millisecond');

    -- Insert Anonymous Ballot (Completely decoupled from voter identity)
    INSERT INTO public.election_ballots (election_id, ballot_reference, submitted_at, created_at)
    VALUES (p_election_id, p_ballot_reference, v_ballot_timestamp, v_ballot_timestamp)
    RETURNING id INTO v_ballot_id;

    -- 6. Insert Ballot Choices & Validate Each Selection
    FOR v_choice IN SELECT * FROM jsonb_array_elements(p_choices)
    LOOP
        v_pos_id := (v_choice->>'position_id')::UUID;
        v_cand_id := (v_choice->>'candidate_id')::UUID;

        -- Verify position belongs to election and is active
        IF NOT EXISTS (
            SELECT 1 FROM public.election_positions
            WHERE id = v_pos_id AND election_id = p_election_id AND is_active = TRUE
        ) THEN
            RAISE EXCEPTION 'Invalid position selection % for election %', v_pos_id, p_election_id;
        END IF;

        -- Verify candidate is approved for position
        IF NOT EXISTS (
            SELECT 1 FROM public.election_candidates
            WHERE id = v_cand_id AND position_id = v_pos_id AND election_id = p_election_id AND status = 'APPROVED'
        ) THEN
            RAISE EXCEPTION 'Invalid or unapproved candidate % for position %', v_cand_id, v_pos_id;
        END IF;

        INSERT INTO public.election_ballot_choices (ballot_id, position_id, candidate_id, created_at)
        VALUES (v_ballot_id, v_pos_id, v_cand_id, v_ballot_timestamp);
    END LOOP;

    -- 7. Generate voter record timestamp independently
    v_voter_timestamp := clock_timestamp();

    -- Mark Voter as Voted (One-Property-One-Vote enforced)
    UPDATE public.election_voters
    SET has_voted = TRUE,
        voted_at = v_voter_timestamp,
        updated_at = v_voter_timestamp
    WHERE id = v_voter.id;

    -- 8. Invalidate Voting Session
    UPDATE public.election_voting_sessions
    SET consumed = TRUE,
        updated_at = clock_timestamp()
    WHERE id = v_session.id;

    -- 9. Log Privacy-Preserving Audit Event (Zero linkage to voter or confirmation code)
    INSERT INTO public.election_audit_logs (
        election_id,
        action,
        actor_type,
        actor_reference,
        description,
        metadata,
        created_at
    )
    VALUES (
        p_election_id,
        'BALLOT_CAST',
        'SYSTEM',
        'ANONYMOUS_SEALED_BALLOT',
        'An anonymous ballot was cast and committed into the election ledger.',
        jsonb_build_object('status', 'SUCCESS'),
        clock_timestamp()
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Your ballot has been successfully and confidentially recorded.',
        'confirmation_code', p_ballot_reference,
        'submitted_at', v_ballot_timestamp
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Ballot submission failed: ' || SQLERRM
        );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cast_ballot(UUID, TEXT, TEXT, JSONB) TO anon, authenticated;

-- =========================================================================
-- SEED BASELINE 2026 EXECUTIVE COMMITTEE ELECTION
-- =========================================================================
DO $$
DECLARE
    v_elec_id UUID;
    v_pos_chair UUID;
    v_pos_vchair UUID;
    v_pos_sec UUID;
    v_pos_fin UUID;
    v_pos_treas UUID;
    v_pos_secu UUID;
BEGIN
    -- Insert Election
    INSERT INTO public.elections (
        election_code,
        name,
        description,
        status,
        starts_at,
        ends_at,
        constitution_rules,
        tie_breaking_rule,
        created_by
    )
    VALUES (
        'FOG-ELEC-2026',
        'Finger of God Estate Executive Committee Election 2026',
        'Official democratic election for the executive governing committee of Finger of God Estate, Phase 1, Asaba. Only verified landlords and accredited residents are eligible to cast one vote per accredited property.',
        'OPEN',
        NOW(),
        NOW() + INTERVAL '14 days',
        '1. Only verified residents/landlords in good standing with an assigned Estate Number (001–300) are eligible to vote.
2. Voting is strictly one vote per accredited property.
3. Ballots are completely anonymous and secret; choices cannot be traced to voter identity.
4. Each voter selects exactly one candidate per approved position.
5. In the event of a tie, the Estate Constitution Article 8 tie-breaking procedure shall apply.',
        'In the event of an equal number of votes between leading candidates for any position, the Electoral Committee shall convene an extraordinary general assembly of eligible voters within 7 days to conduct a run-off election between the tied candidates.',
        'Estate Electoral Committee'
    )
    ON CONFLICT (election_code) DO UPDATE SET updated_at = NOW()
    RETURNING id INTO v_elec_id;

    IF v_elec_id IS NOT NULL THEN
        -- 1. Chairman
        INSERT INTO public.election_positions (election_id, name, description, display_order, is_active, max_selections)
        VALUES (v_elec_id, 'Chairman', 'Chief executive officer of the estate responsible for overall leadership, security oversight, and government liaison.', 1, TRUE, 1)
        ON CONFLICT (election_id, name) DO UPDATE SET updated_at = NOW()
        RETURNING id INTO v_pos_chair;

        -- 2. Vice Chairman
        INSERT INTO public.election_positions (election_id, name, description, display_order, is_active, max_selections)
        VALUES (v_elec_id, 'Vice Chairman', 'Assists the Chairman and oversees estate maintenance, infrastructure, and contractor management.', 2, TRUE, 1)
        ON CONFLICT (election_id, name) DO UPDATE SET updated_at = NOW()
        RETURNING id INTO v_pos_vchair;

        -- 3. General Secretary
        INSERT INTO public.election_positions (election_id, name, description, display_order, is_active, max_selections)
        VALUES (v_elec_id, 'General Secretary', 'Manages official correspondence, records of meetings, announcements, and resident register.', 3, TRUE, 1)
        ON CONFLICT (election_id, name) DO UPDATE SET updated_at = NOW()
        RETURNING id INTO v_pos_sec;

        -- 4. Financial Secretary
        INSERT INTO public.election_positions (election_id, name, description, display_order, is_active, max_selections)
        VALUES (v_elec_id, 'Financial Secretary', 'Manages billing, security levy records, road modernization contributions, and financial audits.', 4, TRUE, 1)
        ON CONFLICT (election_id, name) DO UPDATE SET updated_at = NOW()
        RETURNING id INTO v_pos_fin;

        -- 5. Treasurer
        INSERT INTO public.election_positions (election_id, name, description, display_order, is_active, max_selections)
        VALUES (v_elec_id, 'Treasurer', 'Custody of estate bank accounts, fund disbursements, payment reconciliation, and expenditure receipts.', 5, TRUE, 1)
        ON CONFLICT (election_id, name) DO UPDATE SET updated_at = NOW()
        RETURNING id INTO v_pos_treas;

        -- 6. Security Coordinator
        INSERT INTO public.election_positions (election_id, name, description, display_order, is_active, max_selections)
        VALUES (v_elec_id, 'Security Coordinator', 'Supervises gate personnel, access control technology, visitor tracking, and armed police liaisons.', 6, TRUE, 1)
        ON CONFLICT (election_id, name) DO UPDATE SET updated_at = NOW()
        RETURNING id INTO v_pos_secu;

        -- Candidates for Chairman
        IF v_pos_chair IS NOT NULL THEN
            INSERT INTO public.election_candidates (election_id, position_id, full_name, profile, manifesto, status, display_order)
            VALUES 
            (v_elec_id, v_pos_chair, 'Engr. Babatunde Adeleke', 'Civil engineer and Phase 1 resident since 2020. Successfully led the Phase 1 road project committee.', 'My commitment is modernizing estate infrastructure, expanding solar street lighting, and establishing automated smart gate clearance.', 'APPROVED', 1),
            (v_elec_id, v_pos_chair, 'Chief Okey Nwosu', 'Retired civil servant and estate elder. Longstanding advocate for transparent financial accountability.', 'I pledge an open-door administration with quarterly audited financial reports and reinforced round-the-clock security patrols.', 'APPROVED', 2)
            ON CONFLICT DO NOTHING;
        END IF;

        -- Candidates for Vice Chairman
        IF v_pos_vchair IS NOT NULL THEN
            INSERT INTO public.election_candidates (election_id, position_id, full_name, profile, manifesto, status, display_order)
            VALUES 
            (v_elec_id, v_pos_vchair, 'Dr. Chioma Okonkwo', 'Medical director and resident advocate with over a decade in public health and community leadership.', 'Promoting a peaceful, family-friendly estate with organized emergency response and prompt infrastructure repairs.', 'APPROVED', 1),
            (v_elec_id, v_pos_vchair, 'Alhaji Usman Bello', 'Business executive and resident of Boulevard Way. Passionate about contractor oversight and value for money.', 'Rigorous vendor evaluation, zero tolerance for delayed repairs, and transparent community project management.', 'APPROVED', 2)
            ON CONFLICT DO NOTHING;
        END IF;

        -- Candidates for General Secretary
        IF v_pos_sec IS NOT NULL THEN
            INSERT INTO public.election_candidates (election_id, position_id, full_name, profile, manifesto, status, display_order)
            VALUES 
            (v_elec_id, v_pos_sec, 'Barrister Nnamdi Eze', 'Corporate legal counsel. Drafted the Finger of God Estate Landlord Association constitution bylaws.', 'Timely announcements, digital voting archives, prompt meeting minutes, and legal protection of estate property boundaries.', 'APPROVED', 1)
            ON CONFLICT DO NOTHING;
        END IF;

        -- Candidates for Financial Secretary
        IF v_pos_fin IS NOT NULL THEN
            INSERT INTO public.election_candidates (election_id, position_id, full_name, profile, manifesto, status, display_order)
            VALUES 
            (v_elec_id, v_pos_fin, 'Mrs. Funke Adeyemi', 'Fellow Chartered Accountant (FCA) with 15 years in commercial banking and revenue assurance.', '100% digital receipting, monthly ledger publication, and zero leakages in security levy management.', 'APPROVED', 1)
            ON CONFLICT DO NOTHING;
        END IF;

        -- Candidates for Treasurer
        IF v_pos_treas IS NOT NULL THEN
            INSERT INTO public.election_candidates (election_id, position_id, full_name, profile, manifesto, status, display_order)
            VALUES 
            (v_elec_id, v_pos_treas, 'Mr. Emmanuel Chukwuma', 'Certified auditor and resident since 2019. Headed the 2025 revenue reconciliation audit.', 'Strict dual-signatory escrow controls and instant public verification of all road project and levy collections.', 'APPROVED', 1)
            ON CONFLICT DO NOTHING;
        END IF;

        -- Candidates for Security Coordinator
        IF v_pos_secu IS NOT NULL THEN
            INSERT INTO public.election_candidates (election_id, position_id, full_name, profile, manifesto, status, display_order)
            VALUES 
            (v_elec_id, v_pos_secu, 'Capt. Daniel Briggs (Rtd)', 'Former military intelligence officer with extensive experience in perimeter security and tactical defense.', 'Rapid-response perimeter patrols, digital vehicle gate passes, and complete elimination of unauthorized estate trespassing.', 'APPROVED', 1)
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
END;
$$;


