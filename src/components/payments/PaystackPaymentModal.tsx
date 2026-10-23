import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  User, 
  Home, 
  Phone, 
  Mail, 
  Calendar, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  FileText, 
  ShieldCheck, 
  ArrowRight,
  RefreshCw,
  Lock
} from 'lucide-react';
import { Resident, EstateSettings, MonthlyPayment, Receipt } from '../../types/database';
import { dbService, residentSessionService } from '../../lib/supabase';
import { 
  initializePayment, 
  verifyPayment, 
  cancelPaymentOnServer,
  formatNaira, 
  loadPaystackInlineScript, 
  getPaystackConfig,
  getResidentPaymentStatus,
  getResidentAccessToken,
  PaystackConfig 
} from '../../lib/paystack';
import { PaystackTestModal } from './PaystackTestModal';
import { ReceiptModal } from './ReceiptModal';

interface PaystackPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedResident?: Resident | null;
  estateSettings?: EstateSettings;
  onPaymentSuccess?: () => void;
  targetMonth?: number; // Default: 10 (October)
  targetYear?: number; // Default: 2026
  initialDurationMonths?: 1 | 12;
}

type PaymentStep = 
  | 'input_resident'
  | 'verify_resident'
  | 'initializing'
  | 'verifying'
  | 'success'
  | 'failed';

