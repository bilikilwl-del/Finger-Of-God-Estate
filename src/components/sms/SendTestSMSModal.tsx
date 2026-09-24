import React, { useState } from 'react';
import { X, Send, AlertTriangle, CheckCircle2, User, Phone, MessageSquare, Info } from 'lucide-react';
import { Resident, SMSDeliveryStatus } from '../../types/database';
import { smsApiClient, buildTestMessage, formatPhoneForSMS } from '../../lib/sms';

interface SendTestSMSModalProps {
  isOpen: boolean;
  onClose: () => void;
  residents: Resident[];
  onSuccess: () => void;
}

export const SendTestSMSModal: React.FC<SendTestSMSModalProps> = ({
  isOpen,
  onClose,
  residents,
  onSuccess
}) => {
  const activeResidents = residents.filter(r => r.status === 'Active');
  const [selectedResidentId, setSelectedResidentId] = useState<string>(activeResidents[0]?.id || '');
  const [customText, setCustomText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    status: SMSDeliveryStatus;
    message: string;
  } | null>(null);

  if (!isOpen) return null;

  const selectedResident = residents.find(r => r.id === selectedResidentId) || activeResidents[0];

  const defaultMessage = selectedResident 
    ? buildTestMessage(selectedResident.full_name, selectedResident.resident_number)
    : '';

  const messageToSend = customText.trim() || defaultMessage;
  const charCount = messageToSend.length;
  const smsSegments = Math.ceil(charCount / 160) || 1;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResident) return;

    setIsSubmitting(true);
    setResult(null);

    try {
      const res = await smsApiClient.sendTestSMS(
        selectedResident.id,
        customText.trim() ? customText.trim() : undefined
      );

      setResult({
        success: res.success,
        status: res.status,
        message: res.message
      });

      if (res.success || res.status === 'NOT_CONFIGURED') {
        onSuccess();
      }
    } catch (err: any) {
      setResult({
        success: false,
        status: 'FAILED',
        message: err.message || 'Failed to dispatch test SMS.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">Send Test SMS</h3>
              <p className="text-xs text-slate-400 mt-0.5">Admin diagnostic test dispatch (marked as TEST)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSend} className="p-6 space-y-5">
          {/* Important safety notice */}
          <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Diagnostic Mode:</span> Test messages are labeled with reminder type{' '}
              <span className="font-mono bg-amber-100 px-1 py-0.5 rounded text-amber-800">TEST</span> and do{' '}
              <span className="font-semibold">not</span> affect or advance the resident's monthly security levy reminder cycle.
            </div>
          </div>

          {/* Select Resident */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Select Recipient Resident
            </label>
            <select
              value={selectedResidentId}
              onChange={(e) => setSelectedResidentId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            >
              {activeResidents.map((r) => (
                <option key={r.id} value={r.id}>
                  Resident {r.resident_number} — {r.full_name} ({r.phone_number})
                </option>
              ))}
            </select>
          </div>

          {selectedResident && (
            <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-xs space-y-1.5">
              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Resident:
                </span>
                <span className="font-medium text-slate-900">
                  {selectedResident.full_name} (No: {selectedResident.resident_number})
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  Destination (E.164):
                </span>
                <span className="font-mono font-medium text-slate-900">
                  +{formatPhoneForSMS(selectedResident.phone_number)}
                </span>
              </div>
            </div>
          )}

          {/* Message Text */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                SMS Content (Preview / Custom)
              </label>
              <span className="text-[11px] font-mono text-slate-400">
                {charCount} chars · {smsSegments} segment{smsSegments > 1 ? 's' : ''}
              </span>
            </div>
            <textarea
              rows={4}
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder={defaultMessage}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all font-sans leading-relaxed"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Leave blank to send the official default Finger of God Estate test template.
            </p>
          </div>

          {/* Result Alert */}
          {result && (
            <div className={`p-4 rounded-xl text-xs border ${
              result.status === 'SENT'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : result.status === 'NOT_CONFIGURED'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              <div className="flex items-start gap-2.5">
                {result.status === 'SENT' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold uppercase tracking-wider text-[11px] mb-0.5">
                    Status: {result.status}
                  </div>
                  <div>{result.message}</div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedResident}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-sm font-medium shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Dispatching...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Dispatch Test SMS</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
