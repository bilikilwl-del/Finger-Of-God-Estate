import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, 
  Search, 
  Calendar, 
  Download, 
  ArrowLeft,
  Filter,
  Phone,
  Home,
  MessageSquare,
  ShieldAlert,
  RefreshCw,
  BellRing
} from 'lucide-react';
import { UnpaidResidentRecord, NavigationTab, EstateSettings } from '../../types/database';
import { dbService } from '../../lib/supabase';

interface UnpaidResidentsViewProps {
  estateSettings?: EstateSettings;
  onNavigateToResident?: (residentNumber: string) => void;
  onNavigate?: (tab: NavigationTab) => void;
}

export const UnpaidResidentsView: React.FC<UnpaidResidentsViewProps> = ({ 
  estateSettings,
  onNavigateToResident,
  onNavigate 
}) => {
  const [selectedMonth, setSelectedMonth] = useState<number>(10);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [reminderFilter, setReminderFilter] = useState<string>('ALL');
  const [unpaidResidents, setUnpaidResidents] = useState<UnpaidResidentRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

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
      const records = await dbService.getUnpaidResidents(selectedMonth, selectedYear, searchQuery);
      setUnpaidResidents(records);
    } catch (err) {
      console.error('Error fetching unpaid residents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedYear, searchQuery]);

  const filteredResidents = unpaidResidents.filter(r => {
    if (reminderFilter === 'ALL') return true;
    return r.reminder_status === reminderFilter;
  });

  const totalOutstanding = filteredResidents.length * 5000;

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
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Outstanding Levies
                </span>
                <span className="text-xs text-slate-500 font-mono">Stage 7 Management</span>
              </div>
              <h1 className="text-2xl font-bold font-display text-slate-900 mt-1">UNPAID RESIDENTS</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Active estate residents who have not settled the security levy for {currentPeriod.label}
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
              onClick={() => dbService.downloadReportCsv('outstanding_levy', { month: selectedMonth, year: selectedYear })}
              className="inline-flex items-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Security / Non-Manual Modification Notice */}
        <div className="mt-4 p-3 bg-blue-50/60 border border-blue-100 rounded-xl text-xs text-blue-800 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <strong>Strict Financial Integrity Policy:</strong> Administrators cannot manually change unpaid records to PAID from this interface. Only verified Paystack gateway transactions update resident payment statuses.
          </div>
        </div>

        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="bg-amber-50/50 border border-amber-100/80 rounded-xl p-3.5">
            <span className="text-xs font-medium text-amber-800">Unpaid Residents Count</span>
            <div className="text-2xl font-bold font-mono text-amber-700 mt-1">{filteredResidents.length}</div>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5">
            <span className="text-xs font-medium text-slate-600">Total Outstanding for {currentPeriod.label}</span>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">₦{totalOutstanding.toLocaleString()}</div>
          </div>
          <div className="bg-indigo-50/50 border border-indigo-100/80 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-indigo-800">Automated SMS Reminders</span>
              <div className="text-xs text-slate-500 mt-1">Termii Service Layer Active</div>
            </div>
            <button
              onClick={() => onNavigate?.('sms')}
              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              View SMS Logs
            </button>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search unpaid by resident no, name, phone, or plot..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Reminder:</span>
            <select
              value={reminderFilter}
              onChange={(e) => setReminderFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-medium text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="NONE">No Reminder Sent</option>
              <option value="REMINDER_1">Reminder 1 Sent</option>
              <option value="REMINDER_2">Reminder 2 Sent</option>
            </select>
          </div>

          <button
            onClick={loadData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Unpaid Residents Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
            Loading unpaid residents...
          </div>
        ) : filteredResidents.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700">No Unpaid Residents</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              All active residents have cleared their security levy for {currentPeriod.label}.
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
                  <th className="py-3.5 px-4">Amount Due</th>
                  <th className="py-3.5 px-4">Payment Status</th>
                  <th className="py-3.5 px-4">Reminder Status</th>
                  <th className="py-3.5 px-4 text-right">SMS Engine</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredResidents.map((record) => (
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
                    <td className="py-3.5 px-4 font-mono font-bold text-amber-700">
                      ₦{record.amount_due.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[11px] font-semibold border border-amber-200">
                        <AlertCircle className="w-3 h-3 text-amber-600" />
                        UNPAID
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {record.reminder_status === 'REMINDER_2' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[11px] font-semibold border border-purple-200">
                          <BellRing className="w-3 h-3" />
                          Reminder 2 Sent
                        </span>
                      ) : record.reminder_status === 'REMINDER_1' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-semibold border border-blue-200">
                          <MessageSquare className="w-3 h-3" />
                          Reminder 1 Sent
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Not Sent Yet</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onNavigate?.('sms')}
                        className="inline-flex items-center gap-1 px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Audit SMS</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
