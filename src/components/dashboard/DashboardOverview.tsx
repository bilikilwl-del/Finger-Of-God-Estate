import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  UserX, 
  ShieldCheck, 
  Calendar, 
  Plus, 
  Settings, 
  Database, 
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  MessageSquare,
  Send,
  Search,
  Filter,
  BarChart3,
  PieChart,
  RefreshCw,
  FileSpreadsheet,
  AlertTriangle,
  Receipt,
  Check,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { Resident, EstateSettings, ActivityLog, NavigationTab, MonthlyFinancialSummary, GlobalPaymentSearchResult } from '../../types/database';
import { dbService } from '../../lib/supabase';

interface DashboardOverviewProps {
  residents: Resident[];
  estateSettings: EstateSettings;
  activityLogs: ActivityLog[];
  onNavigate: (tab: NavigationTab) => void;
  onAddResident: () => void;
  onViewResident: (resident: Resident) => void;
  onOpenSqlModal: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  residents,
  estateSettings,
  activityLogs,
  onNavigate,
  onAddResident,
  onViewResident,
  onOpenSqlModal
}) => {
  // Selected Month State for Financial Governance (Default: October 2026)
  const [selectedMonth, setSelectedMonth] = useState<number>(10);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [financialSummary, setFinancialSummary] = useState<MonthlyFinancialSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState<boolean>(true);

  // Global Payment Search
  const [paymentSearchQuery, setPaymentSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<GlobalPaymentSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);

  // SMS Summary Stats
  const [smsStats, setSmsStats] = useState({
    sentToday: 1,
    sentThisMonth: 1,
    reminder1Sent: 1,
    reminder2Sent: 0,
    failedSms: 0
  });

  const availableMonths = [
    { month: 10, year: 2026, label: 'October 2026' },
    { month: 11, year: 2026, label: 'November 2026' },
    { month: 12, year: 2026, label: 'December 2026' },
    { month: 1, year: 2027, label: 'January 2027' }
  ];

  const currentPeriod = availableMonths.find(m => m.month === selectedMonth && m.year === selectedYear) || availableMonths[0];

  const loadFinancialData = async () => {
    setSummaryLoading(true);
    try {
      const summary = await dbService.getFinancialSummary(selectedMonth, selectedYear);
      setFinancialSummary(summary);
    } catch (e) {
      console.error('Failed to load financial summary:', e);
    } finally {
      setSummaryLoading(false);
    }
  };

  const loadSmsStats = async () => {
    try {
      const logs = await dbService.getSmsLogs();
      const thisMonthLogs = logs.filter(l => l.payment_month === selectedMonth && l.payment_year === selectedYear);
      const reminder1 = thisMonthLogs.filter(l => l.reminder_type === 'REMINDER_1' && (l.delivery_status === 'SENT' || l.delivery_status === 'DELIVERED')).length;
      const reminder2 = thisMonthLogs.filter(l => l.reminder_type === 'REMINDER_2' && (l.delivery_status === 'SENT' || l.delivery_status === 'DELIVERED')).length;
      const failed = thisMonthLogs.filter(l => l.delivery_status === 'FAILED').length;
      const totalSent = thisMonthLogs.filter(l => l.delivery_status === 'SENT' || l.delivery_status === 'DELIVERED').length;

      setSmsStats({
        sentToday: totalSent,
        sentThisMonth: totalSent,
        reminder1Sent: reminder1,
        reminder2Sent: reminder2,
        failedSms: failed
      });
    } catch {}
  };

  useEffect(() => {
    loadFinancialData();
    loadSmsStats();
  }, [selectedMonth, selectedYear, residents]);

  // Handle Global Payment Search
  useEffect(() => {
    if (!paymentSearchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await dbService.searchPaymentsGlobal(paymentSearchQuery);
        setSearchResults(results);
      } catch (err) {
        console.error('Global search error:', err);
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [paymentSearchQuery]);

  const totalResidents = residents.length;
  const activeResidents = residents.filter(r => r.status === 'Active').length;
  const inactiveResidents = residents.filter(r => r.status === 'Inactive').length;

  const totalExpected = financialSummary?.total_expected ?? (activeResidents * 5000);
  const totalCollected = financialSummary?.total_collected ?? 0;
  const totalOutstanding = financialSummary?.total_outstanding ?? totalExpected;
  const paidCount = financialSummary?.paid_residents_count ?? 0;
  const unpaidCount = financialSummary?.unpaid_residents_count ?? activeResidents;
  const pendingCount = financialSummary?.pending_payments_count ?? 0;
  const failedCount = financialSummary?.failed_payments_count ?? 0;
  const collectionPercentage = financialSummary?.collection_percentage ?? (totalExpected > 0 ? Math.min(100, Math.round((totalCollected / totalExpected) * 100)) : 0);

  const recentLogs = activityLogs.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Month Selector */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900 text-emerald-400 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                EXCO Security Command
              </span>
              <span className="text-xs text-slate-500 font-mono">Stage 7 Financial Management</span>
            </div>
            <h1 className="text-2xl font-bold font-display text-slate-900 mt-1">
              FINGER OF GOD ESTATE SECURITY MANAGEMENT
            </h1>
            <p className="text-sm font-semibold text-emerald-800">
              ADMIN / EXCO DASHBOARD
            </p>
          </div>

          {/* Month Selector Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 shadow-2xs">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <div className="text-xs">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Viewing Levy Month</span>
                <select
                  value={`${selectedMonth}-${selectedYear}`}
                  onChange={(e) => {
                    const [m, y] = e.target.value.split('-').map(Number);
                    setSelectedMonth(m);
                    setSelectedYear(y);
                  }}
                  className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
                >
                  {availableMonths.map(m => (
                    <option key={`${m.month}-${m.year}`} value={`${m.month}-${m.year}`}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={loadFinancialData}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
              title="Refresh Financial Figures"
            >
              <RefreshCw className={`w-4 h-4 ${summaryLoading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Global Payment Search Bar */}
        <div className="mt-6 pt-6 border-t border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search payments by Resident Number, Name, Phone Number, Paystack Reference, or Receipt Number..."
              value={paymentSearchQuery}
              onChange={(e) => setPaymentSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
            />
            {searchLoading && (
              <RefreshCw className="w-3.5 h-3.5 text-emerald-600 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
            )}
          </div>

          {/* Search Results Dropdown Card */}
          {searchResults.length > 0 && (
            <div className="mt-2 bg-white border border-slate-200 rounded-xl shadow-lg p-3 max-h-72 overflow-y-auto space-y-2 z-20 relative">
              <div className="text-[11px] font-semibold text-slate-500 px-2 flex justify-between">
                <span>FOUND {searchResults.length} PAYMENT RECORD(S)</span>
                <button onClick={() => setSearchResults([])} className="text-slate-400 hover:text-slate-700">Close</button>
              </div>
              {searchResults.map((res) => (
                <div 
                  key={res.id} 
                  className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg flex items-center justify-between text-xs transition-colors cursor-pointer"
                  onClick={() => onNavigate('payments')}
                >
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <span>{res.resident_name}</span>
                      <span className="font-mono text-[11px] text-slate-500">#{res.resident_number}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                      <span>{res.period_label}</span>
                      <span>•</span>
                      <span className="font-mono">{res.paystack_reference}</span>
                      {res.receipt_number && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-emerald-700 font-semibold">{res.receipt_number}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-slate-900">₦{(res.amount_paid || res.amount_due).toLocaleString()}</div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      res.status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {res.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. Collection Progress Indicator */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
              Collection Progress • {currentPeriod.label}
            </span>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-3xl font-bold font-mono text-emerald-400">
                ₦{totalCollected.toLocaleString()}
              </span>
              <span className="text-sm text-slate-300">
                collected of <span className="font-mono font-semibold text-white">₦{totalExpected.toLocaleString()}</span> expected
              </span>
            </div>
          </div>

          <div className="text-right flex items-center gap-3">
            <div>
              <div className="text-3xl font-bold font-mono text-white">{collectionPercentage}%</div>
              <div className="text-[11px] text-slate-400">Levy Clearance Rate</div>
            </div>
          </div>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="mt-4 w-full h-3 bg-slate-700/80 rounded-full overflow-hidden p-0.5">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700"
            style={{ width: `${Math.min(100, collectionPercentage)}%` }}
          />
        </div>
      </div>

      {/* 3. 8 Summary Cards for the Selected Month */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Total Active Residents */}
        <div 
          onClick={() => onNavigate('residents')}
          className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs hover:border-slate-300 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Active Residents</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-2">{activeResidents}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Eligible for levy</span>
            <span className="text-emerald-600 font-medium">100% active</span>
          </div>
        </div>

        {/* Card 2: Paid This Month */}
        <div 
          onClick={() => onNavigate('paid_residents')}
          className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs hover:border-emerald-300 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-xs font-semibold uppercase tracking-wider">Paid This Month</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 mt-2">{paidCount}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Verified households</span>
            <span className="text-emerald-700 font-semibold">{collectionPercentage}%</span>
          </div>
        </div>

        {/* Card 3: Unpaid This Month */}
        <div 
          onClick={() => onNavigate('unpaid_residents')}
          className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs hover:border-amber-300 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-xs font-semibold uppercase tracking-wider">Unpaid This Month</span>
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600 mt-2">{unpaidCount}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Pending collection</span>
            <span className="text-amber-700 font-semibold">{activeResidents > 0 ? Math.round((unpaidCount / activeResidents) * 100) : 0}%</span>
          </div>
        </div>

        {/* Card 4: Total Expected */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Expected</span>
            <CreditCard className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-2">₦{totalExpected.toLocaleString()}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {activeResidents} active × ₦5,000
          </div>
        </div>

        {/* Card 5: Total Collected */}
        <div 
          onClick={() => onNavigate('paid_residents')}
          className="bg-white rounded-2xl border border-emerald-200/80 bg-emerald-50/20 p-4 shadow-xs hover:border-emerald-300 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Collected</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-2">₦{totalCollected.toLocaleString()}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Verified gateway funds
          </div>
        </div>

        {/* Card 6: Total Outstanding */}
        <div 
          onClick={() => onNavigate('outstanding')}
          className="bg-white rounded-2xl border border-rose-200/80 bg-rose-50/20 p-4 shadow-xs hover:border-rose-300 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-rose-800">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Outstanding</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-700 mt-2">₦{totalOutstanding.toLocaleString()}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Expected - Collected
          </div>
        </div>

        {/* Card 7: Pending Payments */}
        <div 
          onClick={() => onNavigate('payments')}
          className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs hover:border-slate-300 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Payments</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600 mt-2">{pendingCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Awaiting gateway webhook
          </div>
        </div>

        {/* Card 8: Failed Payments */}
        <div 
          onClick={() => onNavigate('payments')}
          className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs hover:border-slate-300 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Failed Payments</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-600 mt-2">{failedCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Unsettled attempts
          </div>
        </div>
      </div>

      {/* 4. Stage 7 Dedicated Sections Quick Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            ADMIN & EXCO MODULES
          </h2>
          <span className="text-xs text-slate-400">Direct Navigation</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            onClick={() => onNavigate('paid_residents')}
            className="p-3 bg-emerald-50/70 hover:bg-emerald-100/70 border border-emerald-200 rounded-xl text-left transition-colors group"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-700 mb-2" />
            <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-700">Paid Residents</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{paidCount} Verified</div>
          </button>

          <button
            onClick={() => onNavigate('unpaid_residents')}
            className="p-3 bg-amber-50/70 hover:bg-amber-100/70 border border-amber-200 rounded-xl text-left transition-colors group"
          >
            <AlertCircle className="w-5 h-5 text-amber-700 mb-2" />
            <div className="text-xs font-bold text-slate-900 group-hover:text-amber-700">Unpaid Residents</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{unpaidCount} Households</div>
          </button>

          <button
            onClick={() => onNavigate('outstanding')}
            className="p-3 bg-rose-50/70 hover:bg-rose-100/70 border border-rose-200 rounded-xl text-left transition-colors group"
          >
            <AlertTriangle className="w-5 h-5 text-rose-700 mb-2" />
            <div className="text-xs font-bold text-slate-900 group-hover:text-rose-700">Outstanding Levies</div>
            <div className="text-[11px] text-slate-500 mt-0.5">₦{totalOutstanding.toLocaleString()}</div>
          </button>

          <button
            onClick={() => onNavigate('payments')}
            className="p-3 bg-blue-50/70 hover:bg-blue-100/70 border border-blue-200 rounded-xl text-left transition-colors group"
          >
            <CreditCard className="w-5 h-5 text-blue-700 mb-2" />
            <div className="text-xs font-bold text-slate-900 group-hover:text-blue-700">Transactions</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Paystack Gateway</div>
          </button>

          <button
            onClick={() => onNavigate('reports')}
            className="p-3 bg-purple-50/70 hover:bg-purple-100/70 border border-purple-200 rounded-xl text-left transition-colors group"
          >
            <FileSpreadsheet className="w-5 h-5 text-purple-700 mb-2" />
            <div className="text-xs font-bold text-slate-900 group-hover:text-purple-700">Financial Reports</div>
            <div className="text-[11px] text-slate-500 mt-0.5">6 Exportable CSVs</div>
          </button>

          <button
            onClick={() => onNavigate('sms')}
            className="p-3 bg-indigo-50/70 hover:bg-indigo-100/70 border border-indigo-200 rounded-xl text-left transition-colors group"
          >
            <MessageSquare className="w-5 h-5 text-indigo-700 mb-2" />
            <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-700">SMS Reminders</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Termii Engine</div>
          </button>
        </div>
      </div>

      {/* 5. Visual Charts (Expected vs Collected & Paid vs Unpaid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Collection Chart */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">MONTHLY COLLECTION COMPARISON</h3>
              <p className="text-xs text-slate-500 mt-0.5">Expected vs Collected for {currentPeriod.label}</p>
            </div>
            <BarChart3 className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-4 pt-2">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-700">Expected Levy (100%)</span>
                <span className="font-mono font-bold text-slate-900">₦{totalExpected.toLocaleString()}</span>
              </div>
              <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-slate-400 rounded-full" style={{ width: '100%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-semibold text-emerald-800">Collected Levy ({collectionPercentage}%)</span>
                <span className="font-mono font-bold text-emerald-600">₦{totalCollected.toLocaleString()}</span>
              </div>
              <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, collectionPercentage)}%` }} 
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-semibold text-rose-800">Outstanding Balance ({100 - collectionPercentage}%)</span>
                <span className="font-mono font-bold text-rose-600">₦{totalOutstanding.toLocaleString()}</span>
              </div>
              <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-rose-400 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.max(0, 100 - collectionPercentage)}%` }} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Payment Status Household Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">PAYMENT STATUS DISTRIBUTION</h3>
              <p className="text-xs text-slate-500 mt-0.5">Household compliance breakdown</p>
            </div>
            <PieChart className="w-4 h-4 text-slate-400" />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl text-center">
              <span className="text-xs font-semibold text-emerald-800">Paid Households</span>
              <div className="text-3xl font-bold font-mono text-emerald-600 mt-1">{paidCount}</div>
              <span className="text-[11px] text-slate-500 block mt-1">Cleared for security access</span>
            </div>

            <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl text-center">
              <span className="text-xs font-semibold text-amber-800">Unpaid Households</span>
              <div className="text-3xl font-bold font-mono text-amber-600 mt-1">{unpaidCount}</div>
              <span className="text-[11px] text-slate-500 block mt-1">Pending reminder follow-up</span>
            </div>
          </div>

          {/* Segment visual */}
          <div className="mt-4 flex rounded-full h-3 overflow-hidden bg-slate-100">
            <div 
              style={{ width: `${activeResidents > 0 ? (paidCount / activeResidents) * 100 : 0}%` }} 
              className="bg-emerald-500 h-full"
              title={`${paidCount} Paid`}
            />
            <div 
              style={{ width: `${activeResidents > 0 ? (unpaidCount / activeResidents) * 100 : 0}%` }} 
              className="bg-amber-400 h-full"
              title={`${unpaidCount} Unpaid`}
            />
          </div>
        </div>
      </div>

      {/* 6. Resident Summary & SMS Reminder Engine Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resident Summary Panel */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">ESTATE RESIDENTS DIRECTORY</h3>
              <p className="text-xs text-slate-500 mt-0.5">Roster of registered estate occupants</p>
            </div>
            <button
              onClick={() => onNavigate('residents')}
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-900 flex items-center gap-1"
            >
              <span>Manage</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
              <span className="text-[11px] text-slate-500 font-medium">Total Roster</span>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">{totalResidents}</div>
            </div>
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 text-center">
              <span className="text-[11px] text-emerald-700 font-medium">Active</span>
              <div className="text-xl font-bold font-mono text-emerald-700 mt-1">{activeResidents}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
              <span className="text-[11px] text-slate-500 font-medium">Inactive</span>
              <div className="text-xl font-bold font-mono text-slate-500 mt-1">{inactiveResidents}</div>
            </div>
          </div>

          {/* Quick list of residents */}
          <div className="divide-y divide-slate-100">
            {residents.slice(0, 4).map((r) => (
              <div key={r.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-slate-900">{r.full_name}</span>
                  <div className="text-[11px] text-slate-500">{r.house_number} • #{r.resident_number}</div>
                </div>
                <button
                  onClick={() => onViewResident(r)}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-medium transition-colors"
                >
                  View
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* SMS Reminder Engine Summary Panel */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">SMS REMINDER DISPATCH ENGINE</h3>
              <p className="text-xs text-slate-500 mt-0.5">Automated SMS gateway status (Africa/Lagos 08:00 AM)</p>
            </div>
            <button
              onClick={() => onNavigate('sms')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <span>Full SMS Log</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
              <span className="text-[11px] text-slate-500 font-medium">Sent Today</span>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">{smsStats.sentToday}</div>
            </div>
            <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-center">
              <span className="text-[11px] text-indigo-700 font-medium">This Month</span>
              <div className="text-xl font-bold font-mono text-indigo-700 mt-1">{smsStats.sentThisMonth}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
              <span className="text-[11px] text-slate-500 font-medium">Failed SMS</span>
              <div className="text-xl font-bold font-mono text-rose-600 mt-1">{smsStats.failedSms}</div>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-slate-700">Reminder 1 (Day 1 - 10 of Month)</span>
              </div>
              <span className="font-mono font-bold text-slate-900">{smsStats.reminder1Sent} Sent</span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <span className="text-slate-700">Reminder 2 (Post-Day 10 Overdue)</span>
              </div>
              <span className="font-mono font-bold text-slate-900">{smsStats.reminder2Sent} Sent</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
