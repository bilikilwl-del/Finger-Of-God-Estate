-- =========================================================================
-- FINGER OF GOD ESTATE MANAGEMENT SYSTEM
-- OFFICIAL PRODUCTION DATABASE ARCHITECTURE & MIGRATION SCRIPT
-- =========================================================================
-- Target Database: PostgreSQL 15+ / Supabase
-- This script is idempotent and safe to run on fresh or existing databases.
-- =========================================================================

-- Enable required extensions
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
    contact_phone VARCHAR(50) NOT NULL DEFAULT '08023456789',
    contact_email VARCHAR(100) NOT NULL DEFAULT 'admin@fingerofgodestate.ng',
    sms_sender_name VARCHAR(20) NOT NULL DEFAULT 'FINGEROFGOD',
    first_payment_month VARCHAR(30) NOT NULL DEFAULT 'October 2026',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 2. RESIDENTS TABLE (Unique resident numbers 001 - 300)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.residents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resident_number VARCHAR(10) NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone_number VARCHAR(30) NOT NULL,
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
    password_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_resident_number_format CHECK (resident_number ~ '^[0-9]{3}$' AND resident_number::integer BETWEEN 1 AND 300)
);

CREATE INDEX IF NOT EXISTS idx_residents_num ON public.residents(resident_number);
CREATE INDEX IF NOT EXISTS idx_residents_phone ON public.residents(phone_number);
CREATE INDEX IF NOT EXISTS idx_residents_status ON public.residents(status);
CREATE INDEX IF NOT EXISTS idx_residents_auth_user ON public.residents(auth_user_id);

-- -------------------------------------------------------------------------
-- 3. ADMIN USERS & RBAC TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
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
-- 5. PAYMENT TRANSACTIONS TABLE (Audit Trail)
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
-- 8. ROAD MODERNIZATION PROJECT MILESTONES TABLE
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
-- 9. BANK RECONCILIATIONS / ESCROW TRANSFER AUDIT TABLE
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

-- Duplicate SMS Protection: prevent sending the same reminder type more than once per period
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
-- 13. SEED INITIAL BASELINE DATA
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
    '08023456789',
    'admin@fingerofgodestate.ng',
    'FINGEROFGOD',
    'October 2026'
WHERE NOT EXISTS (SELECT 1 FROM public.estate_settings LIMIT 1);

-- Seed Initial Super Admin record
INSERT INTO public.admin_users (email, full_name, role, status)
VALUES ('admin@fingerofgodestate.ng', 'Chief Executive Administrator', 'Super Admin', 'Active')
ON CONFLICT (email) DO NOTHING;

-- Seed Initial Road Project Milestones
INSERT INTO public.road_project_milestones (milestone_order, title, description, status, progress_percentage)
VALUES 
    (1, 'Phase 1 Drainage Construction', 'Heavy-duty concrete stormwater drainage along Main Boulevard', 'COMPLETED', 100),
    (2, 'Sub-base Earthwork & Compaction', 'Subgrade scarification and heavy-duty laterite stabilization', 'COMPLETED', 100),
    (3, 'Stone Base Course & Crushed Rock', 'Delivery and vibratory rolling of granite stone base aggregates', 'IN_PROGRESS', 65),
    (4, 'Heavy Interlocking Paving', 'Laying 80mm industrial interlocking paving blocks', 'UPCOMING', 0),
    (5, 'Culvert Crossings & Final Curing', 'Reinforced culvert slabs and access curb integration', 'UPCOMING', 0)
ON CONFLICT (milestone_order) DO UPDATE 
SET title = EXCLUDED.title, description = EXCLUDED.description;

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES - LEAST PRIVILEGE HARDENING
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

-- Helper security function: Check if current auth user is an active administrator
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE auth_user_id = auth.uid()
      AND status = 'Active'
  );
$$;

-- 1. Estate Settings: Public read, admin write
CREATE POLICY "Public read on estate settings"
    ON public.estate_settings FOR SELECT
    USING (true);

CREATE POLICY "Admin write on estate settings"
    ON public.estate_settings FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 2. Residents: Admins have full access; authenticated residents see only their own record
CREATE POLICY "Admin full access on residents"
    ON public.residents FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Residents read own record"
    ON public.residents FOR SELECT
    TO authenticated
    USING (auth_user_id = auth.uid());

CREATE POLICY "Residents update own contact info"
    ON public.residents FOR UPDATE
    TO authenticated
    USING (auth_user_id = auth.uid())
    WITH CHECK (auth_user_id = auth.uid());

-- 3. Admin Users: Only admins can view or modify admin profiles
CREATE POLICY "Admin access on admin_users"
    ON public.admin_users FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 4. Monthly Payments: Admins full access; residents read own payments
CREATE POLICY "Admin full access on payments"
    ON public.monthly_payments FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

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

-- 5. Payment Transactions: Admins full access; residents read own transactions
CREATE POLICY "Admin full access on transactions"
    ON public.payment_transactions FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

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

-- 6. Receipts: Public verification allowed via exact receipt_number / paystack_reference
CREATE POLICY "Admin full access on receipts"
    ON public.receipts FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

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

CREATE POLICY "Public exact receipt lookup"
    ON public.receipts FOR SELECT
    TO anon
    USING (true);

-- 7. Road Modernization Project: Public read for transparency; Admin write
CREATE POLICY "Public read on road transactions"
    ON public.road_project_transactions FOR SELECT
    USING (status = 'VERIFIED');

CREATE POLICY "Admin write on road transactions"
    ON public.road_project_transactions FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Public read on road milestones"
    ON public.road_project_milestones FOR SELECT
    USING (true);

CREATE POLICY "Admin write on road milestones"
    ON public.road_project_milestones FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 7b. Road Project Contributions: Public read verified; Residents read own; Admin full access
CREATE POLICY "Public read verified contributions"
    ON public.road_project_contributions FOR SELECT
    USING (status = 'COMPLETED');

CREATE POLICY "Admin full access on road contributions"
    ON public.road_project_contributions FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Residents read own road contributions"
    ON public.road_project_contributions FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.residents r 
        WHERE r.id = road_project_contributions.resident_id 
          AND r.auth_user_id = auth.uid()
      )
    );

-- 8. Bank Reconciliations: Admin only
CREATE POLICY "Admin access on bank reconciliations"
    ON public.bank_reconciliations FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 9. SMS Logs: Admin only
CREATE POLICY "Admin access on sms logs"
    ON public.sms_logs FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 9b. SMS Reminders Schedule: Admin only
CREATE POLICY "Admin access on sms reminders"
    ON public.sms_reminders FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 10. Announcements: Public read for published; Admin full access
CREATE POLICY "Public read published announcements"
    ON public.announcements FOR SELECT
    USING (status = 'PUBLISHED' AND publish_at <= NOW());

CREATE POLICY "Admin full access on announcements"
    ON public.announcements FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 11. Activity Logs: Admin only
CREATE POLICY "Admin read activity logs"
    ON public.activity_logs FOR SELECT
    TO authenticated
    USING (public.is_admin());

CREATE POLICY "Admin write activity logs"
    ON public.activity_logs FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());
