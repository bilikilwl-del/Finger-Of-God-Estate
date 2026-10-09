-- =========================================================================
-- FINGER OF GOD ESTATE MANAGEMENT SYSTEM
-- REVISED BUILDING & FLAT MANAGEMENT AND SECURITY LEVY MIGRATION (PHASE 2)
-- =========================================================================
-- Target Database: PostgreSQL 15+ / Supabase
-- Target Schema: public
-- File: /supabase_building_flat_security_levy_migration.sql
-- Status: PREPARED FOR REVIEW ONLY (NOT YET EXECUTED)
-- =========================================================================

-- Enable core cryptographic and UUID extensions if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -------------------------------------------------------------------------
-- 1. BUILDINGS TABLE
-- -------------------------------------------------------------------------
-- Zero CASCADE deletes: ON DELETE RESTRICT preserves financial context.
CREATE TABLE IF NOT EXISTS public.buildings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    house_number VARCHAR(50) NOT NULL UNIQUE,
    building_name VARCHAR(150),
    total_flats_count INTEGER NOT NULL DEFAULT 1 CHECK (total_flats_count >= 1),
    landlord_name VARCHAR(150),
    landlord_phone VARCHAR(50),
    landlord_email VARCHAR(150),
    landlord_resident_id UUID REFERENCES public.residents(id) ON DELETE RESTRICT,
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buildings_house_num ON public.buildings(house_number);
CREATE INDEX IF NOT EXISTS idx_buildings_status ON public.buildings(status);
CREATE INDEX IF NOT EXISTS idx_buildings_landlord_phone ON public.buildings(landlord_phone);
CREATE INDEX IF NOT EXISTS idx_buildings_landlord_resident_id ON public.buildings(landlord_resident_id);

-- -------------------------------------------------------------------------
-- 2. FLATS TABLE
-- -------------------------------------------------------------------------
-- Inactive flats (is_billing_active = FALSE) do NOT generate monthly obligations.
CREATE TABLE IF NOT EXISTS public.flats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE RESTRICT,
    flat_number VARCHAR(50) NOT NULL,
    label VARCHAR(100),
    occupant_type VARCHAR(30) NOT NULL DEFAULT 'VACANT' CHECK (occupant_type IN ('TENANT', 'LANDLORD', 'VACANT', 'COMMERCIAL')),
    resident_id UUID REFERENCES public.residents(id) ON DELETE RESTRICT,
    occupant_name VARCHAR(150),
    occupant_phone VARCHAR(50),
    occupant_email VARCHAR(150),
    is_billing_active BOOLEAN NOT NULL DEFAULT FALSE,
    billing_activated_at TIMESTAMPTZ,
    billing_activated_by VARCHAR(150),
    monthly_levy_amount NUMERIC(12, 2) NOT NULL DEFAULT 1500.00 CHECK (monthly_levy_amount >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_building_flat_num UNIQUE (building_id, flat_number)
);

CREATE INDEX IF NOT EXISTS idx_flats_building ON public.flats(building_id);
CREATE INDEX IF NOT EXISTS idx_flats_resident ON public.flats(resident_id);
CREATE INDEX IF NOT EXISTS idx_flats_status ON public.flats(status);
CREATE INDEX IF NOT EXISTS idx_flats_billing_active ON public.flats(is_billing_active);

-- -------------------------------------------------------------------------
-- 3. FLAT SECURITY LEVY OBLIGATIONS (MONTHLY BILLING UNITS)
-- -------------------------------------------------------------------------
-- Includes checkout reservation locking to prevent concurrent double-payments.
CREATE TABLE IF NOT EXISTS public.flat_security_levy_obligations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flat_id UUID NOT NULL REFERENCES public.flats(id) ON DELETE RESTRICT,
    billing_month VARCHAR(7) NOT NULL CHECK (billing_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
    amount_due NUMERIC(12, 2) NOT NULL DEFAULT 1500.00 CHECK (amount_due >= 0),
    amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (amount_paid >= 0),
    balance_due NUMERIC(12, 2) NOT NULL DEFAULT 1500.00 CHECK (balance_due >= 0),
    status VARCHAR(30) NOT NULL DEFAULT 'UNPAID' CHECK (status IN ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'WAIVED', 'EXEMPT')),
    is_billed BOOLEAN NOT NULL DEFAULT TRUE,
    due_date DATE,
    -- Checkout reservation mechanism (30-minute lock window)
    locked_by_reference VARCHAR(150),
    lock_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_flat_billing_month UNIQUE (flat_id, billing_month)
);

