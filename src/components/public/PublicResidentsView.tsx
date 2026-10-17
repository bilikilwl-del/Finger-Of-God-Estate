import React from 'react';
import {
  Users,
  Shield,
  CreditCard,
  UserCheck,
  Building,
  Key,
  Car,
  Bell,
  ArrowLeft,
  FileCheck2,
  ChevronRight
} from 'lucide-react';
import { EstateSettings, NavigationTab, Resident } from '../../types/database';
import { PublicNavbar } from '../layout/PublicNavbar';
import { PublicFooter } from '../layout/PublicFooter';
import { SEOHead } from '../common/SEOHead';

interface PublicResidentsViewProps {
  estateSettings: EstateSettings;
  currentResident?: Resident | null;
  onNavigate: (tab: NavigationTab) => void;
  onOpenResidentLogin: (tab?: 'login' | 'activate') => void;
}

export const PublicResidentsView: React.FC<PublicResidentsViewProps> = ({
  estateSettings,
  currentResident,
  onNavigate,
  onOpenResidentLogin
}) => {
  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 font-sans flex flex-col">
      <SEOHead
        title="Resident Services & Digital Verification Hub — Finger of God Estate"
        description="Resident directory guidelines, one-time account activation, email OTP sign-in, gate pass management, and 1-month or 12-month levy payment options for Finger of God Estate."
        keywords={['Resident Services', 'Activate Account', 'Finger of God Estate Residents', 'Estate Verification', 'Gate Pass']}
        canonicalPath="/#residents"
        ogType="website"
      />

      <PublicNavbar
        currentTab="public_residents"
        estateSettings={estateSettings}
        currentResident={currentResident}
        onNavigate={onNavigate}
        onOpenResidentLogin={onOpenResidentLogin}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-stone-200 pb-6">
          <div>
            <button
              onClick={() => onNavigate('home')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#064E3B] transition-colors mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Estate Homepage</span>
            </button>
            <div className="text-xs font-semibold text-[#064E3B] mb-1">
              Homeowner &amp; Tenant Self-Service · IDs #001 – #300
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-display">
              Resident Services &amp; Portal Hub
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1.5 max-w-3xl leading-relaxed">
              Dedicated self-service platform for homeowners and tenants of Finger of God Estate to activate accounts once, sign in via Email OTP, and manage 1-month or 12-month levy payments, visitor passes, and estate notices.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {currentResident ? (
              <button
                onClick={() => onNavigate('resident_portal')}
                className="px-5 py-2.5 bg-[#064E3B] hover:bg-emerald-900 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                <span>Open My Resident Portal</span>
              </button>
            ) : (
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => onOpenResidentLogin('login')}
                  className="px-4 py-2.5 bg-[#064E3B] hover:bg-emerald-900 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Resident Sign In</span>
                </button>
                <button
                  onClick={() => onOpenResidentLogin('activate')}
                  className="px-4 py-2.5 bg-white hover:bg-stone-100 text-slate-800 border border-stone-300 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Activate Account
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Resident Welcome / Active Session Banner */}
        {currentResident ? (
          <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-xl border border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-emerald-400">
                Active Resident Session
              </div>
              <h2 className="text-xl font-bold font-display">{currentResident.full_name}</h2>
              <p className="text-xs text-slate-300 font-mono">
                Resident #{currentResident.resident_number} · {currentResident.house_number} ({currentResident.address})
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onNavigate('resident_portal')}
                className="px-4 py-2.5 bg-[#064E3B] hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => onNavigate('estate_levy')}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-semibold rounded-lg cursor-pointer transition-colors"
              >
                Pay Monthly Levy
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white p-6 sm:p-8 rounded-xl border border-stone-200 shadow-2xs grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-8 space-y-2">
              <div className="text-xs font-semibold text-[#064E3B]">
                Secure Resident Authentication · One-Time Account Activation
              </div>
              <h2 className="text-xl font-bold text-slate-900 font-display">
                Access Your Personal Resident Portal
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                First-time users can complete their one-time <strong>Activate Account</strong> setup using their Resident ID (001–100), Full Name, Phone Number, Email Address, and Home Address. Returning residents sign in securely using their Resident ID and a 6-digit OTP sent to their registered email.
              </p>
            </div>
            <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-2.5 justify-end">
              <button
                onClick={() => onOpenResidentLogin('login')}
                className="w-full px-5 py-3 bg-[#064E3B] hover:bg-emerald-900 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors cursor-pointer text-center"
              >
                Sign In with Resident ID &amp; Email OTP
              </button>
              <button
                onClick={() => onOpenResidentLogin('activate')}
                className="w-full px-5 py-3 bg-stone-100 hover:bg-stone-200 text-slate-800 font-semibold text-xs rounded-lg transition-colors cursor-pointer text-center"
              >
                First Time? Activate Account Once
              </button>
            </div>
          </div>
        )}

        {/* Resident Services Grid */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-slate-900">
            Available Resident Services
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-2xs flex flex-col justify-between space-y-4">
              <div className="space-y-2.5">
                <div className="p-2.5 bg-emerald-50 text-[#064E3B] rounded-lg w-fit">
                  <Shield className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm">Security Levy (1 or 12 Months)</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Pay your flat security levy online at ₦1,500/month (1 Month) or ₦18,000/year (12 Months) via Paystack and download stamped digital receipts.
                </p>
              </div>
              <button
                onClick={() => onNavigate('security_public')}
                className="text-xs font-semibold text-[#064E3B] hover:underline flex items-center gap-1 cursor-pointer pt-1"
              >
                <span>Open Security Levy Desk</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-2xs flex flex-col justify-between space-y-4">
              <div className="space-y-2.5">
                <div className="p-2.5 bg-emerald-50 text-[#064E3B] rounded-lg w-fit">
                  <CreditCard className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm">Estate Levy (1 or 12 Months)</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Pay your building estate levy at ₦1,000/month (1 Month) or ₦12,000/year (12 Months) per building and track verified building clearance.
                </p>
              </div>
              <button
                onClick={() => onNavigate('estate_levy')}
                className="text-xs font-semibold text-[#064E3B] hover:underline flex items-center gap-1 cursor-pointer pt-1"
              >
                <span>Open Estate Levy Portal</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-2xs flex flex-col justify-between space-y-4">
              <div className="space-y-2.5">
                <div className="p-2.5 bg-amber-50 text-amber-800 rounded-lg w-fit">
                  <Key className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm">Digital Visitor Passes</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Generate secure QR visitor passes with time limits to allow fast, verified clearance for family, guests, and deliveries at the main gatehouse.
                </p>
              </div>
              <button
                onClick={() => onNavigate('resident_portal')}
                className="text-xs font-semibold text-amber-800 hover:underline flex items-center gap-1 cursor-pointer pt-1"
              >
                <span>Generate Visitor Pass</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-2xs flex flex-col justify-between space-y-4">
              <div className="space-y-2.5">
                <div className="p-2.5 bg-stone-100 text-slate-700 rounded-lg w-fit">
                  <Car className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm">Household Vehicle Registry</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Register household car plate numbers with gate security for expedited barrier clearance and vehicle verification.
                </p>
              </div>
              <button
                onClick={() => onNavigate('resident_portal')}
                className="text-xs font-semibold text-slate-800 hover:underline flex items-center gap-1 cursor-pointer pt-1"
              >
                <span>Manage Vehicles</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-2xs flex flex-col justify-between space-y-4">
              <div className="space-y-2.5">
                <div className="p-2.5 bg-stone-100 text-slate-700 rounded-lg w-fit">
                  <Bell className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm">Official Estate Notices</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Read executive committee broadcasts, general meeting schedules, security advisories, and infrastructure updates.
                </p>
              </div>
              <button
                onClick={() => onNavigate('public_announcements')}
                className="text-xs font-semibold text-slate-800 hover:underline flex items-center gap-1 cursor-pointer pt-1"
              >
                <span>View Announcements</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-2xs flex flex-col justify-between space-y-4">
              <div className="space-y-2.5">
                <div className="p-2.5 bg-emerald-50 text-[#064E3B] rounded-lg w-fit">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm">Receipt Verification</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Verify any issued estate receipt number to validate transaction authenticity against the official estate ledger.
                </p>
              </div>
              <button
                onClick={() => onNavigate('verify_receipt')}
                className="text-xs font-semibold text-[#064E3B] hover:underline flex items-center gap-1 cursor-pointer pt-1"
              >
                <span>Verify a Receipt</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter
        estateSettings={estateSettings}
        onNavigate={onNavigate}
        onOpenResidentLogin={onOpenResidentLogin}
      />
    </div>
  );
};
