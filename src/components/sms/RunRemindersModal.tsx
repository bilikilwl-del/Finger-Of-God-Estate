import React, { useState } from 'react';
import { X, Play, CheckCircle2, AlertCircle, AlertTriangle, ShieldCheck, Clock, RefreshCw } from 'lucide-react';
import { smsApiClient } from '../../lib/sms';

interface RunRemindersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentMonth?: number;
  currentYear?: number;
}

export const RunRemindersModal: React.FC<RunRemindersModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentMonth = 10,
  currentYear = 2026
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<{
    success: boolean;
    message: string;
    processed: number;
    sent: number;
    skippedPaid: number;
    skippedAlreadySent: number;
    failed: number;
    notConfigured: number;
    details: Array<{
      residentNumber: string;
      fullName: string;
      action: string;
      reminderType?: string;
      reason: string;
      status: string;
    }>;
  } | null>(null);

  if (!isOpen) return null;

  const monthLabel = `${new Date(currentYear, currentMonth - 1, 1).toLocaleString('en-US', { month: 'long' })} ${currentYear}`;

  const handleExecute = async () => {
    setIsRunning(true);
    setResults(null);

    try {
      const res = await smsApiClient.runScheduledRemindersNow(currentMonth, currentYear);
      setResults(res);
      onSuccess();
    } catch (err: any) {
      setResults({
        success: false,
        message: err.message || 'Execution error during reminder cycle.',
        processed: 0,
        sent: 0,
        skippedPaid: 0,
        skippedAlreadySent: 0,
        failed: 1,
        notConfigured: 0,
        details: []
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Play className="w-5 h-5 fill-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">Run Automated Reminder Check</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Africa/Lagos Schedule Execution for {monthLabel}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Rules Overview Banner */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs text-slate-700">
            <div className="flex items-center gap-2 font-semibold text-slate-900 text-sm">
              <Clock className="w-4 h-4 text-emerald-600" />
              Automated Lifecycle Rules
            </div>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li>
                <strong className="text-slate-800">Payment Due:</strong> 1st of the month (₦5,000 security levy).
              </li>
              <li>
                <strong className="text-slate-800">Reminder 1:</strong> 5 days after payment due date (6th of month).
              </li>
              <li>
                <strong className="text-slate-800">Reminder 2:</strong> 5 days after Reminder 1 (11th of month).
              </li>
              <li>
                <strong className="text-emerald-700">Immediate Stop Rule:</strong> Once payment is confirmed as{' '}
                <span className="font-mono bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded font-bold">PAID</span>, all reminders are permanently halted for that month.
              </li>
              <li>
                <strong className="text-slate-800">Duplicate Protection:</strong> Never sends Reminder 1 or Reminder 2 twice to the same resident.
              </li>
            </ul>
          </div>

          {!results ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto">
                <h4 className="font-semibold text-slate-900 text-base">
                  Execute Scheduled Job on Demand?
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  The engine will evaluate every active resident's current payment status for {monthLabel} and send the appropriate reminder if due, skipping any resident who has already paid.
                </p>
              </div>

              <button
                onClick={handleExecute}
                disabled={isRunning}
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-sm font-semibold shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Evaluating Residents & Dispatches...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Execute Reminder Evaluation Now</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Outcome Banner */}
              <div className={`p-4 rounded-xl text-xs border ${
                results.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}>
                <div className="font-bold text-sm mb-1">{results.message}</div>
              </div>

              {/* Metric Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-lg font-bold text-slate-900">{results.processed}</div>
                  <div className="text-[11px] text-slate-500 uppercase tracking-wider">Processed</div>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="text-lg font-bold text-emerald-700">{results.sent}</div>
                  <div className="text-[11px] text-emerald-600 uppercase tracking-wider font-semibold">Sent</div>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="text-lg font-bold text-blue-700">{results.skippedPaid}</div>
                  <div className="text-[11px] text-blue-600 uppercase tracking-wider font-semibold">Skipped (Paid)</div>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="text-lg font-bold text-amber-700">{results.notConfigured + results.skippedAlreadySent}</div>
                  <div className="text-[11px] text-amber-600 uppercase tracking-wider font-semibold">Unsent / Prevented</div>
                </div>
              </div>

              {/* Execution Details Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-100/70 border-b border-slate-200 font-semibold text-xs text-slate-700 flex items-center justify-between">
                  <span>Resident Evaluation Breakdown</span>
                  <span className="text-[11px] font-mono text-slate-500">{results.details.length} resident checks</span>
                </div>
                <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                  {results.details.map((d, i) => (
                    <div key={i} className="p-3 flex items-start justify-between gap-3 text-xs">
                      <div>
                        <div className="font-semibold text-slate-900 flex items-center gap-2">
                          <span className="font-mono px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px]">
                            {d.residentNumber}
                          </span>
                          <span>{d.fullName}</span>
                          {d.reminderType && (
                            <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-[10px] font-mono">
                              {d.reminderType}
                            </span>
                          )}
                        </div>
                        <div className="text-slate-500 mt-0.5">{d.reason}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        d.action === 'SENT'
                          ? 'bg-emerald-100 text-emerald-800'
                          : d.action === 'SKIPPED'
                          ? 'bg-blue-100 text-blue-800'
                          : d.action === 'NOT_CONFIGURED'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {d.action}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Re-run button */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleExecute}
                  disabled={isRunning}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Run Again</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-200/70 rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