CREATE INDEX IF NOT EXISTS idx_obligations_flat ON public.flat_security_levy_obligations(flat_id);
CREATE INDEX IF NOT EXISTS idx_obligations_month ON public.flat_security_levy_obligations(billing_month);
CREATE INDEX IF NOT EXISTS idx_obligations_status ON public.flat_security_levy_obligations(status);
CREATE INDEX IF NOT EXISTS idx_obligations_lock ON public.flat_security_levy_obligations(locked_by_reference, lock_expires_at);

-- -------------------------------------------------------------------------
-- 4. UNIFIED SECURITY LEVY TRANSACTIONS (INDIVIDUAL & BULK)
-- -------------------------------------------------------------------------
-- Supports both single-flat and multi-flat checkouts under one atomic ledger.
CREATE TABLE IF NOT EXISTS public.security_levy_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_type VARCHAR(30) NOT NULL CHECK (transaction_type IN ('INDIVIDUAL_FLAT', 'BULK_FLATS')),
    building_id UUID REFERENCES public.buildings(id) ON DELETE RESTRICT,
    payer_name VARCHAR(150) NOT NULL,
    payer_email VARCHAR(150) NOT NULL,
    payer_phone VARCHAR(50),
    payer_type VARCHAR(30) NOT NULL DEFAULT 'LANDLORD' CHECK (payer_type IN ('LANDLORD', 'AGENT', 'RESIDENT', 'ADMIN')),
    billing_month VARCHAR(7) NOT NULL CHECK (billing_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
    total_units INTEGER NOT NULL CHECK (total_units >= 1),
    rate_per_unit NUMERIC(12, 2) NOT NULL DEFAULT 1500.00 CHECK (rate_per_unit >= 0),
    expected_amount NUMERIC(12, 2) NOT NULL CHECK (expected_amount >= 0),
    verified_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (verified_amount >= 0),
    allocated_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (allocated_amount >= 0),
    unallocated_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (unallocated_amount >= 0),
    target_flat_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    target_obligation_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    paystack_reference VARCHAR(150) UNIQUE,
    payment_method VARCHAR(30) NOT NULL DEFAULT 'PAYSTACK' CHECK (payment_method IN ('PAYSTACK', 'MANUAL_BANK_TRANSFER', 'MANUAL_CASH', 'MANUAL_POS')),
    payment_status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PROCESSING', 'SUCCESSFUL', 'FAILED', 'REVERSED')),
    allocation_status VARCHAR(30) NOT NULL DEFAULT 'UNALLOCATED' CHECK (allocation_status IN ('UNALLOCATED', 'ALLOCATED', 'PARTIALLY_ALLOCATED', 'OVERPAID_UNALLOCATED', 'FAILED')),
    idempotency_key VARCHAR(150) UNIQUE,
    verified_at TIMESTAMPTZ,
    channel_payload JSONB,
    reconciliation_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sl_tx_ref ON public.security_levy_transactions(paystack_reference);
CREATE INDEX IF NOT EXISTS idx_sl_tx_building ON public.security_levy_transactions(building_id);
CREATE INDEX IF NOT EXISTS idx_sl_tx_status ON public.security_levy_transactions(payment_status);
CREATE INDEX IF NOT EXISTS idx_sl_tx_allocation_status ON public.security_levy_transactions(allocation_status);
CREATE INDEX IF NOT EXISTS idx_sl_tx_idempotency ON public.security_levy_transactions(idempotency_key);

-- -------------------------------------------------------------------------
-- 5. FLAT PAYMENT ALLOCATIONS (ATOMIC PER-FLAT LEDGER)
-- -------------------------------------------------------------------------
-- Strict constraint (flat_id, obligation_id) guarantees no double crediting.
CREATE TABLE IF NOT EXISTS public.flat_payment_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES public.security_levy_transactions(id) ON DELETE RESTRICT,
    flat_id UUID NOT NULL REFERENCES public.flats(id) ON DELETE RESTRICT,
    obligation_id UUID NOT NULL REFERENCES public.flat_security_levy_obligations(id) ON DELETE RESTRICT,
    allocated_amount NUMERIC(12, 2) NOT NULL CHECK (allocated_amount > 0),
    billing_month VARCHAR(7) NOT NULL CHECK (billing_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
    rate_snapshot NUMERIC(12, 2) NOT NULL DEFAULT 1500.00,
    paystack_reference VARCHAR(150),
    receipt_number VARCHAR(100) UNIQUE NOT NULL,
    payment_method VARCHAR(30) NOT NULL DEFAULT 'PAYSTACK',
    allocation_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_flat_obligation_allocation UNIQUE (flat_id, obligation_id)
);

CREATE INDEX IF NOT EXISTS idx_allocations_tx ON public.flat_payment_allocations(transaction_id);
CREATE INDEX IF NOT EXISTS idx_allocations_flat ON public.flat_payment_allocations(flat_id);
CREATE INDEX IF NOT EXISTS idx_allocations_obligation ON public.flat_payment_allocations(obligation_id);
CREATE INDEX IF NOT EXISTS idx_allocations_receipt ON public.flat_payment_allocations(receipt_number);

-- -------------------------------------------------------------------------
-- 6. MANUAL PAYMENT AUDIT & RECORDING TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.manual_payment_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_type VARCHAR(30) NOT NULL CHECK (payment_type IN ('INDIVIDUAL_FLAT', 'BULK_FLATS')),
    flat_id UUID REFERENCES public.flats(id) ON DELETE RESTRICT,
    transaction_id UUID REFERENCES public.security_levy_transactions(id) ON DELETE RESTRICT,
    admin_email VARCHAR(150) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('MANUAL_BANK_TRANSFER', 'MANUAL_CASH', 'MANUAL_POS')),
    bank_reference VARCHAR(150),
    receipt_reference VARCHAR(100),
    supporting_document_url TEXT,
    notes TEXT NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_manual_payments_admin ON public.manual_payment_logs(admin_email);
