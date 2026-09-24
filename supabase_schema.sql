-- =========================================================================
-- FINGER OF GOD ESTATE SECURITY MANAGEMENT - SUPABASE DATABASE ARCHITECTURE
-- STAGE 1 & STAGE 2 COMPREHENSIVE RELATIONAL SCHEMA
-- =========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------------------------
-- 1. ESTATE SETTINGS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.estate_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    estate_name TEXT NOT NULL DEFAULT 'Finger of God Estate Security Management',
    estate_address TEXT NOT NULL DEFAULT 'Main Gate Boulevard, Phase 1, Finger of God Estate',
    estate_state TEXT NOT NULL DEFAULT 'Lagos',
    estate_lga TEXT NOT NULL DEFAULT 'Eti-Osa',
    monthly_security_levy NUMERIC(12, 2) NOT NULL DEFAULT 5000.00,
    payment_due_day INTEGER NOT NULL DEFAULT 1 CHECK (payment_due_day >= 1 AND payment_due_day <= 28),
    currency TEXT NOT NULL DEFAULT 'NGN',
    contact_phone TEXT NOT NULL DEFAULT '08023456789',
    contact_email TEXT NOT NULL DEFAULT 'admin@fingerofgodestate.ng',
    sms_sender_name TEXT NOT NULL DEFAULT 'FINGEROFGOD',
    first_payment_month TEXT NOT NULL DEFAULT 'October 2026',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 2. RESIDENTS TABLE (STAGE 2 ENHANCED)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.residents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resident_number VARCHAR(20) NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone_number VARCHAR(30) NOT NULL,
    additional_phone VARCHAR(30),
    email TEXT,
    house_number TEXT NOT NULL,
    address TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'Lagos',
    lga TEXT NOT NULL DEFAULT 'Eti-Osa',
    notes TEXT,
    registration_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- In case table was already created in Stage 1, apply backward-compatible alterations:
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS additional_phone VARCHAR(30);
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS idx_residents_number ON public.residents(resident_number);
CREATE INDEX IF NOT EXISTS idx_residents_status ON public.residents(status);
CREATE INDEX IF NOT EXISTS idx_residents_phone ON public.residents(phone_number);
CREATE INDEX IF NOT EXISTS idx_residents_house ON public.residents(house_number);

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
-- 4. MONTHLY PAYMENTS TABLE (STAGE 4 PAYSTACK INTEGRATION)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.monthly_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
    resident_number VARCHAR(20) NOT NULL,
    period_month INTEGER NOT NULL CHECK (period_month >= 1 AND period_month <= 12),
    period_year INTEGER NOT NULL CHECK (period_year >= 2026),
    period_label VARCHAR(30) NOT NULL, -- e.g. "October 2026"
    amount_due NUMERIC(12, 2) NOT NULL DEFAULT 5000.00,
    amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'UNPAID' CHECK (status IN ('UNPAID', 'PENDING', 'PAID', 'FAILED', 'CANCELLED', 'Paid', 'Unpaid', 'Pending', 'Failed', 'Partially Paid', 'Overdue')),
    due_date DATE NOT NULL,
    paid_at TIMESTAMPTZ,
    paystack_reference VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_resident_period UNIQUE (resident_id, period_month, period_year)
);

CREATE INDEX IF NOT EXISTS idx_payments_resident ON public.monthly_payments(resident_id);
CREATE INDEX IF NOT EXISTS idx_payments_resident_num ON public.monthly_payments(resident_number);
CREATE INDEX IF NOT EXISTS idx_payments_period ON public.monthly_payments(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.monthly_payments(status);

-- -------------------------------------------------------------------------
-- 5. PAYMENT TRANSACTIONS TABLE (STAGE 4 PAYSTACK INTEGRATION)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID REFERENCES public.monthly_payments(id) ON DELETE SET NULL,
    resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
    resident_number VARCHAR(20) NOT NULL,
    period_month INTEGER NOT NULL DEFAULT 10,
    period_year INTEGER NOT NULL DEFAULT 2026,
    period_label VARCHAR(30) NOT NULL DEFAULT 'October 2026',
    transaction_reference VARCHAR(100) NOT NULL UNIQUE,
    paystack_reference VARCHAR(100) UNIQUE,
    paystack_transaction_id VARCHAR(100),
    amount_due NUMERIC(12, 2) NOT NULL DEFAULT 5000.00,
    amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
    payment_method VARCHAR(30) NOT NULL DEFAULT 'Paystack' CHECK (payment_method IN ('Paystack', 'Bank Transfer', 'Cash', 'POS', 'Cheque')),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('UNPAID', 'PENDING', 'PAID', 'FAILED', 'CANCELLED', 'Success', 'Pending', 'Failed', 'Abandoned')),
    payment_channel VARCHAR(50),
    payment_date TIMESTAMPTZ,
    gateway_response TEXT,
    customer_email TEXT,
    channel_details JSONB DEFAULT '{}'::jsonb,
    created_by_admin UUID REFERENCES public.admin_users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tx_reference ON public.payment_transactions(transaction_reference);
