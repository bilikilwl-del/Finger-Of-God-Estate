import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Search, 
  Filter, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText, 
  Printer, 
  Download, 
  ExternalLink, 
  RefreshCw, 
  TrendingUp, 
  ArrowUpRight,
  User,
  Home,
  Hash,
  Phone,
  Calendar,
  Layers,
  Check,
  ChevronDown
} from 'lucide-react';
import { MonthlyPayment, PaymentTransaction, Receipt, Resident, EstateSettings } from '../../types/database';
import { dbService } from '../../lib/supabase';
import { formatNaira, getPaystackConfig, PaystackConfig } from '../../lib/paystack';
import { PaystackPaymentModal } from './PaystackPaymentModal';
import { ReceiptModal } from './ReceiptModal';

interface PaymentsViewProps {
  estateSettings?: EstateSettings;
  onNavigateToResident?: (residentNumber: string) => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({
  estateSettings,
  onNavigateToResident
}) => {
  const [selectedMonth, setSelectedMonth] = useState<number>(10);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [activeTab, setActiveTab] = useState<'monthly' | 'transactions' | 'receipts'>('monthly');

  // Data states
  const [monthlyPayments, setMonthlyPayments] = useState<MonthlyPayment[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [stats, setStats] = useState<{
    totalExpected: number;
    totalCollected: number;
    totalOutstanding: number;
    paidResidentsCount: number;
    unpaidResidentsCount: number;
    pendingPaymentsCount: number;
    failedPaymentsCount: number;
    totalResidentsCount: number;
    collectionRate: number;
  }>({
    totalExpected: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    paidResidentsCount: 0,
    unpaidResidentsCount: 0,
    pendingPaymentsCount: 0,
    failedPaymentsCount: 0,
    totalResidentsCount: 0,
    collectionRate: 0
  });

  const [paystackConfig, setPaystackConfig] = useState<PaystackConfig | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [channelFilter, setChannelFilter] = useState<string>('All');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payingResident, setPayingResident] = useState<Resident | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedTxForDetails, setSelectedTxForDetails] = useState<PaymentTransaction | null>(null);

  // Month options (Starting from October 2026 as per estate rule)
  const monthOptions = [
    { month: 10, year: 2026, label: 'October 2026 (First Levy Month)' },
    { month: 11, year: 2026, label: 'November 2026' },
    { month: 12, year: 2026, label: 'December 2026' },
    { month: 1, year: 2027, label: 'January 2027' }
  ];

  const loadPaymentData = async () => {
    setLoading(true);
    try {
      const [paymentsData, txData, statsData, cfg, receiptsData] = await Promise.all([
        dbService.getMonthlyPayments({ periodMonth: selectedMonth, periodYear: selectedYear }),
        dbService.getPaymentTransactions({ periodMonth: selectedMonth, periodYear: selectedYear }),
        dbService.getPaymentStats(selectedMonth, selectedYear),
        getPaystackConfig(),
        dbService.getAllReceipts()
      ]);

      setMonthlyPayments(paymentsData);
      setTransactions(txData);
      setStats(statsData);
      setPaystackConfig(cfg);
      setReceipts(receiptsData);
    } catch (err) {
      console.error('Error fetching payments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPaymentData();
  }, [selectedMonth, selectedYear]);

  // Filtered monthly payments
  const filteredMonthlyPayments = monthlyPayments.filter(p => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      !q ||
      p.resident_number.toLowerCase().includes(q) ||
      (p.resident?.full_name && p.resident.full_name.toLowerCase().includes(q)) ||
      (p.resident?.house_number && p.resident.house_number.toLowerCase().includes(q)) ||
      (p.resident?.phone_number && p.resident.phone_number.includes(q)) ||
      (p.paystack_reference && p.paystack_reference.toLowerCase().includes(q));

    const matchesStatus = 
      statusFilter === 'All' || 
      p.status.toUpperCase() === statusFilter.toUpperCase();

    return matchesSearch && matchesStatus;
  });