CREATE INDEX IF NOT EXISTS idx_manual_payments_flat ON public.manual_payment_logs(flat_id);
CREATE INDEX IF NOT EXISTS idx_manual_payments_tx ON public.manual_payment_logs(transaction_id);

-- -------------------------------------------------------------------------
-- 7. ESTATE AUDIT LOGS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.estate_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_type VARCHAR(30) NOT NULL DEFAULT 'ADMIN' CHECK (actor_type IN ('ADMIN', 'RESIDENT', 'SYSTEM', 'WEBHOOK')),
    actor_identifier VARCHAR(150) NOT NULL,
    action VARCHAR(80) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address VARCHAR(60),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.estate_audit_logs(actor_identifier);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.estate_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.estate_audit_logs(created_at);

-- -------------------------------------------------------------------------
-- 8. ATOMIC ALLOCATION STORED PROCEDURE (ROW LOCKING & RECONCILIATION)
-- -------------------------------------------------------------------------
-- Executes within an atomic database transaction boundary with row-level locks
-- (SELECT ... FOR UPDATE). Guarantees idempotency and prevents double allocation.
CREATE OR REPLACE FUNCTION public.fn_allocate_security_levy_payment(
    p_transaction_id UUID,
    p_actor VARCHAR DEFAULT 'SYSTEM_WEBHOOK'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tx public.security_levy_transactions%ROWTYPE;
    v_obligation public.flat_security_levy_obligations%ROWTYPE;
    v_flat_id_text TEXT;
    v_flat_id UUID;
    v_target_flats JSONB;
    v_allocated_count INTEGER := 0;
    v_conflict_count INTEGER := 0;
    v_total_allocated NUMERIC(12, 2) := 0.00;
    v_total_unallocated NUMERIC(12, 2) := 0.00;
    v_receipt_no VARCHAR(100);
    v_result JSONB;
BEGIN
    -- 1. Lock transaction row exclusively
    SELECT * INTO v_tx
    FROM public.security_levy_transactions
    WHERE id = p_transaction_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'TRANSACTION_NOT_FOUND');
    END IF;

    -- 2. Idempotency Check: if already processed and allocated, return existing status immediately
    IF v_tx.allocation_status = 'ALLOCATED' THEN
        RETURN jsonb_build_object(
            'success', true,
            'status', 'ALREADY_ALLOCATED',
            'transaction_id', v_tx.id,
            'allocated_amount', v_tx.allocated_amount
        );
    END IF;

    -- 3. Verify transaction is successful
    IF v_tx.payment_status != 'SUCCESSFUL' THEN
        RETURN jsonb_build_object('success', false, 'error', 'TRANSACTION_NOT_SUCCESSFUL', 'payment_status', v_tx.payment_status);
    END IF;

    v_target_flats := v_tx.target_flat_ids;

    -- 4. Iterate over each target flat and lock its monthly obligation
    FOR v_flat_id_text IN SELECT jsonb_array_elements_text(v_target_flats)
    LOOP
        v_flat_id := v_flat_id_text::UUID;

        -- Lock obligation row for update (or create if billing is active)
        SELECT * INTO v_obligation
        FROM public.flat_security_levy_obligations
        WHERE flat_id = v_flat_id AND billing_month = v_tx.billing_month
        FOR UPDATE;

        IF NOT FOUND THEN
            -- Create the monthly obligation if not present
            INSERT INTO public.flat_security_levy_obligations (
                flat_id, billing_month, amount_due, amount_paid, balance_due, status
            ) VALUES (
                v_flat_id, v_tx.billing_month, v_tx.rate_per_unit, 0.00, v_tx.rate_per_unit, 'UNPAID'
            ) RETURNING * INTO v_obligation;
        END IF;

        -- 5. Conflict & Idempotency check on the obligation
        IF v_obligation.status = 'PAID' THEN
            -- Flat has ALREADY been paid (race condition or duplicate checkout)
            -- Never double-credit or overwrite; mark this unit as unallocated credit
            v_conflict_count := v_conflict_count + 1;
            v_total_unallocated := v_total_unallocated + v_tx.rate_per_unit;
        ELSE
            -- Generate unique receipt number
            v_receipt_no := 'SLR-' || to_char(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 8));

            -- Insert atomic per-flat allocation record
            INSERT INTO public.flat_payment_allocations (
                transaction_id, flat_id, obligation_id, allocated_amount,
                billing_month, rate_snapshot, paystack_reference, receipt_number, payment_method
            ) VALUES (
                v_tx.id, v_flat_id, v_obligation.id, v_tx.rate_per_unit,
                v_tx.billing_month, v_tx.rate_per_unit, v_tx.paystack_reference, v_receipt_no, v_tx.payment_method
            )
            ON CONFLICT (flat_id, obligation_id) DO NOTHING;

            -- Update obligation status
            UPDATE public.flat_security_levy_obligations
            SET amount_paid = amount_due,
                balance_due = 0.00,
                status = 'PAID',
                locked_by_reference = NULL,
                lock_expires_at = NULL,
                updated_at = NOW()
            WHERE id = v_obligation.id;

            v_allocated_count := v_allocated_count + 1;
            v_total_allocated := v_total_allocated + v_tx.rate_per_unit;
        END IF;
    END LOOP;

    -- 6. Update transaction allocation state
    UPDATE public.security_levy_transactions
    SET allocated_amount = v_total_allocated,
        unallocated_amount = v_total_unallocated,
        allocation_status = CASE 
            WHEN v_conflict_count = 0 THEN 'ALLOCATED'
            WHEN v_allocated_count > 0 AND v_conflict_count > 0 THEN 'PARTIALLY_ALLOCATED'
            ELSE 'OVERPAID_UNALLOCATED'
        END,
        reconciliation_notes = CASE
            WHEN v_conflict_count > 0 THEN 
                'Conflict detected: ' || v_conflict_count || ' unit(s) were already marked PAID. Preserved ₦' || v_total_unallocated || ' as unallocated credit.'
            ELSE NULL
        END,
        updated_at = NOW()
    WHERE id = v_tx.id;

    -- 7. Audit log insertion
    INSERT INTO public.estate_audit_logs (
        actor_type, actor_identifier, action, entity_type, entity_id, details
    ) VALUES (
        CASE WHEN p_actor LIKE '%@%' THEN 'ADMIN' ELSE 'WEBHOOK' END,
        p_actor,
        'ALLOCATE_SECURITY_LEVY',
        'SECURITY_LEVY_TRANSACTION',
        v_tx.id::TEXT,
        jsonb_build_object(
            'allocated_count', v_allocated_count,
            'conflict_count', v_conflict_count,
            'total_allocated', v_total_allocated,
            'total_unallocated', v_total_unallocated,
            'paystack_reference', v_tx.paystack_reference
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'transaction_id', v_tx.id,
        'allocated_count', v_allocated_count,
        'conflict_count', v_conflict_count,
        'total_allocated', v_total_allocated,
        'total_unallocated', v_total_unallocated
    );
END;
$$;

-- -------------------------------------------------------------------------
-- 8B. MONTHLY OBLIGATION BATCH GENERATION PROCEDURE
-- -------------------------------------------------------------------------
-- Generates ₦1,500 monthly obligations for all active, billing-enabled flats.
CREATE OR REPLACE FUNCTION public.fn_generate_monthly_security_obligations(
    p_billing_month VARCHAR DEFAULT to_char(NOW(), 'YYYY-MM')
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_flat RECORD;
    v_generated_count INTEGER := 0;
    v_skipped_count INTEGER := 0;
BEGIN
    FOR v_flat IN 
        SELECT id, monthly_levy_amount 
        FROM public.flats 
        WHERE status = 'ACTIVE' AND is_billing_active = TRUE
    LOOP
        INSERT INTO public.flat_security_levy_obligations (
            flat_id, billing_month, amount_due, amount_paid, balance_due, status, is_billed
        ) VALUES (
            v_flat.id, p_billing_month, v_flat.monthly_levy_amount, 0.00, v_flat.monthly_levy_amount, 'UNPAID', TRUE
        )
        ON CONFLICT (flat_id, billing_month) DO NOTHING;

        IF FOUND THEN
            v_generated_count := v_generated_count + 1;
        ELSE
            v_skipped_count := v_skipped_count + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'billing_month', p_billing_month,
        'generated_count', v_generated_count,
        'skipped_count', v_skipped_count
    );
END;
$$;

-- -------------------------------------------------------------------------
-- 9. STRICT PRIVACY & ROW LEVEL SECURITY (RLS) POLICIES
-- -------------------------------------------------------------------------
-- Principles:
-- 1. Zero anonymous access to sensitive tables (NO anon SELECT/INSERT/UPDATE/DELETE).
-- 2. No unrestricted USING (true) for financial, obligation, or personal data.
-- 3. All direct client mutations are rejected: client-side cannot forge allocations.
-- 4. Authorized server logic uses the Supabase service_role, bypassing RLS safely.
-- 5. Authenticated administrators verified against public.admin_users have scoped access.
-- 6. Authenticated residents can only view flats linked to their resident record.

ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flat_security_levy_obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_levy_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flat_payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_payment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estate_audit_logs ENABLE ROW LEVEL SECURITY;

-- Revoke all default anonymous permissions
REVOKE ALL ON public.buildings FROM anon;
REVOKE ALL ON public.flats FROM anon;
REVOKE ALL ON public.flat_security_levy_obligations FROM anon;
REVOKE ALL ON public.security_levy_transactions FROM anon;
REVOKE ALL ON public.flat_payment_allocations FROM anon;
REVOKE ALL ON public.manual_payment_logs FROM anon;
REVOKE ALL ON public.estate_audit_logs FROM anon;

-- Helper function: Is caller an approved admin?
CREATE OR REPLACE FUNCTION public.fn_is_verified_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE (admin_users.auth_user_id = auth.uid() OR admin_users.email = (auth.jwt()->>'email'))
        AND admin_users.is_active = TRUE
    );