CREATE INDEX IF NOT EXISTS idx_tx_paystack ON public.payment_transactions(paystack_reference);
CREATE INDEX IF NOT EXISTS idx_tx_resident ON public.payment_transactions(resident_id);
CREATE INDEX IF NOT EXISTS idx_tx_resident_num ON public.payment_transactions(resident_number);
CREATE INDEX IF NOT EXISTS idx_tx_status ON public.payment_transactions(status);

-- -------------------------------------------------------------------------
-- 6. RECEIPTS TABLE (STAGE 4 PAYSTACK INTEGRATION)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_number VARCHAR(50) NOT NULL UNIQUE,
    transaction_id UUID REFERENCES public.payment_transactions(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES public.monthly_payments(id) ON DELETE CASCADE,
    resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
    resident_number VARCHAR(20) NOT NULL,
    resident_name TEXT NOT NULL,
    house_number TEXT NOT NULL,
    amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 5000.00,
    currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
    period_covered TEXT NOT NULL,
    payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paystack_reference VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PAID',
    pdf_url TEXT,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receipt_num ON public.receipts(receipt_number);
CREATE INDEX IF NOT EXISTS idx_receipt_ref ON public.receipts(paystack_reference);
CREATE INDEX IF NOT EXISTS idx_receipt_resident ON public.receipts(resident_id);

-- -------------------------------------------------------------------------
-- 7. SMS REMINDER LOGS TABLE (STAGE 5 ACTIVE)
-- Stores automated payment reminders, manual dispatches, delivery statuses,
-- and provider responses with duplicate prevention constraints.
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sms_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resident_id UUID REFERENCES public.residents(id) ON DELETE CASCADE,
    resident_number VARCHAR(20) NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    payment_month INTEGER NOT NULL CHECK (payment_month BETWEEN 1 AND 12),
    payment_year INTEGER NOT NULL CHECK (payment_year >= 2026),
    period_label VARCHAR(50) NOT NULL,
    reminder_type VARCHAR(30) NOT NULL CHECK (reminder_type IN ('REMINDER_1', 'REMINDER_2', 'TEST', 'MANUAL')),
    message TEXT NOT NULL,
    provider VARCHAR(50) NOT NULL DEFAULT 'termii',
    provider_message_id VARCHAR(100),
    delivery_status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (delivery_status IN ('SENT', 'DELIVERED', 'FAILED', 'PENDING', 'NOT_CONFIGURED')),
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Duplicate Protection Constraint:
-- Ensures Reminder 1 and Reminder 2 cannot be successfully sent more than once
-- to the same resident for the same monthly security levy period.
CREATE UNIQUE INDEX IF NOT EXISTS uq_sms_successful_reminder 
ON public.sms_logs (resident_id, payment_month, payment_year, reminder_type) 
WHERE (reminder_type IN ('REMINDER_1', 'REMINDER_2') AND delivery_status = 'SENT');

CREATE INDEX IF NOT EXISTS idx_sms_logs_resident ON public.sms_logs(resident_number);
CREATE INDEX IF NOT EXISTS idx_sms_logs_period ON public.sms_logs(payment_year, payment_month);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created ON public.sms_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON public.sms_logs(delivery_status);

-- Backward compatibility alias
CREATE TABLE IF NOT EXISTS public.sms_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resident_id UUID REFERENCES public.residents(id) ON DELETE SET NULL,
    recipient_phone VARCHAR(30) NOT NULL,
    message_type VARCHAR(30) NOT NULL DEFAULT 'Payment Reminder',
    message_content TEXT NOT NULL,
    sms_provider VARCHAR(30) DEFAULT 'Termii',
    message_id VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'Pending',
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
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;
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

CREATE POLICY "Allow all operations for authenticated users on sms_logs"
    ON public.sms_logs FOR ALL
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

-- Allow residents to view their own verified receipts by reference
CREATE POLICY "Allow public read on receipts"
    ON public.receipts FOR SELECT
    TO anon
    USING (true);

-- Allow public read on monthly payments for status verification
CREATE POLICY "Allow public read on monthly_payments"
    ON public.monthly_payments FOR SELECT
    TO anon
    USING (true);

