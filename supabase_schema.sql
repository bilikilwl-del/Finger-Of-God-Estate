-- =========================================================================
-- ESTATE SECURITY LEVY MANAGEMENT SYSTEM - SUPABASE DATABASE ARCHITECTURE
-- STAGE 1 & FUTURE STAGES RELATIONAL SCHEMA
-- =========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------------------------
-- 1. ESTATE SETTINGS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.estate_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    estate_name TEXT NOT NULL DEFAULT 'Palm Grove Residential Estate',
    estate_address TEXT NOT NULL DEFAULT 'Plot 10-14, Security Gate Avenue',
    estate_state TEXT NOT NULL DEFAULT 'Lagos',
    estate_lga TEXT NOT NULL DEFAULT 'Eti-Osa',
    monthly_security_levy NUMERIC(12, 2) NOT NULL DEFAULT 5000.00,
    payment_due_day INTEGER NOT NULL DEFAULT 1 CHECK (payment_due_day >= 1 AND payment_due_day <= 28),
    currency TEXT NOT NULL DEFAULT 'NGN',
    contact_phone TEXT NOT NULL DEFAULT '08012345678',
    contact_email TEXT NOT NULL DEFAULT 'admin@palmgroveestate.ng',
    sms_sender_name TEXT NOT NULL DEFAULT 'PALMGROVE',
    first_payment_month TEXT NOT NULL DEFAULT 'October 2026',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 2. RESIDENTS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.residents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resident_number VARCHAR(20) NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone_number VARCHAR(30) NOT NULL,
    email TEXT,
    house_number TEXT NOT NULL,
    address TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'Lagos',
    lga TEXT NOT NULL DEFAULT 'Eti-Osa',
    registration_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_residents_number ON public.residents(resident_number);
CREATE INDEX IF NOT EXISTS idx_residents_status ON public.residents(status);
CREATE INDEX IF NOT EXISTS idx_residents_phone ON public.residents(phone_number);

-- -------------------------------------------------------------------------
-- 3. ADMIN USERS & ROLES TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role VARCHAR(30) NOT NULL DEFAULT 'Administrator' CHECK (role IN ('Super Admin', 'Administrator', 'Security Officer', 'Accountant')),
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 4. MONTHLY PAYMENTS TABLE (Ready for Stage 2)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.monthly_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
    period_month INTEGER NOT NULL CHECK (period_month >= 1 AND period_month <= 12),
    period_year INTEGER NOT NULL CHECK (period_year >= 2026),
    period_label VARCHAR(30) NOT NULL, -- e.g. "October 2026"
    amount_due NUMERIC(12, 2) NOT NULL DEFAULT 5000.00,
    amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'Unpaid' CHECK (status IN ('Paid', 'Unpaid', 'Partially Paid', 'Overdue')),
    due_date DATE NOT NULL,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_resident_period UNIQUE (resident_id, period_month, period_year)
);

CREATE INDEX IF NOT EXISTS idx_payments_resident ON public.monthly_payments(resident_id);
CREATE INDEX IF NOT EXISTS idx_payments_period ON public.monthly_payments(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.monthly_payments(status);

-- -------------------------------------------------------------------------
-- 5. PAYMENT TRANSACTIONS TABLE (Ready for Stage 2 & Paystack)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID REFERENCES public.monthly_payments(id) ON DELETE SET NULL,
    resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
    transaction_reference VARCHAR(100) NOT NULL UNIQUE,
    paystack_reference VARCHAR(100) UNIQUE,
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
    payment_method VARCHAR(30) NOT NULL DEFAULT 'Paystack' CHECK (payment_method IN ('Paystack', 'Bank Transfer', 'Cash', 'POS', 'Cheque')),
    status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Success', 'Pending', 'Failed', 'Abandoned')),
    channel_details JSONB DEFAULT '{}'::jsonb,
    created_by_admin UUID REFERENCES public.admin_users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tx_reference ON public.payment_transactions(transaction_reference);
CREATE INDEX IF NOT EXISTS idx_tx_paystack ON public.payment_transactions(paystack_reference);

-- -------------------------------------------------------------------------
-- 6. RECEIPTS TABLE (Ready for Future Stage)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_number VARCHAR(50) NOT NULL UNIQUE,
    transaction_id UUID REFERENCES public.payment_transactions(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES public.monthly_payments(id) ON DELETE CASCADE,
    resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
    amount_paid NUMERIC(12, 2) NOT NULL,
    period_covered TEXT NOT NULL,
    pdf_url TEXT,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 7. SMS REMINDERS & LOGS TABLE (Ready for Stage 3)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sms_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resident_id UUID REFERENCES public.residents(id) ON DELETE SET NULL,
    recipient_phone VARCHAR(30) NOT NULL,
    message_type VARCHAR(30) NOT NULL CHECK (message_type IN ('Payment Reminder', 'Receipt Alert', 'Overdue Notice', 'Broadcast Announcement')),
    message_content TEXT NOT NULL,
    sms_provider VARCHAR(30) DEFAULT 'Termii',
    message_id VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Sent', 'Delivered', 'Failed', 'Pending')),
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 8. ANNOUNCEMENTS TABLE (Ready for Future Stage)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'Normal' CHECK (priority IN ('Low', 'Normal', 'High', 'Emergency')),
    published_by TEXT NOT NULL DEFAULT 'Estate Admin',
    is_published BOOLEAN NOT NULL DEFAULT true,
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 9. ACTIVITY LOGS TABLE (Stage 1 Active)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_email TEXT NOT NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100),
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_created ON public.activity_logs(created_at DESC);

-- -------------------------------------------------------------------------
-- SEED INITIAL DEFAULT ESTATE SETTINGS (IF NOT EXISTS)
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
    'Palm Grove Residential Estate',
    'Plot 10-14, Security Gate Avenue, Phase 2',
    'Lagos',
    'Eti-Osa',
    5000.00,
    1,
    'NGN',
    '08012345678',
    'admin@palmgroveestate.ng',
    'PALMGROVE',
    'October 2026'
WHERE NOT EXISTS (SELECT 1 FROM public.estate_settings LIMIT 1);

-- -------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- -------------------------------------------------------------------------
ALTER TABLE public.estate_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Allow read/write for authenticated users (Admins)
CREATE POLICY "Allow all operations for authenticated users on estate_settings"
    ON public.estate_settings FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users on residents"
    ON public.residents FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users on admin_users"
    ON public.admin_users FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users on activity_logs"
    ON public.activity_logs FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users on payments"
    ON public.monthly_payments FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users on transactions"
    ON public.payment_transactions FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users on receipts"
    ON public.receipts FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users on sms_reminders"
    ON public.sms_reminders FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users on announcements"
    ON public.announcements FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Also allow anon read on estate_settings so initial landing works smoothly
CREATE POLICY "Allow public read on estate_settings"
    ON public.estate_settings FOR SELECT
    TO anon
    USING (true);
