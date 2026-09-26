import React, { useState, useEffect } from 'react';
import {
  Zap,
  Coins,
  Shield,
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
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  ArrowLeft,
  CheckCircle,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
  Sparkles,
  Layers
} from 'lucide-react';
import {
  EstateSettings,
  LightProjectTransaction,
  LightProjectSummary,
  NavigationTab,
  Resident
} from '../../types/database';
import { PublicNavbar } from '../layout/PublicNavbar';
import { PublicFooter } from '../layout/PublicFooter';
import { SEOHead } from '../common/SEOHead';
import { PaystackPaymentModal } from '../payments/PaystackPaymentModal';

interface PublicLightProjectViewProps {
  estateSettings: EstateSettings;
  currentResident?: Resident | null;
  onNavigate: (tab: NavigationTab) => void;
  onOpenResidentLogin: () => void;
}

const INITIAL_LIGHT_TRANSACTIONS: LightProjectTransaction[] = [
  {
    id: 'ltx-001',
    reference: 'FOG-PWR-202610-001',
    date: '2026-09-24',
    type: 'CREDIT',
    category: 'Transformer Maintenance',
    description: 'Quarterly Power & Substation Levy - House 14A (Palm View Boulevard)',
    amount: 25000,
    running_balance: 4850000,
    payer_or_vendor: 'House 14A (Plot 7)',
    building_number: '14A',
    approved_by: 'Power Committee Secretariat',
    verified_at: '2026-09-24T14:30:00Z',
    status: 'VERIFIED'
  },
  {
    id: 'ltx-002',
    reference: 'FOG-PWR-202610-002',
    date: '2026-09-22',
    type: 'DEBIT',
    category: 'Transformer Maintenance',
    description: '500kVA Step-Down Transformer Oil Filtration, Silica Gel Replacement & Earthing Test',
    amount: 420000,
    running_balance: 4825000,
    payer_or_vendor: 'Delta Power Engineering Services Ltd',
    approved_by: 'Technical Director & Chairman',
    verified_at: '2026-09-22T11:15:00Z',
    status: 'VERIFIED'
  },
  {
    id: 'ltx-003',
    reference: 'FOG-PWR-202610-003',
    date: '2026-09-20',
    type: 'CREDIT',
    category: 'Solar Streetlight Fund',
    description: 'Special Assessment Contribution for Phase 2 Solar Streetlight Array - Plot 22B',
    amount: 50000,
    running_balance: 5245000,
    payer_or_vendor: 'Plot 22B (Hibiscus Crescent)',
    building_number: '22B',
    approved_by: 'Paystack Verified',
    verified_at: '2026-09-20T09:40:00Z',
    status: 'VERIFIED'
  },
  {
    id: 'ltx-004',
    reference: 'FOG-PWR-202610-004',
    date: '2026-09-18',
    type: 'DEBIT',
    category: 'Solar Streetlight Fund',
    description: 'Procurement of 12x 150W All-In-One Integrated Solar LED Streetlights & Mounting Poles',
    amount: 1140000,
    running_balance: 5195000,
    payer_or_vendor: 'SunMax Renewable Energy Nigeria',
    approved_by: 'Infrastructure Taskforce',
    verified_at: '2026-09-18T16:20:00Z',
    status: 'VERIFIED'
  },
  {
    id: 'ltx-005',
    reference: 'FOG-PWR-202610-005',
    date: '2026-09-15',
    type: 'CREDIT',
    category: 'Monthly Power Levy',
    description: 'Household Power & Feeder Line Assessment - Block C, Flats 1-4',
    amount: 60000,
    running_balance: 6335000,
    payer_or_vendor: 'Block C Compound',
    building_number: 'Block C',
    approved_by: 'Zenith Bank Direct Feed',
    verified_at: '2026-09-15T13:00:00Z',
    status: 'VERIFIED'
  },
  {
    id: 'ltx-006',
    reference: 'FOG-PWR-202610-006',
    date: '2026-09-10',
    type: 'DEBIT',
    category: 'Cabling & Feeder Line',
    description: 'High-Tension Drop-Out Fuse Replacement & Feeder Pillar Re-cabling at Main Gate Junction',
    amount: 285000,
    running_balance: 6275000,
    payer_or_vendor: 'Bedc Authorized Contractor',
    approved_by: 'Executive Security & Power Committee',
    verified_at: '2026-09-10T10:00:00Z',
    status: 'VERIFIED'
  }
];

