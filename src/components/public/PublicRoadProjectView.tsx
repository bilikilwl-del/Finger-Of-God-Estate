import React, { useState, useEffect } from 'react';
import {
  Shield,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Calendar,
  Building2,
  Building,
  CreditCard,
  FileText,
  Search,
  Download,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Clock,
  ExternalLink,
  Info,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Coins,
  ChevronRight,
  Eye,
  X,
  Phone,
  Mail,
  MapPin,
  Lock,
  Layers,
  Sparkles,
  Menu,
  Radio,
  RefreshCw,
  ShieldCheck,
  Activity,
  Zap,
  Loader2
} from 'lucide-react';
import {
  EstateSettings,
  RoadProjectTransaction,
  RoadProjectSummary,
  RoadProjectMilestone,
  RoadTransactionType,
  RoadProjectCategory
} from '../../types/database';
import { dbService } from '../../lib/supabase';
import { EstateLogo } from '../common/EstateLogo';
import { SEOHead } from '../common/SEOHead';
import { PublicNavbar } from '../layout/PublicNavbar';
import { RoadProjectPaystackModal } from '../payments/RoadProjectPaystackModal';
import { useRoadProjectStream } from '../../hooks/useRoadProjectStream';

interface PublicRoadProjectViewProps {
  estateSettings: EstateSettings;
  onNavigateHome: () => void;
  onNavigateToSecurity: () => void;
  onNavigateToAnnouncements: () => void;
  onNavigateToPortal: () => void;
  onNavigateToVerifyReceipt: () => void;
  onOpenResidentLogin: () => void;
  onNavigateHomeSection?: (sectionId: string) => void;
}

