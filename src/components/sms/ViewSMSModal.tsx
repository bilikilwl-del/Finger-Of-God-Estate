import React from 'react';
import { X, MessageSquare, Copy, Check, Calendar, Phone, User, CheckCircle2, AlertTriangle, AlertCircle, Clock, Send } from 'lucide-react';
import { SMSLog } from '../../types/database';

interface ViewSMSModalProps {
  log: SMSLog | null;
  onClose: () => void;
}

export const ViewSMSModal: React.FC<ViewSMSModalProps> = ({ log, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  if (!log) return null;

  const copyMessage = () => {
    navigator.clipboard.writeText(log.message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = () => {
    switch (log.delivery_status) {
      case 'SENT':
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {log.delivery_status}
          </span>
        );
      case 'NOT_CONFIGURED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5" />
            SMS SERVICE NOT CONFIGURED
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5" />
            FAILED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <Clock className="w-3.5 h-3.5" />
            {log.delivery_status}
          </span>
        );
    }
  };

  const getReminderBadge = () => {
    switch (log.reminder_type) {
      case 'REMINDER_1':
        return (
          <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            Reminder 1 (Day 6)
          </span>
        );
      case 'REMINDER_2':
        return (
          <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            Reminder 2 (Day 11)
          </span>
        );
      case 'TEST':
        return (
          <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200">
            Test SMS Dispatch
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {log.reminder_type}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">SMS Transmission Audit</h3>
              <p className="text-xs text-slate-400 mt-0.5">ID: {log.id}</p>
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
        <div className="p-6 space-y-5">
          {/* Status Row */}
          <div className="flex items-center justify-between">
            {getReminderBadge()}
            {getStatusBadge()}
          </div>

          {/* Recipient Details */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Recipient Resident:
              </span>
              <span className="font-semibold text-slate-900">
                {log.resident?.full_name || 'Resident ' + log.resident_number} (No: {log.resident_number})
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                Phone Number:
              </span>
              <span className="font-mono font-medium text-slate-900">
                {log.phone_number}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Levy Cycle:
              </span>
              <span className="font-medium text-slate-900">
                {log.period_label || `${log.payment_month}/${log.payment_year}`}
              </span>
            </div>
          </div>

          {/* SMS Body Card */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                SMS Content ({log.message.length} chars)
              </span>
              <button
                onClick={copyMessage}
                className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy SMS</span>
                  </>
                )}
              </button>
            </div>
            <div className="p-3.5 bg-emerald-950/5 border border-emerald-200/80 rounded-xl text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-wrap">
              {log.message}
            </div>
          </div>

          {/* Technical Metadata */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Provider:</span>
              <span className="font-mono font-medium text-slate-900 uppercase">{log.provider || 'termii'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Provider Message ID:</span>
              <span className="font-mono text-slate-700">
                {log.provider_message_id || 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Sent Timestamp:</span>
              <span className="text-slate-700">
                {log.sent_at ? new Date(log.sent_at).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' }) : 'Not sent'}
              </span>
            </div>
            {log.error_message && (
              <div className="pt-2 border-t border-slate-200/60 text-rose-700">
                <span className="font-semibold block mb-0.5">Error Notice:</span>
                <span>{log.error_message}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200/70 rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
