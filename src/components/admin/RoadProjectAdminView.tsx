import React, { useState, useEffect } from 'react';
import {
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeft,
  Plus,
  Shield,
  Search,
  Filter,
  Download,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Eye,
  FileText,
  Clock,
  Building,
  Info,
  X,
  Lock,
  CreditCard,
  Zap,
  RefreshCw,
  Sparkles,
  Link,
  Ban,
  ShieldAlert,
  Layers,
  UploadCloud,
  CheckCircle,
  ShieldCheck,
  Send
} from 'lucide-react';
import {
  EstateSettings,
  RoadProjectTransaction,
  RoadProjectSummary,
  RoadTransactionType,
  RoadProjectCategory,
  RoadBankReconciliationItem
} from '../../types/database';
import { dbService } from '../../lib/supabase';
import { useRoadProjectStream } from '../../hooks/useRoadProjectStream';

interface RoadProjectAdminViewProps {
  estateSettings: EstateSettings;
  onNavigateToDashboard?: () => void;
}

export const RoadProjectAdminView: React.FC<RoadProjectAdminViewProps> = ({
  estateSettings,
  onNavigateToDashboard
}) => {
  const [activeTab, setActiveTab] = useState<'LEDGER' | 'RECONCILIATION' | 'BANK_GATEWAY'>('LEDGER');
  
  // Ledger state
  const [transactions, setTransactions] = useState<RoadProjectTransaction[]>([]);
  const [summary, setSummary] = useState<RoadProjectSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'CREDIT' | 'DEBIT'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals for Transactions
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalType, setModalType] = useState<RoadTransactionType>('CREDIT');
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    category: 'Building Contribution' as RoadProjectCategory,
    amount: '',
    payer_or_vendor: '',
    approved_by: 'Engr. Babatunde Adeleke (Chairman)',
    receipt_or_invoice_ref: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [selectedTx, setSelectedTx] = useState<RoadProjectTransaction | null>(null);

  // Void/Delete modal
  const [txToVoid, setTxToVoid] = useState<RoadProjectTransaction | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [isVoiding, setIsVoiding] = useState(false);

  // Reconciliation state
  const [reconItems, setReconItems] = useState<RoadBankReconciliationItem[]>([]);
  const [reconStats, setReconStats] = useState({ total: 0, matched: 0, unmatched: 0, duplicates: 0 });
  const [reconFilter, setReconFilter] = useState<'ALL' | 'MATCHED' | 'UNMATCHED' | 'DUPLICATE'>('ALL');
  const [matchingItem, setMatchingItem] = useState<RoadBankReconciliationItem | null>(null);
  const [matchBuildingInput, setMatchBuildingInput] = useState('');
  const [matchContributorInput, setMatchContributorInput] = useState('');
  const [isMatching, setIsMatching] = useState(false);

  // Bank Webhook Simulator state
  const [simAmount, setSimAmount] = useState('100000');
  const [simSender, setSimSender] = useState('Chief Emmanuel Nwosu');
  const [simNarration, setSimNarration] = useState('ZENITH TRF FROM NWOSU BLDG 031 ROAD ASSESSMENT');
  const [simTxId, setSimTxId] = useState(`ZEN-TEST-${Math.floor(100000 + Math.random() * 900000)}`);
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState<{ success: boolean; duplicate?: boolean; unmatched?: boolean; message?: string } | null>(null);

  // Statement Ingestion state
  const [statementText, setStatementText] = useState(
    `2026-10-27 | ZEN-STMT-9941 | TRF FROM BALOGUN BLDG 024 LEVY | 100000\n2026-10-27 | ZEN-STMT-9942 | CASH DEP ROAD DONATION UNKNOWN | 50000\n2026-10-27 | ZEN-STMT-9943 | TRF FROM NWOSU BLDG 031 | 100000`
  );
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; duplicates: number; unmatched: number } | null>(null);

  // Real-time SSE Stream
  const { isConnected: isStreamConnected, lastNotification, dismissNotification } = useRoadProjectStream({
    onRefreshNeeded: () => {
      loadLedger();
      loadReconciliation();
    }
  });

  useEffect(() => {
    loadLedger();
    loadReconciliation();
  }, []);

  const loadLedger = async () => {
    setLoading(true);
    try {
      const [txList, sumData] = await Promise.all([
        dbService.getRoadProjectTransactions('desc'),
        dbService.getRoadProjectSummary(35000000)
      ]);
      setTransactions(txList);
      setSummary(sumData);
    } catch (err) {
      console.error('Failed to load road ledger in admin:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadReconciliation = async () => {
    try {
      const res = await dbService.getRoadProjectReconciliation();
      if (res.success) {
        setReconItems(res.items);
        setReconStats(res.stats);
      }
    } catch (err) {
      console.error('Failed to load reconciliation items:', err);
    }
  };

  const handleOpenAddModal = (type: RoadTransactionType) => {
    setModalType(type);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      description: '',
      category: type === 'CREDIT' ? 'Building Contribution' : 'Drainage Construction',
      amount: '',
      payer_or_vendor: '',
      approved_by: 'Engr. Babatunde Adeleke (Chairman)',
      receipt_or_invoice_ref: '',
      notes: ''
    });
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description.trim()) {
      setFormError('Please enter a clear description or purpose.');
      return;
    }
    const amt = parseFloat(formData.amount);
    if (isNaN(amt) || amt <= 0) {
      setFormError('Please enter a valid amount greater than ₦0.');
      return;
    }
    if (!formData.payer_or_vendor.trim()) {
      setFormError(modalType === 'CREDIT' ? 'Please enter contributor / building name.' : 'Please enter vendor / contractor name.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      if (modalType === 'DEBIT') {
        const res = await dbService.recordRoadProjectExpenditure({
          amount: amt,
          category: formData.category,
          description: formData.description,
          payer_or_vendor: formData.payer_or_vendor,
          approved_by: formData.approved_by,
          receipt_or_invoice_ref: formData.receipt_or_invoice_ref,
          notes: formData.notes,
          date: formData.date
        });
        if (res.success) {
          setIsAddModalOpen(false);
          loadLedger();
        } else {
          setFormError(res.error || 'Failed to record authorized expenditure.');
        }
      } else {
        const res = await dbService.addRoadProjectTransaction({
          type: 'CREDIT',
          description: formData.description,
          category: formData.category,
          amount: amt,
          payer_or_vendor: formData.payer_or_vendor,
          approved_by: formData.approved_by,
          receipt_or_invoice_ref: formData.receipt_or_invoice_ref,
          notes: formData.notes,
          date: formData.date
        });

        if (res.success) {
          setIsAddModalOpen(false);
          loadLedger();
          loadReconciliation();
        } else {
          setFormError(res.error || 'Failed to record transaction.');
        }
      }
    } catch (err: any) {
      setFormError(err.message || 'Error recording transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmVoid = async () => {
    if (!txToVoid) return;
    if (!voidReason.trim()) {
      alert('Please specify an audit reason for voiding this transaction.');
      return;
    }

    setIsVoiding(true);
    try {
      const res = await dbService.deleteRoadProjectTransaction(txToVoid.id, voidReason);
      if (res.success) {
        setTxToVoid(null);
        setVoidReason('');
        loadLedger();
      } else {
        alert(res.error || 'Failed to void transaction.');
      }
    } catch (err: any) {
      alert(err.message || 'Error voiding transaction.');
    } finally {
      setIsVoiding(false);
    }
  };

  const handleMatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchingItem || !matchBuildingInput.trim()) return;

    setIsMatching(true);
    try {
      const res = await dbService.matchRoadProjectReconciliation({
        reconciliation_id: matchingItem.id,
        building_number: matchBuildingInput.trim(),
        contributor_name: matchContributorInput.trim() || undefined
      });

      if (res.success) {
        setMatchingItem(null);
        setMatchBuildingInput('');
        setMatchContributorInput('');
        loadReconciliation();
        loadLedger();
      } else {
        alert(res.message || 'Failed to match transaction');
      }
    } catch (err: any) {
      alert(err.message || 'Network error matching transaction');
    } finally {
      setIsMatching(false);
    }
  };

  const handleSimulateWebhook = async () => {
    const amt = parseFloat(simAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Enter valid amount');
      return;
    }

    setSimLoading(true);
    setSimResult(null);

    try {
      const res = await dbService.simulateBankTransferWebhook({
        bank_transaction_id: simTxId.trim(),
        amount: amt,
        narration: simNarration.trim(),
        sender_name: simSender.trim(),
        bank_name: 'Zenith Bank PLC',
        source_type: 'Bank API'
      });

      setSimResult({
        success: res.success,
        duplicate: res.duplicate,
        unmatched: res.unmatched,
        message: res.duplicate 
          ? '⚠️ Duplicate Protection Active: This transaction ID was already processed. Duplicate credit prevented!'
          : res.unmatched
            ? 'ℹ️ Verified as CREDIT on ledger. Flagged as UNMATCHED in reconciliation because building was not detected in narration.'
            : '✅ Successfully verified as CREDIT on ledger and auto-matched to building!'
      });

      loadLedger();
      loadReconciliation();
    } catch (err: any) {
      setSimResult({ success: false, message: err.message || 'Simulation failed' });
    } finally {
      setSimLoading(false);
    }
  };

  const handleImportStatement = async () => {
    const lines = statementText.trim().split('\n').filter(l => l.trim().length > 0);
    if (lines.length === 0) return;

    setImportLoading(true);
    setImportResult(null);

    try {
      const rows = lines.map(line => {
        const parts = line.split('|').map(p => p.trim());
        return {
          date: parts[0] || new Date().toISOString().split('T')[0],
          bank_transaction_id: parts[1] || `STMT-${Date.now()}`,
          reference: parts[1],
          narration: parts[2] || 'Zenith Bank Statement Ingestion',
          amount: parseFloat(parts[3]) || 0
        };
      });

      const res = await dbService.importRoadProjectBankStatement(rows);
      setImportResult({
        imported: res.importedCount,
        duplicates: res.duplicateCount,
        unmatched: res.unmatchedCount
      });
      loadLedger();
      loadReconciliation();
    } catch (err: any) {
      alert(err.message || 'Import failed');
    } finally {
      setImportLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (transactions.length === 0) return;
    const headers = ['Date', 'Reference', 'Type', 'Description', 'Source', 'Category', 'Payer/Vendor', 'Credit (NGN)', 'Debit (NGN)', 'Running Balance (NGN)', 'Approved By'];
    const rows = transactions.map(tx => [
      tx.date,
      tx.reference,
      tx.type,
      `"${tx.description.replace(/"/g, '""')}"`,
      tx.source,
      `"${tx.category}"`,
      `"${tx.payer_or_vendor}"`,
      tx.type === 'CREDIT' ? tx.amount : 0,
      tx.type === 'DEBIT' ? tx.amount : 0,
      tx.running_balance,
      `"${tx.approved_by}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Finger_of_God_Estate_Road_Project_Admin_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatNaira = (amt: number) => `₦${(amt || 0).toLocaleString()}`;

  const filteredTransactions = transactions.filter(tx => {
    if (typeFilter !== 'ALL' && tx.type !== typeFilter) return false;
    if (categoryFilter !== 'ALL' && tx.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDesc = tx.description.toLowerCase().includes(q);
      const matchRef = tx.reference.toLowerCase().includes(q);
      const matchPayer = tx.payer_or_vendor.toLowerCase().includes(q);
      const matchCat = tx.category.toLowerCase().includes(q);
      const matchSource = tx.source?.toLowerCase().includes(q);
      if (!matchDesc && !matchRef && !matchPayer && !matchCat && !matchSource) return false;
    }
    return true;
  });

  const filteredReconItems = reconItems.filter(item => {
    if (reconFilter !== 'ALL' && item.status !== reconFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onNavigateToDashboard && (
            <button
              onClick={onNavigateToDashboard}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-display">
                Road Project Financial Dashboard & Treasury
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs">
                Live Ledger
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Verified financial records with automated Paystack webhooks, open banking reconciliation, and duplicate fraud prevention.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenAddModal('DEBIT')}
            className="px-3.5 py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record Authorized Expense (Debit)</span>
          </button>
          <button
            onClick={() => handleOpenAddModal('CREDIT')}
            className="px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Log Verified Deposit (Credit)</span>
          </button>
        </div>
      </div>

      {/* 2. Live Sync Connection Status Bar */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-3 w-3 shrink-0">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isStreamConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span className={`relative inline-flex rounded-full h-3 w-3 ${isStreamConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          </div>
          <div>
            <span className="font-bold text-white">Automated Real-Time Inflow / Outflow Engine:</span>
            <span className="text-slate-300 ml-1.5">
              {isStreamConnected ? 'Connected via Server-Sent Events (SSE)' : 'Active Periodic Synchronization'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-mono">
            <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
            <span>Paystack Webhook: Real-Time (&lt;2s)</span>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1 font-mono">
            <Building className="w-3.5 h-3.5 text-blue-400" />
            <span>Zenith Bank Escrow: Gateway Sync</span>
          </span>
          <button
            onClick={() => { loadLedger(); loadReconciliation(); }}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Reload data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Live Notification Banner */}
      {lastNotification && (
        <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white p-3.5 rounded-2xl shadow-md flex items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-emerald-300 animate-bounce" />
            <div>
              <p className="font-bold text-xs">{lastNotification.message}</p>
              <p className="text-[10px] text-emerald-200 font-mono">Verified at {lastNotification.timestamp} • Balance updated automatically</p>
            </div>
          </div>
          <button onClick={dismissNotification} className="p-1 hover:bg-white/20 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. Mathematical Balance Integrity Notice */}
      <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 text-xs text-emerald-900">
        <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
        <div>
          <span className="font-bold">Strict Mathematical Derived Balance Safeguard:</span> Administrators cannot manually edit or tamper with the available balance figure. The current balance is strictly computed dynamically: <strong>Total Credits minus Total Debits</strong> in immutable chronological sequence.
        </div>
      </div>

      {/* 4. Prominent Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: TOTAL CREDIT */}
        <div className="bg-white rounded-2xl p-5 border border-emerald-200 shadow-xs">
          <div className="text-emerald-700 text-xs font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <ArrowDownLeft className="w-3.5 h-3.5" />
              TOTAL CREDIT
            </span>
            <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded text-[9px] font-bold">
              INFLOWS
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-700 font-display">
            {formatNaira(summary?.total_collected || 0)}
          </div>
          <div className="text-[11px] text-emerald-600 mt-1">
            {summary?.credits_count || 0} verified contributions recorded
          </div>
        </div>

        {/* Card 2: TOTAL DEBIT */}
        <div className="bg-white rounded-2xl p-5 border border-rose-200 shadow-xs">
          <div className="text-rose-700 text-xs font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              TOTAL DEBIT
            </span>
            <span className="px-1.5 py-0.2 bg-rose-100 text-rose-800 rounded text-[9px] font-bold">
              DISBURSED
            </span>
          </div>
          <div className="text-2xl font-black text-rose-600 font-display">
            {formatNaira(summary?.total_spent || 0)}
          </div>
          <div className="text-[11px] text-rose-600 mt-1">
            {summary?.debits_count || 0} authorized project disbursements
          </div>
        </div>

        {/* Card 3: CURRENT BALANCE */}
        <div className="bg-gradient-to-br from-emerald-900 to-teal-950 text-white rounded-2xl p-5 shadow-xs border border-emerald-800">
          <div className="text-emerald-300 text-xs font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              CURRENT BALANCE
            </span>
            <span className="px-1.5 py-0.2 bg-emerald-500/40 text-emerald-100 rounded text-[9px] font-bold">
              DERIVED
            </span>
          </div>
          <div className="text-2xl font-black text-white font-display">
            {formatNaira(summary?.current_balance || 0)}
          </div>
          <div className="text-[11px] text-emerald-200/90 mt-1">
            Total Credit minus Total Debit (Audited)
          </div>
        </div>

        {/* Card 4: OUTSTANDING CONTRIBUTIONS */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Coins className="w-3.5 h-3.5" />
              OUTSTANDING CONTRIBUTIONS
            </span>
            <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded text-[9px] font-bold">
              TARGET
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 font-display">
            {formatNaira(summary?.outstanding_contributions || 0)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Target Budget: {formatNaira(summary?.target_budget || 35000000)} ({summary?.collection_percentage || 0}% funded)
          </div>
        </div>

      </div>

      {/* 5. Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-1 bg-white p-2 rounded-2xl shadow-2xs">
        <button
          onClick={() => setActiveTab('LEDGER')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'LEDGER'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Verified Financial Ledger</span>
          <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px]">
            {transactions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('RECONCILIATION')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'RECONCILIATION'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Bank & Gateway Reconciliation Console</span>
          {reconStats.unmatched > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] animate-pulse">
              {reconStats.unmatched} Unmatched
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('BANK_GATEWAY')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'BANK_GATEWAY'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Bank Feed & Open Banking Gateway Integration</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: FINANCIAL LEDGER */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'LEDGER' && (
        <div className="space-y-4">
          {/* Filter & Search Controls */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl max-w-fit">
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
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  typeFilter === 'CREDIT' ? 'bg-emerald-700 text-white shadow-xs' : 'text-emerald-800 hover:bg-emerald-50'
                }`}
              >
                Credits Only ({summary?.credits_count || 0})
              </button>
              <button
                onClick={() => setTypeFilter('DEBIT')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  typeFilter === 'DEBIT' ? 'bg-rose-700 text-white shadow-xs' : 'text-rose-800 hover:bg-rose-50'
                }`}
              >
                Debits Only ({summary?.debits_count || 0})
              </button>
            </div>

            <div className="flex items-center gap-2 flex-1 md:max-w-md">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search reference, narration, source, building..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                onClick={handleExportCSV}
                className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Download CSV"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-3">Reference</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-4 min-w-[200px]">Description</th>
                    <th className="py-3 px-3">Source</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-4 text-right text-emerald-800">Credit (₦)</th>
                    <th className="py-3 px-4 text-right text-rose-800">Debit (₦)</th>
                    <th className="py-3 px-4 text-right bg-slate-50 font-black">Running Balance</th>
                    <th className="py-3 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-500">
                        <Coins className="w-6 h-6 text-emerald-600 animate-spin mx-auto mb-2" />
                        <span>Loading verified ledger...</span>
                      </td>
                    </tr>
                  ) : filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-500">
                        No transactions found.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => {
                      const isCredit = tx.type === 'CREDIT';
                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                            {tx.date}
                          </td>
                          <td className="py-3 px-3 font-mono font-semibold text-slate-700 whitespace-nowrap">
                            {tx.reference}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            {isCredit ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                                CREDIT
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800">
                                DEBIT
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{tx.description}</div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <span>{tx.payer_or_vendor}</span>
                              {tx.building_number && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 font-mono text-[9px] border border-amber-200">
                                  Bldg {tx.building_number}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            {tx.source === 'Paystack' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <CreditCard className="w-3 h-3 text-emerald-600" />
                                Paystack
                              </span>
                            ) : tx.source === 'Bank API' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                                <Zap className="w-3 h-3 text-purple-600" />
                                Bank API
                              </span>
                            ) : tx.source === 'Bank Transfer' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
                                <Building className="w-3 h-3 text-sky-600" />
                                Bank Transfer
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                <FileText className="w-3 h-3 text-slate-500" />
                                Admin-authorized
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">
                              {tx.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                            {isCredit ? `+${formatNaira(tx.amount)}` : '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-rose-600 whitespace-nowrap">
                            {!isCredit ? `-${formatNaira(tx.amount)}` : '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 bg-slate-50/60 whitespace-nowrap">
                            {formatNaira(tx.running_balance)}
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setSelectedTx(tx)}
                                className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                                title="View Audit Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setTxToVoid(tx);
                                  setVoidReason('');
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                title="Void / Delete Transaction"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: BANK & GATEWAY RECONCILIATION CONSOLE */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'RECONCILIATION' && (
        <div className="space-y-4">
          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-500">Total Provider Records</span>
              <div className="text-2xl font-black text-slate-900 font-display mt-0.5">{reconStats.total}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-emerald-200">
              <span className="text-[10px] font-bold uppercase text-emerald-700">Matched to Building</span>
              <div className="text-2xl font-black text-emerald-700 font-display mt-0.5">{reconStats.matched}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-amber-200">
              <span className="text-[10px] font-bold uppercase text-amber-700">Unmatched (Action Needed)</span>
              <div className="text-2xl font-black text-amber-700 font-display mt-0.5">{reconStats.unmatched}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-rose-200">
              <span className="text-[10px] font-bold uppercase text-rose-700">Duplicates Blocked</span>
              <div className="text-2xl font-black text-rose-700 font-display mt-0.5">{reconStats.duplicates}</div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Filter Reconciliation:</span>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {(['ALL', 'MATCHED', 'UNMATCHED', 'DUPLICATE'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setReconFilter(tab)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                      reconFilter === tab ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={loadReconciliation}
              className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Records</span>
            </button>
          </div>

          {/* Reconciliation Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-3">Source</th>
                    <th className="py-3 px-3">Provider Reference</th>
                    <th className="py-3 px-4 min-w-[200px]">Narration / Payer</th>
                    <th className="py-3 px-4 text-right">Amount (₦)</th>
                    <th className="py-3 px-3">Assigned Building</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReconItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        No reconciliation records matching filter.
                      </td>
                    </tr>
                  ) : (
                    filteredReconItems.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">{item.date}</td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                            {item.source}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono font-semibold text-slate-700 whitespace-nowrap">
                          {item.provider_reference}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">
                          <div>{item.payer_narration}</div>
                          {item.notes && <div className="text-[10px] text-slate-400 mt-0.5">{item.notes}</div>}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {formatNaira(item.amount)}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap font-medium text-slate-800">
                          {item.detected_building ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold font-mono">
                              Building {item.detected_building}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {item.status === 'MATCHED' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              MATCHED
                            </span>
                          ) : item.status === 'UNMATCHED' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                              <AlertCircle className="w-3 h-3 text-amber-600" />
                              UNMATCHED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                              <Ban className="w-3 h-3 text-rose-600" />
                              DUPLICATE BLOCKED
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {item.status === 'UNMATCHED' ? (
                            <button
                              onClick={() => {
                                setMatchingItem(item);
                                setMatchBuildingInput('');
                                setMatchContributorInput(item.payer_narration.split('-')[0]?.trim() || '');
                              }}
                              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            >
                              Match to Building
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-mono">Reconciled</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: BANK FEED & OPEN BANKING GATEWAY SETTINGS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'BANK_GATEWAY' && (
        <div className="space-y-6">
          {/* Nigerian Banking API Landscape Explanation Card */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-md border border-slate-700">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Zap className="w-4 h-4" />
              <span>Nigerian Banking API & Open Banking Architecture</span>
            </div>
            <h3 className="text-xl font-black text-white font-display mb-2">
              Direct Bank Transfer & Open Banking Connectivity
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
              In Nigeria, commercial banks (Zenith Bank PLC, GTBank, Access Bank, etc.) do not expose open public REST APIs without regulated Open Banking gateways (CBN Regulatory Sandbox, Mono, Okra, Stitch) or Paystack Dedicated Virtual Accounts (DVA).
            </p>
            <p className="text-xs text-slate-300 leading-relaxed max-w-3xl mt-2">
              The Finger of God Estate Road Project is architected with a universal webhook and feed adapter. Both live Paystack webhooks and direct bank feeds enter the exact same server-side verification and idempotency engine.
            </p>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-700 text-xs font-mono">
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <span className="text-slate-400 text-[10px] block font-sans">Official Escrow Bank</span>
                <span className="font-bold text-white">Zenith Bank PLC</span>
              </div>
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <span className="text-slate-400 text-[10px] block font-sans">Designated Account</span>
                <span className="font-bold text-emerald-400 text-sm">1018899201</span>
              </div>
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <span className="text-slate-400 text-[10px] block font-sans">Account Name</span>
                <span className="font-bold text-white">FOG Road Project Committee</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Interactive Webhook Simulator with Duplicate Protection Testing */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    Simulate / Test Bank Transfer Webhook
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Test how the server verifies incoming bank transfers and blocks duplicates.
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px]">
                  TEST ADAPTER
                </span>
              </div>

              {simResult && (
                <div className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                  simResult.duplicate 
                    ? 'bg-rose-50 border border-rose-200 text-rose-800'
                    : simResult.unmatched
                      ? 'bg-amber-50 border border-amber-200 text-amber-800'
                      : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                }`}>
                  {simResult.duplicate ? <Ban className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" /> : <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />}
                  <div>
                    <span className="font-bold block">{simResult.duplicate ? 'Duplicate Detected' : 'Webhook Processed'}</span>
                    <span>{simResult.message}</span>
                  </div>
                </div>
              )}

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Bank Transaction ID (Idempotency Key):</label>
                  <input
                    type="text"
                    value={simTxId}
                    onChange={(e) => setSimTxId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px]"
                  />
                  <span className="text-[10px] text-slate-400">Clicking send twice with the same ID tests duplicate prevention!</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Amount (₦):</label>
                    <input
                      type="number"
                      value={simAmount}
                      onChange={(e) => setSimAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Sender Name:</label>
                    <input
                      type="text"
                      value={simSender}
                      onChange={(e) => setSimSender(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Narration (Smart building parser tests this):</label>
                  <input
                    type="text"
                    value={simNarration}
                    onChange={(e) => setSimNarration(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px]"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    disabled={simLoading}
                    onClick={handleSimulateWebhook}
                    className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Bank Webhook ({simLoading ? 'Processing...' : 'Simulate'})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSimTxId(`ZEN-TEST-${Math.floor(100000 + Math.random() * 900000)}`);
                      setSimResult(null);
                    }}
                    className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                    title="Generate new ID"
                  >
                    New ID
                  </button>
                </div>
              </div>
            </div>

            {/* Batch Statement Ingestion Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    Verified Bank Statement Batch Ingestion
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Import multiple verified transactions with automatic deduplication.
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold text-[10px]">
                  BATCH INGESTION
                </span>
              </div>

              {importResult && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                  <div className="font-bold text-slate-800">Batch Processing Report:</div>
                  <div className="flex items-center gap-4 text-[11px]">
                    <span className="text-emerald-700 font-bold">✅ {importResult.imported} Imported</span>
                    <span className="text-rose-600 font-bold">⛔ {importResult.duplicates} Duplicates Rejected</span>
                    <span className="text-amber-700 font-bold">⚠️ {importResult.unmatched} Unmatched</span>
                  </div>
                </div>
              )}

              <div className="space-y-2 text-xs">
                <label className="font-bold text-slate-700 block">
                  Statement Rows (Format: Date | Reference | Narration | Amount):
                </label>
                <textarea
                  rows={5}
                  value={statementText}
                  onChange={(e) => setStatementText(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  disabled={importLoading}
                  onClick={handleImportStatement}
                  className="w-full py-2.5 bg-purple-700 hover:bg-purple-800 disabled:opacity-60 text-white font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>{importLoading ? 'Processing Batch...' : 'Process & Deduplicate Statement Batch'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: MATCH UNMATCHED TRANSACTION TO BUILDING */}
      {/* ------------------------------------------------------------- */}
      {matchingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                  <Link className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Match Bank Deposit to Building</h3>
                  <p className="text-[11px] text-slate-500">Ref: {matchingItem.provider_reference}</p>
                </div>
              </div>
              <button onClick={() => setMatchingItem(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleMatchSubmit} className="py-4 space-y-3.5 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1">
                <div className="text-slate-500">Bank Narration:</div>
                <div className="font-mono font-bold text-slate-800">{matchingItem.payer_narration}</div>
                <div className="text-emerald-700 font-bold pt-1">Amount: {formatNaira(matchingItem.amount)}</div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Assign to Building / Plot Number *:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 024, Plot 14B, House 12..."
                  value={matchBuildingInput}
                  onChange={(e) => setMatchBuildingInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Contributor / Landlord Name:</label>
                <input
                  type="text"
                  placeholder="e.g. Mr. Babatunde Adeleke"
                  value={matchContributorInput}
                  onChange={(e) => setMatchContributorInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setMatchingItem(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isMatching}
                  className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs"
                >
                  {isMatching ? 'Matching...' : 'Confirm Match & Update Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADD TRANSACTION (CREDIT OR DEBIT) */}
      {/* ------------------------------------------------------------- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${modalType === 'CREDIT' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {modalType === 'CREDIT' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base font-display">
                    {modalType === 'CREDIT' ? 'Record Verified Road Inflow (Credit)' : 'Record Authorized Road Expenditure (Debit)'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {modalType === 'CREDIT' ? 'Direct bank transfer deposit' : 'Disbursement voucher with contractor invoice'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="py-4 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Transaction Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Amount (₦) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 100000"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {modalType === 'CREDIT' ? 'Contributor / Compound Name *' : 'Vendor / Contractor / Artisan *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={modalType === 'CREDIT' ? 'e.g. Building 024 (Plot 14B)' : 'e.g. Western Interlock Ltd'}
                  value={formData.payer_or_vendor}
                  onChange={(e) => setFormData({ ...formData, payer_or_vendor: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Description / Project Purpose *</label>
                <input
                  type="text"
                  required
                  placeholder={modalType === 'CREDIT' ? 'e.g. Building 024 compound road assessment levy' : 'e.g. Supply of 40 tonnes crushed granite stone base'}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as RoadProjectCategory })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  >
                    {modalType === 'CREDIT' ? (
                      <>
                        <option value="Building Contribution">Building Contribution</option>
                        <option value="Landlord Levy">Landlord Levy</option>
                        <option value="Special Donation">Special Donation</option>
                        <option value="Commercial Store Levy">Commercial Store Levy</option>
                      </>
                    ) : (
                      <>
                        <option value="Drainage Construction">Drainage Construction</option>
                        <option value="Interlocking Paving">Interlocking Paving</option>
                        <option value="Earthwork & Grading">Earthwork & Grading</option>
                        <option value="Stone Base & Aggregates">Stone Base & Aggregates</option>
                        <option value="Heavy Equipment & Diesel">Heavy Equipment & Diesel</option>
                        <option value="Culvert & Crossing Slab">Culvert & Crossing Slab</option>
                        <option value="Project Supervision & Testing">Project Supervision & Testing</option>
                        <option value="Logistics & Site Security">Logistics & Site Security</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Receipt / Invoice Ref</label>
                  <input
                    type="text"
                    placeholder={modalType === 'CREDIT' ? 'RCP-RD-...' : 'INV-MAT-...'}
                    value={formData.receipt_or_invoice_ref}
                    onChange={(e) => setFormData({ ...formData, receipt_or_invoice_ref: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono text-[11px]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Approval Authority *</label>
                <input
                  type="text"
                  required
                  value={formData.approved_by}
                  onChange={(e) => setFormData({ ...formData, approved_by: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 py-2.5 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer ${
                    modalType === 'CREDIT' ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-rose-700 hover:bg-rose-800'
                  }`}
                >
                  {isSubmitting ? 'Recording...' : `Record ${modalType}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: VIEW AUDIT DETAILS */}
      {/* ------------------------------------------------------------- */}
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
                    Transaction Audit Details
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

            <div className="py-4 space-y-3.5 text-xs">
              <div className="bg-slate-50 p-4 rounded-2xl text-center border border-slate-100">
                <span className="text-[11px] font-bold uppercase text-slate-500">
                  {selectedTx.type === 'CREDIT' ? 'Inflow Amount Credited' : 'Disbursement Expense Amount'}
                </span>
                <div className={`text-3xl font-black mt-1 font-display ${selectedTx.type === 'CREDIT' ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {selectedTx.type === 'CREDIT' ? '+' : '-'}{formatNaira(selectedTx.amount)}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Derived Running Balance: <strong>{formatNaira(selectedTx.running_balance)}</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Date</span>
                  <span className="font-semibold text-slate-800">{selectedTx.date}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Transaction Source</span>
                  <span className="font-semibold text-slate-800">{selectedTx.source}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">
                    {selectedTx.type === 'CREDIT' ? 'Payer / Compound' : 'Vendor / Contractor'}
                  </span>
                  <span className="font-semibold text-slate-800">{selectedTx.payer_or_vendor}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Category</span>
                  <span className="font-semibold text-slate-800">{selectedTx.category}</span>
                </div>
              </div>

              {selectedTx.provider_transaction_id && (
                <div className="bg-slate-50 p-3 rounded-xl font-mono text-[11px]">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block font-sans">Provider Transaction / Idempotency ID</span>
                  <span className="font-semibold text-slate-800">{selectedTx.provider_transaction_id}</span>
                </div>
              )}

              <div className="bg-slate-50 p-3 rounded-xl space-y-1">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Description</span>
                <p className="font-medium text-slate-800">{selectedTx.description}</p>
                {selectedTx.notes && (
                  <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200 mt-1">
                    <strong>Audit Note:</strong> {selectedTx.notes}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 bg-emerald-50/60 border border-emerald-100 p-2.5 rounded-xl">
                <span className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Approved: {selectedTx.approved_by}</span>
                </span>
                <span className="font-mono text-[10px] text-slate-400">
                  {new Date(selectedTx.verified_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="pt-2">
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

      {/* ------------------------------------------------------------- */}
      {/* MODAL: VOID TRANSACTION */}
      {/* ------------------------------------------------------------- */}
      {txToVoid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-rose-700">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-slate-900 text-sm">Void Transaction {txToVoid.reference}</h3>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <p className="text-slate-600">
                Voiding this transaction will remove it from the active ledger and recalculate all subsequent running balances.
              </p>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Audit Reason for Voiding *:</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Specify audit or clerical reason..."
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setTxToVoid(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isVoiding}
                  onClick={handleConfirmVoid}
                  className="flex-1 py-2.5 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-xl shadow-xs"
                >
                  {isVoiding ? 'Voiding...' : 'Confirm Void'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