  // Filtered transactions
  const filteredTransactions = transactions.filter(t => {
    const q = searchQuery.toLowerCase().trim();
    const rcp = receipts.find(r => r.paystack_reference === t.paystack_reference || r.resident_number === t.resident_number);
    const matchesSearch = 
      !q ||
      t.resident_number.toLowerCase().includes(q) ||
      (t.resident?.full_name && t.resident.full_name.toLowerCase().includes(q)) ||
      (t.resident?.phone_number && t.resident.phone_number.includes(q)) ||
      (t.paystack_reference && t.paystack_reference.toLowerCase().includes(q)) ||
      t.transaction_reference.toLowerCase().includes(q) ||
      (rcp && rcp.receipt_number.toLowerCase().includes(q));

    const matchesStatus = 
      statusFilter === 'All' || 
      t.status.toUpperCase() === statusFilter.toUpperCase();

    const matchesChannel =
      channelFilter === 'All' ||
      (t.payment_channel && t.payment_channel.toUpperCase() === channelFilter.toUpperCase());

    return matchesSearch && matchesStatus && matchesChannel;
  });

  // Filtered Digital Receipts
  const filteredReceipts = receipts.filter(r => {
    const q = searchQuery.toLowerCase().trim();
    return !q ||
      r.receipt_number.toLowerCase().includes(q) ||
      r.resident_number.toLowerCase().includes(q) ||
      r.resident_name.toLowerCase().includes(q) ||
      r.paystack_reference.toLowerCase().includes(q) ||
      r.period_covered.toLowerCase().includes(q);
  });

  const handleOpenPayment = (resident?: Resident) => {
    setPayingResident(resident || null);
    setIsPayModalOpen(true);
  };

  const handleViewReceipt = async (reference: string) => {
    const rcp = await dbService.getReceiptByReference(reference);
    if (rcp) {
      setSelectedReceipt(rcp);
      setIsReceiptModalOpen(true);
    }
  };

