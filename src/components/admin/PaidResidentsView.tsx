import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Search, 
  Calendar, 
  Download, 
  Receipt as ReceiptIcon, 
  ArrowLeft,
  Filter,
  Phone,
  Home,
  CreditCard,
  RefreshCw
} from 'lucide-react';
import { PaidResidentRecord, Receipt, NavigationTab, EstateSettings } from '../../types/database';
import { dbService } from '../../lib/supabase';
import { ReceiptModal } from '../payments/ReceiptModal';

interface PaidResidentsViewProps {
  estateSettings?: EstateSettings;
  onNavigateToResident?: (residentNumber: string) => void;
  onNavigate?: (tab: NavigationTab) => void;
}

export const PaidResidentsView: React.FC<PaidResidentsViewProps> = ({ 
  estateSettings,
  onNavigateToResident,
  onNavigate 
}) => {
  const [selectedMonth, setSelectedMonth] = useState<number>(10);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [paidResidents, setPaidResidents] = useState<PaidResidentRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);

  const availableMonths = [
    { month: 10, year: 2026, label: 'October 2026' },
    { month: 11, year: 2026, label: 'November 2026' },
    { month: 12, year: 2026, label: 'December 2026' },
    { month: 1, year: 2027, label: 'January 2027' }
  ];

  const currentPeriod = availableMonths.find(m => m.month === selectedMonth && m.year === selectedYear) || availableMonths[0];

  const loadData = async () => {
    setLoading(true);
    try {
      const records = await dbService.getPaidResidents(selectedMonth, selectedYear, searchQuery);
      setPaidResidents(records);
    } catch (err) {
      console.error('Error fetching paid residents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedYear, searchQuery]);

  const handleViewReceipt = async (record: PaidResidentRecord) => {
    try {
      await dbService.recordAdminAudit('RECEIPT_VIEWED', 'receipt', `Admin viewed receipt for Resident #${record.resident_number}`, record.receipt_number);
      const allReceipts = await dbService.getAllReceipts();
      const rcp = allReceipts.find(r => r.resident_number === record.resident_number && r.period_covered.includes(String(selectedYear)));
      if (rcp) {
        setSelectedReceipt(rcp);
      } else {
        setSelectedReceipt({
          id: 'rcp-' + record.resident_number,
          receipt_number: record.receipt_number,
          transaction_id: 'tx-' + record.resident_number,
          payment_id: 'pay-' + record.resident_number,
          resident_id: 'res-' + record.resident_number,
          resident_number: record.resident_number,
          resident_name: record.resident_name,
          house_number: record.house_number,
          amount_paid: record.amount_paid,
          currency: 'NGN',
          period_covered: currentPeriod.label,
          payment_date: record.payment_date,
          paystack_reference: record.payment_reference,
          status: 'PAID',
          issued_at: record.payment_date
        });
      }
    } catch (e) {
      console.error('Error opening receipt:', e);
    }
  };

  const totalCollected = paidResidents.reduce((sum, r) => sum + (r.amount_paid || 5000), 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate?.('dashboard')}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Verified Collections
                </span>
                <span className="text-xs text-slate-500 font-mono">Stage 7 Management</span>
              </div>
              <h1 className="text-2xl font-bold font-display text-slate-900 mt-1">PAID RESIDENTS</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Active residents with verified Paystack payment records for {currentPeriod.label}
              </p>
            </div>
          </div>

          {/* Month Selector & Export */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <Calendar className="w-4 h-4 text-slate-500" />
              <select
                value={`${selectedMonth}-${selectedYear}`}
                onChange={(e) => {
                  const [m, y] = e.target.value.split('-').map(Number);
                  setSelectedMonth(m);
                  setSelectedYear(y);
                }}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
              >
                {availableMonths.map(m => (
                  <option key={`${m.month}-${m.year}`} value={`${m.month}-${m.year}`}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => dbService.downloadReportCsv('resident_payment', { month: selectedMonth, year: selectedYear })}
              className="inline-flex items-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="bg-emerald-50/50 border border-emerald-100/80 rounded-xl p-3.5">
            <span className="text-xs font-medium text-emerald-800">Total Paid Residents</span>
            <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">{paidResidents.length}</div>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5">
            <span className="text-xs font-medium text-slate-600">Total Collected for {currentPeriod.label}</span>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">₦{totalCollected.toLocaleString()}</div>
          </div>
          <div className="bg-blue-50/50 border border-blue-100/80 rounded-xl p-3.5">
            <span className="text-xs font-medium text-blue-800">Standard Levy Per Resident</span>
            <div className="text-2xl font-bold font-mono text-blue-700 mt-1">₦5,000</div>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by resident no, name, phone, reference, or receipt..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
          />
        </div>

        <button
          onClick={loadData}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors self-end sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh List</span>
        </button>
      </div>

      {/* Paid Residents Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
            Loading paid resident records from verified database...
          </div>
        ) : paidResidents.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700">No Paid Records Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No active resident has completed payment for {currentPeriod.label} matching the search criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 border-b border-slate-200/80 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Resident No.</th>
                  <th className="py-3.5 px-4">Resident Name</th>
                  <th className="py-3.5 px-4">House / Plot</th>
                  <th className="py-3.5 px-4">Phone Number</th>
                  <th className="py-3.5 px-4">Amount Paid</th>
                  <th className="py-3.5 px-4">Payment Date</th>
                  <th className="py-3.5 px-4">Paystack Ref</th>
                  <th className="py-3.5 px-4">Receipt No.</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paidResidents.map((record) => (
                  <tr key={record.resident_number} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      #{record.resident_number}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {record.resident_name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Home className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[160px]">{record.house_number}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{record.phone_number}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-600">
                      ₦{record.amount_paid.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(record.payment_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                      <span className="truncate max-w-[130px] inline-block" title={record.payment_reference}>
                        {record.payment_reference}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-800 font-medium">
                      <span className="truncate max-w-[140px] inline-block" title={record.receipt_number}>
                        {record.receipt_number}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleViewReceipt(record)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[11px] font-semibold transition-colors border border-emerald-200"
                      >
                        <ReceiptIcon className="w-3 h-3" />
                        <span>View Receipt</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Official Digital Receipt Modal */}
      <ReceiptModal
        receipt={selectedReceipt}
        isOpen={!!selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        estateSettings={estateSettings}
      />
    </div>
  );
};