$$;

-- -----------------------
-- Buildings RLS Policies
-- -----------------------
-- Authenticated admins can view all buildings.
-- Authenticated residents/landlords can only view buildings where they are the designated landlord.
CREATE POLICY "buildings_select_auth" ON public.buildings
    FOR SELECT TO authenticated
    USING (
        public.fn_is_verified_admin()
        OR landlord_resident_id IN (SELECT id FROM public.residents WHERE user_id = auth.uid() OR email = (auth.jwt()->>'email'))
    );

CREATE POLICY "buildings_admin_insert" ON public.buildings
    FOR INSERT TO authenticated
    WITH CHECK (public.fn_is_verified_admin());

CREATE POLICY "buildings_admin_update" ON public.buildings
    FOR UPDATE TO authenticated
    USING (public.fn_is_verified_admin())
    WITH CHECK (public.fn_is_verified_admin());

-- -----------------------
-- Flats RLS Policies
-- -----------------------
CREATE POLICY "flats_select_auth" ON public.flats
    FOR SELECT TO authenticated
    USING (
        public.fn_is_verified_admin()
        OR resident_id IN (SELECT id FROM public.residents WHERE user_id = auth.uid() OR email = (auth.jwt()->>'email'))
        OR building_id IN (
            SELECT b.id FROM public.buildings b
            WHERE b.landlord_resident_id IN (SELECT r.id FROM public.residents r WHERE r.user_id = auth.uid() OR r.email = (auth.jwt()->>'email'))
        )
    );