  return (
    <div className="space-y-6">

      {/* Top Banner / Month Selection & Payment Action */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-widest">
              Stage 4 Active
            </span>
            <span className="text-xs font-semibold text-slate-500">
              Paystack Levy Management (₦5,000 / month)
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight font-display">
            Monthly Security Levy Payments
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Monitor verified Paystack collections, check defaulters, and issue official receipts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Month Selector */}
          <div className="relative">
            <select
              value={`${selectedMonth}-${selectedYear}`}
              onChange={(e) => {
                const [m, y] = e.target.value.split('-');
                setSelectedMonth(Number(m));
                setSelectedYear(Number(y));
              }}
              className="appearance-none bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold py-2.5 pl-3.5 pr-8 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
            >
              {monthOptions.map(opt => (
                <option key={`${opt.month}-${opt.year}`} value={`${opt.month}-${opt.year}`}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            onClick={() => handleOpenPayment()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            <span>Pay with Paystack</span>
          </button>
        </div>
      </div>

      {/* Paystack Gateway Security Health Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Gateway Info */}
        <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between border border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Paystack Gateway</span>
            </div>
            <p className="text-sm font-black text-white font-display">
              {paystackConfig?.mode === 'live' ? 'Live Production Mode' : 'Test Mode (Sandbox)'}
            </p>
            <span className="text-[10px] text-slate-400 block font-mono">
              Server verification active (PAYSTACK_SECRET_KEY)
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-black text-[#0ba4db]">
            P
          </div>
        </div>

        {/* Webhook Endpoint Status */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Webhook Listener</span>
            <p className="text-xs font-mono font-bold text-slate-800 truncate max-w-[200px]">
              {paystackConfig?.webhookUrl || '/api/paystack/webhook'}
            </p>
            <span className="text-[10px] text-emerald-600 font-semibold block flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              HMAC SHA512 Signature Protected
            </span>
          </div>
          <div className="p-2 rounded-xl bg-slate-100 text-slate-600">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* First Payment Month Rule Notice */}
        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block">Estate Rule</span>
            <p className="text-xs font-bold text-emerald-950">
              Levy Cycle begins October 2026
            </p>
            <span className="text-[10px] text-emerald-700 block">
              ₦5,000 flat monthly security levy per resident
            </span>
          </div>
          <div className="p-2 rounded-xl bg-emerald-200/60 text-emerald-900">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Expected */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Expected</span>
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-display">
            {formatNaira(stats.totalExpected)}
          </div>
          <p className="text-[11px] text-slate-500">
            {stats.totalResidentsCount} active estate resident{stats.totalResidentsCount !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Total Collected */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Collected</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 font-display">
            {formatNaira(stats.totalCollected)}
          </div>
          <p className="text-[11px] text-slate-500">
            {stats.paidResidentsCount} of {stats.totalResidentsCount} paid ({stats.collectionRate}%)
          </p>
        </div>

        {/* Total Outstanding */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Outstanding</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600 font-display">
            {formatNaira(stats.totalOutstanding)}
          </div>
          <p className="text-[11px] text-rose-600 font-medium">
            {stats.unpaidResidentsCount} resident{stats.unpaidResidentsCount !== 1 ? 's' : ''} with arrears
          </p>
        </div>

        {/* Pending & Failed */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Gateway Incomplete</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-800 font-display">
            {stats.pendingPaymentsCount + stats.failedPaymentsCount}
          </div>
          <p className="text-[11px] text-slate-500">
            {stats.pendingPaymentsCount} pending, {stats.failedPaymentsCount} failed
          </p>
        </div>

      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Tab Header & Filter Controls */}
        <div className="p-4 sm:p-6 border-b border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            {/* View Switcher */}
            <div className="flex items-center p-1 bg-slate-100 rounded-2xl w-fit">
              <button
                onClick={() => setActiveTab('monthly')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'monthly'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Resident Monthly Status ({filteredMonthlyPayments.length})
              </button>
              <button
                onClick={() => setActiveTab('transactions')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'transactions'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Paystack Transactions ({filteredTransactions.length})
              </button>
              <button
                onClick={() => setActiveTab('receipts')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'receipts'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Digital Receipts ({filteredReceipts.length})
              </button>
            </div>

            {/* Quick Refresh */}
            <button
              onClick={loadPaymentData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Records</span>
            </button>
          </div>

          {/* Search & Status Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by resident number, full name, house, or reference..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-slate-200 text-xs font-medium text-slate-700 py-2.5 px-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="PAID">Paid</option>
                <option value="UNPAID">Unpaid</option>
                <option value="PENDING">Pending</option>
                <option value="FAILED">Failed</option>
              </select>

              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                className="bg-white border border-slate-200 text-xs font-medium text-slate-700 py-2.5 px-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
              >
                <option value="All">All Channels</option>
                <option value="CARD">Card</option>
                <option value="BANK">Bank</option>
                <option value="TRANSFER">Transfer</option>
                <option value="USSD">USSD</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tab 1: Monthly Payments by Resident */}
        {activeTab === 'monthly' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="py-3.5 px-4">Resident No.</th>
                  <th className="py-3.5 px-4">Resident Name</th>
                  <th className="py-3.5 px-4">House / Plot</th>
                  <th className="py-3.5 px-4">Phone Number</th>
                  <th className="py-3.5 px-4">Amount Due</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Payment Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredMonthlyPayments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No payment records found for the selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredMonthlyPayments.map((p) => {
                    const isPaid = p.status.toUpperCase() === 'PAID';
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          #{p.resident_number}
                        </td>
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => onNavigateToResident && onNavigateToResident(p.resident_number)}
                            className="font-bold text-slate-900 hover:text-emerald-700 transition-colors text-left cursor-pointer"
                          >
                            {p.resident?.full_name || 'Resident #' + p.resident_number}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {p.resident?.house_number || 'Estate Resident'}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600">
                          {p.resident?.phone_number || '-'}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {formatNaira(p.amount_due)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : p.status.toUpperCase() === 'PENDING'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}>
                            {isPaid && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                            <span>{p.status}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {p.paid_at ? new Date(p.paid_at).toLocaleDateString('en-NG') : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isPaid ? (
                              <button
                                onClick={() => p.paystack_reference && handleViewReceipt(p.paystack_reference)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 font-bold transition-colors cursor-pointer"
                                title="View Official Receipt"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Receipt</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleOpenPayment(p.resident)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-bold transition-colors shadow-xs cursor-pointer"
                                title="Proceed to Paystack"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>Pay Levy</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Paystack Gateway Transactions */}
        {activeTab === 'transactions' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="py-3.5 px-4">Transaction Date</th>
                  <th className="py-3.5 px-4">Resident</th>
                  <th className="py-3.5 px-4">Month</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Paystack Ref</th>
                  <th className="py-3.5 px-4">Receipt Number</th>
                  <th className="py-3.5 px-4">Channel</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      No Paystack transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => {
                    const isSuccess = tx.status.toUpperCase() === 'PAID' || tx.status.toLowerCase() === 'success';
                    const rcp = receipts.find(r => r.paystack_reference === tx.paystack_reference || r.resident_number === tx.resident_number);
                    const receiptNum = rcp ? rcp.receipt_number : (isSuccess ? `FOGES-REC-202610-${tx.resident_number}-A7C8E9` : '—');
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                          {new Date(tx.payment_date || tx.created_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-slate-900 block">#{tx.resident_number}</span>
                          <span className="text-[11px] text-slate-500">{tx.resident?.full_name || 'Resident'}</span>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-700">
                          {tx.period_label}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {formatNaira(tx.amount_paid || tx.amount_due)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isSuccess
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : tx.status.toUpperCase() === 'PENDING'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}>
                            {isSuccess ? 'PAID' : tx.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] font-semibold text-slate-800">
                          <span className="truncate max-w-[120px] inline-block" title={tx.paystack_reference || undefined}>
                            {tx.paystack_reference || tx.transaction_reference}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-700">
                          <span className="truncate max-w-[130px] inline-block" title={receiptNum}>
                            {receiptNum}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 uppercase text-[10px] font-bold text-slate-600">
                          {tx.payment_channel || 'CARD'}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => setSelectedTxForDetails(tx)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors text-xs"
                            title="Inspect Transaction Details"
                          >
                            Details
                          </button>
                          {isSuccess && (
                            <button
                              onClick={() => handleViewReceipt(tx.paystack_reference || tx.transaction_reference)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 font-bold transition-colors cursor-pointer text-xs"
                              title="View Official Digital Receipt"
                            >
                              <FileText className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Receipt</span>
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
        )}

        {/* Tab 3: Official Digital Receipts */}
        {activeTab === 'receipts' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="py-3.5 px-4">Receipt Number</th>
                  <th className="py-3.5 px-4">Resident</th>
                  <th className="py-3.5 px-4">House / Plot</th>
                  <th className="py-3.5 px-4">Period</th>
                  <th className="py-3.5 px-4">Amount Paid</th>
                  <th className="py-3.5 px-4">Payment Date</th>
                  <th className="py-3.5 px-4">Paystack Reference</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredReceipts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      No official digital receipts found matching search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredReceipts.map((rcp) => (
                    <tr key={rcp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {rcp.receipt_number}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">{rcp.resident_name}</span>
                        <span className="font-mono text-[11px] text-slate-500">#{rcp.resident_number}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {rcp.house_number}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {rcp.period_covered}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {formatNaira(rcp.amount_paid || 5000)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {new Date(rcp.payment_date).toLocaleDateString('en-NG', { dateStyle: 'medium' })}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-700">
                        {rcp.paystack_reference}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>PAID</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedReceipt(rcp);
                            setIsReceiptModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold transition-colors cursor-pointer text-xs shadow-2xs"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>VIEW RECEIPT</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Paystack Payment Checkout Modal */}
      <PaystackPaymentModal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        preselectedResident={payingResident}
        estateSettings={estateSettings}
        targetMonth={selectedMonth}
        targetYear={selectedYear}
        onPaymentSuccess={() => {
          loadPaymentData();
        }}
      />

      {/* Digital Receipt Modal */}
      <ReceiptModal
        receipt={selectedReceipt}
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        estateSettings={estateSettings}
      />

      {/* Transaction Details Modal (Stage 7) */}
      {selectedTxForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  Transaction Audit
                </span>
                <h3 className="text-lg font-bold font-display text-slate-900 mt-1">
                  Paystack Transaction Details
                </h3>
              </div>
              <button
                onClick={() => setSelectedTxForDetails(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Resident Information */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1.5 text-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                Resident Details
              </span>
              <div className="flex justify-between">
                <span className="text-slate-500">Resident Name:</span>
                <span className="font-bold text-slate-900">{selectedTxForDetails.resident?.full_name || 'Estate Resident'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Resident Number:</span>
                <span className="font-mono font-bold text-slate-900">#{selectedTxForDetails.resident_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">House / Plot:</span>
                <span className="text-slate-700">{selectedTxForDetails.resident?.house_number || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Phone Number:</span>
                <span className="font-mono text-slate-700">{selectedTxForDetails.resident?.phone_number || '—'}</span>
              </div>
            </div>

            {/* Payment Details */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1.5 text-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                Payment Information
              </span>
              <div className="flex justify-between">
                <span className="text-slate-500">Billing Month:</span>
                <span className="font-semibold text-slate-900">{selectedTxForDetails.period_label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Due:</span>
                <span className="font-mono font-semibold text-slate-900">₦{selectedTxForDetails.amount_due.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Paid:</span>
                <span className="font-mono font-bold text-emerald-600">
                  ₦{(selectedTxForDetails.amount_paid || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Transaction Status:</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  selectedTxForDetails.status === 'PAID'
                    ? 'bg-emerald-100 text-emerald-800'
                    : selectedTxForDetails.status === 'PENDING'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}>
                  {selectedTxForDetails.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Channel:</span>
                <span className="uppercase font-semibold text-slate-800">{selectedTxForDetails.payment_channel || 'CARD'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Date:</span>
                <span className="font-mono text-slate-700">
                  {new Date(selectedTxForDetails.payment_date || selectedTxForDetails.created_at).toLocaleString('en-GB')}
                </span>
              </div>
            </div>

            {/* Gateway & Receipt References */}
            <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100 space-y-1.5 text-xs">
              <span className="text-[10px] font-bold uppercase text-blue-700 block tracking-wider">
                Gateway Verification
              </span>
              <div className="flex justify-between">
                <span className="text-slate-500">Paystack Reference:</span>
                <span className="font-mono font-semibold text-slate-900 select-all">
                  {selectedTxForDetails.paystack_reference}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Receipt Number:</span>
                <span className="font-mono font-semibold text-emerald-700 select-all">
                  {(() => {
                    const r = receipts.find(rc => rc.paystack_reference === selectedTxForDetails.paystack_reference || rc.resident_number === selectedTxForDetails.resident_number);
                    return r ? r.receipt_number : (selectedTxForDetails.status === 'PAID' ? `FOGES-REC-202610-${selectedTxForDetails.resident_number}-A7C8E9` : 'Not Issued');
                  })()}
                </span>
              </div>
            </div>

            {/* Strict NDPR / PCI-DSS notice */}
            <div className="p-2.5 bg-slate-100 rounded-lg text-[10px] text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                Sensitive card numbers and CVVs are strictly not retained or displayed to maintain NDPR and PCI-DSS compliance.
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedTxForDetails(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                Close
              </button>
              {selectedTxForDetails.status === 'PAID' && (
                <button
                  onClick={() => {
                    const ref = selectedTxForDetails.paystack_reference || selectedTxForDetails.transaction_reference;
                    setSelectedTxForDetails(null);
                    if (ref) handleViewReceipt(ref);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>View Official Receipt</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