export const PublicLightProjectView: React.FC<PublicLightProjectViewProps> = ({
  estateSettings,
  currentResident,
  onNavigate,
  onOpenResidentLogin
}) => {
  const [transactions, setTransactions] = useState<LightProjectTransaction[]>(INITIAL_LIGHT_TRANSACTIONS);
  const [filterType, setFilterType] = useState<'ALL' | 'CREDIT' | 'DEBIT'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);

  const summary: LightProjectSummary = {
    project_name: 'Estate Electrification, Dedicated 500kVA Substation & Solar Lighting',
    target_budget: 18500000,
    total_collected: 12450000,
    total_spent: 7600000,
    current_balance: 4850000,
    outstanding_contributions: 6050000,
    collection_percentage: 67,
    total_transactions_count: transactions.length,
    credits_count: transactions.filter(t => t.type === 'CREDIT').length,
    debits_count: transactions.filter(t => t.type === 'DEBIT').length,
    last_serviced_date: '2026-09-22',
    transformer_capacity: '500 kVA (Dedicated Estate Step-Down Substation)',
    solar_lights_count: 64,
    last_updated: new Date().toISOString()
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (filterType !== 'ALL' && tx.type !== filterType) return false;
    if (categoryFilter !== 'ALL' && tx.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        tx.reference.toLowerCase().includes(q) ||
        tx.description.toLowerCase().includes(q) ||
        tx.payer_or_vendor.toLowerCase().includes(q) ||
        (tx.building_number && tx.building_number.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <SEOHead
        title="Solar Street Lighting & Power Infrastructure — Finger of God Estate"
        description="Public ledger, solar streetlight installations, and 500kVA dedicated transformer maintenance fund for Finger of God Estate, Asaba."
        keywords={['Solar Street Lighting', 'Power Committee', 'Finger of God Estate', 'Transformer Substation', 'Estate Infrastructure', 'Asaba Delta State']}
        canonicalPath="/#light-project"
        ogType="website"
      />

      <PublicNavbar
        currentTab="light_project"
        estateSettings={estateSettings}
        currentResident={currentResident}
        onNavigate={onNavigate}
        onOpenResidentLogin={onOpenResidentLogin}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Back Link & Header */}
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
              <span className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                <Zap className="w-5 h-5" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
                Light & Electrification Project
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl">
              Transparent accounting, transformer maintenance reserve, feeder line stability, and community-wide solar streetlight deployment for Finger of God Estate.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPayModalOpen(true)}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              <span>Contribute to Light Project</span>
            </button>
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Target Budget</p>
            <p className="text-2xl font-black text-slate-900 mt-1 font-mono">
              ₦{summary.target_budget.toLocaleString()}
            </p>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-600">
              <span className="font-semibold text-amber-700">{summary.collection_percentage}% funded</span>
              <span>• Complete project target</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-emerald-200/90 shadow-2xs bg-gradient-to-br from-emerald-50/50 to-white">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
              Total Contributions (Credit)
            </p>
            <p className="text-2xl font-black text-emerald-950 mt-1 font-mono">
              ₦{summary.total_collected.toLocaleString()}
            </p>
            <p className="text-[11px] text-emerald-700 mt-2">
              Verified resident household contributions
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-rose-200/90 shadow-2xs bg-gradient-to-br from-rose-50/50 to-white">
            <p className="text-[11px] font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
              Total Expended (Debit)
            </p>
            <p className="text-2xl font-black text-rose-950 mt-1 font-mono">
              ₦{summary.total_spent.toLocaleString()}
            </p>
            <p className="text-[11px] text-rose-700 mt-2">
              Transformer repairs, cables & solar lights
            </p>
          </div>

          <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Current Reserve Balance</p>
            <p className="text-2xl font-black text-white mt-1 font-mono">
              ₦{summary.current_balance.toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-300 mt-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Available in project bank escrow</span>
            </p>
          </div>
        </div>

        {/* Infrastructure Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4.5 rounded-xl border border-slate-200 flex items-start gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-800 rounded-lg shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Dedicated Substation</p>
              <p className="text-[11px] text-slate-600 mt-0.5">{summary.transformer_capacity}</p>
              <p className="text-[10px] text-emerald-700 font-semibold mt-1">Last Serviced: {summary.last_serviced_date}</p>
            </div>
          </div>

          <div className="bg-white p-4.5 rounded-xl border border-slate-200 flex items-start gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-lg shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Solar Streetlight Coverage</p>
              <p className="text-[11px] text-slate-600 mt-0.5">{summary.solar_lights_count} High-Lumen Solar LED Streetlights active</p>
              <p className="text-[10px] text-emerald-700 font-semibold mt-1">Phase 1 (100%) • Phase 2 (75%)</p>
            </div>
          </div>

          <div className="bg-white p-4.5 rounded-xl border border-slate-200 flex items-start gap-3">
            <div className="p-2.5 bg-blue-100 text-blue-800 rounded-lg shrink-0">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Electrical Fault Hotline</p>
              <p className="text-[11px] text-slate-600 mt-0.5">24/7 Power Committee Duty Line: {estateSettings.contact_phone || '08023456789'}</p>
              <p className="text-[10px] text-slate-500 font-semibold mt-1">Rapid response for transformer drops</p>
            </div>
          </div>
        </div>

        {/* Transparent Financial Ledger Section */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Light Project Financial Ledger</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  Live Audited
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Complete record of all resident contributions and technical power expenditures.
              </p>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-lg border border-slate-300 p-0.5 bg-white text-xs">
                <button
                  onClick={() => setFilterType('ALL')}
                  className={`px-3 py-1 rounded-md font-semibold cursor-pointer ${
                    filterType === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({transactions.length})
                </button>
                <button
                  onClick={() => setFilterType('CREDIT')}
                  className={`px-3 py-1 rounded-md font-semibold cursor-pointer ${
                    filterType === 'CREDIT' ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Credits (Income)
                </button>
                <button
                  onClick={() => setFilterType('DEBIT')}
                  className={`px-3 py-1 rounded-md font-semibold cursor-pointer ${
                    filterType === 'DEBIT' ? 'bg-rose-700 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Debits (Expenses)
                </button>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search ledger..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 w-36 sm:w-48"
                />
              </div>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <th className="py-3 px-4">Date / Ref</th>
                  <th className="py-3 px-4">Type & Category</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Payer / Vendor</th>
                  <th className="py-3 px-4 text-right">Amount (₦)</th>
                  <th className="py-3 px-4 text-right">Balance (₦)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900">{tx.date}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{tx.reference}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        tx.type === 'CREDIT'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {tx.type === 'CREDIT' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                        <span>{tx.type}</span>
                      </span>
                      <p className="text-[10px] text-slate-500 mt-0.5">{tx.category}</p>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <p className="text-slate-800 font-medium line-clamp-2">{tx.description}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Approved by: {tx.approved_by}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-800">{tx.payer_or_vendor}</p>
                      {tx.building_number && (
                        <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded font-mono">
                          Building #{tx.building_number}
                        </span>
                      )}
                    </td>
                    <td className={`py-3 px-4 text-right font-mono font-bold ${
                      tx.type === 'CREDIT' ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                      {tx.type === 'CREDIT' ? '+' : '-'}₦{tx.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700 font-semibold">
                      ₦{tx.running_balance.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-semibold border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Verified</span>
                      </span>
                    </td>
                  </tr>
                ))}

                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                      No transactions found matching the selected filter or search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Project Phases / Milestones */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Light & Power Milestones</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-950">Phase 1: Substation Overhaul</span>
                <span className="px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 text-[10px] font-bold">100% Completed</span>
              </div>
              <p className="text-[11px] text-slate-600">
                500kVA transformer overhaul, replacement of blown drop-out fuses, earthing pit re-drilling, and lightning arresters.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-950">Phase 2: Solar Streetlights</span>
                <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-900 text-[10px] font-bold">75% In Progress</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Installation of 85 integrated all-in-one solar LED streetlights along Main Gate Boulevard and residential closes.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Phase 3: Smart Feeder Metering</span>
                <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-bold">Upcoming Q1 2027</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Smart telemetry meters for real-time load balancing and automated power failure SMS notification to residents.
              </p>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter
        estateSettings={estateSettings}
        onNavigate={onNavigate}
        onOpenResidentLogin={onOpenResidentLogin}
      />

      <PaystackPaymentModal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        estateSettings={estateSettings}
        preselectedResident={currentResident}
      />
    </div>
  );
};
