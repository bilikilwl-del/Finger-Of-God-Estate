import React, { useState, useEffect } from 'react';
import { 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  RefreshCw, 
  ShieldCheck, 
  Phone, 
  MessageSquare, 
  Info,
  Server,
  Lock,
  Clock,
  Check
} from 'lucide-react';
import { smsApiClient, AdminSmsConfigCheck, AdminSmsTestResult, AdminSmsTestHistoryItem } from '../../lib/sms';
import { OutstandingPaymentSMSSection } from './OutstandingPaymentSMSSection';

export const SMSTestDashboardSection: React.FC = () => {
  const [testPhone, setTestPhone] = useState<string>('');
  const [testMessage, setTestMessage] = useState<string>(
    'Finger of God Estate: This is a test SMS from the Resident Portal. If you received this message, the estate SMS service is working correctly.'
  );

  const [isSending, setIsSending] = useState(false);
  const [isCheckingConfig, setIsCheckingConfig] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [configCheck, setConfigCheck] = useState<AdminSmsConfigCheck | null>(null);
  const [configCheckMessage, setConfigCheckMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [testResult, setTestResult] = useState<AdminSmsTestResult | null>(null);
  const [testHistory, setTestHistory] = useState<AdminSmsTestHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Load config check and history on mount
  useEffect(() => {
    loadConfigCheck();
    loadTestHistory();
  }, []);

  const loadConfigCheck = async () => {
    setIsCheckingConfig(true);
    try {
      const data = await smsApiClient.checkAdminConfig();
      setConfigCheck(data);
      if (data.ready) {
        setConfigCheckMessage({
          type: 'success',
          text: `✓ SMS configuration is ready (${data.provider} · Sender ID: ${data.senderId})`
        });
      } else {
        setConfigCheckMessage({
          type: 'error',
          text: '✕ SMS configuration incomplete. Set SMS_API_KEY in server environment.'
        });
      }
    } catch {
      setConfigCheckMessage({
        type: 'error',
        text: '✕ Could not verify SMS configuration from server.'
      });
    } finally {
      setIsCheckingConfig(false);
    }
  };

  const loadTestHistory = async () => {
    setHistoryLoading(true);
    try {
      const items = await smsApiClient.getAdminTestHistory();
      setTestHistory(items);
    } catch {
      // Keep empty if failed
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSendTestSms = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const cleanPhone = testPhone.trim();
    if (!cleanPhone) {
      setValidationError('Please enter a test phone number (e.g. 08031234567).');
      return;
    }

    if (!testMessage.trim()) {
      setValidationError('Please enter a test message.');
      return;
    }

    setIsSending(true);
    setTestResult(null);

    try {
      const res = await smsApiClient.sendAdminTestSms(cleanPhone, testMessage.trim());
      setTestResult(res);
      // Reload history to show the newly added test
      loadTestHistory();
    } catch (err: any) {
      setTestResult({
        success: false,
        status: 'FAILED',
        deliveryLabel: 'Network Error',
        message: 'Network error connecting to estate SMS service.',
        error: err?.message || 'Network exception',
        provider: configCheck?.provider || 'SMSLive247',
        senderId: configCheck?.senderId || 'FINGEROFGOD',
        recipientMasked: '234***',
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsSending(false);
    }
  };

  const charCount = testMessage.length;
  const smsSegments = Math.ceil(charCount / 160) || 1;

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-600/10 border border-emerald-600/20 flex items-center justify-center text-emerald-600">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                SMS Test Dashboard
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Administrator diagnostic tool to verify GSM gateway connectivity before sending resident notifications
              </p>
            </div>
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={loadConfigCheck}
            disabled={isCheckingConfig}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCheckingConfig ? 'animate-spin' : ''}`} />
            <span>CHECK SMS CONFIGURATION</span>
          </button>
        </div>
      </div>

      {/* Config Verification Alert Banner */}
      {configCheckMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-medium animate-in fade-in duration-200 ${
            configCheckMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {configCheckMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            )}
            <span>{configCheckMessage.text}</span>
          </div>
          {configCheck?.checkedAt && (
            <span className="text-[11px] opacity-75 font-mono hidden sm:inline">
              Checked: {new Date(configCheck.checkedAt).toLocaleTimeString('en-GB')}
            </span>
          )}
        </div>
      )}

      {/* Grid: Provider Configuration Status & Diagnostic Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Provider Status Card */}
        <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-sm text-slate-900">SMS Provider Status</h3>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              configCheck?.ready 
                ? 'bg-emerald-100 text-emerald-800' 
                : 'bg-amber-100 text-amber-800'
            }`}>
              {configCheck?.ready ? 'Active' : 'Unconfigured'}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            {/* Provider */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
              <span className="text-slate-500 font-medium">SMS Provider:</span>
              <span className="font-bold text-slate-900 font-mono">
                {configCheck?.provider || 'SMSLive247'}
              </span>
            </div>

            {/* Sender ID */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
              <span className="text-slate-500 font-medium">Sender ID:</span>
              <span className="font-bold text-slate-900 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                {configCheck?.senderId || 'FINGEROFGOD'}
              </span>
            </div>

            {/* API Key */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                API Key:
              </span>
              <span className="font-mono text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                ••••••••••••
              </span>
            </div>

            {/* Route / Channel */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
              <span className="text-slate-500 font-medium">Route / Channel:</span>
              <span className="font-semibold text-slate-700 capitalize">
                {configCheck?.channel || 'generic'} (DND Fallback)
              </span>
            </div>
          </div>

          {/* Configuration Verification Checklist */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Configuration Checklist
            </span>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-700">
                <span>SMS Provider</span>
                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Configured
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-700">
                <span>SMS API Key</span>
                <span className={`inline-flex items-center gap-1 font-semibold text-[11px] ${
                  configCheck?.checks.apiKeyPresent ? 'text-emerald-700' : 'text-amber-700'
                }`}>
                  {configCheck?.checks.apiKeyPresent ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> Present (Server-only)
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Missing
                    </>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-700">
                <span>Sender ID</span>
                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Configured
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-700">
                <span>SMS Channel</span>
                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Configured
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Test Form & Live Result Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-900">Send Single Test SMS</h3>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Diagnostic Dispatch
              </span>
            </div>

            {/* Validation warning */}
            {validationError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            <form onSubmit={handleSendTestSms} className="space-y-4">
              {/* Test Phone Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Test Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={testPhone}
                    onChange={(e) => {
                      setTestPhone(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    placeholder="08031234567"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Accepts Nigerian formats: <code className="font-mono text-slate-700">08031234567</code>, <code className="font-mono text-slate-700">+2348031234567</code>, or <code className="font-mono text-slate-700">2348031234567</code>. Normalized centrally by server.
                </p>
              </div>

              {/* Test Message */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Test SMS Message
                  </label>
                  <span className={`text-[11px] font-mono ${charCount > 160 ? 'text-amber-700 font-semibold' : 'text-slate-500'}`}>
                    {charCount} characters · {smsSegments} SMS {smsSegments > 1 ? 'pages' : 'page'}
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  maxLength={500}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all leading-relaxed"
                />
              </div>

              {/* Safeguard Notice */}
              <div className="p-3 bg-amber-50 border border-amber-200/70 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Single-Recipient Test Safeguard:</strong> This test form dispatches exclusively to the specific phone number entered above. No resident directory records or scheduled reminder cycles are triggered.
                </p>
              </div>

              {/* Submit Button */}
              <div className="pt-1 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={isSending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <Send className={`w-3.5 h-3.5 ${isSending ? 'animate-pulse' : ''}`} />
                  <span>{isSending ? 'Sending Test SMS...' : 'SEND TEST SMS'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Live Result Display Box */}
          {testResult && (
            <div
              className={`p-5 rounded-2xl border transition-all animate-in fade-in duration-300 ${
                testResult.status === 'ACCEPTED'
                  ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                  : 'bg-red-50/90 border-red-300 text-red-950'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border ${
                    testResult.status === 'ACCEPTED'
                      ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                      : 'bg-red-100 border-red-300 text-red-700'
                  }`}
                >
                  {testResult.status === 'ACCEPTED' ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5" />
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm tracking-tight">
                      {testResult.status === 'ACCEPTED' ? '✓ SMS Accepted' : '✕ SMS Failed'}
                    </h4>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        testResult.status === 'ACCEPTED'
                          ? 'bg-emerald-200 text-emerald-900'
                          : 'bg-red-200 text-red-900'
                      }`}
                    >
                      {testResult.deliveryLabel}
                    </span>
                  </div>

                  <p className="text-xs leading-relaxed">
                    {testResult.message}
                  </p>

                  {testResult.error && (
                    <p className="text-xs text-red-700 font-mono bg-red-100/80 p-2 rounded-lg border border-red-200">
                      Reason: {testResult.error}
                    </p>
                  )}

                  {/* Metadata fields */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-current/10 text-[11px] font-medium">
                    <div>
                      <span className="opacity-70 block">Recipient:</span>
                      <span className="font-mono font-bold">{testResult.recipientMasked}</span>
                    </div>
                    <div>
                      <span className="opacity-70 block">Sender ID:</span>
                      <span className="font-mono font-bold">{testResult.senderId}</span>
                    </div>
                    <div>
                      <span className="opacity-70 block">Provider:</span>
                      <span className="font-semibold">{testResult.provider}</span>
                    </div>
                    <div>
                      <span className="opacity-70 block">Message ID:</span>
                      <span className="font-mono truncate block" title={testResult.providerMessageId || 'N/A'}>
                        {testResult.providerMessageId || 'N/A'}
                      </span>
                    </div>
                  </div>

                  {testResult.status === 'ACCEPTED' && (
                    <p className="text-[10px] text-emerald-800/80 pt-1">
                      Note: <strong>Accepted by provider</strong> confirms the SMS gateway received and validated the transmission request. Handset delivery depends on recipient network status.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Test History Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-sm text-slate-900">
              Recent Test History (Last 20 Tests)
            </h3>
          </div>
          <button
            type="button"
            onClick={loadTestHistory}
            disabled={historyLoading}
            className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 font-medium cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Date / Time</th>
                <th className="py-3 px-4">Recipient</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Provider</th>
                <th className="py-3 px-4">Provider Msg ID</th>
                <th className="py-3 px-4">Message Preview</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {testHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    <MessageSquare className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-xs text-slate-600">No test SMS records yet</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Enter a test number above and click Send Test SMS to test provider delivery.
                    </p>
                  </td>
                </tr>
              ) : (
                testHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-900">
                        {new Date(item.created_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {new Date(item.created_at).toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                      {item.recipient_masked}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          item.status === 'ACCEPTED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {item.status === 'ACCEPTED' ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <AlertTriangle className="w-3 h-3 text-red-600" />
                        )}
                        {item.delivery_label || item.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-medium text-slate-700">
                      {item.provider}
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 max-w-[150px] truncate" title={item.provider_message_id || '—'}>
                      {item.provider_message_id || '—'}
                    </td>

                    <td className="py-3 px-4 text-slate-600 max-w-[240px] truncate" title={item.message_preview}>
                      {item.message_preview}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Outstanding Payment SMS Draft Generator & Review Area */}
      <OutstandingPaymentSMSSection onSmsSent={loadTestHistory} />
    </div>
  );
};
