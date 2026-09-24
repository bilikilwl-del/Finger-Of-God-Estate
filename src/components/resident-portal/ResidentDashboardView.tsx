import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  User, 
  Home, 
  Calendar, 
  CreditCard, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock, 
  FileText, 
  Printer, 
  Download, 
  ArrowUpRight, 
  ChevronRight, 
  Phone, 
  Mail, 
  MapPin, 
  RefreshCw, 
  LogOut, 
  Info, 
  ExternalLink,
  Filter,
  Search,
  Sparkles,
  Lock
} from 'lucide-react';
import { 
  Resident, 
  MonthlyPayment, 
  PaymentTransaction, 
  Receipt, 
  ResidentDashboardData, 
  EstateSettings 
} from '../../types/database';
import { dbService, residentSessionService } from '../../lib/supabase';
import { formatNaira } from '../../lib/paystack';
import { PaystackPaymentModal } from '../payments/PaystackPaymentModal';
import { ReceiptModal } from '../payments/ReceiptModal';

interface ResidentDashboardViewProps {
  currentResident: Resident;
  onLogout: () => void;
  onSwitchResident: () => void;
  onNavigateToVerifyReceipt?: (receiptNumber?: string) => void;
  onNavigateToAdmin?: () => void;
  estateSettings?: EstateSettings;
}

