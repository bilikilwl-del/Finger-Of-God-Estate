import React, { useState } from 'react';
import {
  CreditCard,
  Shield,
  CheckCircle2,
  Calendar,
  Phone,
  FileCheck2,
  Search,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Clock,
  Sparkles,
  Zap,
  HelpCircle,
  Building,
  UserCheck,
  ChevronRight,
  Download,
  Lock
} from 'lucide-react';
import {
  EstateSettings,
  Resident,
  NavigationTab,
  MonthlyPayment
} from '../../types/database';
import { dbService } from '../../lib/supabase';
import { PublicNavbar } from '../layout/PublicNavbar';
import { PublicFooter } from '../layout/PublicFooter';
import { PaystackPaymentModal } from '../payments/PaystackPaymentModal';

interface PublicEstateLevyViewProps {
  estateSettings: EstateSettings;
  currentResident?: Resident | null;
  onNavigate: (tab: NavigationTab) => void;
  onOpenResidentLogin: () => void;
  onOpenAdminLogin: () => void;
}

export const PublicEstateLevyView: React.FC<PublicEstateLevyViewProps> = ({
  estateSettings,
  currentResident,
  onNavigate,
  onOpenResidentLogin,
  onOpenAdminLogin
}) => {
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [searchResidentNumber, setSearchResidentNumber] = useState(currentResident?.resident_number || '');
  const [searchedResident, setSearchedResident] = useState<Resident | null>(currentResident || null);
  const [residentPayments, setResidentPayments] = useState<MonthlyPayment[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<number>(10);
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  const levyAmount = estateSettings.monthly_security_levy || 5000;
  const formattedLevy = `₦${levyAmount.toLocaleString()}`;

  const handleLookupResident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchResidentNumber.trim()) {
      setSearchError('Please enter your Resident Number (e.g. 001, 002)');
      return;
    }

    setSearching(true);
    setSearchError('');
    try {
      const residents = await dbService.getResidents();
      const cleanInput = searchResidentNumber.trim();
      const target = residents.find(
        r => r.resident_number === cleanInput || 
             r.resident_number.padStart(3, '0') === cleanInput.padStart(3, '0')
      );

      if (!target) {
        setSearchError(`Resident Number "${cleanInput}" was not found in the estate directory.`);
        setSearchedResident(null);
        setResidentPayments([]);
      } else {
        setSearchedResident(target);
        // Load monthly payments for this resident
        const payments = await dbService.getMonthlyPayments({ residentNumber: target.resident_number });
        setResidentPayments(payments);
      }
    } catch {
      setSearchError('Unable to retrieve resident records. Please check your network.');
    } finally {
      setSearching(false);
    }
  };

  const handleQuickPayResident = (res: Resident) => {
    setSearchedResident(res);
    setIsPayModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <PublicNavbar
        currentTab="estate_levy"
        estateSettings={estateSettings}
        currentResident={currentResident}
        onNavigate={onNavigate}
        onOpenResidentLogin={onOpenResidentLogin}
        onOpenAdminLogin={onOpenAdminLogin}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header Section */}
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
                <CreditCard className="w-5 h-5" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
                Monthly Estate Security & Services Levy
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl">
              Pay your monthly estate dues securely online, view payment status, and retrieve verified stamped receipts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPayModalOpen(true)}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              <span>Pay Estate Levy Now</span>
            </button>
          </div>
        </div>

        {/* Levy Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Statutory Monthly Levy</p>
            <p className="text-3xl font-black text-emerald-950 font-mono">{formattedLevy}</p>
            <p className="text-xs text-slate-600">Per residential household / building unit</p>
            <div className="pt-2 flex items-center gap-1.5 text-[11px] text-emerald-800 font-semibold">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>Due on the 1st of every month</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Payment Channels</p>
            <p className="text-sm font-bold text-slate-900">Instant Online (Paystack) & Bank Transfer</p>
            <p className="text-xs text-slate-600 leading-relaxed">
              Debit Card, USSD, Bank Transfer, Apple Pay, & QR code. Receipts generated instantly.
            </p>
            <div className="pt-2 flex items-center gap-1.5 text-[11px] text-slate-600">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              <span>PCI-DSS Level 1 Encrypted</span>
            </div>
          </div>

          <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-md space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Levy Purpose & Allocation</p>
            <p className="text-xs text-slate-300 leading-relaxed">
              100% of collected security levies fund armed gate patrol officers, CCTV perimeter power, environmental sanitation, and road drainage desilting.
            </p>
            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={() => onNavigate('security_public')}
                className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
              >
                <span>View Security Operations</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Section 2: Direct Dues Lookup & Payment Widget */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Resident Dues Lookup */}
          <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-5">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Search className="w-4 h-4 text-emerald-700" />
                <span>Resident Dues & Payment Status Lookup</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Enter your Resident Number to check paid months, outstanding dues, and make instant payment.
              </p>
            </div>

            <form onSubmit={handleLookupResident} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Enter Resident No. (e.g. 001, 002, 003)"
                  value={searchResidentNumber}
                  onChange={(e) => setSearchResidentNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 text-slate-900 font-medium"
                />
              </div>
              <button
                type="submit"
                disabled={searching}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {searching ? 'Checking...' : 'Check Status'}
              </button>
            </form>

            {searchError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{searchError}</span>
              </div>
            )}

            {searchedResident && (
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/70 pb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Verified Resident Profile</span>
                    <p className="text-sm font-bold text-emerald-950">{searchedResident.full_name}</p>
                    <p className="text-xs text-emerald-800 font-mono">Resident #{searchedResident.resident_number} • {searchedResident.house_number}</p>
                  </div>
                  <button
                    onClick={() => handleQuickPayResident(searchedResident)}
                    className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Pay {formattedLevy}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Street / Address</p>
                    <p className="font-semibold text-slate-800 truncate">{searchedResident.address}</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Status</p>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      <CheckCircle2 className="w-3 h-3" />
                      {searchedResident.status}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-emerald-100 col-span-2 sm:col-span-1">
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Monthly Due</p>
                    <p className="font-mono font-bold text-emerald-900">{formattedLevy}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: What the Levy Covers */}
          <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-700" />
              <span>What Your Levy Covers</span>
            </h3>

            <ul className="space-y-3 text-xs">
              <li className="flex items-start gap-2.5">
                <div className="p-1 bg-emerald-100 text-emerald-800 rounded-md shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">24/7 Gate & Patrol Guards</p>
                  <p className="text-slate-600 text-[11px]">Uniformed security personnel stationed at main gates and mobile night patrols.</p>
                </div>
              </li>

              <li className="flex items-start gap-2.5">
                <div className="p-1 bg-emerald-100 text-emerald-800 rounded-md shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">Streetlight Power & Maintenance</p>
                  <p className="text-slate-600 text-[11px]">Solar battery replacement, LED light repairs, and illumination across avenues.</p>
                </div>
              </li>

              <li className="flex items-start gap-2.5">
                <div className="p-1 bg-emerald-100 text-emerald-800 rounded-md shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">Drainage Desilting & Vector Control</p>
                  <p className="text-slate-600 text-[11px]">Routine de-silting of roadside drains and environmental clearing of common areas.</p>
                </div>
              </li>

              <li className="flex items-start gap-2.5">
                <div className="p-1 bg-emerald-100 text-emerald-800 rounded-md shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">Perimeter CCTV & Gate Barrier Control</p>
                  <p className="text-slate-600 text-[11px]">Electronic access control systems, visitor logging, and rapid emergency response.</p>
                </div>
              </li>
            </ul>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => onNavigate('verify_receipt')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>Verify a Payment Receipt</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section 3: Payment FAQ */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-emerald-700" />
            <span>Estate Levy Payment Guidelines</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <p className="font-bold text-slate-900">When is the monthly levy due?</p>
              <p className="leading-relaxed">
                The levy is due on the 1st of every calendar month. A grace period is extended until the 10th before SMS reminders are dispatched.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <p className="font-bold text-slate-900">How do I get my official stamped receipt?</p>
              <p className="leading-relaxed">
                Receipts are generated immediately after online Paystack confirmation and can be downloaded as a PDF with a tamper-proof verification QR code.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <p className="font-bold text-slate-900">Can I pay in advance for multiple months or a full year?</p>
              <p className="leading-relaxed">
                Yes! Residents can pay for single months, quarterly (₦15,000), bi-annually (₦30,000), or annually (₦60,000) directly through the portal.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <p className="font-bold text-slate-900">Who do I contact for payment discrepancies?</p>
              <p className="leading-relaxed">
                Reach the Estate Accounts Desk via email at <span className="font-semibold text-slate-800">{estateSettings.contact_email || 'admin@fingerofgodestate.ng'}</span> or call <span className="font-semibold text-slate-800">{estateSettings.contact_phone || '08023456789'}</span>.
              </p>
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

      <PaystackPaymentModal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        estateSettings={estateSettings}
        preselectedResident={searchedResident || currentResident}
        targetMonth={selectedMonth}
        targetYear={selectedYear}
      />
    </div>
  );
};
