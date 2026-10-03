-- =========================================================================
-- FINGER OF GOD ESTATE MANAGEMENT SYSTEM
-- STAGE 1: PRODUCTION ELECTION & SECRET BALLOT DATABASE MIGRATION
-- =========================================================================
-- Target Database: PostgreSQL 15+ / Supabase
-- This migration creates the persistent schema for the Finger of God Estate
-- Election & Secret Ballot System with strict mathematical privacy separation.
-- =========================================================================

-- Enable core extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================================
-- 1. ELECTIONS TABLE
-- =========================================================================
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

-- =========================================================================
-- 2. ELECTION POSITIONS TABLE
-- =========================================================================
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

-- =========================================================================
-- 3. ELECTION CANDIDATES TABLE
-- =========================================================================
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

-- =========================================================================
-- 4. ELECTION VOTERS TABLE (Voter Accreditation & One-Vote Enforcement)
-- CRITICAL: Zero ballot choices or voting preferences are stored here.
-- =========================================================================
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

-- =========================================================================
-- 5. ELECTION VOTING SESSIONS TABLE (Temporary OTP Authentication)
-- Plaintext OTPs and raw tokens are NEVER stored.
-- =========================================================================
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

-- =========================================================================
-- 6. ELECTION BALLOTS TABLE (Strictly Anonymous Secret Ballots)
-- CRITICAL SECRET-BALLOT REQUIREMENTS:
-- 1. NO voter_id, resident_id, resident_number, phone, email, or auth user ID.
-- 2. NO foreign key to election_voters or election_voting_sessions.
-- 3. ballot_reference is a random anonymous token decoupled from voter identity.
-- =========================================================================
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

-- =========================================================================
-- 7. ELECTION BALLOT CHOICES TABLE (Anonymous Candidate Selections)
-- CRITICAL: One candidate choice per position per ballot. Zero voter linkage.
-- =========================================================================
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

-- =========================================================================
-- 8. ELECTION RESULTS TABLE (Certified Results Summaries)
-- =========================================================================
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

-- =========================================================================
-- 9. ELECTION AUDIT LOGS TABLE
-- CRITICAL: Must NEVER contain voter-ballot association.
-- =========================================================================
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

-- =========================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES FOR ELECTION SYSTEM
-- =========================================================================

-- Enable RLS on all 9 election tables
ALTER TABLE public.elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.election_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.election_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.election_voters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.election_voting_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.election_ballots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.election_ballot_choices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.election_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.election_audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Elections Policies
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

-- 2. Election Positions Policies
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

-- 3. Election Candidates Policies
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

-- 4. Election Voters Policies (Zero Public/Anonymous Access)
DROP POLICY IF EXISTS "Admin full access on election voters" ON public.election_voters;
CREATE POLICY "Admin full access on election voters"
    ON public.election_voters FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 5. Election Voting Sessions Policies (Backend & Admin Access Only)
DROP POLICY IF EXISTS "Admin full access on election voting sessions" ON public.election_voting_sessions;
CREATE POLICY "Admin full access on election voting sessions"
    ON public.election_voting_sessions FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 6. Election Ballots Policies (No Direct Anonymous Modification)
DROP POLICY IF EXISTS "Admin read on election ballots" ON public.election_ballots;
CREATE POLICY "Admin read on election ballots"
    ON public.election_ballots FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- 7. Election Ballot Choices Policies (No Direct Anonymous Modification)
DROP POLICY IF EXISTS "Admin read on election ballot choices" ON public.election_ballot_choices;
CREATE POLICY "Admin read on election ballot choices"
    ON public.election_ballot_choices FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- 8. Election Results Policies (Public Read Published; Admin Full Access)
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

-- 9. Election Audit Logs Policies (Admin Only)
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
-- 11. ATOMIC SECRET BALLOT CASTING STORED PROCEDURE (RPC)
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
-- 12. SEED BASELINE 2026 EXECUTIVE COMMITTEE ELECTION
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

