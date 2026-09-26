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
  Zap,
  Radio,
  RefreshCw,
  ShieldCheck
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
  onOpenAdminLogin: () => void;
}

export const PublicRoadProjectView: React.FC<PublicRoadProjectViewProps> = ({
  estateSettings,
  onNavigateHome,
  onNavigateToSecurity,
  onNavigateToAnnouncements,
  onNavigateToPortal,
  onNavigateToVerifyReceipt,
  onOpenResidentLogin,
  onOpenAdminLogin
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [transactions, setTransactions] = useState<RoadProjectTransaction[]>([]);
  const [summary, setSummary] = useState<RoadProjectSummary | null>(null);
  const [milestones, setMilestones] = useState<RoadProjectMilestone[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'CREDIT' | 'DEBIT'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Modal states
  const [selectedTx, setSelectedTx] = useState<RoadProjectTransaction | null>(null);
  const [isContributeModalOpen, setIsContributeModalOpen] = useState(false);
  const [isSubmitProofModalOpen, setIsSubmitProofModalOpen] = useState(false);
  const [proofSubmitted, setProofSubmitted] = useState(false);
  const [proofData, setProofData] = useState({
    buildingNumber: '',
    donorName: '',
    phone: '',
    amount: '',
    paymentDate: '',
    bankReference: '',
    notes: ''
  });

  // Paystack Quick Online Contribution
  const [isPaystackModalOpen, setIsPaystackModalOpen] = useState(false);
  const [onlineContributionAmount, setOnlineContributionAmount] = useState<number>(100000);
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);

  // Near real-time SSE stream hook
  const { isConnected: isStreamConnected, lastNotification, dismissNotification } = useRoadProjectStream({
    onRefreshNeeded: () => {
      loadRoadData();
    }
  });

  useEffect(() => {
    loadRoadData();
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

  // Filter transactions
  const filteredTransactions = transactions.filter(tx => {
    if (typeFilter !== 'ALL' && tx.type !== typeFilter) return false;
    if (categoryFilter !== 'ALL' && tx.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDesc = tx.description.toLowerCase().includes(q);
      const matchRef = tx.reference.toLowerCase().includes(q);
      const matchPayer = tx.payer_or_vendor.toLowerCase().includes(q);
      const matchCat = tx.category.toLowerCase().includes(q);
      const matchRec = tx.receipt_or_invoice_ref?.toLowerCase().includes(q);
      if (!matchDesc && !matchRef && !matchPayer && !matchCat && !matchRec) return false;
    }
    return true;
  });

  const handleExportCSV = () => {
    if (transactions.length === 0) return;
    const headers = ['Date', 'Reference', 'Type', 'Description', 'Category', 'Payer/Vendor', 'Credit (NGN)', 'Debit (NGN)', 'Running Balance (NGN)', 'Approved By', 'Receipt/Invoice Ref'];
    const rows = transactions.map(tx => [
      tx.date,
      tx.reference,
      tx.type,
      `"${tx.description.replace(/"/g, '""')}"`,
      `"${tx.category}"`,
      `"${tx.payer_or_vendor}"`,
      tx.type === 'CREDIT' ? tx.amount : 0,
      tx.type === 'DEBIT' ? tx.amount : 0,
      tx.running_balance,
      `"${tx.approved_by}"`,
      `"${tx.receipt_or_invoice_ref || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Finger_of_God_Estate_Road_Project_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleProofSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingProof(true);
    try {
      const amt = parseFloat(proofData.amount);
      if (isNaN(amt) || amt <= 0) {
        alert('Please enter a valid amount.');
        setIsSubmittingProof(false);
        return;
      }

      await dbService.simulateBankTransferWebhook({
        bank_transaction_id: proofData.bankReference?.trim() || `PROOF-${Date.now()}`,
        amount: amt,
        date: proofData.paymentDate || new Date().toISOString().split('T')[0],
        narration: `Resident bank payment reported: ${proofData.donorName} (${proofData.buildingNumber}). Notes: ${proofData.notes || 'None'}`,
        sender_name: proofData.donorName,
        bank_name: 'Zenith Bank PLC',
        source_type: 'Bank Transfer'
      });

      setProofSubmitted(true);
      setTimeout(() => {
        setProofSubmitted(false);
        setIsSubmitProofModalOpen(false);
        setProofData({
          buildingNumber: '',
          donorName: '',
          phone: '',
          amount: '',
          paymentDate: '',
          bankReference: '',
          notes: ''
        });
        loadRoadData();
      }, 2000);
    } catch (err: any) {
      alert(err.message || 'Failed to submit proof');
    } finally {
      setIsSubmittingProof(false);
    }
  };

  const formatNaira = (amt: number) => `₦${(amt || 0).toLocaleString()}`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* 1. Header / Navigation */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-18">
            {/* Logo & Back Affordance */}
            <div className="flex items-center gap-3">
              <button
                onClick={onNavigateHome}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-emerald-800 hover:bg-slate-100 rounded-xl transition-all cursor-pointer border border-slate-200/90 shadow-2xs group"
                title="Return to Main Estate Homepage"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-emerald-700 group-hover:-translate-x-0.5 transition-transform" />
                <span className="hidden sm:inline">Back to Home</span>
                <span className="sm:hidden">Back</span>
              </button>

              <div 
                className="flex items-center cursor-pointer select-none" 
                onClick={onNavigateHome}
                title="Finger of God Estate - Home"
              >
                <EstateLogo
                  size="sm"
                  variant="horizontal"
                  theme="light"
                  estateName={estateSettings.estate_name || 'Finger of God Estate'}
                  subtitle="ESTATE MANAGEMENT • ASABA"
                  hideSubtitleOnMobile={true}
                />
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
              <button 
                onClick={onNavigateHome}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Home
              </button>
              <button 
                onClick={onNavigateToSecurity}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                <span>Security</span>
              </button>
              {/* Road Project - Active Tab */}
              <button 
                className="px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-50 rounded-lg transition-colors cursor-pointer border border-amber-300/80 flex items-center gap-1.5 shadow-2xs"
              >
                <Coins className="w-3.5 h-3.5 text-amber-700" />
                <span>Road Project</span>
                <span className="px-1.5 py-0.2 bg-amber-600 text-white font-black text-[9px] rounded-full uppercase tracking-wider">
                  Transparent
                </span>
              </button>
              <button 
                onClick={onNavigateToPortal}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Residents
              </button>
              <button 
                onClick={onNavigateHome}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Estate Information
              </button>
              <button 
                onClick={onNavigateToPortal}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Payments & Levies
              </button>
              <button 
                onClick={onNavigateToAnnouncements}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Announcements
              </button>
            </nav>

            {/* Right Action Buttons */}
            <div className="hidden sm:flex items-center gap-2.5">
              <button
                onClick={() => setIsContributeModalOpen(true)}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Coins className="w-3.5 h-3.5" />
                <span>Contribute to Road</span>
              </button>
              <button
                onClick={onOpenAdminLogin}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                title="Admin Console"
              >
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>Admin</span>
              </button>
            </div>

            {/* Mobile menu trigger */}
            <div className="flex lg:hidden items-center gap-2">
              <button
                onClick={() => setIsContributeModalOpen(true)}
                className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-700 rounded-lg"
              >
                Contribute
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-2 shadow-xl animate-in slide-in-from-top-2 duration-150">
            <button
              onClick={() => { setMobileMenuOpen(false); onNavigateHome(); }}
              className="w-full text-left px-3 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50 rounded-xl flex items-center gap-2 text-emerald-800 bg-emerald-50/60 border border-emerald-200"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-700" />
              <span>Back to Main Estate Homepage</span>
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); onNavigateToSecurity(); }}
              className="w-full text-left px-3 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 rounded-xl flex items-center gap-2"
            >
              <Shield className="w-4 h-4 text-emerald-600" />
              <span>Security Department</span>
            </button>
            <button
              className="w-full text-left px-3 py-2.5 text-sm font-bold text-amber-900 bg-amber-50 rounded-xl flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-700" />
                <span>Road Project (Transparent Ledger)</span>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 bg-amber-600 text-white rounded-full">ACTIVE</span>
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); onNavigateToPortal(); }}
              className="w-full text-left px-3 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 rounded-xl"
            >
              Resident Portal & Security Levy
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); onNavigateToAnnouncements(); }}
              className="w-full text-left px-3 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 rounded-xl"
            >
              Announcements & Notices
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); onNavigateToVerifyReceipt(); }}
              className="w-full text-left px-3 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 rounded-xl"
            >
              Verify Payment Receipt
            </button>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => { setMobileMenuOpen(false); setIsContributeModalOpen(true); }}
                className="w-full py-2.5 bg-emerald-700 text-white font-bold text-xs rounded-xl text-center"
              >
                Contribute to Road Project
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 2. Hero Section: Road Project Overview */}
      <section className="bg-gradient-to-b from-slate-900 via-slate-850 to-slate-900 text-white pt-12 pb-16 sm:pb-20 relative overflow-hidden">
        {/* Subtle background mesh */}
        <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Top Breadcrumb & Back Navigation */}
          <div className="mb-6 flex items-center justify-between">
            <button
              onClick={onNavigateHome}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-850 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700/80 transition-all cursor-pointer group shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-emerald-400 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to Estate Homepage</span>
            </button>
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
              <span className="hover:text-slate-200 cursor-pointer" onClick={onNavigateHome}>Home</span>
              <span>/</span>
              <span className="text-amber-400 font-semibold">Road Project Ledger</span>
            </div>
          </div>

          <div className="max-w-4xl">
            {/* Project badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold tracking-wide uppercase mb-4">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Finger of God Estate • Special Infrastructure Undertaking</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight font-display mb-4">
              Road Modernization Project & Transparent Public Ledger
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
              Complete reconstruction and modernization of Phase 1 and Phase 2 Main Boulevards, featuring dual reinforced concrete stormwater drainage channels, 150mm crushed granite stone sub-base, and heavy-duty 40MPa interlocked paving blocks.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>100% Transparent Financial Ledger</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 text-xs font-medium">
                <Shield className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Dual Signatory Escrow Account</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 text-xs font-medium">
                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Live Continuous Updates</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Prominent Financial KPI Dashboard (Real-time Mathematical Calculation) */}
      <section className="-mt-8 sm:-mt-10 relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Real-time Status Connection Bar */}
        <div className="bg-slate-900 text-white rounded-2xl p-3.5 sm:p-4 mb-4 shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative flex h-3 w-3 shrink-0">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isStreamConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isStreamConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs sm:text-sm text-white">Live Verified Financial Ledger</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30">
                  {isStreamConnected ? 'SSE Live Connected' : 'Auto-Sync Active'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Financial figures update automatically without refreshing. All balances are mathematically calculated from verified transactions.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 font-mono">
              <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
              <span>Paystack: Real-Time Webhook (&lt;2s)</span>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1.5 font-mono">
              <Building className="w-3.5 h-3.5 text-blue-400" />
              <span>Bank Feed: Zenith Escrow Sync</span>
            </span>
            <button
              onClick={() => loadRoadData()}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
              title="Refresh ledger data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Live Notification Banner */}
        {lastNotification && (
          <div className="mb-4 bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between gap-3 animate-in slide-in-from-top-3 duration-300 border border-emerald-500/40">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/20 text-white shadow-xs">
                <Sparkles className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-white text-emerald-900 text-[10px] font-black uppercase">
                    Live Ledger Update
                  </span>
                  <span className="text-[10px] text-emerald-100 font-mono">{lastNotification.timestamp}</span>
                </div>
                <p className="font-bold text-xs sm:text-sm mt-0.5">{lastNotification.message}</p>
              </div>
            </div>
            <button
              onClick={dismissNotification}
              className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: TOTAL CREDIT */}
          <div className="bg-white rounded-2xl p-5 border border-emerald-200 shadow-md flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-6 -mt-6 pointer-events-none" />
            <div>
              <div className="flex items-center justify-between text-emerald-800 text-xs font-bold uppercase tracking-wider mb-2">
                <span className="flex items-center gap-1.5">
                  <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                  TOTAL CREDIT
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  INFLOWS
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-700 font-display">
                {formatNaira(summary?.total_collected || 0)}
              </div>
              <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{summary?.credits_count || 0} verified contributions recorded</span>
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-emerald-50 flex items-center justify-between text-xs text-slate-600">
              <span>Collection Progress:</span>
              <span className="font-bold text-emerald-700">{summary?.collection_percentage || 0}% of target</span>
            </div>
          </div>

          {/* Card 2: TOTAL DEBIT */}
          <div className="bg-white rounded-2xl p-5 border border-rose-200 shadow-md flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-bl-full -mr-6 -mt-6 pointer-events-none" />
            <div>
              <div className="flex items-center justify-between text-rose-800 text-xs font-bold uppercase tracking-wider mb-2">
                <span className="flex items-center gap-1.5">
                  <ArrowUpRight className="w-4 h-4 text-rose-600" />
                  TOTAL DEBIT
                </span>
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                  DISBURSED
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-rose-600 font-display">
                {formatNaira(summary?.total_spent || 0)}
              </div>
              <p className="text-[11px] text-rose-600 mt-1">
                Materials, equipment, labor & drainage works
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-rose-50 flex items-center justify-between text-xs text-slate-600">
              <span>Disbursed Invoices:</span>
              <span className="font-bold text-slate-800">{summary?.debits_count || 0} approved disbursements</span>
            </div>
          </div>

          {/* Card 3: CURRENT BALANCE */}
          <div className="bg-gradient-to-br from-emerald-800 via-emerald-900 to-teal-950 text-white rounded-2xl p-5 shadow-lg flex flex-col justify-between relative overflow-hidden border border-emerald-700">
            <div className="absolute -bottom-6 -right-6 w-28 h-28 bg-white/5 rounded-full pointer-events-none" />
            <div>
              <div className="flex items-center justify-between text-emerald-200 text-xs font-bold uppercase tracking-wider mb-2">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  CURRENT BALANCE
                </span>
                <span className="px-2 py-0.5 bg-emerald-500/40 text-emerald-100 rounded-full text-[9px] font-bold uppercase tracking-wider border border-emerald-400/30">
                  DERIVED BALANCE
                </span>
              </div>
              <div className="text-3xl sm:text-3xl font-black text-white font-display tracking-tight">
                {formatNaira(summary?.current_balance || 0)}
              </div>
              <p className="text-[11px] text-emerald-200/90 mt-1">
                Total Credit minus Total Debit (Immutable)
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-emerald-100/90">
              <span>Escrow Status:</span>
              <span className="font-bold text-white flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-300" />
                Audited & Reconciled
              </span>
            </div>
          </div>

          {/* Card 4: OUTSTANDING CONTRIBUTIONS */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
                <span>OUTSTANDING CONTRIBUTIONS</span>
                <span className="p-1 rounded-md bg-slate-100 text-slate-600">
                  <Coins className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 font-display">
                {formatNaira(summary?.outstanding_contributions || 0)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Approved Target Budget: {formatNaira(summary?.target_budget || 35000000)}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span>Levy Assessment:</span>
              <span className="font-semibold text-slate-900">₦100,000 / Compound</span>
            </div>
          </div>

        </div>

        {/* Progress bar towards target */}
        <div className="mt-4 bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className="text-slate-700 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>Overall Road Modernization Funding Progress</span>
            </span>
            <span className="font-bold text-emerald-700">
              {formatNaira(summary?.total_collected || 0)} of {formatNaira(summary?.target_budget || 35000000)} ({summary?.collection_percentage || 0}%)
            </span>
          </div>
          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
            <div 
              className="bg-emerald-600 h-full transition-all duration-700 rounded-full"
              style={{ width: `${Math.min(100, summary?.collection_percentage || 0)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
            <span>Phase 1: Grading (Done)</span>
            <span>Phase 2: Side Drains (Done)</span>
            <span className="font-semibold text-emerald-700">Phase 3: Stone Base (Active)</span>
            <span>Phase 4: Interlocking Paving (Next)</span>
          </div>
        </div>
      </section>

      {/* 4. Action Banner: How to Contribute to Road Project */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="bg-gradient-to-r from-amber-50 via-emerald-50 to-teal-50 border border-emerald-200/90 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[11px] font-bold">
              <span>Direct Community Contribution</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 font-display">
              Have you paid your compound road contribution?
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Every building / plot owner is required to contribute towards the permanent road infrastructure. Payments are made directly into the designated dual-signatory Road Project Escrow Account and verified on this public ledger.
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-700 pt-1">
              <span className="bg-white/80 px-2.5 py-1 rounded-md border border-slate-200">
                <strong>Bank:</strong> Zenith Bank PLC
              </span>
              <span className="bg-white/80 px-2.5 py-1 rounded-md border border-slate-200">
                <strong>Account:</strong> 1018899201
              </span>
              <span className="bg-white/80 px-2.5 py-1 rounded-md border border-slate-200">
                <strong>Name:</strong> Finger of God Road Project Committee
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-stretch gap-3 shrink-0 w-full md:w-auto">
            <button
              onClick={() => setIsContributeModalOpen(true)}
              className="px-5 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all text-center cursor-pointer flex items-center justify-center gap-2"
            >
              <Coins className="w-4 h-4" />
              <span>Contribute Online</span>
            </button>
            <button
              onClick={() => setIsSubmitProofModalOpen(true)}
              className="px-5 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold text-xs uppercase tracking-wider shadow-xs transition-all text-center cursor-pointer flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>Report / Verify Bank Transfer</span>
            </button>
          </div>
        </div>
      </section>

      {/* 5. Main Public Financial Transaction Ledger Table */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 mb-16 flex-1 w-full">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          
          {/* Ledger Table Header Controls */}
          <div className="p-6 border-b border-slate-200 bg-slate-50/50">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-display">
                    Public Financial Transaction Dashboard
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs">
                    {filteredTransactions.length} Records
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Continuously updated financial ledger showing all verified inflows (Credits) and approved disbursements (Debits) with running balance.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCSV}
                  className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Download Ledger as CSV spreadsheet"
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

            {/* Filter Tabs & Search Bar */}
            <div className="mt-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-4 border-t border-slate-200/80">
              
              {/* Type Filter Buttons */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl max-w-fit">
                <button
                  onClick={() => setTypeFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    typeFilter === 'ALL'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Transactions ({transactions.length})
                </button>
                <button
                  onClick={() => setTypeFilter('CREDIT')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    typeFilter === 'CREDIT'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-emerald-800 hover:bg-emerald-100/50'
                  }`}
                >
                  <ArrowDownLeft className="w-3 h-3" />
                  <span>CREDIT (Inflows)</span>
                </button>
                <button
                  onClick={() => setTypeFilter('DEBIT')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    typeFilter === 'DEBIT'
                      ? 'bg-rose-700 text-white shadow-xs'
                      : 'text-rose-800 hover:bg-rose-100/50'
                  }`}
                >
                  <ArrowUpRight className="w-3 h-3" />
                  <span>DEBIT (Expenses)</span>
                </button>
              </div>

              {/* Search & Category Filter */}
              <div className="flex items-center gap-2 flex-1 md:max-w-md">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by building, ref, description..."
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-slate-400"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
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

          {/* Ledger Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3.5 px-4 font-semibold">Date</th>
                  <th className="py-3.5 px-3 font-semibold">Reference</th>
                  <th className="py-3.5 px-3 font-semibold">Type</th>
                  <th className="py-3.5 px-4 font-semibold min-w-[200px]">Description</th>
                  <th className="py-3.5 px-3 font-semibold">Source</th>
                  <th className="py-3.5 px-3 font-semibold">Category</th>
                  <th className="py-3.5 px-4 text-right font-semibold text-emerald-800">Credit (₦)</th>
                  <th className="py-3.5 px-4 text-right font-semibold text-rose-800">Debit (₦)</th>
                  <th className="py-3.5 px-4 text-right font-semibold text-slate-900 bg-slate-50/80">Balance</th>
                  <th className="py-3.5 px-3 text-center font-semibold">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Coins className="w-6 h-6 text-emerald-600 animate-spin" />
                        <span className="text-xs font-semibold">Loading verified road ledger...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-500">
                      <div className="max-w-sm mx-auto space-y-2">
                        <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
                        <p className="font-semibold text-slate-700">No transactions match your filter</p>
                        <p className="text-[11px] text-slate-500">Try clearing the search query or selecting &quot;All Transactions&quot;.</p>
                        <button
                          onClick={() => { setTypeFilter('ALL'); setCategoryFilter('ALL'); setSearchQuery(''); }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
                        >
                          Reset Filters
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => {
                    const isCredit = tx.type === 'CREDIT';
                    return (
                      <tr 
                        key={tx.id} 
                        className="hover:bg-slate-50/90 transition-colors group cursor-pointer"
                        onClick={() => setSelectedTx(tx)}
                      >
                        {/* Date */}
                        <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                          {tx.date}
                        </td>

                        {/* Reference */}
                        <td className="py-3 px-3 font-mono text-[11px] font-semibold text-slate-700 whitespace-nowrap">
                          {tx.reference}
                        </td>

                        {/* Type Badge */}
                        <td className="py-3 px-3 whitespace-nowrap">
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
                        <td className="py-3 px-4 font-medium text-slate-900">
                          <div className="font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
                            {tx.description}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                            <span className="font-medium text-slate-700">{tx.payer_or_vendor}</span>
                            {tx.building_number && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200 font-mono text-[9px] font-bold">
                                Bldg {tx.building_number}
                              </span>
                            )}
                            {tx.receipt_or_invoice_ref && (
                              <span className="text-[10px] font-mono text-slate-400">
                                Ref: {tx.receipt_or_invoice_ref}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Transaction Source */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {tx.source === 'Paystack' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CreditCard className="w-3 h-3 text-emerald-600" />
                              Paystack
                            </span>
                          ) : tx.source === 'Bank API' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                              <Zap className="w-3 h-3 text-purple-600" />
                              Bank API
                            </span>
                          ) : tx.source === 'Bank Transfer' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
                              <Building className="w-3 h-3 text-sky-600" />
                              Bank Transfer
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              <FileText className="w-3 h-3 text-slate-500" />
                              Admin-authorized
                            </span>
                          )}
                        </td>

                        {/* Category */}
                        <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold">
                            {tx.category}
                          </span>
                        </td>

                        {/* Credit Column */}
                        <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">
                          {isCredit ? (
                            <span className="text-emerald-700">
                              +{formatNaira(tx.amount)}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-sans">—</span>
                          )}
                        </td>

                        {/* Debit Column */}
                        <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">
                          {!isCredit ? (
                            <span className="text-rose-600">
                              -{formatNaira(tx.amount)}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-sans">—</span>
                          )}
                        </td>

                        {/* Running Balance */}
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 bg-slate-50/60 whitespace-nowrap">
                          {formatNaira(tx.running_balance)}
                        </td>

                        {/* Action Audit Preview */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedTx(tx); }}
                            className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                            title="View audit details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className="bg-slate-100/90 font-bold border-t-2 border-slate-200 text-slate-900">
                <tr>
                  <td colSpan={6} className="py-3.5 px-4 text-right uppercase tracking-wider text-xs">
                    Ledger Totals & Available Balance:
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-emerald-800 text-xs">
                    +{formatNaira(summary?.total_collected || 0)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-rose-800 text-xs">
                    -{formatNaira(summary?.total_spent || 0)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-emerald-900 font-black text-sm bg-emerald-50/80">
                    {formatNaira(summary?.current_balance || 0)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Footer Ledger Notice */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                All amounts are verified by the Road Oversight Committee. Running balance is mathematically derived from the actual transaction ledger.
              </span>
            </div>
            <div>
              Last verified: {new Date().toLocaleDateString()} at 10:00 AM
            </div>
          </div>

        </div>
      </section>

      {/* 6. Road Modernization Milestones & Work Schedule */}
      <section className="bg-white py-12 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold text-emerald-700 tracking-wider uppercase bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Project Execution Roadmap
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-display mt-2">
              Construction Milestones & Progress
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Track the physical execution of road construction across Phase 1 & Phase 2.
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
                    isDone 
                      ? 'bg-emerald-50/60 border-emerald-200' 
                      : isInProgress 
                      ? 'bg-amber-50/60 border-amber-300 ring-2 ring-amber-300/40' 
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                        isDone 
                          ? 'bg-emerald-600 text-white' 
                          : isInProgress 
                          ? 'bg-amber-600 text-white animate-pulse' 
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                        {isDone ? 'Completed' : isInProgress ? 'In Progress' : 'Upcoming'}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-500">
                        0{index + 1}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 text-xs mb-1.5 leading-snug">
                      {ms.title}
                    </h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      {ms.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/60">
                    <div className="flex items-center justify-between text-[11px] mb-1 font-semibold">
                      <span className="text-slate-500">Progress</span>
                      <span className={isDone ? 'text-emerald-700' : isInProgress ? 'text-amber-800' : 'text-slate-400'}>
                        {ms.progress_percentage}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          isDone ? 'bg-emerald-600' : isInProgress ? 'bg-amber-500' : 'bg-slate-300'
                        }`}
                        style={{ width: `${ms.progress_percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. Oversight Committee & Governance Board */}
      <section className="bg-slate-100/70 py-12 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            
            <div className="lg:col-span-1 space-y-3">
              <span className="text-xs font-bold text-emerald-800 tracking-wider uppercase bg-emerald-100/80 px-2.5 py-1 rounded-full">
                Accountability Charter
              </span>
              <h3 className="text-2xl font-black text-slate-900 font-display">
                Oversight & Audit Governance
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                The Finger of God Estate Road Project is governed by a dedicated Resident Steering Committee operating under strict fiduciary standards:
              </p>
              <ul className="space-y-2 text-xs text-slate-700">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span><strong>Zero Cash Policy:</strong> All levies must be paid to the bank escrow.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span><strong>Dual Signatory:</strong> Withdrawals require Chairman & Treasurer joint approval.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span><strong>Civil Supervision:</strong> Independent COREN-registered engineer on-site.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span><strong>Open Books:</strong> Every single voucher and invoice is publicly audit-ready.</span>
                </li>
              </ul>
            </div>

            {/* Committee members list */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-1">
                  Steering Committee Chairman
                </div>
                <div className="font-bold text-slate-900 text-sm">
                  Engr. Babatunde Adeleke (FNSE)
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Resident Executive Council Member • Plot 4A
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-1">
                  Site Supervising Civil Engineer
                </div>
                <div className="font-bold text-slate-900 text-sm">
                  Engr. K. O. Alabi (MNSE, COREN)
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Quality Assurance & Compaction Specialist
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-1">
                  Committee Treasurer & Auditor
                </div>
                <div className="font-bold text-slate-900 text-sm">
                  Dr. Chioma Nwachukwu
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Resident Representative • House 12, Palm View
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-1">
                  Community Liaison Lead
                </div>
                <div className="font-bold text-slate-900 text-sm">
                  Alhaji Usman Danladi
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Zonal Representative • Acacia Close
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 8. Transaction Details Audit Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${selectedTx.type === 'CREDIT' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {selectedTx.type === 'CREDIT' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base font-display">
                    Transaction Audit Record
                  </h3>
                  <p className="font-mono text-xs text-slate-500">
                    Ref: {selectedTx.reference}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
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
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Date</span>
                  <span className="font-semibold text-slate-800">{selectedTx.date}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Category</span>
                  <span className="font-semibold text-slate-800">{selectedTx.category}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">
                    {selectedTx.type === 'CREDIT' ? 'Payer / Compound' : 'Vendor / Contractor'}
                  </span>
                  <span className="font-semibold text-slate-800">{selectedTx.payer_or_vendor}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Receipt / Voucher #</span>
                  <span className="font-semibold font-mono text-slate-800">{selectedTx.receipt_or_invoice_ref || 'N/A'}</span>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Description & Purpose</span>
                <p className="font-medium text-slate-800">{selectedTx.description}</p>
                {selectedTx.notes && (
                  <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 mt-1">
                    <strong>Audit Note:</strong> {selectedTx.notes}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 bg-emerald-50/60 border border-emerald-100 p-2.5 rounded-xl">
                <span className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Approved by: {selectedTx.approved_by}</span>
                </span>
                <span className="font-mono text-[10px] text-slate-400">
                  {new Date(selectedTx.verified_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedTx(null)}
                className="w-full py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close Audit Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Modal: Online Contribution via Paystack or Bank Transfer */}
      {isContributeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Coins className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base font-display">
                    Contribute to Road Project
                  </h3>
                  <p className="text-xs text-slate-500">
                    Finger of God Estate Road Modernization
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsContributeModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 space-y-2">
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Direct Bank Transfer Details (Preferred):</span>
                </div>
                <p className="text-amber-800 leading-relaxed">
                  Make your transfer directly to the estate road construction account:
                </p>
                <div className="bg-white p-3 rounded-xl border border-amber-200/80 font-mono text-slate-800 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Bank:</span>
                    <span className="font-bold">Zenith Bank PLC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Account Number:</span>
                    <span className="font-black text-emerald-700 text-sm">1018899201</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Account Name:</span>
                    <span className="font-bold">FOG Road Project Committee</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Payment Reference:</span>
                    <span className="font-bold text-amber-800">Your Building # (e.g. Bld 024)</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Or Pay Instantly with Card / USSD via Paystack:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[50000, 100000, 200000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setOnlineContributionAmount(amt)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        onlineContributionAmount === amt
                          ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {formatNaira(amt)}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  setIsContributeModalOpen(false);
                  setIsPaystackModalOpen(true);
                }}
                className="w-full py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                <span>Pay Online with Paystack (Real-time Ledger Credit)</span>
              </button>

              <div className="text-center pt-2">
                <button
                  onClick={() => {
                    setIsContributeModalOpen(false);
                    setIsSubmitProofModalOpen(true);
                  }}
                  className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
                >
                  Already made a bank transfer? Submit payment proof here &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 10. Modal: Report / Submit Bank Transfer Proof */}
      {isSubmitProofModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base font-display">
                    Submit Road Contribution Proof
                  </h3>
                  <p className="text-xs text-slate-500">
                    Notify the audit committee to verify your ledger credit
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSubmitProofModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {proofSubmitted ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="font-black text-slate-900 text-lg">Contribution Proof Received!</h4>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  Thank you! The Road Project Financial Secretary and Audit Committee will verify the bank deposit and add your verified CREDIT to the public ledger shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleProofSubmit} className="py-4 space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Building / Plot Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Building 024 or Plot 14B"
                      value={proofData.buildingNumber}
                      onChange={(e) => setProofData({ ...proofData, buildingNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Contributor Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Chief Adeleke"
                      value={proofData.donorName}
                      onChange={(e) => setProofData({ ...proofData, donorName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Amount Paid (₦) *</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 100000"
                      value={proofData.amount}
                      onChange={(e) => setProofData({ ...proofData, amount: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="080XXXXXXXX"
                      value={proofData.phone}
                      onChange={(e) => setProofData({ ...proofData, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Transfer Date *</label>
                    <input
                      type="date"
                      required
                      value={proofData.paymentDate}
                      onChange={(e) => setProofData({ ...proofData, paymentDate: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Bank Session ID / Ref</label>
                    <input
                      type="text"
                      placeholder="e.g. 10000420261005..."
                      value={proofData.bankReference}
                      onChange={(e) => setProofData({ ...proofData, bankReference: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-[11px]"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Notes / Narration</label>
                  <textarea
                    rows={2}
                    placeholder="Optional notes or bank account name used..."
                    value={proofData.notes}
                    onChange={(e) => setProofData({ ...proofData, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsSubmitProofModalOpen(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs"
                  >
                    Submit Proof for Verification
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 11. Paystack Payment Modal for Online Road Contributions */}
      {isPaystackModalOpen && (
        <RoadProjectPaystackModal
          isOpen={isPaystackModalOpen}
          onClose={() => setIsPaystackModalOpen(false)}
          estateSettings={estateSettings}
          onPaymentVerified={(_tx) => {
            loadRoadData();
          }}
        />
      )}

      {/* 12. Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <EstateLogo
              size="sm"
              variant="icon-only"
              theme="dark"
              estateName={estateSettings.estate_name || 'Finger of God Estate'}
            />
            <div>
              <div className="font-bold text-white text-sm">
                {estateSettings.estate_name || 'Finger of God Estate'}
              </div>
              <div className="text-[11px] text-slate-500">
                Community Infrastructure & Road Modernization Committee • Asaba
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
            <button onClick={onNavigateHome} className="hover:text-white transition-colors cursor-pointer">
              Home
            </button>
            <button onClick={onNavigateToSecurity} className="hover:text-white transition-colors cursor-pointer">
              Security
            </button>
            <button onClick={onNavigateToPortal} className="hover:text-white transition-colors cursor-pointer">
              Residents
            </button>
            <button onClick={onNavigateToAnnouncements} className="hover:text-white transition-colors cursor-pointer">
              Announcements
            </button>
            <button onClick={onOpenAdminLogin} className="hover:text-white transition-colors cursor-pointer">
              Admin Console
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
