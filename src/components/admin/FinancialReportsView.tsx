import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Calendar, 
  ArrowLeft, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  BarChart3,
  Search,
  Printer,
  ShieldCheck,
  FileSpreadsheet
} from 'lucide-react';
import { dbService } from '../../lib/supabase';
import { NavigationTab, EstateSettings } from '../../types/database';

interface FinancialReportsViewProps {
  estateSettings?: EstateSettings;
  onNavigate?: (tab: NavigationTab) => void;
}

export const FinancialReportsView: React.FC<FinancialReportsViewProps> = ({ 
  estateSettings,
  onNavigate 
}) => {
  const [selectedReport, setSelectedReport] = useState<string>('monthly_collection');
  const [selectedMonth, setSelectedMonth] = useState<number>(10);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [reportData, setReportData] = useState<any>(null);
  const [collectionHistory, setCollectionHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [historyLoading, setHistoryLoading] = useState<boolean>(true);

  const reportTypes = [
    { id: 'monthly_collection', name: 'Monthly Collection Report', desc: 'Summary of active residents, expected, collected, and collection %' },
    { id: 'outstanding_levy', name: 'Outstanding Levy Report', desc: 'Active residents with unpaid arrears and outstanding balances' },
    { id: 'resident_payment', name: 'Resident Payment Register', desc: 'Comprehensive resident payment status and receipt references' },
    { id: 'payment_transaction', name: 'Payment Transactions Report', desc: 'Paystack verified transactions with references and channels' },
    { id: 'payment_history', name: 'Payment History Report', desc: 'Historical ledger spanning all billing cycles' },
    { id: 'sms_reminder', name: 'SMS Reminder Dispatch Report', desc: 'Reminder 1 and 2 automated notices and delivery logs' }
  ];

  const availableMonths = [
    { month: 10, year: 2026, label: 'October 2026' },
    { month: 11, year: 2026, label: 'November 2026' },
    { month: 12, year: 2026, label: 'December 2026' },
    { month: 1, year: 2027, label: 'January 2027' }
  ];

  const fetchReport = async () => {
    setLoading(true);
    try {
      await dbService.recordAdminAudit('REPORT_GENERATED', 'report', `Admin generated ${selectedReport} report`, selectedReport);
      const data = await dbService.getFinancialReport(selectedReport, {
        month: selectedMonth,
        year: selectedYear,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      });
      setReportData(data);
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCollectionHistory = async () => {
    setHistoryLoading(true);
    try {
      const history = await dbService.getCollectionHistory();
      setCollectionHistory(history);
    } catch (err) {
      console.error('Failed to fetch collection history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedReport, selectedMonth, selectedYear, startDate, endDate]);

  useEffect(() => {
    fetchCollectionHistory();
  }, []);

  const handleExportCsv = () => {
    dbService.downloadReportCsv(selectedReport, {
      month: selectedMonth,
      year: selectedYear,
      startDate: startDate || undefined,
      endDate: endDate || undefined
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
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
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
                  <BarChart3 className="w-3.5 h-3.5" />
                  Financial Governance
                </span>
                <span className="text-xs text-slate-500 font-mono">Stage 7 Reports</span>
              </div>
              <h1 className="text-2xl font-bold font-display text-slate-900 mt-1">FINANCIAL REPORTS & EXPORTS</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Official security levy financial audits, collections, transactions, and CSV export engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              title="Print Report"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print</span>
            </button>
          </div>
        </div>

        {/* Report Selector Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-6 pt-6 border-t border-slate-100">
          {reportTypes.map((rep) => {
            const isSelected = selectedReport === rep.id;
            return (
              <button
                key={rep.id}
                onClick={() => setSelectedReport(rep.id)}
                className={`p-3 rounded-xl text-left transition-all border ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/70'
                }`}
              >
                <div className="text-xs font-bold truncate">{rep.name}</div>
                <div className={`text-[10px] mt-0.5 truncate ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                  {rep.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Parameters Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Month Filter */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span className="text-xs text-slate-500 font-medium">Levy Month:</span>
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

            {/* Date Range Start */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
              <span className="text-slate-500 font-medium">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-slate-800 focus:outline-none text-xs font-mono"
              />
            </div>

            {/* Date Range End */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
              <span className="text-slate-500 font-medium">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-slate-800 focus:outline-none text-xs font-mono"
              />
            </div>

            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="text-xs text-rose-600 hover:text-rose-700 font-medium px-2 py-1 rounded-lg"
              >
                Clear Dates
              </button>
            )}
          </div>

          <button
            onClick={fetchReport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Regenerate Report</span>
          </button>
        </div>
      </div>

      {/* Report Content Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
            Generating report from verified database records...
          </div>
        ) : !reportData ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No report data available for the chosen parameters.
          </div>
        ) : (
          <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold font-display text-slate-900">{reportData.title}</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Generated at {new Date().toLocaleTimeString('en-GB')} • Source: Official Database
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-mono font-semibold border border-emerald-200">
                <ShieldCheck className="w-4 h-4" />
                <span>Verified Financial Report</span>
              </div>
            </div>

            {/* 1. Monthly Collection Report View */}
            {selectedReport === 'monthly_collection' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <span className="text-xs text-slate-500 font-medium">Eligible Active Residents</span>
                    <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                      {reportData.total_active_residents}
                    </div>
                  </div>
                  <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100">
                    <span className="text-xs text-blue-700 font-medium">Total Expected Levy</span>
                    <div className="text-2xl font-bold font-mono text-blue-800 mt-1">
                      ₦{reportData.total_expected?.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-100">
                    <span className="text-xs text-emerald-700 font-medium">Total Collected</span>
                    <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
                      ₦{reportData.total_collected?.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-rose-50/60 p-4 rounded-xl border border-rose-100">
                    <span className="text-xs text-rose-700 font-medium">Total Outstanding</span>
                    <div className="text-2xl font-bold font-mono text-rose-700 mt-1">
                      ₦{reportData.total_outstanding?.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Collection Performance Details */}
                <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                    <span>Collection Progress</span>
                    <span className="font-mono text-emerald-600">{reportData.collection_percentage}</span>
                  </div>
                  <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, parseInt(reportData.collection_percentage) || 0)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>{reportData.paid_residents} Households Paid</span>
                    <span>{reportData.unpaid_residents} Households Unpaid</span>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Outstanding Levy Report View */}
            {selectedReport === 'outstanding_levy' && reportData.rows && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Resident No.</th>
                      <th className="py-3 px-4">Resident Name</th>
                      <th className="py-3 px-4">House / Plot</th>
                      <th className="py-3 px-4">Phone Number</th>
                      <th className="py-3 px-4">Period</th>
                      <th className="py-3 px-4">Amount Due</th>
                      <th className="py-3 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.rows.map((row: any) => (
                      <tr key={row.resident_number} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">#{row.resident_number}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{row.resident_name}</td>
                        <td className="py-3 px-4 text-slate-600">{row.house_number}</td>
                        <td className="py-3 px-4 font-mono text-slate-600">{row.phone_number}</td>
                        <td className="py-3 px-4 text-slate-500">{row.period_label}</td>
                        <td className="py-3 px-4 font-mono font-bold text-rose-600">₦{row.amount_due.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right">
                          <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[11px] font-semibold border border-rose-200">
                            UNPAID
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 3. Resident Payment Register View */}
            {selectedReport === 'resident_payment' && reportData.rows && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Resident</th>
                      <th className="py-3 px-4">House / Plot</th>
                      <th className="py-3 px-4">Month</th>
                      <th className="py-3 px-4">Amount Paid</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Payment Date</th>
                      <th className="py-3 px-4">Paystack Ref</th>
                      <th className="py-3 px-4 text-right">Receipt No.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.rows.map((row: any) => (
                      <tr key={row.resident_number} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{row.resident_name}</div>
                          <div className="text-[11px] font-mono text-slate-500">#{row.resident_number}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{row.house_number}</td>
                        <td className="py-3 px-4 text-slate-500">{row.period_label}</td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-600">
                          ₦{row.amount_paid.toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                            row.status === 'PAID'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                          {row.payment_date !== '—' ? new Date(row.payment_date).toLocaleDateString('en-GB') : '—'}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                          <span className="truncate max-w-[120px] inline-block">{row.payment_reference}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-[11px] text-slate-800">
                          {row.receipt_number}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 4. Payment Transaction Report View */}
            {selectedReport === 'payment_transaction' && reportData.transactions && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Resident</th>
                      <th className="py-3 px-4">Billing Month</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Paystack Ref</th>
                      <th className="py-3 px-4 text-right">Channel</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.transactions.map((t: any) => (
                      <tr key={t.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                          {new Date(t.payment_date || t.created_at).toLocaleString('en-GB')}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{t.resident_name}</div>
                          <div className="text-[11px] font-mono text-slate-500">#{t.resident_number}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{t.period_label}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          ₦{(t.amount_paid || t.amount_due).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                            t.status === 'PAID'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : t.status === 'PENDING'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                          {t.paystack_reference}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-600 uppercase">
                          {t.payment_channel || 'card'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 5. Payment History Report View */}
            {selectedReport === 'payment_history' && reportData.payments && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Resident</th>
                      <th className="py-3 px-4">Period</th>
                      <th className="py-3 px-4">Amount Due</th>
                      <th className="py-3 px-4">Amount Paid</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Settled At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.payments.map((p: any) => (
                      <tr key={p.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {p.resident_name || `Resident #${p.resident_number}`}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{p.period_label}</td>
                        <td className="py-3 px-4 font-mono text-slate-600">₦{p.amount_due.toLocaleString()}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">₦{p.amount_paid.toLocaleString()}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                            p.status === 'PAID'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-500 text-[11px]">
                          {p.paid_at ? new Date(p.paid_at).toLocaleDateString('en-GB') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 6. SMS Reminder Report View */}
            {selectedReport === 'sms_reminder' && reportData.logs && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Resident</th>
                      <th className="py-3 px-4">Phone</th>
                      <th className="py-3 px-4">Reminder Type</th>
                      <th className="py-3 px-4">Delivery Status</th>
                      <th className="py-3 px-4">Message Snippet</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.logs.map((s: any) => (
                      <tr key={s.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                          {new Date(s.sent_at || s.created_at).toLocaleString('en-GB')}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">#{s.resident_number}</td>
                        <td className="py-3 px-4 font-mono text-slate-600">{s.phone_number}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[11px] font-semibold border border-purple-200">
                            {s.reminder_type}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                            s.delivery_status === 'SENT' || s.delivery_status === 'DELIVERED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            {s.delivery_status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-[11px] max-w-xs truncate">
                          {s.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Historical Collection Ledger Cards */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold font-display text-slate-900">HISTORICAL COLLECTION SUMMARY</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified financial collection performance across configured estate levy periods
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">Database Grounded</span>
        </div>

        {historyLoading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Loading collection history...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {collectionHistory.map((item) => (
              <div key={item.period_label} className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">{item.period_label}</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                    {item.collection_percentage}%
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Expected:</span>
                    <span className="font-mono text-slate-900 font-semibold">₦{item.expected_amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>Collected:</span>
                    <span className="font-mono font-bold">₦{item.collected_amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-rose-700">
                    <span>Outstanding:</span>
                    <span className="font-mono font-bold">₦{item.outstanding_amount.toLocaleString()}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex justify-between text-[11px] text-slate-500">
                  <span>{item.paid_count} Paid</span>
                  <span>{item.unpaid_count} Unpaid</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
