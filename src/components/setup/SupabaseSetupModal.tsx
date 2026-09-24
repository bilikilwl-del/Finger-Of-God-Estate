import React, { useState, useEffect } from 'react';
import { Database, Copy, Check, X, Shield, Server, CheckCircle2, AlertTriangle, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import { isSupabaseConfigured, verifySupabaseTables, isAnyTableMissing, getMissingTables } from '../../lib/supabase';

interface SupabaseSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseSetupModal: React.FC<SupabaseSetupModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'tables' | 'sql' | 'env'>('tables');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyReport, setVerifyReport] = useState<{
    allReady: boolean;
    checkedTables: Record<string, boolean>;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen && isSupabaseConfigured) {
      handleVerifyTables();
    }
  }, [isOpen]);

  const handleVerifyTables = async () => {
    setIsVerifying(true);
    try {
      const res = await verifySupabaseTables();
      setVerifyReport(res);
    } catch {
      // safe fallback
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isOpen) return null;

  const sqlCode = `-- =========================================================================
-- FINGER OF GOD ESTATE SECURITY MANAGEMENT - SUPABASE RELATIONAL DATABASE
-- STAGE 1 & STAGE 2 COMPREHENSIVE ARCHITECTURE
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ESTATE SETTINGS
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

-- 2. RESIDENTS (STAGE 2 ENHANCED)
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

-- Backward-compatible migrations for existing tables:
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS additional_phone VARCHAR(30);
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS idx_residents_number ON public.residents(resident_number);
CREATE INDEX IF NOT EXISTS idx_residents_status ON public.residents(status);
CREATE INDEX IF NOT EXISTS idx_residents_phone ON public.residents(phone_number);
CREATE INDEX IF NOT EXISTS idx_residents_house ON public.residents(house_number);

-- 3. ADMIN USERS & ROLES
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

-- 4. MONTHLY PAYMENTS (Stage 2 Ready)
CREATE TABLE IF NOT EXISTS public.monthly_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
    period_month INTEGER NOT NULL CHECK (period_month >= 1 AND period_month <= 12),
    period_year INTEGER NOT NULL CHECK (period_year >= 2026),
    period_label VARCHAR(30) NOT NULL,
    amount_due NUMERIC(12, 2) NOT NULL DEFAULT 5000.00,
    amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'Unpaid' CHECK (status IN ('Paid', 'Unpaid', 'Partially Paid', 'Overdue')),
    due_date DATE NOT NULL,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_resident_period UNIQUE (resident_id, period_month, period_year)
);

-- 5. PAYMENT TRANSACTIONS (Stage 2 & Paystack Ready)
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

-- 6. RECEIPTS (Future Stage)
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

-- 7. SMS REMINDERS & BROADCASTS (Stage 3 Ready)
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

-- 8. ANNOUNCEMENTS (Stage 3 Ready)
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

-- 9. ACTIVITY LOGS (Stage 1 Active)
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

-- RLS POLICIES & SEED
ALTER TABLE public.estate_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users on estate_settings" ON public.estate_settings FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users on residents" ON public.residents FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users on activity_logs" ON public.activity_logs FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow anon read estate_settings" ON public.estate_settings FOR SELECT TO anon USING (true);`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tables = [
    { name: 'estate_settings', stage: 'Stage 1 (Active)', desc: 'Configures estate name, monthly levy (₦5,000), due day (1st), first billing month (Oct 2026), phone, email, and SMS sender name.' },
    { name: 'residents', stage: 'Stage 1 (Active)', desc: 'Stores resident profiles, sequential unique resident numbers (001, 002...), phone, address, state, LGA, and status.' },
    { name: 'activity_logs', stage: 'Stage 1 (Active)', desc: 'Audit logging for administrative operations (resident created, edited, status changed, settings updated).' },
    { name: 'admin_users', stage: 'Stage 1 & 3', desc: 'Stores administrative users, linked to Supabase Auth UUID, roles (Super Admin, Administrator, Security Officer, Accountant).' },
    { name: 'monthly_payments', stage: 'Stage 2 (Prepared)', desc: 'Tracks monthly ₦5,000 security levy obligations starting October 2026 per resident.' },
    { name: 'payment_transactions', stage: 'Stage 2 (Prepared)', desc: 'Audit records for Paystack checkout references, bank transfers, POS, and cash entries.' },
    { name: 'receipts', stage: 'Stage 2 (Prepared)', desc: 'Sequential receipt generation for levy payments with PDF URLs.' },
    { name: 'sms_reminders', stage: 'Stage 3 (Prepared)', desc: 'Logs for automated SMS reminders, overdue alerts, and security broadcasts.' },
    { name: 'announcements', stage: 'Stage 3 (Prepared)', desc: 'Broadcast notices for estate residents and security notifications.' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold">Supabase Database Architecture</h2>
              <p className="text-xs text-slate-400">Relational Database & Environment Configuration</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Engine Status:</span>
            {isSupabaseConfigured ? (
              <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Live Supabase Connected
              </span>
            ) : (
              <span className="text-amber-700 font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Local Sandbox Mode (Ready for Supabase credentials)
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {isSupabaseConfigured && (
              <button
                type="button"
                onClick={handleVerifyTables}
                disabled={isVerifying}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 text-slate-500 ${isVerifying ? 'animate-spin' : ''}`} />
                <span>{isVerifying ? 'Checking Tables...' : 'Verify Tables'}</span>
              </button>
            )}
            <div className="flex items-center gap-1 text-slate-500">
              <Server className="w-3.5 h-3.5" />
              <span>PostgreSQL 15+ Compatible</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-3 border-b border-slate-200 flex items-center gap-4 text-sm font-medium">
          <button
            onClick={() => setActiveTab('tables')}
            className={`pb-3 border-b-2 transition-colors ${activeTab === 'tables' ? 'border-emerald-600 text-emerald-700 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
          >
            Database Tables (9)
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`pb-3 border-b-2 transition-colors ${activeTab === 'sql' ? 'border-emerald-600 text-emerald-700 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
          >
            Complete Supabase SQL Script
          </button>
          <button
            onClick={() => setActiveTab('env')}
            className={`pb-3 border-b-2 transition-colors ${activeTab === 'env' ? 'border-emerald-600 text-emerald-700 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
          >
            Environment Variables (.env)
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'tables' && (
            <div className="space-y-4">
              {/* PGRST205 / Table Missing Diagnostic Banner */}
              {isSupabaseConfigured && verifyReport && !verifyReport.allReady && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-amber-950">Supabase Schema Initialization Required</h4>
                      <p className="mt-1 leading-relaxed text-amber-800">
                        One or more tables (such as <code className="font-mono font-semibold bg-amber-100 px-1 py-0.2 rounded">public.estate_settings</code>) have not yet been created in your Supabase project. The application is running seamlessly with persistent local storage.
                      </p>
                      <div className="mt-2.5 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveTab('sql')}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                        >
                          View & Copy SQL Script →
                        </button>
                        <span className="text-[11px] text-amber-700">Paste into Supabase Dashboard → SQL Editor</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {isSupabaseConfigured && verifyReport && verifyReport.allReady && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span><strong>Tables Active:</strong> Core tables verified in Supabase schema cache. Data syncing to cloud.</span>
                </div>
              )}

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700">
                <p className="font-semibold text-slate-900 mb-1">Architecture Note:</p>
                The schema includes all core tables for <strong>Stage 1 & 2</strong> (Residents, Estate Settings, Activity Logs) plus relational structures prepared for payments, receipts, and announcements without breaking forward compatibility.
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                {tables.map((tbl) => {
                  const isChecked = verifyReport?.checkedTables[tbl.name] !== undefined;
                  const isReady = verifyReport?.checkedTables[tbl.name];
                  return (
                    <div key={tbl.name} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50">
                      <div>
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-xs font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                            {tbl.name}
                          </code>
                          <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                            {tbl.stage}
                          </span>
                          {isChecked && (
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${isReady ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                              {isReady ? 'Cloud Detected' : 'Pending SQL Setup'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{tbl.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'sql' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-600">
                  Run this SQL in your <strong>Supabase SQL Editor</strong> to create all tables, indexes, and security policies:
                </p>
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied to Clipboard</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy SQL Script</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative rounded-xl bg-slate-950 p-4 border border-slate-800">
                <pre className="font-mono text-xs text-emerald-400 overflow-x-auto max-h-[380px] leading-relaxed select-all">
                  {sqlCode}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'env' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  Connecting Your Live Supabase Backend
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-slate-700 leading-relaxed">
                  <li>Create a free account or project at <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline font-semibold inline-flex items-center gap-0.5">supabase.com <ExternalLink className="w-3 h-3" /></a>.</li>
                  <li>In your Supabase project dashboard, navigate to <strong>Project Settings → API</strong>.</li>
                  <li>Copy your <strong>Project URL</strong> and <strong>anon/public Key</strong>.</li>
                  <li>Set them in your environment file:</li>
                </ol>

                <div className="mt-3 p-3 bg-slate-950 rounded-lg text-emerald-400 font-mono text-xs overflow-x-auto select-all">
                  <div>VITE_SUPABASE_URL="https://your-project-ref.supabase.co"</div>
                  <div>VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."</div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 text-blue-900 leading-relaxed">
                <p className="font-semibold mb-1">Resilient Local Persistence:</p>
                When Supabase environment keys are not yet provided, this application automatically functions seamlessly in offline/local storage mode so all resident registrations, sequential numbers, searches, status toggles, and estate settings are saved and testable immediately!
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Close Overview
          </button>
        </div>
      </div>
    </div>
  );
};