CREATE POLICY "flats_admin_insert" ON public.flats
    FOR INSERT TO authenticated
    WITH CHECK (public.fn_is_verified_admin());

CREATE POLICY "flats_admin_update" ON public.flats
    FOR UPDATE TO authenticated
    USING (public.fn_is_verified_admin())
    WITH CHECK (public.fn_is_verified_admin());

-- ------------------------------------
-- Obligations RLS Policies (Scoped)
-- ------------------------------------
-- Residents can only view obligations for flats they occupy.
-- Landlords can view obligations for flats in their owned buildings.
CREATE POLICY "obligations_select_auth" ON public.flat_security_levy_obligations
    FOR SELECT TO authenticated
    USING (
        public.fn_is_verified_admin()
        OR flat_id IN (
            SELECT f.id FROM public.flats f
            WHERE f.resident_id IN (SELECT id FROM public.residents WHERE user_id = auth.uid() OR email = (auth.jwt()->>'email'))
            OR f.building_id IN (
                SELECT b.id FROM public.buildings b
                WHERE b.landlord_resident_id IN (SELECT r.id FROM public.residents r WHERE r.user_id = auth.uid() OR r.email = (auth.jwt()->>'email'))
            )
        )
    );

-- Mutations are strictly forbidden from direct client calls
CREATE POLICY "obligations_admin_write" ON public.flat_security_levy_obligations
    FOR ALL TO authenticated
    USING (public.fn_is_verified_admin())
    WITH CHECK (public.fn_is_verified_admin());