export const PublicRoadProjectView: React.FC<PublicRoadProjectViewProps> = ({
  estateSettings,
  onNavigateHome,
  onNavigateToSecurity,
  onNavigateToAnnouncements,
  onNavigateToPortal,
  onNavigateToVerifyReceipt,
  onOpenResidentLogin,
  onNavigateHomeSection
}) => {
  const [transactions, setTransactions] = useState<RoadProjectTransaction[]>([]);
  const [summary, setSummary] = useState<RoadProjectSummary | null>(null);
  const [milestones, setMilestones] = useState<RoadProjectMilestone[]>([]);
  const [loading, setLoading] = useState(true);

  // Live Digital Clock state
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter & Search states
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'CREDIT' | 'DEBIT'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Modal states
  const [selectedTx, setSelectedTx] = useState<RoadProjectTransaction | null>(null);

  // Paystack Quick Online Contribution
  const [isPaystackModalOpen, setIsPaystackModalOpen] = useState(false);

  // Paystack Return Reference Verification state
  const [verifyingRef, setVerifyingRef] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<{
    status: 'success' | 'failed';
    transaction?: RoadProjectTransaction;
    message?: string;
  } | null>(null);

  // Near real-time SSE stream hook
  const { isConnected: isStreamConnected, lastNotification, dismissNotification } = useRoadProjectStream({
    onRefreshNeeded: () => {
      loadRoadData();
    }
  });

  useEffect(() => {
    loadRoadData();

    // Check for Paystack callback reference in URL (e.g. ?reference=FOG-RD-PAY-...)
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const ref = urlParams.get('reference') || urlParams.get('trxref');
      
      if (ref && (ref.startsWith('FOG-RD-') || ref.startsWith('FOG-'))) {
        // Clean up URL immediately to prevent repeated verification on page refresh
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);

        setVerifyingRef(ref);
        dbService.verifyRoadPaystackPayment({ reference: ref }).then((res) => {
          setVerifyingRef(null);
          if (res.success && res.transaction) {
            setVerificationResult({
              status: 'success',
              transaction: res.transaction
            });
            loadRoadData();
          } else {
            setVerificationResult({
              status: 'failed',
              message: res.message || 'Payment was not completed or could not be verified on Paystack. No transaction was added to the ledger.'
            });
          }
        }).catch((err) => {
          setVerifyingRef(null);
          setVerificationResult({
            status: 'failed',
            message: err.message || 'Server error verifying payment. If you were debited, the official webhook will confirm your payment.'
          });
        });
      }
    }
  }, []);

  const loadRoadData = async () => {
    setLoading(true);
    try {
      const [txList, sumData, msList] = await Promise.all([
        dbService.getRoadProjectTransactions(sortOrder),
        dbService.getRoadProjectSummary(35000000),
        dbService.getRoadProjectMilestones()
      ]);
      setTransactions(txList);
      setSummary(sumData);
      setMilestones(msList);
    } catch (err) {
      console.error('Error loading road project data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSortToggle = () => {
    const nextOrder = sortOrder === 'desc' ? 'asc' : 'desc';
    setSortOrder(nextOrder);
    setTransactions(prev => {
      return [...prev].sort((a, b) => {
        const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
        return nextOrder === 'asc' ? diff : -diff;
      });
    });
  };

  // Filter transactions strictly for road_modernization project records
  const filteredTransactions = transactions.filter(tx => {
    // Only records tagged with road_modernization
    if (tx.project_type && tx.project_type !== 'road_modernization') return false;
    if (typeFilter !== 'ALL' && tx.type !== typeFilter) return false;
    if (categoryFilter !== 'ALL' && tx.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDesc = tx.description?.toLowerCase().includes(q);
      const matchRef = tx.reference?.toLowerCase().includes(q);
      const matchPayer = (tx.contributor_display_name || tx.payer_or_vendor || '').toLowerCase().includes(q);
      const matchCat = tx.category?.toLowerCase().includes(q);
      const matchRec = tx.receipt_or_invoice_ref?.toLowerCase().includes(q);
      if (!matchDesc && !matchRef && !matchPayer && !matchCat && !matchRec) return false;
    }
    return true;
  });

  const handleExportCSV = () => {
    if (transactions.length === 0) return;
    const headers = ['Date', 'Time', 'Reference', 'Type', 'Description', 'Category', 'Contributor/Vendor', 'Credit (NGN)', 'Debit (NGN)', 'Running Balance (NGN)', 'Approved By'];
    const rows = transactions.map(tx => [
      tx.date,
      new Date(tx.verified_at || tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      tx.reference,
      tx.type,
      `"${tx.description.replace(/"/g, '""')}"`,
      `"${tx.category}"`,
      `"${tx.contributor_display_name || tx.payer_or_vendor || 'Anonymous Contributor'}"`,
      tx.type === 'CREDIT' ? tx.amount : 0,
      tx.type === 'DEBIT' ? tx.amount : 0,
      tx.running_balance,
      `"${tx.approved_by}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Finger_of_God_Estate_Road_Modernization_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatNaira = (amt: number) => `₦${(amt || 0).toLocaleString()}`;

  // Time formatter helpers for transaction records
  const formatTxDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    } catch {
      // fallback
    }
    return dateStr;
  };

  const formatTxTime = (verifiedAtStr: string) => {
    try {
      const d = new Date(verifiedAtStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      }
    } catch {
      // fallback
    }
    return '12:00 PM';
  };

  const creditsList = transactions.filter(t => t.type === 'CREDIT');
  const debitsList = transactions.filter(t => t.type === 'DEBIT');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <SEOHead
        title="Road Modernization Project & Transparent Public Ledger — Finger of God Estate"
        description="Live tracked road paving, concrete stormwater drainage, and interlocking project with real-time financial transparency ledger for Finger of God Estate, Asaba."
        keywords={['Road Paving Project', 'Interlocking Stones', 'Finger of God Estate', 'Asaba Infrastructure', 'Public Financial Ledger', 'Development Levy']}
        canonicalPath="/#road-project"
        ogType="website"
      />

      {/* Universal Estate Header */}
      <PublicNavbar
        currentTab="road_project"
        estateSettings={estateSettings}
        onNavigate={(tab) => {
          if (tab === 'home') onNavigateHome();
          else if (tab === 'security_public') onNavigateToSecurity();
          else if (tab === 'public_announcements') onNavigateToAnnouncements();
          else if (tab === 'verify_receipt') onNavigateToVerifyReceipt();
          else if (tab === 'public_residents' || tab === 'resident_portal') onNavigateToPortal();
          else if (tab === 'estate_levy') onNavigateHome();
          else onNavigateHome();
        }}
        onOpenResidentLogin={onOpenResidentLogin || (() => {})}
      />

      {/* 1. HERO SECTION & PAGE TITLE */}
      <section className="bg-gradient-to-b from-slate-900 via-slate-850 to-slate-900 text-white pt-10 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />
        
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          {/* Top Status & Live Clock Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <button
                onClick={onNavigateHome}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all cursor-pointer border border-slate-700 shadow-2xs"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" />
                <span>Home</span>
              </button>
              <span className="text-slate-650">/</span>
              <span className="text-amber-400 font-bold text-xs">Transparent Public Ledger</span>
            </div>

            {/* Live Clock & Status Indicator */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              {/* Live Status Indicator */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-200">
                <span className="relative flex h-2.5 w-2.5">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isStreamConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isStreamConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                </span>
                <span className="font-mono font-bold tracking-wider text-[11px] uppercase">
                  {isStreamConnected ? '● LIVE UPDATES CONNECTED' : '● RECONNECTING / AUTO-SYNC'}
                </span>
              </div>

              {/* Digital Clock */}
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-emerald-300 font-mono font-bold">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} — {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            </div>
          </div>

          <div className="max-w-4xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Capital Infrastructure Transparency Portal</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight font-display">
              ROAD MODERNIZATION PROJECT
            </h1>
            <p className="text-lg sm:text-xl font-bold text-emerald-400 font-display">
              Transparent Public Ledger
            </p>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed pt-1">
              Track verified project contributions, expenditures, and the current project balance in real time.
            </p>
          </div>
        </div>
      </section>

      {/* 2. DIGITAL PROJECT HEADER & SUMMARY KPI CARDS */}
      <section className="-mt-8 sm:-mt-10 relative z-20 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 w-full">
        
        {/* Live Notification Banner if any */}
        {lastNotification && (
          <div className="mb-4 bg-emerald-700 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between gap-3 border border-emerald-500/40">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 animate-bounce shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-black bg-white/20 px-2 py-0.5 rounded-full">Live Ledger Update</span>
                <p className="font-bold text-xs sm:text-sm mt-0.5">{lastNotification.message}</p>
              </div>
            </div>
            <button onClick={dismissNotification} className="p-1 rounded-lg hover:bg-white/10 text-emerald-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          
          {/* Card 1: TOTAL PROJECT TARGET */}
          <div className="bg-white rounded-2xl p-4.5 border border-slate-200 shadow-md flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                TOTAL PROJECT TARGET
              </span>
              <div className="text-xl sm:text-2xl font-black text-slate-900 font-display">
                {formatNaira(summary?.target_budget || 35000000)}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Approved Phase 1 Budget</p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] font-semibold text-emerald-700">
              {summary?.collection_percentage || 0}% Funded
            </div>
          </div>

          {/* Card 2: TOTAL CREDIT */}
          <div className="bg-white rounded-2xl p-4.5 border border-emerald-200 shadow-md flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block mb-1 flex items-center gap-1">
                <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                TOTAL CREDIT
              </span>
              <div className="text-xl sm:text-2xl font-black text-emerald-700 font-display">
                {formatNaira(summary?.total_collected || 0)}
              </div>
              <p className="text-[10px] text-emerald-600 mt-1">{summary?.credits_count || 0} Inflow Records</p>
            </div>
            <div className="mt-3 pt-2 border-t border-emerald-50 text-[11px] font-semibold text-emerald-800">
              Verified Bank Inflows
            </div>
          </div>

          {/* Card 3: TOTAL DEBIT */}
          <div className="bg-white rounded-2xl p-4.5 border border-rose-200 shadow-md flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block mb-1 flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                TOTAL DEBIT
              </span>
              <div className="text-xl sm:text-2xl font-black text-rose-600 font-display">
                {formatNaira(summary?.total_spent || 0)}
              </div>
              <p className="text-[10px] text-rose-600 mt-1">{summary?.debits_count || 0} Expense Vouchers</p>
            </div>
            <div className="mt-3 pt-2 border-t border-rose-50 text-[11px] font-semibold text-rose-800">
              Project Disbursements
            </div>
          </div>

          {/* Card 4: CURRENT BALANCE */}
          <div className="bg-gradient-to-br from-emerald-800 to-teal-950 text-white rounded-2xl p-4.5 shadow-md flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider block mb-1 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                CURRENT BALANCE
              </span>
              <div className="text-xl sm:text-2xl font-black text-white font-display">
                {formatNaira(summary?.current_balance || 0)}
              </div>
              <p className="text-[10px] text-emerald-200/90 mt-1">Credit minus Debit</p>
            </div>
            <div className="mt-3 pt-2 border-t border-white/10 text-[11px] font-semibold text-emerald-200">
              Escrow Verified
            </div>
          </div>

          {/* Card 5: TOTAL CONTRIBUTIONS */}
          <div className="bg-white rounded-2xl p-4.5 border border-slate-200 shadow-md flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                TOTAL CONTRIBUTIONS
              </span>
              <div className="text-xl sm:text-2xl font-black text-slate-900 font-display">
                {summary?.credits_count || 0}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Contributing Compounds</p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] font-semibold text-slate-700">
              Active Participation
            </div>
          </div>

          {/* Card 6: OUTSTANDING CONTRIBUTIONS */}
          <div className="bg-white rounded-2xl p-4.5 border border-amber-200 shadow-md flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block mb-1">
                OUTSTANDING LEVIES
              </span>
              <div className="text-xl sm:text-2xl font-black text-amber-900 font-display">
                {formatNaira(summary?.outstanding_contributions || 0)}
              </div>
              <p className="text-[10px] text-amber-700 mt-1">Remaining target balance</p>
            </div>
            <div className="mt-3 pt-2 border-t border-amber-50 text-[11px] font-semibold text-amber-800">
              Due for Completion
            </div>
          </div>

        </div>

        {/* Project Progress Bar */}
        <div className="mt-4 bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-semibold">
            <span className="text-slate-800 flex items-center gap-1.5 font-bold">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>Project Progress & Execution Stage</span>
            </span>
            <div className="flex items-center gap-3 text-slate-600">
              <span>Status: <strong className="text-emerald-700 uppercase">Ongoing</strong></span>
              <span>Start: <strong className="text-slate-800">10 Oct 2026</strong></span>
              <span>Target: <strong className="text-slate-800">30 Dec 2026</strong></span>
              <span className="font-bold text-emerald-700">{summary?.collection_percentage || 0}% Complete</span>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden flex">
            <div 
              className="bg-emerald-600 h-full transition-all duration-700 rounded-full"
              style={{ width: `${Math.min(100, summary?.collection_percentage || 0)}%` }}
            />
          </div>
        </div>
      </section>

      {/* 3. FINANCIAL TRANSPARENCY SUMMARY & RECENT ACTIVITY & BREAKDOWN */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        
        {/* A. MONEY RECEIVED SUMMARY CARD */}
        <div className="bg-white rounded-3xl p-6 border border-emerald-200 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">MONEY RECEIVED</h3>
                <p className="text-[11px] text-slate-500">{creditsList.length} total inflows</p>
              </div>
            </div>
            <span className="font-black text-emerald-700 text-lg font-mono">
              {formatNaira(summary?.total_collected || 0)}
            </span>
          </div>

          <div className="space-y-2.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Latest Credits</span>
            {creditsList.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center bg-slate-50 rounded-xl">No road project contributions yet.</p>
            ) : (
              creditsList.slice(0, 3).map((c) => (
                <div key={c.id} className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-900 truncate max-w-[200px]">{c.description}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{formatTxDate(c.date)} • {formatTxTime(c.verified_at || c.date)}</p>
                  </div>
                  <div className="text-right font-mono font-bold text-emerald-700">
                    +{formatNaira(c.amount)}
                  </div>
                </div>
              ))
            )}
          </div>

          <button
            onClick={() => setTypeFilter('CREDIT')}
            className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1"
          >
            <span>View All Credits ({creditsList.length})</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* B. PROJECT EXPENDITURE SUMMARY CARD */}
        <div className="bg-white rounded-3xl p-6 border border-rose-200 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2.5 bg-rose-100 text-rose-800 rounded-xl">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">PROJECT EXPENDITURE</h3>
                <p className="text-[11px] text-slate-500">{debitsList.length} approved disbursements</p>
              </div>
            </div>
            <span className="font-black text-rose-600 text-lg font-mono">
              {formatNaira(summary?.total_spent || 0)}
            </span>
          </div>

          <div className="space-y-2.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Latest Expenditures</span>
            {debitsList.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center bg-slate-50 rounded-xl">No project expenditures recorded yet.</p>
            ) : (
              debitsList.slice(0, 3).map((d) => (
                <div key={d.id} className="p-3 rounded-xl bg-rose-50/60 border border-rose-100 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-900 truncate max-w-[200px]">{d.description}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{formatTxDate(d.date)} • {formatTxTime(d.verified_at || d.date)}</p>
                  </div>
                  <div className="text-right font-mono font-bold text-rose-600">
                    -{formatNaira(d.amount)}
                  </div>
                </div>
              ))
            )}
          </div>

          <button
            onClick={() => setTypeFilter('DEBIT')}
            className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1"
          >
            <span>View All Expenditures ({debitsList.length})</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* C. LATEST ACTIVITY (DIGITAL TIME-BASED FEED) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2.5 bg-slate-100 text-slate-800 rounded-xl">
                <Activity className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Latest Activity</h3>
                <p className="text-[11px] text-slate-500">Real-time financial audit trail</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
              Live Feed
            </span>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[220px] pr-1">
            {transactions.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No transactions recorded yet.</p>
            ) : (
              transactions.slice(0, 4).map((tx) => {
                const timeStr = formatTxTime(tx.verified_at || tx.date);
                const isCredit = tx.type === 'CREDIT';
                return (
                  <div key={tx.id} className="flex items-start gap-3 text-xs border-b border-slate-100 pb-2.5 last:border-0">
                    <span className="font-mono text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded shrink-0">
                      {timeStr}
                    </span>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800 leading-tight">
                        {isCredit ? 'Credit received from' : 'Disbursement for'} {tx.payer_or_vendor}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{tx.description}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-2">
            <div className="p-3 bg-slate-50 rounded-xl text-center text-[11px] text-slate-600 font-medium">
              Current Project Balance: <strong className="text-slate-900 font-mono">{formatNaira(summary?.current_balance || 0)}</strong>
            </div>
          </div>
        </div>

      </section>

      {/* 4. ACTION BANNER: CONTRIBUTE TO ROAD PROJECT */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 mt-8 w-full">
        <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/30 text-emerald-300 text-xs font-bold border border-emerald-400/30">
              <Coins className="w-3.5 h-3.5 text-emerald-400" />
              <span>Contribute to Road Project</span>
            </div>
            <h3 className="text-2xl sm:text-4xl font-black text-white font-display">
              Finger of God Estate Road Modernization
            </h3>
            <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
              Make your contribution securely online using Paystack.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
            <button
              onClick={() => setIsPaystackModalOpen(true)}
              className="px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg hover:shadow-emerald-500/20 transition-all text-center cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.02]"
            >
              <Coins className="w-5 h-5 text-slate-950" />
              <span>Contribute Now</span>
            </button>
          </div>
        </div>
      </section>

      {/* 5. DIGITAL TRANSACTION LEDGER SECTION */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 mt-10 mb-16 flex-1 w-full">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          
          {/* Controls Bar */}
          <div className="p-6 border-b border-slate-200 bg-slate-50/60">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-display">
                    Road Project Public Ledger
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs">
                    {filteredTransactions.length} Confirmed Records
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Chronological financial ledger with running balance. Every transaction displays exact contributor, date, reference, description, amount, and confirmed status.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCSV}
                  className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Download CSV spreadsheet"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={handleSortToggle}
                  className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>{sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
                </button>
              </div>
            </div>

            {/* Filters & Search */}
            <div className="mt-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-4 border-t border-slate-200/80">
              
              <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl max-w-fit">
                <button
                  onClick={() => setTypeFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    typeFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({transactions.length})
                </button>
                <button
                  onClick={() => setTypeFilter('CREDIT')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    typeFilter === 'CREDIT' ? 'bg-emerald-700 text-white shadow-xs' : 'text-emerald-800 hover:bg-emerald-100/50'
                  }`}
                >
                  <ArrowDownLeft className="w-3 h-3" />
                  <span>CREDIT</span>
                </button>
                <button
                  onClick={() => setTypeFilter('DEBIT')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    typeFilter === 'DEBIT' ? 'bg-rose-700 text-white shadow-xs' : 'text-rose-800 hover:bg-rose-100/50'
                  }`}
                >
                  <ArrowUpRight className="w-3 h-3" />
                  <span>DEBIT</span>
                </button>
              </div>

              <div className="flex items-center gap-2 flex-1 md:max-w-md">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by contributor, ref, description..."
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ALL">All Categories</option>
                  <option value="Building Contribution">Building Contribution</option>
                  <option value="Landlord Levy">Landlord Levy</option>
                  <option value="Special Donation">Special Donation</option>
                  <option value="Commercial Store Levy">Commercial Store Levy</option>
                  <option value="Drainage Construction">Drainage Construction</option>
                  <option value="Earthwork & Grading">Earthwork & Grading</option>
                  <option value="Stone Base & Aggregates">Stone Base & Aggregates</option>
                  <option value="Interlocking Paving">Interlocking Paving</option>
                  <option value="Culvert & Crossing Slab">Culvert & Crossing Slab</option>
                  <option value="Project Supervision & Testing">Project Supervision & Testing</option>
                </select>
              </div>

            </div>
          </div>

          {/* Desktop Table & Mobile Responsive Cards View */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse hidden md:table">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3.5 px-4 font-semibold">Contributor</th>
                  <th className="py-3.5 px-4 text-right font-semibold text-emerald-800">Amount (₦)</th>
                  <th className="py-3.5 px-4 font-semibold">Date & Time</th>
                  <th className="py-3.5 px-3 font-semibold">Reference</th>
                  <th className="py-3.5 px-3 font-semibold">Type</th>
                  <th className="py-3.5 px-4 font-semibold min-w-[200px]">Description</th>
                  <th className="py-3.5 px-4 text-right font-semibold text-slate-900 bg-slate-50/80">Running Balance</th>
                  <th className="py-3.5 px-3 text-center font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Coins className="w-6 h-6 text-emerald-600 animate-spin" />
                        <span className="text-xs font-semibold">Loading verified financial ledger...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      <div className="max-w-sm mx-auto space-y-2">
                        <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
                        <p className="font-semibold text-slate-700">No road project contributions yet.</p>
                        <p className="text-xs text-slate-500">Be the first to make an online contribution via Paystack!</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => {
                    const isCredit = tx.type === 'CREDIT';
                    const txDate = formatTxDate(tx.date);
                    const txTime = formatTxTime(tx.verified_at || tx.date);
                    const contributorDisplayName = tx.contributor_display_name || tx.payer_or_vendor || (tx.building_number ? `Resident ${tx.building_number}` : 'Anonymous Contributor');
                    return (
                      <tr 
                        key={tx.id} 
                        className="hover:bg-slate-50/90 transition-colors group cursor-pointer"
                        onClick={() => setSelectedTx(tx)}
                      >
                        {/* Contributor */}
                        <td className="py-3.5 px-4 font-medium text-slate-900">
                          <div className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                            {contributorDisplayName}
                          </div>
                          {tx.building_number && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200 font-mono text-[9px] font-bold inline-block mt-0.5">
                              Bldg {tx.building_number}
                            </span>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap">
                          {isCredit ? (
                            <span className="text-emerald-700">+{formatNaira(tx.amount)}</span>
                          ) : (
                            <span className="text-rose-600">-{formatNaira(tx.amount)}</span>
                          )}
                        </td>

                        {/* Date & Time */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-mono font-bold text-slate-800">{txDate}</div>
                          <div className="font-mono text-[10px] text-slate-500">{txTime}</div>
                        </td>

                        {/* Reference */}
                        <td className="py-3.5 px-3 font-mono text-[11px] font-semibold text-slate-700 whitespace-nowrap">
                          {tx.reference}
                        </td>

                        {/* Type */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          {isCredit ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <ArrowDownLeft className="w-3 h-3 text-emerald-700" />
                              CREDIT
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                              <ArrowUpRight className="w-3 h-3 text-rose-700" />
                              DEBIT
                            </span>
                          )}
                        </td>

                        {/* Description */}
                        <td className="py-3.5 px-4 font-medium text-slate-900">
                          <div className="text-slate-800">
                            {tx.description}
                          </div>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] inline-block mt-0.5">
                            {tx.category}
                          </span>
                        </td>

                        {/* Running Balance */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 bg-slate-50/60 whitespace-nowrap">
                          {formatNaira(tx.running_balance)}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Confirmed
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Mobile Responsive Transaction Cards View */}
            <div className="block md:hidden divide-y divide-slate-200">
              {filteredTransactions.length === 0 ? (
                <div className="p-8 text-center text-slate-500 space-y-1">
                  <AlertCircle className="w-6 h-6 text-slate-400 mx-auto" />
                  <p className="font-semibold text-xs">No road project contributions yet.</p>
                </div>
              ) : (
                filteredTransactions.map((tx) => {
                  const isCredit = tx.type === 'CREDIT';
                  const txDate = formatTxDate(tx.date);
                  const txTime = formatTxTime(tx.verified_at || tx.date);
                  const contributorDisplayName = tx.contributor_display_name || tx.payer_or_vendor || (tx.building_number ? `Resident ${tx.building_number}` : 'Anonymous Contributor');
                  return (
                    <div 
                      key={tx.id} 
                      onClick={() => setSelectedTx(tx)}
                      className="p-4 space-y-2.5 hover:bg-slate-50 cursor-pointer"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-slate-500 font-semibold">{txDate} • {txTime}</span>
                        {isCredit ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">CREDIT</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">DEBIT</span>
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs">{contributorDisplayName}</h4>
                        <p className="text-[11px] text-slate-600 mt-0.5">{tx.description}</p>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs font-mono">
                        <span className="text-slate-500 font-semibold">Ref: {tx.reference}</span>
                        <span className={`font-black ${isCredit ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {isCredit ? '+' : '-'}{formatNaira(tx.amount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500 bg-slate-50 p-2 rounded-lg font-mono">
                        <span>Running Balance:</span>
                        <strong className="text-slate-900">{formatNaira(tx.running_balance)}</strong>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Ledger Totals Footer */}
          <div className="p-4 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs font-bold">
            <span className="text-slate-700">Financial Ledger Totals:</span>
            <div className="flex items-center gap-4 font-mono">
              <span className="text-emerald-700">Total Credits: +{formatNaira(summary?.total_collected || 0)}</span>
              <span className="text-rose-600">Total Debits: -{formatNaira(summary?.total_spent || 0)}</span>
              <span className="text-slate-900 bg-white px-3 py-1 rounded-lg border border-slate-200">Balance: {formatNaira(summary?.current_balance || 0)}</span>
            </div>
          </div>

        </div>
      </section>

      {/* 6. PROJECT MILESTONES */}
      <section className="bg-white py-12 border-t border-slate-200">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold text-emerald-700 tracking-wider uppercase bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Project Execution Roadmap
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-display mt-2">
              Construction Milestones & Progress
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Physical execution and milestone delivery across Phase 1 & Phase 2.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {milestones.map((ms, index) => {
              const isDone = ms.status === 'COMPLETED';
              const isInProgress = ms.status === 'IN_PROGRESS';
              return (
                <div 
                  key={ms.id} 
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                    isDone ? 'bg-emerald-50/60 border-emerald-200' : isInProgress ? 'bg-amber-50/60 border-amber-300 ring-2 ring-amber-300/40' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                        isDone ? 'bg-emerald-600 text-white' : isInProgress ? 'bg-amber-600 text-white animate-pulse' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {isDone ? 'Completed' : isInProgress ? 'In Progress' : 'Upcoming'}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-500">0{index + 1}</span>
                    </div>

                    <h4 className="font-bold text-slate-900 text-xs mb-1.5 leading-snug">{ms.title}</h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed">{ms.description}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/60">
                    <div className="flex items-center justify-between text-[11px] mb-1 font-semibold">
                      <span className="text-slate-500">Progress</span>
                      <span className={isDone ? 'text-emerald-700' : isInProgress ? 'text-amber-800' : 'text-slate-400'}>{ms.progress_percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${isDone ? 'bg-emerald-600' : isInProgress ? 'bg-amber-500' : 'bg-slate-300'}`} style={{ width: `${ms.progress_percentage}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. TRANSACTION AUDIT MODAL */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${selectedTx.type === 'CREDIT' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {selectedTx.type === 'CREDIT' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base font-display">Transaction Audit Record</h3>
                  <p className="font-mono text-xs text-slate-500">Ref: {selectedTx.reference}</p>
                </div>
              </div>
              <button onClick={() => setSelectedTx(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3.5">
              <div className="bg-slate-50 p-4 rounded-2xl text-center border border-slate-100">
                <span className="text-[11px] font-bold uppercase text-slate-500">
                  {selectedTx.type === 'CREDIT' ? 'Inflow Contribution Amount' : 'Disbursement Expense Amount'}
                </span>
                <div className={`text-3xl font-black mt-1 font-display ${selectedTx.type === 'CREDIT' ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {selectedTx.type === 'CREDIT' ? '+' : '-'}{formatNaira(selectedTx.amount)}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Resulting Running Balance: <strong>{formatNaira(selectedTx.running_balance)}</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Contributor / Payer</span>
                  <span className="font-semibold text-slate-800">{selectedTx.contributor_display_name || selectedTx.payer_or_vendor || 'Anonymous Contributor'}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Date & Time</span>
                  <span className="font-semibold text-slate-800 font-mono">{selectedTx.date} • {formatTxTime(selectedTx.verified_at || selectedTx.date)}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Category</span>
                  <span className="font-semibold text-slate-800">{selectedTx.category}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Payment Gateway</span>
                  <span className="font-semibold text-slate-800">{selectedTx.source || 'Paystack'}</span>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Description</span>
                <p className="font-medium text-slate-800">{selectedTx.description}</p>
              </div>
            </div>

            <div className="pt-2">
              <button onClick={() => setSelectedTx(null)} className="w-full py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 cursor-pointer">
                Close Audit Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. PAYSTACK MODAL */}
      {isPaystackModalOpen && (
        <RoadProjectPaystackModal
          isOpen={isPaystackModalOpen}
          onClose={() => setIsPaystackModalOpen(false)}
          estateSettings={estateSettings}
          onPaymentVerified={() => loadRoadData()}
        />
      )}

      {/* 9. PAYSTACK RETURN VERIFICATION IN PROGRESS MODAL */}
      {verifyingRef && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <h3 className="text-xl font-black text-slate-900 font-display">Verifying Road Contribution</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Please wait while we securely confirm your payment with Paystack for reference <strong className="font-mono text-slate-900">{verifyingRef}</strong>...
            </p>
          </div>
        </div>
      )}

      {/* 10. PAYSTACK RETURN VERIFICATION RESULT MODAL */}
      {verificationResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95">
            {verificationResult.status === 'success' && verificationResult.transaction ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <h4 className="text-xl font-black text-slate-900 font-display">
                    Road Project Contribution Successful
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto font-medium">
                    Thank you for contributing to the Finger of God Estate Road Modernization Project.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-200/80">
                    <span className="text-slate-500 font-medium">Amount Paid:</span>
                    <span className="font-bold text-emerald-700 text-base font-mono">₦{verificationResult.transaction.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/80">
                    <span className="text-slate-500 font-medium">Reference:</span>
                    <span className="font-mono font-bold text-slate-800">{verificationResult.transaction.reference}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/80">
                    <span className="text-slate-500 font-medium">Contributor:</span>
                    <span className="font-semibold text-slate-900">{verificationResult.transaction.contributor_display_name || verificationResult.transaction.payer_or_vendor || 'Anonymous Contributor'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500 font-medium">Status:</span>
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Verified &amp; Recorded
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setVerificationResult(null)}
                  className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Close &amp; View on Live Ledger
                </button>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-rose-100 text-rose-700 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <AlertCircle className="w-10 h-10" />
                </div>
                <div>
                  <h4 className="text-xl font-black text-slate-900 font-display">
                    Payment Not Confirmed
                  </h4>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    {verificationResult.message || 'Payment was not completed on Paystack or could not be verified. No contribution was recorded to the ledger.'}
                  </p>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left text-[11px] text-amber-800">
                  <strong>Notice:</strong> Only genuinely successful Paystack transactions are credited to the road project ledger. If you were debited, the official webhook will process your confirmation automatically.
                </div>
                <button
                  type="button"
                  onClick={() => setVerificationResult(null)}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10 border-t border-slate-800 text-xs">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <EstateLogo size="sm" variant="icon-only" theme="dark" estateName={estateSettings.estate_name || 'Finger of God Estate'} />
            <div>
              <div className="font-bold text-white text-sm">{estateSettings.estate_name || 'Finger of God Estate'}</div>
              <div className="text-[11px] text-slate-500">Road Modernization Committee • Asaba</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
            <button onClick={onNavigateHome} className="hover:text-white transition-colors cursor-pointer">Home</button>
            <button onClick={onNavigateToSecurity} className="hover:text-white transition-colors cursor-pointer">Security</button>
            <button onClick={onNavigateToPortal} className="hover:text-white transition-colors cursor-pointer">Residents</button>
            <button onClick={onNavigateToAnnouncements} className="hover:text-white transition-colors cursor-pointer">Announcements</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicRoadProjectView;