export const PaystackPaymentModal: React.FC<PaystackPaymentModalProps> = ({
  isOpen,
  onClose,
  preselectedResident,
  estateSettings,
  onPaymentSuccess,
  targetMonth = 10,
  targetYear = 2026,
  initialDurationMonths = 1
}) => {
  const [step, setStep] = useState<PaymentStep>('input_resident');
  const [residentNumberInput, setResidentNumberInput] = useState('');
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [existingPayment, setExistingPayment] = useState<MonthlyPayment | null>(null);
  const [existingReceipt, setExistingReceipt] = useState<Receipt | null>(null);
  const [durationMonths, setDurationMonths] = useState<1 | 12>(initialDurationMonths === 12 ? 12 : 1);
  
  // Paystack transaction state
  const [paystackConfig, setPaystackConfig] = useState<PaystackConfig | null>(null);
  const [currentReference, setCurrentReference] = useState<string>('');
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Receipt view state
  const [verifiedReceipt, setVerifiedReceipt] = useState<Receipt | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const startMonthLabel = `${new Date(targetYear, targetMonth - 1).toLocaleString('default', { month: 'long' })} ${targetYear}`;
  const endDate = new Date(targetYear, targetMonth - 1 + 11, 1);
  const endMonthLabel = `${endDate.toLocaleString('default', { month: 'long' })} ${endDate.getFullYear()}`;
  const periodLabel = durationMonths === 12
    ? `${startMonthLabel} – ${endMonthLabel} (12 Months)`
    : `${startMonthLabel} (1 Month)`;
  const monthlyLevyRate = estateSettings?.monthly_security_levy || 1500;
  const levyAmount = monthlyLevyRate * durationMonths;

  // Initialize Paystack configuration on open
  useEffect(() => {
    if (isOpen) {
      setDurationMonths(initialDurationMonths === 12 ? 12 : 1);
      getPaystackConfig().then(cfg => setPaystackConfig(cfg));
      loadPaystackInlineScript();
    }
  }, [isOpen, initialDurationMonths]);

  // Handle preselected or active session resident
  useEffect(() => {
    const activeResident = preselectedResident || residentSessionService.getCurrentResident();
    if (isOpen && activeResident) {
      setResidentNumberInput(activeResident.resident_number);
      checkResidentAndLevy(activeResident.resident_number, activeResident);
    } else if (isOpen) {
      // Reset state for new lookup
      setStep('input_resident');
      setResidentNumberInput('');
      setSelectedResident(null);
      setExistingPayment(null);
      setExistingReceipt(null);
      setErrorMessage(null);
      setVerifiedReceipt(null);
    }
  }, [isOpen, preselectedResident]);

  if (!isOpen) return null;

  // STEP 1 & 2: Resident Lookup & Verification (Secure Server-Side & Authenticated)
  const checkResidentAndLevy = async (resNumber: string, passedResident?: Resident | null) => {
    const activeRes = passedResident || preselectedResident || residentSessionService.getCurrentResident();
    const formatted = resNumber.trim().padStart(3, '0');
    setLoading(true);
    setErrorMessage(null);

    try {
      // 1. If active resident is provided from authenticated session, use it as baseline
      if (activeRes && (activeRes.resident_number === formatted || activeRes.resident_number === resNumber.trim())) {
        setSelectedResident(activeRes);
      }

      // 2. Authoritative server check with authenticated resident token / session
      const statusRes = await getResidentPaymentStatus({
        residentNumber: formatted,
        periodMonth: targetMonth,
        periodYear: targetYear
      });

      if (statusRes.success && statusRes.resident) {
        setSelectedResident(statusRes.resident);
        setExistingPayment(statusRes.payment || null);
        setExistingReceipt(statusRes.receipt || null);

        if (!statusRes.resident.account_activated || statusRes.resident.account_status === 'NOT ACTIVATED') {
          setErrorMessage(
            `Resident #${statusRes.resident.resident_number} (${statusRes.resident.full_name}) has not been activated yet. Only activated residents can make security levy payments. Please activate your account first.`
          );
        }

        setStep('verify_resident');
        setLoading(false);
        return;
      }

      // 3. Fallback: if active resident matches, allow proceeding with active resident
      if (activeRes && (activeRes.resident_number === formatted || activeRes.resident_number === resNumber.trim())) {
        setSelectedResident(activeRes);
        if (!activeRes.account_activated || activeRes.account_status === 'NOT ACTIVATED') {
          setErrorMessage(
            `Resident #${activeRes.resident_number} (${activeRes.full_name}) has not been activated yet. Only activated residents can make security levy payments. Please activate your account first.`
          );
        }
        setStep('verify_resident');
        setLoading(false);
        return;
      }

      // 4. Fallback: check database via public lookup
      const pubLookup = await dbService.lookupResidentPublic(formatted);
      if (pubLookup.found && pubLookup.resident) {
        const foundResident = pubLookup.resident as Resident;
        setSelectedResident(foundResident);
        setExistingPayment(null);
        setExistingReceipt(null);
        if (!foundResident.account_activated || foundResident.account_status === 'NOT ACTIVATED') {
          setErrorMessage(
            `Resident #${foundResident.resident_number} (${foundResident.full_name}) has not been activated yet. Only activated residents can make security levy payments. Please activate your account first.`
          );
        }
        setStep('verify_resident');
        setLoading(false);
        return;
      }

      // 5. Resident truly not found
      const rawMsg = statusRes.message || pubLookup.message || '';
      const displayMsg = (rawMsg && !rawMsg.toLowerCase().includes('session') && !rawMsg.toLowerCase().includes('unauthorized') && !rawMsg.toLowerCase().includes('expired'))
        ? rawMsg
        : 'We could not find your estate resident account. Please check the resident number or contact the estate administrator.';
      setErrorMessage(displayMsg);
      setSelectedResident(null);
      setStep('input_resident');
    } catch (err: any) {
      if (activeRes && (activeRes.resident_number === formatted || activeRes.resident_number === resNumber.trim())) {
        setSelectedResident(activeRes);
        if (!activeRes.account_activated || activeRes.account_status === 'NOT ACTIVATED') {
          setErrorMessage(
            `Resident #${activeRes.resident_number} (${activeRes.full_name}) has not been activated yet. Only activated residents can make security levy payments. Please activate your account first.`
          );
        }
        setStep('verify_resident');
      } else {
        setErrorMessage(err.message || 'We could not find your estate resident account. Please contact the estate administrator.');
        setSelectedResident(null);
        setStep('input_resident');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!residentNumberInput.trim()) return;
    checkResidentAndLevy(residentNumberInput);
  };

  // STEP 3 & 4: Initialize Payment with Server & Open Paystack
  const handleProceedToPayment = async () => {
    if (!selectedResident) return;

    if (!selectedResident.account_activated || selectedResident.account_status === 'NOT ACTIVATED') {
      setErrorMessage(`Resident #${selectedResident.resident_number} account is not yet activated. You must activate your resident account before paying monthly security levies.`);
      return;
    }

    if (selectedResident.status !== 'Active') {
      setErrorMessage('Resident is inactive. Only active residents can pay security levies.');
      return;
    }

    if (existingPayment && existingPayment.status.toUpperCase() === 'PAID' && durationMonths === 1) {
      setErrorMessage('Your security levy for this month has already been paid.');
      return;
    }

    setStep('initializing');
    setErrorMessage(null);

    try {
      const initResult = await initializePayment({
        residentNumber: selectedResident.resident_number,
        periodMonth: targetMonth,
        periodYear: targetYear,
        durationMonths: durationMonths,
        email: selectedResident.email || undefined
      });

      if (!initResult.success) {
        throw new Error(initResult.message || 'Payment initialization failed.');
      }

      const ref = initResult.reference;
      setCurrentReference(ref);

      // If real Paystack public key is configured and PaystackPop is available
      if (paystackConfig?.isConfigured && paystackConfig.publicKey && (window as any).PaystackPop && initResult.access_code) {
        const handler = (window as any).PaystackPop.setup({
          key: paystackConfig.publicKey,
          email: selectedResident.email || `resident.${selectedResident.resident_number}@fingerofgodestate.ng`,
          amount: levyAmount * 100, // in kobo
          currency: 'NGN',
          ref: ref,
          metadata: {
            resident_number: selectedResident.resident_number,
            resident_name: selectedResident.full_name,
            house_number: selectedResident.house_number,
            duration_months: durationMonths,
            period_label: periodLabel
          },
          callback: (response: any) => {
            // Trigger server-side verification with reference
            handleTriggerServerVerification(response.reference || ref);
          },
          onClose: () => {
            if (ref) {
              cancelPaymentOnServer(ref, 'CANCELLED', 'Payment cancelled by user in checkout modal.');
            }
            setStep('verify_resident');
            setErrorMessage('Payment cancelled. Transaction was not completed.');
          }
        });
        handler.openIframe();
      } else {
        // OPEN TEST MODE / SANDBOX MODAL
        setIsTestModalOpen(true);
      }
    } catch (err: any) {
      const msg = err.message || '';
      setErrorMessage(msg || 'Payment initialization failed.');
      setStep('verify_resident');
    }
  };

  // STEP 5, 6, 7: Server-side Verification & Confirmation
  const handleTriggerServerVerification = async (reference: string) => {
    setIsTestModalOpen(false);
    setStep('verifying');
    setErrorMessage(null);

    try {
      const verifyRes = await verifyPayment(reference);

      if (verifyRes.success && verifyRes.verified) {
        // Sync locally and update records
        if (verifyRes.payment && verifyRes.transaction && verifyRes.receipt) {
          await dbService.confirmVerifiedPayment({
            payment: verifyRes.payment,
            payments: verifyRes.payments,
            transaction: verifyRes.transaction,
            receipt: verifyRes.receipt
          });
        }

        setVerifiedReceipt(verifyRes.receipt);
        setStep('success');

        if (onPaymentSuccess) {
          onPaymentSuccess();
        }
      } else {
        setStep('failed');
        setErrorMessage(
          verifyRes.message || 
          'We could not confirm this payment yet. Please do not make another payment until the transaction has been checked.'
        );
      }
    } catch (err: any) {
      setStep('failed');
      setErrorMessage('Server error verifying Paystack transaction. Please contact estate security administrator.');
    }
  };

  const handleTestPaymentFailed = (reason: string) => {
    if (currentReference) {
      const isCancelled = reason.toLowerCase().includes('cancel');
      cancelPaymentOnServer(currentReference, isCancelled ? 'CANCELLED' : 'FAILED', reason);
    }
    setIsTestModalOpen(false);
    setStep('failed');
    setErrorMessage(reason);
  };

  const handleViewReceipt = () => {
    if (verifiedReceipt || existingReceipt) {
      setIsReceiptModalOpen(true);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
        <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[calc(100dvh-2rem)] flex flex-col">
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-display">Pay Security Levy</h3>
                <p className="text-[11px] text-slate-400">Finger of God Estate Security Management</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                {paystackConfig?.mode === 'live' ? 'Paystack Live' : 'Paystack Test'}
              </span>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6 overflow-y-auto flex-1">

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-xs text-rose-900 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold block">Payment Notice</span>
                  <p>{errorMessage}</p>
                </div>
              </div>
            )}

            {/* STEP 1: Resident Number Input */}
            {step === 'input_resident' && (
              <form onSubmit={handleLookupSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                    Enter Resident Number
                  </label>
                  <p className="text-xs text-slate-500">
                    Provide the 3-digit estate resident identifier (e.g. 001, 002, 010) to verify your account.
                  </p>
                  <div className="relative mt-2">
                    <input
                      type="text"
                      value={residentNumberInput}
                      onChange={(e) => setResidentNumberInput(e.target.value)}
                      placeholder="e.g. 001"
                      maxLength={10}
                      autoFocus
                      className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 text-base font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none uppercase placeholder:normal-case"
                    />
                    <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !residentNumberInput.trim()}
                  className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Resident...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify Resident Profile</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* STEP 2: Resident Verification & Current Levy */}
            {step === 'verify_resident' && selectedResident && (
              <div className="space-y-5">
                
                {/* Resident Profile Summary Card */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold bg-slate-900 text-white px-2 py-0.5 rounded">
                        #{selectedResident.resident_number}
                      </span>
                      <span className="text-xs font-bold text-slate-900">{selectedResident.full_name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        selectedResident.account_activated && selectedResident.account_status !== 'NOT ACTIVATED'
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {selectedResident.account_activated && selectedResident.account_status !== 'NOT ACTIVATED' ? 'Activated' : 'Not Activated'}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        selectedResident.status === 'Active' 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}>
                        {selectedResident.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5 truncate">
                      <Home className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{selectedResident.house_number}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{selectedResident.phone_number}</span>
                    </div>
                  </div>
                </div>

                {/* Account Not Activated Alert */}
                {(!selectedResident.account_activated || selectedResident.account_status === 'NOT ACTIVATED') && (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/90 text-amber-900 space-y-1.5">
                    <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-amber-800">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Account Not Activated</span>
                    </div>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      Resident #{selectedResident.resident_number} ({selectedResident.full_name}) has not completed account activation. Security levy payments cannot be made until this resident ID has been activated.
                    </p>
                  </div>
                )}

                {/* PAYMENT DURATION SELECTOR: 1 MONTH OR 12 MONTHS ONLY */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    Select Security Levy Payment Option
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setDurationMonths(1);
                        setErrorMessage(null);
                      }}
                      className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                        durationMonths === 1
                          ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 shadow-xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold uppercase tracking-wide">1 Month</span>
                        {durationMonths === 1 && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                      </div>
                      <div className="text-base font-black font-display mt-1 text-slate-900">
                        {formatNaira(monthlyLevyRate)}
                      </div>
                      <span className="text-[10px] text-slate-500 block">Monthly Security Levy</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDurationMonths(12);
                        setErrorMessage(null);
                      }}
                      className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                        durationMonths === 12
                          ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 shadow-xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold uppercase tracking-wide">12 Months</span>
                        {durationMonths === 12 && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                      </div>
                      <div className="text-base font-black font-display mt-1 text-slate-900">
                        {formatNaira(monthlyLevyRate * 12)}
                      </div>
                      <span className="text-[10px] text-slate-500 block">1 Year (12 × {formatNaira(monthlyLevyRate)})</span>
                    </button>
                  </div>
                </div>

                {/* ALREADY PAID STATE (for 1-month selection if already paid) */}
                {existingPayment && existingPayment.status.toUpperCase() === 'PAID' && durationMonths === 1 ? (
                  <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-4">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                      <div>
                        <h4 className="text-sm font-bold text-emerald-950">Security Levy Already Paid</h4>
                        <p className="text-xs text-emerald-800">
                          Your security levy for this month has already been paid.
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-white/80 rounded-xl border border-emerald-200/60 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Amount Paid:</span>
                        <span className="font-bold text-slate-900">{formatNaira(existingPayment.amount_paid || 1500)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Payment Date:</span>
                        <span className="font-semibold text-slate-800">
                          {existingPayment.paid_at ? new Date(existingPayment.paid_at).toLocaleDateString('en-NG') : 'Confirmed'}
                        </span>
                      </div>
                      {existingPayment.paystack_reference && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Reference:</span>
                          <span className="font-mono text-[11px] text-slate-700">{existingPayment.paystack_reference}</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleViewReceipt}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>View Official Receipt</span>
                    </button>
                  </div>
                ) : (
                  /* UNPAID / READY TO PROCEED */
                  <div className="space-y-4">
                    {/* Current Levy Box */}
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-900 to-slate-900 text-white space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-emerald-300 font-bold uppercase tracking-wider">
                          {durationMonths === 12 ? '12 Months Security Levy' : '1 Month Security Levy'}
                        </span>
                        <span className="font-semibold bg-white/10 px-2 py-0.5 rounded">
                          {periodLabel}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between pt-1">
                        <span className="text-3xl font-black font-display tracking-tight">
                          {formatNaira(levyAmount)}
                        </span>
                        <span className="text-xs text-slate-300 font-medium">
                          {durationMonths === 12 ? `12 × ${formatNaira(monthlyLevyRate)}` : '1 Month'} • NGN
                        </span>
                      </div>
                    </div>

                    {/* Pay with Paystack Button */}
                    <button
                      onClick={handleProceedToPayment}
                      disabled={
                        selectedResident.status !== 'Active' || 
                        !selectedResident.account_activated || 
                        selectedResident.account_status === 'NOT ACTIVATED'
                      }
                      className="w-full py-4 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-md cursor-pointer"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Proceed to Pay {durationMonths === 12 ? '12 Months' : '1 Month'} ({formatNaira(levyAmount)})</span>
                    </button>

                    {(!selectedResident.account_activated || selectedResident.account_status === 'NOT ACTIVATED') ? (
                      <p className="text-center text-xs font-semibold text-rose-600">
                        Payment blocked: Resident #{selectedResident.resident_number} must be activated before making security levy payments.
                      </p>
                    ) : (
                      <div className="flex items-center justify-center gap-2 text-center text-[11px] text-slate-400">
                        <Lock className="w-3 h-3 text-slate-400" />
                        <span>Secure payment handled directly via Paystack gateway</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Change resident option */}
                {!preselectedResident && (
                  <button
                    onClick={() => {
                      setStep('input_resident');
                      setResidentNumberInput('');
                    }}
                    className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    ← Check a different resident number
                  </button>
                )}
              </div>
            )}

            {/* STEP 3 & 4: Initializing */}
            {step === 'initializing' && (
              <div className="py-12 text-center space-y-4">
                <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900">Preparing Secure Paystack Checkout</h4>
                  <p className="text-xs text-slate-500">Determining official levy amount and generating transaction reference...</p>
                </div>
              </div>
            )}

            {/* STEP 5: Server-side Verification in progress */}
            {step === 'verifying' && (
              <div className="py-12 text-center space-y-4">
                <RefreshCw className="w-10 h-10 text-[#0ba4db] animate-spin mx-auto" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900">Verifying Payment Server-Side</h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Contacting Paystack directly with server key to verify amount ({formatNaira(levyAmount)}), currency, and transaction status...
                  </p>
                </div>
              </div>
            )}

            {/* STEP 6: Payment Successful */}
            {step === 'success' && verifiedReceipt && (
              <div className="space-y-5 animate-in fade-in zoom-in-95">
                <div className="text-center py-4 space-y-2">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight font-display">
                    PAYMENT SUCCESSFUL
                  </h3>
                  <p className="text-xs text-slate-600 max-w-sm mx-auto">
                    Your monthly estate security levy has been securely verified and confirmed.
                  </p>
                </div>

                {/* Verified Details */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2.5">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                    <span className="text-slate-500">Resident:</span>
                    <span className="font-bold text-slate-900">
                      #{verifiedReceipt.resident_number} • {verifiedReceipt.resident_name}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Payment Month:</span>
                    <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                      {verifiedReceipt.period_covered}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Amount Paid:</span>
                    <span className="font-black text-slate-900">{formatNaira(verifiedReceipt.amount_paid)}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Payment Date:</span>
                    <span className="font-medium text-slate-700">
                      {new Date(verifiedReceipt.payment_date).toLocaleDateString('en-NG')}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Transaction Reference:</span>
                    <span className="font-mono text-[11px] text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {verifiedReceipt.paystack_reference}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <span className="text-slate-500">Payment Status:</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase tracking-wider">
                      PAID
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <button
                    onClick={handleViewReceipt}
                    className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <FileText className="w-4 h-4" />
                    <span>VIEW RECEIPT</span>
                  </button>
                  <button
                    onClick={onClose}
                    className="py-3 px-4 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* STEP 7: Payment Failed or Cancelled */}
            {step === 'failed' && (
              <div className="py-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900">Payment Verification Incomplete</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    The payment was not marked as PAID. If debited, please wait a moment or contact the estate administrator.
                  </p>
                </div>
                <div className="pt-2 flex justify-center gap-3">
                  <button
                    onClick={() => setStep('verify_resident')}
                    className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Paystack Test Checkout Modal Simulator */}
      {selectedResident && (
        <PaystackTestModal
          isOpen={isTestModalOpen}
          onClose={() => {
            if (currentReference) {
              cancelPaymentOnServer(currentReference, 'CANCELLED', 'Payment cancelled by user.');
            }
            setIsTestModalOpen(false);
            setStep('verify_resident');
            setErrorMessage('Payment cancelled by user.');
          }}
          reference={currentReference}
          amount={levyAmount}
          customerEmail={selectedResident.email || `resident.${selectedResident.resident_number}@fingerofgodestate.ng`}
          residentName={selectedResident.full_name}
          residentNumber={selectedResident.resident_number}
          periodLabel={periodLabel}
          onPaymentComplete={(ref) => handleTriggerServerVerification(ref)}
          onPaymentFailed={(reason) => handleTestPaymentFailed(reason)}
        />
      )}

      {/* Official Receipt Modal */}
      <ReceiptModal
        receipt={verifiedReceipt || existingReceipt}
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        estateSettings={estateSettings}
      />
    </>
  );
};
