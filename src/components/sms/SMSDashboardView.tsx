import React, { useState, useEffect, useMemo } from 'react';
import { 
  MessageSquare, 
  Send, 
  Play, 
  RefreshCw, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Clock, 
  Calendar, 
  Phone, 
  User, 
  Eye, 
  Copy, 
  Check, 
  ShieldCheck, 
  ArrowRight, 
  Zap,
  Info
} from 'lucide-react';
import { Resident, SMSLog, SMSConfigStatus, SMSSummaryStats, SMSReminderType, SMSDeliveryStatus } from '../../types/database';
import { smsApiClient } from '../../lib/sms';
import { dbService } from '../../lib/supabase';
import { SendTestSMSModal } from './SendTestSMSModal';
import { RunRemindersModal } from './RunRemindersModal';
import { ViewSMSModal } from './ViewSMSModal';

interface SMSDashboardViewProps {
  residents: Resident[];
  onSelectResident?: (resident: Resident) => void;
}

export const SMSDashboardView: React.FC<SMSDashboardViewProps> = ({
  residents,
  onSelectResident
}) => {
  const [logs, setLogs] = useState<SMSLog[]>([]);
  const [config, setConfig] = useState<SMSConfigStatus>({
    isConfigured: false,
    provider: 'termii',
    senderId: 'FINGEROFGOD',
    channel: 'generic',
    lastSuccessfulSms: null,
    lastFailedSms: null
  });
  const [stats, setStats] = useState<SMSSummaryStats>({
    sentToday: 0,
    sentThisMonth: 0,
    reminder1Sent: 0,
    reminder2Sent: 0,
    failedSms: 0,
    pendingSms: 0,
    totalLogged: 0
  });

  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');

  // Modals state
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [selectedLogForView, setSelectedLogForView] = useState<SMSLog | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [fetchedConfig, fetchedStats, fetchedLogs] = await Promise.all([
        smsApiClient.getConfigStatus(),
        smsApiClient.getSummaryStats(),
        smsApiClient.getLogs()
      ]);

      setConfig(fetchedConfig);
      setStats(fetchedStats);

      // If server logs returned, use them; otherwise use dbService fallback
      if (fetchedLogs && fetchedLogs.length > 0) {
        setLogs(fetchedLogs);
      } else {
        const localLogs = await dbService.getSmsLogs();
        setLogs(localLogs);
      }
    } catch (err) {
      console.warn('Error fetching SMS data, using database service:', err);
      const localLogs = await dbService.getSmsLogs();
      setLogs(localLogs);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Type filter
      if (selectedType !== 'All' && log.reminder_type !== selectedType) {
        return false;
      }
      // Status filter
      if (selectedStatus !== 'All' && log.delivery_status !== selectedStatus) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchResNumber = log.resident_number.toLowerCase().includes(q);
        const matchPhone = log.phone_number.includes(q);
        const matchName = log.resident?.full_name?.toLowerCase().includes(q) || false;
        const matchMessage = log.message.toLowerCase().includes(q);
        return matchResNumber || matchPhone || matchName || matchMessage;
      }
      return true;
    });
  }, [logs, selectedType, selectedStatus, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-600/10 border border-emerald-600/20 flex items-center justify-center text-emerald-600">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                SMS Reminders & Automated Notifications
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Automated monthly estate security levy reminders (₦5,000 / month · Africa/Lagos Timezone)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsTestModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Test SMS</span>
          </button>

          <button
            onClick={() => setIsRunModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs shadow-emerald-600/20 transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Trigger Reminder Check</span>
          </button>

          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer"
            title="Refresh logs & statistics"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Provider Status Alert / Banner */}
      {!config.isConfigured ? (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-900 text-sm tracking-tight">
                  SMS SERVICE NOT CONFIGURED
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900 uppercase">
                  Simulation / Audit Mode
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                No active <code className="font-mono bg-amber-100 px-1 py-0.5 rounded text-amber-900 font-semibold">SMS_API_KEY</code> detected in the server environment. 
                Reminder cycles and test messages will be evaluated and logged in the system audit history, but will not be transmitted over GSM networks.
              </p>
              <div className="mt-2.5 flex items-center gap-4 text-[11px] text-amber-900/80 font-medium">
                <span>Provider: <strong>Termii (Nigeria)</strong></span>
                <span>·</span>
                <span>Configured Sender ID: <strong>{config.senderId}</strong></span>
                <span>·</span>
                <span>Channel: <strong>{config.channel}</strong></span>
              </div>
            </div>
          </div>
          <div className="text-right shrink-0 hidden md:block">
            <span className="text-[11px] font-mono text-amber-700 block">Server Gateway</span>
            <span className="text-xs font-semibold text-amber-900">Stage 5 Ready</span>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-900 text-sm tracking-tight">
                  SMS SERVICE CONFIGURED & ACTIVE
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-900 uppercase">
                  Live Dispatch
                </span>
              </div>
              <p className="text-xs text-emerald-800 mt-1">
                Connected to Nigerian SMS Provider (<strong>Termii</strong>). Automated reminders will be dispatched via Sender ID <strong>{config.senderId}</strong>.
              </p>
              <div className="mt-2 text-[11px] text-emerald-900/80 flex items-center gap-4">
                <span>Timezone: <strong>Africa/Lagos (GMT+1)</strong></span>
                <span>·</span>
                <span>Scheduled Cron: <strong>Daily at 08:00 AM Lagos Time</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Automated Reminder Lifecycle Rules Banner */}
      <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl shadow-md border border-slate-800">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-300">
              Automated Monthly Levy Reminder Rules (₦5,000 / month)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-md">
            First Cycle: October 2026
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          {/* Due date */}
          <div className="p-3.5 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-1">
            <div className="text-[11px] text-slate-400 font-semibold uppercase">Step 1 · Due Date</div>
            <div className="text-slate-100 font-bold text-sm">1st of Month</div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              ₦5,000 security levy becomes due for all active residents.
            </p>
          </div>

          {/* Reminder 1 */}
          <div className="p-3.5 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-1">
            <div className="text-[11px] text-indigo-400 font-semibold uppercase">Step 2 · Reminder 1</div>
            <div className="text-slate-100 font-bold text-sm">6th of Month</div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Sent 5 days after payment due date to unpaid active residents.
            </p>
          </div>

          {/* Reminder 2 */}
          <div className="p-3.5 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-1">
            <div className="text-[11px] text-purple-400 font-semibold uppercase">Step 3 · Reminder 2</div>
            <div className="text-slate-100 font-bold text-sm">11th of Month</div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Sent another 5 days after Reminder 1 if levy remains unpaid.
            </p>
          </div>

          {/* Critical Stop Rule */}
          <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/40 rounded-xl space-y-1">
            <div className="text-[11px] text-emerald-400 font-semibold uppercase">Critical Stop Rule</div>
            <div className="text-emerald-300 font-bold text-sm">Payment Confirmed</div>
            <p className="text-emerald-200/80 text-[11px] leading-relaxed">
              Immediate STOP: Confirmed payment halts all future reminders for that resident for that cycle.
            </p>
          </div>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Sent Today</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{stats.sentToday}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Africa/Lagos Today</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Sent This Month</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{stats.sentThisMonth}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">October 2026 Cycle</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Reminder 1 Sent</div>
          <div className="text-2xl font-bold text-indigo-600 mt-1">{stats.reminder1Sent}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Day 6 Dispatches</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Reminder 2 Sent</div>
          <div className="text-2xl font-bold text-purple-600 mt-1">{stats.reminder2Sent}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Day 11 Dispatches</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Unsent / Notice</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{stats.failedSms}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Unconfigured / Failed</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Total Logged</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{logs.length}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Audit History</div>
        </div>
      </div>

      {/* SMS Logs Table & Filtering */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Filter Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by resident number, name, phone, or message..."
              className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Reminder Type Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-500">Type:</span>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value="All">All Types</option>
                <option value="REMINDER_1">Reminder 1</option>
                <option value="REMINDER_2">Reminder 2</option>
                <option value="TEST">Test SMS</option>
                <option value="MANUAL">Manual</option>
              </select>
            </div>

            {/* Delivery Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-500">Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value="All">All Statuses</option>
                <option value="SENT">SENT</option>
                <option value="NOT_CONFIGURED">NOT CONFIGURED</option>
                <option value="FAILED">FAILED</option>
                <option value="PENDING">PENDING</option>
              </select>
            </div>

            {(selectedType !== 'All' || selectedStatus !== 'All' || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedType('All');
                  setSelectedStatus('All');
                  setSearchQuery('');
                }}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium px-2 py-1"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Date / Time</th>
                <th className="py-3 px-4">Resident</th>
                <th className="py-3 px-4">Phone Number</th>
                <th className="py-3 px-4">Reminder Type</th>
                <th className="py-3 px-4">Message Content Preview</th>
                <th className="py-3 px-4">Provider / Msg ID</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-sm text-slate-600">No SMS logs found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {searchQuery || selectedType !== 'All' || selectedStatus !== 'All'
                        ? 'Try adjusting your search criteria or filters.'
                        : 'Dispatched automated reminders and test messages will be recorded here.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const residentObj = residents.find(r => r.id === log.resident_id || r.resident_number === log.resident_number);
                  const residentName = residentObj?.full_name || log.resident?.full_name || 'Resident ' + log.resident_number;

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Timestamp */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-900">
                          {new Date(log.created_at).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {new Date(log.created_at).toLocaleTimeString('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </td>

                      {/* Resident */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800 font-bold text-[11px]">
                            {log.resident_number}
                          </span>
                          <span 
                            onClick={() => residentObj && onSelectResident && onSelectResident(residentObj)}
                            className={`font-semibold text-slate-900 truncate max-w-[140px] ${residentObj ? 'hover:text-emerald-600 cursor-pointer underline-offset-2 hover:underline' : ''}`}
                          >
                            {residentName}
                          </span>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-800">
                        {log.phone_number}
                      </td>

                      {/* Reminder Type */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {log.reminder_type === 'REMINDER_1' ? (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Reminder 1 (Day 6)
                          </span>
                        ) : log.reminder_type === 'REMINDER_2' ? (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                            Reminder 2 (Day 11)
                          </span>
                        ) : log.reminder_type === 'TEST' ? (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200">
                            Test SMS
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700">
                            {log.reminder_type}
                          </span>
                        )}
                      </td>

                      {/* Message Preview */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="truncate text-slate-600" title={log.message}>
                          {log.message}
                        </div>
                      </td>

                      {/* Provider & ID */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono font-medium text-slate-800 uppercase text-[11px]">
                          {log.provider || 'termii'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate max-w-[100px]">
                          {log.provider_message_id || '—'}
                        </div>
                      </td>

                      {/* Delivery Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {log.delivery_status === 'SENT' || log.delivery_status === 'DELIVERED' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            SENT
                          </span>
                        ) : log.delivery_status === 'NOT_CONFIGURED' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200" title="SMS SERVICE NOT CONFIGURED">
                            <AlertTriangle className="w-3 h-3" />
                            NOT CONFIGURED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200" title={log.error_message || 'Failed'}>
                            <AlertCircle className="w-3 h-3" />
                            FAILED
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => setSelectedLogForView(log)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="View Full SMS Transmission Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <SendTestSMSModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        residents={residents}
        onSuccess={loadData}
      />

      <RunRemindersModal
        isOpen={isRunModalOpen}
        onClose={() => setIsRunModalOpen(false)}
        onSuccess={loadData}
        currentMonth={10}
        currentYear={2026}
      />

      <ViewSMSModal
        log={selectedLogForView}
        onClose={() => setSelectedLogForView(null)}
      />
    </div>
  );
};