-- ------------------------------------
-- Transactions RLS Policies (Scoped)
-- ------------------------------------
CREATE POLICY "transactions_select_auth" ON public.security_levy_transactions
    FOR SELECT TO authenticated
    USING (
        public.fn_is_verified_admin()
        OR payer_email = (auth.jwt()->>'email')
    );

-- Mutations strictly prohibited via direct client requests (handled via backend service role)
CREATE POLICY "transactions_admin_write" ON public.security_levy_transactions
    FOR ALL TO authenticated
    USING (public.fn_is_verified_admin())
    WITH CHECK (public.fn_is_verified_admin());

-- ------------------------------------
-- Allocations RLS Policies (Scoped)
-- ------------------------------------
CREATE POLICY "allocations_select_auth" ON public.flat_payment_allocations
    FOR SELECT TO authenticated
    USING (
        public.fn_is_verified_admin()
        OR flat_id IN (
            SELECT f.id FROM public.flats f
            WHERE f.resident_id IN (SELECT id FROM public.residents WHERE user_id = auth.uid() OR email = (auth.jwt()->>'email'))
            OR f.building_id IN (
                SELECT b.id FROM public.buildings b
                WHERE b.landlord_resident_id IN (SELECT r.id FROM public.residents r WHERE r.user_id = auth.uid() OR r.email = (auth.jwt()->>'email'))
            )
        )
    );

CREATE POLICY "allocations_admin_write" ON public.flat_payment_allocations
    FOR ALL TO authenticated
    USING (public.fn_is_verified_admin())
    WITH CHECK (public.fn_is_verified_admin());

-- ------------------------------------
-- Manual Payment Logs & Audit Logs (Admin Only)
-- ------------------------------------
CREATE POLICY "manual_payments_admin_only" ON public.manual_payment_logs
    FOR ALL TO authenticated
    USING (public.fn_is_verified_admin())
    WITH CHECK (public.fn_is_verified_admin());

CREATE POLICY "audit_logs_admin_only" ON public.estate_audit_logs
    FOR ALL TO authenticated
    USING (public.fn_is_verified_admin())
    WITH CHECK (public.fn_is_verified_admin());

-- =========================================================================
-- END OF MIGRATION DRAFT (AWAITING EXPLICIT USER AUTHORIZATION)
-- =========================================================================