export const ResidentDashboardView: React.FC<ResidentDashboardViewProps> = ({
  currentResident,
  onLogout,
  onSwitchResident,
  onNavigateToVerifyReceipt,
  onNavigateToAdmin,
  estateSettings
}) => {
  const [dashboardData, setDashboardData] = useState<ResidentDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [paymentTargetMonth, setPaymentTargetMonth] = useState<{ month: number; year: number; label: string } | null>(null);
  
  // History Filters
  const [selectedYear, setSelectedYear] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'profile'>('overview');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await dbService.getResidentDashboard(currentResident.resident_number);
      if (data) {
        setDashboardData(data);
      }
    } catch (err) {
      console.error('Failed to load resident dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentResident.resident_number]);

  const handleOpenPayment = (month: number = 10, year: number = 2026, label: string = 'October 2026') => {
    setPaymentTargetMonth({ month, year, label });
    setIsPayModalOpen(true);
  };

  const handlePaymentSuccess = async (tx: PaymentTransaction, rcp?: Receipt) => {
    setIsPayModalOpen(false);
    await loadData();
    if (rcp) {
      setSelectedReceipt(rcp);
      setIsReceiptModalOpen(true);
    } else {
      // Find newly generated receipt
      const updatedData = await dbService.getResidentDashboard(currentResident.resident_number);
      if (updatedData && updatedData.receipts.length > 0) {
        setSelectedReceipt(updatedData.receipts[0]);
        setIsReceiptModalOpen(true);
      }
    }
  };

  const handleViewReceipt = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setIsReceiptModalOpen(true);
  };

  const handleFindReceiptForPayment = (payment: MonthlyPayment) => {
    if (!dashboardData) return;
    const found = dashboardData.receipts.find(
      r => r.payment_id === payment.id || 
           (payment.paystack_reference && r.paystack_reference === payment.paystack_reference) ||
           r.period_covered === payment.period_label
    );
    if (found) {
      setSelectedReceipt(found);
      setIsReceiptModalOpen(true);
    } else {
      // Generate preview receipt from payment record
      const preview: Receipt = {
        id: `rcp-gen-${payment.id}`,
        receipt_number: `FOGES-REC-${payment.period_year}${String(payment.period_month).padStart(2, '0')}-${currentResident.resident_number}-OFFICIAL`,
        transaction_id: 'tx-verified',
        payment_id: payment.id,
        resident_id: currentResident.id,
        resident_number: currentResident.resident_number,
        resident_name: currentResident.full_name,
        house_number: currentResident.house_number,
        amount_paid: payment.amount_paid || 5000,
        currency: 'NGN',
        period_covered: payment.period_label,
        payment_date: payment.paid_at || new Date().toISOString(),
        paystack_reference: payment.paystack_reference || `FOGES-${payment.period_year}${payment.period_month}-${currentResident.resident_number}`,
        status: 'PAID',
        issued_at: payment.paid_at || new Date().toISOString()
      };
      setSelectedReceipt(preview);
      setIsReceiptModalOpen(true);
    }
  };

  // Filtered History
  const filteredHistory = (dashboardData?.paymentHistory || []).filter(item => {
    if (selectedYear !== 'All' && String(item.period_year) !== selectedYear) return false;
    if (selectedStatus !== 'All' && item.status !== selectedStatus) return false;
    return true;
  });

  const currentMonth = dashboardData?.currentMonthPayment;
  const isCurrentMonthPaid = currentMonth?.status === 'PAID';
  const outstandingList = dashboardData?.outstandingLevies || [];

  return (
    <div className="min-h-screen bg-slate-50/70 pb-16">
      {/* Top Resident Bar */}
      <div className="bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 block">
                Finger of God Estate Security Management
              </span>
              <span className="text-sm font-black text-white font-display">
                Resident Portal • My Security Levy
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={onSwitchResident}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors cursor-pointer border border-slate-700"
            >
              Switch Profile
            </button>
            {onNavigateToVerifyReceipt && (
              <button
                onClick={() => onNavigateToVerifyReceipt()}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 font-medium transition-colors cursor-pointer border border-slate-700"
              >
                Verify Receipt
              </button>
            )}
            {onNavigateToAdmin && (
              <button
                onClick={onNavigateToAdmin}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors cursor-pointer border border-slate-700"
              >
                Admin Console
              </button>
            )}
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-200 transition-colors cursor-pointer ml-1"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-6">
        
        {/* Resident Identity Header Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-800 border-2 border-emerald-300 flex items-center justify-center font-mono font-black text-xl shadow-xs shrink-0">
                #{currentResident.resident_number}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-display">
                    {currentResident.full_name}
                  </h1>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    currentResident.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {currentResident.status} Resident
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Home className="w-3.5 h-3.5 text-slate-400" />
                    <span>{currentResident.house_number}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{currentResident.address}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{currentResident.phone_number}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Status Tag */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-left sm:text-right min-w-[200px]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Current Levy Status • October 2026
                </span>
                <div className="flex items-center gap-2 mt-0.5 sm:justify-end">
                  {isCurrentMonthPaid ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-black text-xs uppercase">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                      <span>PAID</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-black text-xs uppercase">
                      <Clock className="w-3.5 h-3.5 text-amber-700" />
                      <span>UNPAID</span>
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={loadData}
                disabled={isLoading}
                className="p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                title="Refresh Records"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
              </button>
            </div>

          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-2 pt-6 mt-6 border-t border-slate-100 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              MY SECURITY LEVY
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              PAYMENT HISTORY ({dashboardData?.paymentHistory.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              MY RESIDENT DETAILS
            </button>
          </div>
        </div>

        {/* Tab 1: Overview & Active Levy */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            
            {/* 5 SUMMARY CARDS REQUIRED BY STAGE 6 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
              
              {/* CARD 1: CURRENT MONTH */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  CURRENT MONTH
                </span>
                <div className="pt-1">
                  {isCurrentMonthPaid ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-black text-xs uppercase">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                      <span>PAID</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-black text-xs uppercase">
                      <Clock className="w-3.5 h-3.5 text-amber-700" />
                      <span>UNPAID</span>
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 font-medium pt-1">October 2026</p>
              </div>

              {/* CARD 2: TOTAL PAID */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  TOTAL PAID
                </span>
                <div className="pt-1">
                  <span className="text-xl sm:text-2xl font-black text-emerald-700 font-display">
                    {formatNaira(dashboardData?.summary.totalPaid || 0)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium pt-1">Verified Paystack levies</p>
              </div>

              {/* CARD 3: TOTAL OUTSTANDING */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  TOTAL OUTSTANDING
                </span>
                <div className="pt-1">
                  <span className={`text-xl sm:text-2xl font-black font-display ${
                    (dashboardData?.summary.totalOutstanding || 0) > 0 ? 'text-amber-700' : 'text-slate-800'
                  }`}>
                    {formatNaira(dashboardData?.summary.totalOutstanding || 0)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium pt-1">Amount due</p>
              </div>

              {/* CARD 4: MONTHS PAID */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  MONTHS PAID
                </span>
                <div className="pt-1">
                  <span className="text-xl sm:text-2xl font-black text-slate-900 font-display">
                    {dashboardData?.summary.monthsPaid || 0}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium pt-1">Cleared cycles</p>
              </div>

              {/* CARD 5: MONTHS OUTSTANDING */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-1 col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  MONTHS OUTSTANDING
                </span>
                <div className="pt-1">
                  <span className={`text-xl sm:text-2xl font-black font-display ${
                    (dashboardData?.summary.monthsOutstanding || 0) > 0 ? 'text-amber-700' : 'text-emerald-700'
                  }`}>
                    {dashboardData?.summary.monthsOutstanding || 0}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium pt-1">Unpaid billing periods</p>
              </div>

            </div>

            {/* PROMINENT CURRENT-MONTH SECTION */}
            <div className={`rounded-3xl p-6 sm:p-8 border-2 transition-all ${
              isCurrentMonthPaid 
                ? 'bg-emerald-900 text-white border-emerald-700 shadow-xl' 
                : 'bg-white text-slate-900 border-amber-300 shadow-lg'
            }`}>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full ${
                      isCurrentMonthPaid ? 'bg-emerald-800 text-emerald-200' : 'bg-amber-100 text-amber-900'
                    }`}>
                      ACTIVE BILLING PERIOD
                    </span>
                    <span className={`text-xs font-bold ${isCurrentMonthPaid ? 'text-emerald-300' : 'text-slate-500'}`}>
                      Due: 1st of Every Month
                    </span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-black font-display tracking-tight uppercase">
                    OCTOBER 2026 SECURITY LEVY
                  </h2>

                  <div className="flex flex-wrap items-center gap-4 pt-1">
                    <div>
                      <span className={`text-xs uppercase font-bold tracking-wider block ${
                        isCurrentMonthPaid ? 'text-emerald-300' : 'text-slate-500'
                      }`}>
                        Amount Due
                      </span>
                      <span className="text-xl sm:text-2xl font-black font-display">
                        ₦5,000
                      </span>
                    </div>

                    <div className="h-8 w-px bg-slate-300/40" />

                    <div>
                      <span className={`text-xs uppercase font-bold tracking-wider block ${
                        isCurrentMonthPaid ? 'text-emerald-300' : 'text-slate-500'
                      }`}>
                        Status
                      </span>
                      {isCurrentMonthPaid ? (
                        <span className="inline-flex items-center gap-1 text-emerald-300 font-black text-sm uppercase">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>PAID</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-black text-sm uppercase">
                          <Clock className="w-4 h-4" />
                          <span>UNPAID</span>
                        </span>
                      )}
                    </div>

                    {isCurrentMonthPaid && currentMonth && (
                      <>
                        <div className="h-8 w-px bg-slate-300/40" />
                        <div>
                          <span className="text-xs uppercase font-bold tracking-wider text-emerald-300 block">
                            Payment Date
                          </span>
                          <span className="text-xs sm:text-sm font-semibold text-emerald-100">
                            {currentMonth.paid_at ? new Date(currentMonth.paid_at).toLocaleDateString('en-NG', { dateStyle: 'medium' }) : 'Confirmed'}
                          </span>
                        </div>
                        <div className="h-8 w-px bg-slate-300/40" />
                        <div>
                          <span className="text-xs uppercase font-bold tracking-wider text-emerald-300 block">
                            Transaction Reference
                          </span>
                          <span className="text-xs font-mono text-emerald-200">
                            {currentMonth.paystack_reference || 'FOGES-202610-001-XXXX'}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Prominent Action Button */}
                <div className="w-full md:w-auto shrink-0">
                  {isCurrentMonthPaid ? (
                    <button
                      onClick={() => currentMonth && handleFindReceiptForPayment(currentMonth)}
                      className="w-full md:w-auto px-8 py-4 rounded-2xl bg-white text-emerald-950 hover:bg-emerald-50 font-black text-sm tracking-wider uppercase transition-all shadow-md flex items-center justify-center gap-2.5 cursor-pointer"
                    >
                      <FileText className="w-5 h-5 text-emerald-700" />
                      <span>VIEW RECEIPT</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenPayment(10, 2026, 'October 2026')}
                      className="w-full md:w-auto px-8 py-4 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-sm tracking-wider uppercase transition-all shadow-xl flex items-center justify-center gap-2.5 cursor-pointer ring-4 ring-emerald-600/30"
                    >
                      <CreditCard className="w-5 h-5" />
                      <span>PAY ₦5,000</span>
                    </button>
                  )}
                </div>

              </div>
            </div>

            {/* OUTSTANDING LEVIES SECTION */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900 font-display uppercase tracking-tight">
                    OUTSTANDING LEVIES
                  </h3>
                  <p className="text-xs text-slate-500">
                    Legitimate unpaid estate security levy periods
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                  {outstandingList.length} Outstanding
                </span>
              </div>

              {outstandingList.length === 0 ? (
                <div className="p-8 text-center bg-emerald-50/50 rounded-2xl border border-emerald-200/80 space-y-2">
                  <div className="inline-flex p-3 rounded-full bg-emerald-100 text-emerald-800 mb-1">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="font-black text-slate-900 text-base">All Levies Cleared</h4>
                  <p className="text-xs text-slate-600 max-w-md mx-auto">
                    You have no outstanding security levy payments. All current monthly security levies for your residence have been successfully confirmed.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                  {outstandingList.map((item) => (
                    <div key={item.id} className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white hover:bg-slate-50/60 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">
                            {item.period_label}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-black text-[11px] uppercase">
                            UNPAID
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium">
                          Security levy fee: <span className="font-bold text-slate-800">₦5,000</span> • Due 1st of month
                        </p>
                      </div>

                      <button
                        onClick={() => handleOpenPayment(item.period_month, item.period_year, item.period_label)}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs tracking-wider uppercase transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>PAY NOW</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RECENT DIGITAL RECEIPTS PREVIEW */}
            {dashboardData && dashboardData.receipts.length > 0 && (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 font-display uppercase tracking-tight">
                      MY DIGITAL RECEIPTS
                    </h3>
                    <p className="text-xs text-slate-500">
                      Official verified receipts for your estate security levy payments
                    </p>
                  </div>
                  <span className="text-xs font-bold text-emerald-700">
                    {dashboardData.receipts.length} Official Receipt(s)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dashboardData.receipts.map((rcp) => (
                    <div
                      key={rcp.id}
                      className="p-5 rounded-2xl border border-slate-200 bg-slate-50/40 hover:bg-slate-50 hover:border-emerald-300 transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                            Receipt Number
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-900">
                            {rcp.receipt_number}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-black text-[10px] uppercase">
                          PAID
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <div>
                          <span className="text-slate-500 block">Period</span>
                          <span className="font-bold text-slate-800">{rcp.period_covered}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-500 block">Amount</span>
                          <span className="font-black text-slate-900">{formatNaira(rcp.amount_paid || 5000)}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">
                          {new Date(rcp.payment_date).toLocaleDateString('en-NG', { dateStyle: 'medium' })}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewReceipt(rcp)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>View Receipt</span>
                          </button>
                          {onNavigateToVerifyReceipt && (
                            <button
                              onClick={() => onNavigateToVerifyReceipt(rcp.receipt_number)}
                              className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-200 text-slate-600 cursor-pointer"
                              title="Verify Receipt Publicly"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* Tab 2: Complete Payment History */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 font-display uppercase tracking-tight">
                  COMPLETE PAYMENT HISTORY
                </h3>
                <p className="text-xs text-slate-500">
                  Full chronological record of security levy payments and receipts
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-500 font-medium">Year:</span>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="All">All Years</option>
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                  <span className="text-slate-500 font-medium">Status:</span>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="All">All Statuses</option>
                    <option value="PAID">PAID</option>
                    <option value="UNPAID">UNPAID</option>
                    <option value="PENDING">PENDING</option>
                    <option value="FAILED">FAILED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Responsive Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                  <tr>
                    <th className="py-3 px-4">Billing Month</th>
                    <th className="py-3 px-4">Amount Due</th>
                    <th className="py-3 px-4">Amount Paid</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Payment Date</th>
                    <th className="py-3 px-4">Transaction Ref</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No payments found matching the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((item) => {
                      const isPaid = item.status === 'PAID';
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-4 px-4 font-bold text-slate-900">
                            {item.period_label}
                          </td>
                          <td className="py-4 px-4 font-semibold text-slate-700">
                            {formatNaira(item.amount_due || 5000)}
                          </td>
                          <td className="py-4 px-4 font-bold text-slate-900">
                            {formatNaira(item.amount_paid || 0)}
                          </td>
                          <td className="py-4 px-4">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-black text-[11px] uppercase">
                                <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                                <span>PAID</span>
                              </span>
                            ) : item.status === 'PENDING' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-300 font-black text-[11px] uppercase">
                                <Clock className="w-3 h-3" />
                                <span>PENDING</span>
                              </span>
                            ) : item.status === 'FAILED' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-300 font-black text-[11px] uppercase">
                                <XCircle className="w-3 h-3" />
                                <span>FAILED</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-black text-[11px] uppercase">
                                <Clock className="w-3 h-3 text-amber-700" />
                                <span>UNPAID</span>
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-slate-600 font-medium">
                            {item.paid_at ? new Date(item.paid_at).toLocaleDateString('en-NG', { dateStyle: 'medium' }) : '—'}
                          </td>
                          <td className="py-4 px-4 font-mono text-[11px] text-slate-700">
                            {item.paystack_reference || '—'}
                          </td>
                          <td className="py-4 px-4 text-right">
                            {isPaid ? (
                              <button
                                onClick={() => handleFindReceiptForPayment(item)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>View Receipt</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleOpenPayment(item.period_month, item.period_year, item.period_label)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>Pay Now</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Resident Profile & Estate Info */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-900 font-display uppercase tracking-tight">
                ESTATE RESIDENT PROFILE
              </h3>
              <p className="text-xs text-slate-500">
                Official residency registration records for Finger of God Estate
              </p>
            </div>

            {/* Read-Only Notice */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3 text-xs text-slate-600">
              <Lock className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-800">Security Profile Integrity</p>
                <p className="mt-0.5">
                  Residents are not permitted to modify sensitive resident identification information directly. To update your name, house allocation, or registered telephone numbers, please contact the security administration desk.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Resident Number</span>
                <span className="font-mono text-base font-bold text-slate-900">#{currentResident.resident_number}</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Full Name</span>
                <span className="text-sm font-bold text-slate-900">{currentResident.full_name}</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">House / Plot</span>
                <span className="text-sm font-semibold text-slate-800">{currentResident.house_number}</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Address</span>
                <span className="text-sm font-semibold text-slate-800">{currentResident.address}</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Registered Phone</span>
                <span className="font-mono text-sm font-semibold text-slate-900">{currentResident.phone_number}</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Additional Phone</span>
                <span className="font-mono text-sm text-slate-700">{currentResident.additional_phone || 'None registered'}</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Email Address</span>
                <span className="text-sm text-slate-800">{currentResident.email || 'None registered'}</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">State & LGA</span>
                <span className="text-sm text-slate-800">{currentResident.state || 'Lagos'}, {currentResident.lga || 'Eti-Osa'}</span>
              </div>
            </div>

            {/* Estate Office Contact */}
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-2">
              <p className="font-bold text-sm text-emerald-900">Need Help or Profile Update?</p>
              <p className="text-emerald-800">
                For corrections, disputes, or security clearance passes, reach out to the Finger of God Estate Security Management Office:
              </p>
              <div className="flex flex-wrap gap-4 pt-1 font-semibold text-emerald-900">
                <span>Phone: 08023456789</span>
                <span>Email: admin@fingerofgodestate.ng</span>
                <span>Location: Security Command Gate, Phase 1</span>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Paystack Payment Checkout Modal */}
      {isPayModalOpen && (
        <PaystackPaymentModal
          isOpen={isPayModalOpen}
          onClose={() => setIsPayModalOpen(false)}
          preselectedResident={currentResident}
          targetMonth={paymentTargetMonth?.month || 10}
          targetYear={paymentTargetMonth?.year || 2026}
          estateSettings={estateSettings}
          onPaymentSuccess={async () => {
            setIsPayModalOpen(false);
            await loadData();
          }}
        />
      )}

      {/* Official Digital Receipt Modal */}
      {selectedReceipt && (
        <ReceiptModal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          receipt={selectedReceipt}
          estateSettings={estateSettings}
        />
      )}
    </div>
  );
};
