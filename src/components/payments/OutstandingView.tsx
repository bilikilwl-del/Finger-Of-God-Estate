import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, 
  Search, 
  CreditCard, 
  User, 
  Home, 
  Phone, 
  Calendar, 
  ArrowUpRight, 
  ShieldAlert,
  Send,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { Resident, MonthlyPayment, EstateSettings } from '../../types/database';
import { dbService } from '../../lib/supabase';
import { formatNaira } from '../../lib/paystack';
import { PaystackPaymentModal } from './PaystackPaymentModal';

interface OutstandingViewProps {
  estateSettings?: EstateSettings;
  onNavigateToResident?: (residentNumber: string) => void;
}

export const OutstandingView: React.FC<OutstandingViewProps> = ({
  estateSettings,
  onNavigateToResident
}) => {
  const [selectedMonth, setSelectedMonth] = useState<number>(10);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [unpaidPayments, setUnpaidPayments] = useState<MonthlyPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pay Modal
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payingResident, setPayingResident] = useState<Resident | null>(null);

  const LEVY_AMOUNT = estateSettings?.monthly_security_levy || 5000;
  const periodLabel = `${new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long' })} ${selectedYear}`;

  const loadDefaulters = async () => {
    setLoading(true);
    try {
      const allPayments = await dbService.getMonthlyPayments({
        periodMonth: selectedMonth,
        periodYear: selectedYear
      });

      const defaulters = allPayments.filter(p => p.status.toUpperCase() !== 'PAID');
      setUnpaidPayments(defaulters);
    } catch (err) {
      console.error('Error fetching defaulters:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDefaulters();
  }, [selectedMonth, selectedYear]);

  const filteredDefaulters = unpaidPayments.filter(p => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      p.resident_number.toLowerCase().includes(q) ||
      (p.resident?.full_name && p.resident.full_name.toLowerCase().includes(q)) ||
      (p.resident?.house_number && p.resident.house_number.toLowerCase().includes(q)) ||
      (p.resident?.phone_number && p.resident.phone_number.includes(q))
    );
  });

  const totalOutstandingAmount = unpaidPayments.length * LEVY_AMOUNT;

  const handlePayNow = (resident?: Resident) => {
    setPayingResident(resident || null);
    setIsPayModalOpen(true);
  };

  return (
    <div className="space-y-6">

      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 uppercase tracking-widest flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-rose-600" />
              <span>Arrears & Defaulters</span>
            </span>
            <span className="text-xs font-semibold text-slate-500">
              Levy Cycle: {periodLabel}
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight font-display">
            Outstanding Security Levies
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Identify residents who have not settled the monthly security levy of ₦5,000.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadDefaulters}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => handlePayNow()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            <span>Settle Levy</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-medium text-slate-500 block">Total Unpaid Residents</span>
          <div className="text-2xl font-black text-rose-600 font-display">
            {unpaidPayments.length}
          </div>
          <p className="text-[11px] text-slate-500">Defaulters for {periodLabel}</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-medium text-slate-500 block">Total Arrears Balance</span>
          <div className="text-2xl font-black text-rose-600 font-display">
            {formatNaira(totalOutstandingAmount)}
          </div>
          <p className="text-[11px] text-slate-500">₦5,000 per unpaid resident</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-medium text-slate-500 block">Levy Due Date</span>
          <div className="text-2xl font-black text-slate-900 font-display">
            Oct 1, 2026
          </div>
          <p className="text-[11px] text-slate-500">First monthly estate levy period</p>
        </div>
      </div>

      {/* Defaulters Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Search Bar */}
        <div className="p-4 sm:p-6 border-b border-slate-200 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search defaulters by resident number, full name, or plot..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-rose-500 outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
              <tr>
                <th className="py-3.5 px-4">Resident No.</th>
                <th className="py-3.5 px-4">Full Name</th>
                <th className="py-3.5 px-4">House / Plot</th>
                <th className="py-3.5 px-4">Phone Number</th>
                <th className="py-3.5 px-4">Arrears Due</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredDefaulters.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No Outstanding Arrears</p>
                    <span className="text-xs text-slate-500">All filtered residents have paid their monthly levy.</span>
                  </td>
                </tr>
              ) : (
                filteredDefaulters.map((p) => (
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
                    <td className="py-3.5 px-4 font-black text-rose-600">
                      {formatNaira(p.amount_due || LEVY_AMOUNT)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
                        <AlertCircle className="w-3 h-3 text-rose-600" />
                        <span>UNPAID</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handlePayNow(p.resident)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-xs cursor-pointer text-xs"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Pay via Paystack</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

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
          loadDefaulters();
        }}
      />

    </div>
  );
};
