import React, { useState } from 'react';
import { 
  FileText, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  RefreshCw, 
  Check, 
  Info, 
  X, 
  PhoneCall, 
  Clock, 
  User, 
  HelpCircle 
} from 'lucide-react';
import { OutstandingPaymentSmsDraft, SendApprovedRemindersResult, smsApiClient } from '../../lib/sms';

interface OutstandingPaymentSMSSectionProps {
  onSmsSent?: () => void;
}

export const OutstandingPaymentSMSSection: React.FC<OutstandingPaymentSMSSectionProps> = ({ onSmsSent }) => {
  const [selectedMonth, setSelectedMonth] = useState<number>(10);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [drafts, setDrafts] = useState<OutstandingPaymentSmsDraft[]>([]);
  const [selectedDraftIds, setSelectedDraftIds] = useState<Set<string>>(new Set());
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);
  const [sendSummary, setSendSummary] = useState<SendApprovedRemindersResult | null>(null);

  const availableMonths = [
    { month: 10, year: 2026, label: 'October 2026' },
    { month: 11, year: 2026, label: 'November 2026' },
    { month: 12, year: 2026, label: 'December 2026' }
  ];

  // 1. GENERATE DRAFTS (Drafts Only - NEVER sends SMS)
  const handleGenerateDrafts = async () => {
    setIsGenerating(true);
    setFeedbackMessage(null);
    setSendSummary(null);
    setSelectedDraftIds(new Set());

    try {
      const res = await smsApiClient.generateOutstandingPaymentDrafts(selectedMonth, selectedYear);
      if (res.success) {
        setDrafts(res.drafts);
        if (res.drafts.length === 0) {
          setFeedbackMessage({
            type: 'info',
            text: 'No residents currently have an outstanding security levy balance for this cycle.'
          });
        } else {
          setFeedbackMessage({
            type: 'success',
            text: `Generated ${res.drafts.length} payment reminder draft(s) for ${res.period}. Review, edit, and approve before sending.`
          });
        }
      } else {
        setFeedbackMessage({
          type: 'error',
          text: res.message || 'Failed to generate payment reminder drafts.'
        });
      }
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err?.message || 'Error occurred while generating drafts.'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // 2. TOGGLE SELECTION
  const handleToggleSelect = (id: string, isValidPhone: boolean) => {
    if (!isValidPhone) return;
    const next = new Set(selectedDraftIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedDraftIds(next);
  };

  // 3. SELECT ALL ELIGIBLE (Valid phones only)
  const handleSelectAll = () => {
    const eligibleIds = drafts.filter(d => d.is_phone_valid).map(d => d.draft_id);
    if (selectedDraftIds.size === eligibleIds.length) {
      setSelectedDraftIds(new Set());
    } else {
      setSelectedDraftIds(new Set(eligibleIds));
    }
  };

  // 4. EDIT MESSAGE PER RESIDENT (Preserves admin edits)
  const handleMessageChange = (draftId: string, newMessage: string) => {
    setDrafts(prev => prev.map(d => {
      if (d.draft_id === draftId) {
        return { ...d, message: newMessage };
      }
      return d;
    }));
  };

  // 5. APPROVE SELECTED (Draft -> Approved, STILL NO SMS SENT)
  const handleApproveSelected = () => {
    if (selectedDraftIds.size === 0) return;

    let newlyApprovedCount = 0;
    setDrafts(prev => prev.map(d => {
      if (selectedDraftIds.has(d.draft_id) && d.status === 'draft') {
        newlyApprovedCount++;
        return { ...d, status: 'approved' };
      }
      return d;
    }));

    setFeedbackMessage({
      type: 'success',
      text: `${newlyApprovedCount} reminder draft(s) approved. Review below and click "SEND APPROVED SMS" to initiate sending.`
    });
  };

  // 6. INITIATE TWO-STEP SEND
  const approvedDrafts = drafts.filter(d => d.status === 'approved');

  const handleOpenSendModal = () => {
    if (approvedDrafts.length === 0) return;
    setIsConfirmModalOpen(true);
  };

  // 7. EXPLICIT CONFIRMATION -> SEND APPROVED SMS
  const handleConfirmSend = async () => {
    setIsConfirmModalOpen(false);
    if (approvedDrafts.length === 0) return;

    setIsSending(true);
    setFeedbackMessage(null);

    try {
      const res = await smsApiClient.sendApprovedReminders(approvedDrafts);
      setSendSummary(res);

      // Update draft statuses based on server results
      const resultMap = new Map(res.results.map(r => [r.draft_id, r]));
      setDrafts(prev => prev.map(d => {
        const itemResult = resultMap.get(d.draft_id);
        if (itemResult) {
          return {
            ...d,
            status: itemResult.status,
            delivery_label: itemResult.delivery_label,
            provider_message_id: itemResult.provider_message_id,
            error: itemResult.error
          };
        }
        return d;
      }));

      // Deselect sent items
      setSelectedDraftIds(new Set());

      if (res.total_sent > 0) {
        setFeedbackMessage({
          type: 'success',
          text: `SMS transmission complete: ${res.total_sent} accepted by provider, ${res.total_failed} failed.`
        });
        if (onSmsSent) onSmsSent();
      } else {
        setFeedbackMessage({
          type: 'error',
          text: `All ${res.total_failed} SMS dispatches failed. Inspect reason details in the review table.`
        });
      }
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err?.message || 'Error executing approved SMS transmissions.'
      });
    } finally {
      setIsSending(false);
    }
  };

  const eligibleCount = drafts.filter(d => d.is_phone_valid).length;
  const allSelected = eligibleCount > 0 && selectedDraftIds.size === eligibleCount;
  const draftCount = drafts.filter(d => d.status === 'draft').length;
  const approvedCount = drafts.filter(d => d.status === 'approved').length;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              Outstanding Payment SMS
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Identify residents with outstanding payments and prepare SMS reminders for admin review and approval. 
            All generated reminders start in <span className="font-semibold text-slate-700">Draft</span> state and require explicit administrative approval before transmission.
          </p>
        </div>

        {/* Controls: Month Selector & Generator Button */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
            disabled={isGenerating || isSending}
            aria-label="Select billing cycle month"
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          >
            {availableMonths.map(m => (
              <option key={m.month} value={m.month}>{m.label}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleGenerateDrafts}
            disabled={isGenerating || isSending}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Analyzing Balances...' : 'GENERATE PAYMENT REMINDER DRAFTS'}</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-medium ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : feedbackMessage.type === 'info'
              ? 'bg-blue-50 border-blue-200 text-blue-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : feedbackMessage.type === 'info' ? (
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Send Summary Card */}
      {sendSummary && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
              SMS Transmission Summary
            </h4>
            <div className="flex items-center gap-3 text-xs font-mono font-semibold">
              <span className="text-emerald-700">Accepted: {sendSummary.total_sent}</span>
              <span className="text-rose-700">Failed: {sendSummary.total_failed}</span>
            </div>
          </div>

          {sendSummary.total_failed > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-slate-200 text-xs">
              <span className="font-semibold text-rose-800 block text-[11px]">Failed Transmissions:</span>
              {sendSummary.results.filter(r => r.status === 'failed').map((f) => (
                <div key={f.draft_id} className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 flex items-center justify-between">
                  <span>
                    <strong>#{f.resident_number} {f.resident_name}:</strong> {f.error || f.delivery_label}
                  </span>
                  <span className="font-mono text-[10px] text-rose-700">{f.delivery_label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Review Section */}
      {drafts.length === 0 ? (
        <div className="p-10 border border-dashed border-slate-200 rounded-xl text-center space-y-3">
          <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">No Drafts Generated Yet</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Select a billing cycle above and click <strong>"GENERATE PAYMENT REMINDER DRAFTS"</strong> to inspect outstanding balances and prepare messages for admin review.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Action Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3 text-xs">
              <span className="font-semibold text-slate-700">
                Total: <span className="font-mono">{drafts.length}</span>
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-600">
                Selected: <span className="font-mono font-bold text-slate-900">{selectedDraftIds.size}</span>
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-amber-700 font-medium">
                Draft: <span className="font-mono font-bold">{draftCount}</span>
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-indigo-700 font-semibold">
                Approved: <span className="font-mono font-bold">{approvedCount}</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Step 1: Approve Selected (NO SMS SENT) */}
              <button
                type="button"
                onClick={handleApproveSelected}
                disabled={selectedDraftIds.size === 0 || isSending}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                title="Mark selected drafts as Approved (Does not send SMS)"
              >
                <Check className="w-3.5 h-3.5" />
                <span>APPROVE SELECTED ({selectedDraftIds.size})</span>
              </button>

              {/* Step 2: Send Approved SMS (Two-step protection) */}
              <button
                type="button"
                onClick={handleOpenSendModal}
                disabled={approvedCount === 0 || isSending}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer"
                title="Send approved reminders via SmartSMSSolutions"
              >
                <Send className="w-3.5 h-3.5" />
                <span>SEND APPROVED SMS ({approvedCount})</span>
              </button>
            </div>
          </div>

          {/* Drafts Review Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={handleSelectAll}
                      disabled={eligibleCount === 0}
                      aria-label="Select all eligible drafts"
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-3 w-20">Estate No.</th>
                  <th className="py-3 px-4 w-44">Resident</th>
                  <th className="py-3 px-3 w-28 text-right">Outstanding</th>
                  <th className="py-3 px-4">Draft SMS Message (Editable)</th>
                  <th className="py-3 px-3 w-32 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {drafts.map((draft) => {
                  const isSelected = selectedDraftIds.has(draft.draft_id);
                  const charCount = draft.message.length;
                  const smsSegments = Math.ceil(charCount / 160) || 1;

                  return (
                    <tr 
                      key={draft.draft_id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        !draft.is_phone_valid ? 'bg-slate-50/50 opacity-80' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3 text-center align-top pt-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(draft.draft_id, draft.is_phone_valid)}
                          disabled={!draft.is_phone_valid || draft.status === 'sent'}
                          aria-label={`Select draft for resident ${draft.resident_number}`}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:cursor-not-allowed"
                        />
                      </td>

                      {/* Estate Number */}
                      <td className="py-3 px-3 align-top pt-4">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          #{draft.resident_number}
                        </span>
                      </td>

                      {/* Resident Info & Phone */}
                      <td className="py-3 px-4 align-top pt-3.5 space-y-1">
                        <div className="font-bold text-slate-900 leading-tight">
                          {draft.resident_name}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[160px]">
                          {draft.house_number}
                        </div>

                        {/* Phone with status badge */}
                        <div className="pt-0.5">
                          {draft.is_phone_valid ? (
                            <span className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-600">
                              <PhoneCall className="w-2.5 h-2.5 text-emerald-600" />
                              {draft.phone_number}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 text-[10px] font-semibold border border-rose-200">
                              <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                              No valid phone number
                            </span>
                          )}
                        </div>

                        {/* Duplicate protection warning */}
                        {draft.last_reminder_sent && (
                          <div className="pt-0.5">
                            <span className="inline-flex items-center gap-1 text-[9px] text-amber-700 font-medium">
                              <Clock className="w-2.5 h-2.5" />
                              Recent reminder logged
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Outstanding Amount */}
                      <td className="py-3 px-3 align-top pt-4 text-right">
                        <div className="font-mono font-bold text-rose-700 text-sm">
                          ₦{draft.outstanding_amount.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Due: ₦{draft.amount_due.toLocaleString()}
                        </div>
                      </td>

                      {/* Editable Draft SMS Message */}
                      <td className="py-3 px-4 align-top pt-3 space-y-1">
                        <textarea
                          rows={2}
                          value={draft.message}
                          onChange={(e) => handleMessageChange(draft.draft_id, e.target.value)}
                          disabled={draft.status === 'sent'}
                          maxLength={500}
                          aria-label={`Draft message for resident ${draft.resident_number}`}
                          className="w-full p-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 transition-colors leading-relaxed font-sans"
                        />
                        <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                          <span className={charCount > 160 ? 'text-amber-700 font-semibold' : ''}>
                            {charCount} characters · {smsSegments} SMS page{smsSegments > 1 ? 's' : ''}
                          </span>
                          {charCount > 160 && (
                            <span className="text-amber-600 font-medium flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Multi-part SMS
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 align-top pt-4 text-center">
                        {draft.status === 'draft' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                            Draft
                          </span>
                        )}

                        {draft.status === 'approved' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center justify-center gap-1">
                            <Check className="w-3 h-3 text-indigo-600" />
                            Approved
                          </span>
                        )}

                        {draft.status === 'sent' && (
                          <div className="space-y-0.5">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Accepted
                            </span>
                            <span className="text-[9px] text-emerald-700 block font-mono">
                              {draft.delivery_label || 'Accepted by provider'}
                            </span>
                          </div>
                        )}

                        {draft.status === 'failed' && (
                          <div className="space-y-0.5">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200 flex items-center justify-center gap-1">
                              <AlertCircle className="w-3 h-3 text-rose-600" />
                              Failed
                            </span>
                            <span className="text-[9px] text-rose-700 block truncate max-w-[100px]" title={draft.error || 'Failed'}>
                              {draft.error || 'Provider rejected'}
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Two-Step Confirmation Dialog Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Confirm SMS Transmission
                </h4>
                <p className="text-xs text-slate-500">
                  Two-step administrative confirmation
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed">
              You are about to send <strong className="font-bold text-slate-900">{approvedDrafts.length} SMS reminder(s)</strong> to residents with outstanding security levy balances. Continue?
            </p>

            <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p>
                <strong>Provider Delivery Notice:</strong> This action dispatches real SMS messages through SmartSMSSolutions to resident mobile numbers.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isSending}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSend}
                disabled={isSending}
                className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
              >
                <Send className={`w-3.5 h-3.5 ${isSending ? 'animate-pulse' : ''}`} />
                <span>{isSending ? 'Transmitting...' : 'Send SMS'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
