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
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  FileCheck2,
  Lock,
  ChevronRight,
  HelpCircle,
  Clock
} from 'lucide-react';
import { EstateSettings, NavigationTab, Resident } from '../../types/database';
import { PublicNavbar } from '../layout/PublicNavbar';
import { PublicFooter } from '../layout/PublicFooter';

interface PublicResidentsViewProps {
  estateSettings: EstateSettings;
  currentResident?: Resident | null;
  onNavigate: (tab: NavigationTab) => void;
  onOpenResidentLogin: () => void;
  onOpenAdminLogin: () => void;
}

export const PublicResidentsView: React.FC<PublicResidentsViewProps> = ({
  estateSettings,
  currentResident,
  onNavigate,
  onOpenResidentLogin,
  onOpenAdminLogin
}) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <PublicNavbar
        currentTab="public_residents"
        estateSettings={estateSettings}
        currentResident={currentResident}
        onNavigate={onNavigate}
        onOpenResidentLogin={onOpenResidentLogin}
        onOpenAdminLogin={onOpenAdminLogin}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <button
              onClick={() => onNavigate('home')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-700 transition-colors mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home Dashboard</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                <Users className="w-5 h-5" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
                Resident Services & Portal Hub
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl">
              Dedicated self-service platform for homeowners and tenants of Finger of God Estate to manage dues, access passes, vehicles, and estate communications.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {currentResident ? (
              <button
                onClick={() => onNavigate('resident_portal')}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                <span>Open My Resident Portal</span>
              </button>
            ) : (
              <button
                onClick={onOpenResidentLogin}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                <span>Sign In with Resident Number</span>
              </button>
            )}
          </div>
        </div>

        {/* Resident Welcome / Active Session Banner */}
        {currentResident ? (
          <div className="bg-gradient-to-r from-emerald-900 to-slate-900 text-white p-6 rounded-3xl border border-emerald-800 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 text-[10px] font-bold uppercase tracking-wider">
                Active Resident Session
              </span>
              <h2 className="text-xl font-bold font-display">{currentResident.full_name}</h2>
              <p className="text-xs text-emerald-200 font-mono">
                Resident #{currentResident.resident_number} • {currentResident.house_number} ({currentResident.address})
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onNavigate('resident_portal')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => onNavigate('estate_levy')}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                Pay Monthly Levy
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-2xs text-center max-w-2xl mx-auto space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center mx-auto">
              <UserCheck className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 font-display">Resident Portal Access</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you a registered resident of Finger of God Estate? Sign in using your unique Resident Number (e.g. 001) and registered phone number to access your personal payment records, receipts, and visitor passes.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={onOpenResidentLogin}
                className="w-full sm:w-auto px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Sign In to Resident Account
              </button>
              <button
                onClick={() => onNavigate('contact')}
                className="w-full sm:w-auto px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Need Registration Help?
              </button>
            </div>
          </div>
        )}

        {/* Resident Services Grid */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Building className="w-4 h-4 text-emerald-700" />
            <span>Available Resident Services</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
              <div className="p-3 bg-emerald-100 text-emerald-800 rounded-xl w-fit">
                <CreditCard className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Monthly Estate Levy</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Check current payment status, view outstanding months, pay online via Paystack, and download stamped PDF receipts.
              </p>
              <button
                onClick={() => onNavigate('estate_levy')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer pt-1"
              >
                <span>Open Levy Portal</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
              <div className="p-3 bg-amber-100 text-amber-800 rounded-xl w-fit">
                <Key className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Digital Visitor Passes</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Generate secure QR visitor passes with time limits to allow fast, frictionless clearance for family, guests, and deliveries.
              </p>
              <button
                onClick={() => onNavigate('resident_portal')}
                className="text-xs font-bold text-amber-800 hover:text-amber-900 flex items-center gap-1 cursor-pointer pt-1"
              >
                <span>Generate Visitor Pass</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
              <div className="p-3 bg-blue-100 text-blue-800 rounded-xl w-fit">
                <Car className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Household Vehicle Registry</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Register household car plate numbers with gate security for automatic barrier clearance and gate recognition.
              </p>
              <button
                onClick={() => onNavigate('resident_portal')}
                className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1 cursor-pointer pt-1"
              >
                <span>Manage Vehicles</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
              <div className="p-3 bg-purple-100 text-purple-800 rounded-xl w-fit">
                <Bell className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Official Estate Notices</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Receive important security alerts, general meeting schedules, payment deadlines, and project status broadcasts.
              </p>
              <button
                onClick={() => onNavigate('public_announcements')}
                className="text-xs font-bold text-purple-700 hover:text-purple-800 flex items-center gap-1 cursor-pointer pt-1"
              >
                <span>View Announcements</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
              <div className="p-3 bg-rose-100 text-rose-800 rounded-xl w-fit">
                <Shield className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Security Incident Reporting</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Quickly report suspicious movements, security breaches, electrical faults, or maintenance issues directly to gate command.
              </p>
              <button
                onClick={() => onNavigate('security_public')}
                className="text-xs font-bold text-rose-700 hover:text-rose-800 flex items-center gap-1 cursor-pointer pt-1"
              >
                <span>Security Desk</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
              <div className="p-3 bg-emerald-100 text-emerald-800 rounded-xl w-fit">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Receipt Verification</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Verify any issued estate receipt number to validate transaction authenticity against the secure ledger.
              </p>
              <button
                onClick={() => onNavigate('verify_receipt')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer pt-1"
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
        onOpenAdminLogin={onOpenAdminLogin}
        onOpenResidentLogin={onOpenResidentLogin}
      />
    </div>
  );
};
