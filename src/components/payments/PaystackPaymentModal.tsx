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
import { dbService } from '../../lib/supabase';
import { 
  initializePayment, 
  verifyPayment, 
  formatNaira, 
  loadPaystackInlineScript, 
  getPaystackConfig,
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
  targetYear = 2026
}) => {
  const [step, setStep] = useState<PaymentStep>('input_resident');
  const [residentNumberInput, setResidentNumberInput] = useState('');
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [existingPayment, setExistingPayment] = useState<MonthlyPayment | null>(null);
  const [existingReceipt, setExistingReceipt] = useState<Receipt | null>(null);
  
  // Paystack transaction state
  const [paystackConfig, setPaystackConfig] = useState<PaystackConfig | null>(null);
  const [currentReference, setCurrentReference] = useState<string>('');
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Receipt view state
  const [verifiedReceipt, setVerifiedReceipt] = useState<Receipt | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const periodLabel = `${new Date(targetYear, targetMonth - 1).toLocaleString('default', { month: 'long' })} ${targetYear}`;
  const levyAmount = estateSettings?.monthly_security_levy || 5000;

  // Initialize Paystack configuration on open
  useEffect(() => {
    if (isOpen) {
      getPaystackConfig().then(cfg => setPaystackConfig(cfg));
      loadPaystackInlineScript();
    }
  }, [isOpen]);

  // Handle preselected resident
  useEffect(() => {
    if (isOpen && preselectedResident) {
      setResidentNumberInput(preselectedResident.resident_number);
      checkResidentAndLevy(preselectedResident.resident_number);
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

  // STEP 1 & 2: Resident Lookup & Verification
  const checkResidentAndLevy = async (resNumber: string) => {
    const formatted = resNumber.trim().padStart(3, '0');
    setLoading(true);
    setErrorMessage(null);

    try {
      const residents = await dbService.getResidents();
      const resident = residents.find(r => r.resident_number === formatted || r.resident_number === resNumber.trim());

      if (!resident) {
        setErrorMessage(`Resident number "${resNumber}" not found in estate directory.`);
        setSelectedResident(null);
        setStep('input_resident');
        setLoading(false);
        return;
      }

      setSelectedResident(resident);

      // Check current levy status for target month & year
      const payment = await dbService.getMonthlyPaymentForResident(resident.resident_number, targetMonth, targetYear);
      setExistingPayment(payment);

      if (payment && payment.status.toUpperCase() === 'PAID') {
        // Fetch receipt if already paid
        if (payment.paystack_reference) {
          const rcp = await dbService.getReceiptByReference(payment.paystack_reference);
          setExistingReceipt(rcp);
        }
      }

      setStep('verify_resident');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error checking resident information.');
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

    if (selectedResident.status !== 'Active') {
      setErrorMessage('Resident is inactive. Only active residents can pay monthly security levies.');
      return;
    }

    if (existingPayment && existingPayment.status.toUpperCase() === 'PAID') {
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
          amount: 500000, // ₦5,000 in kobo
          currency: 'NGN',
          ref: ref,
          metadata: {
            resident_number: selectedResident.resident_number,
            resident_name: selectedResident.full_name,
            house_number: selectedResident.house_number,
            period_label: periodLabel
          },
          callback: (response: any) => {
            // Trigger server-side verification with reference
            handleTriggerServerVerification(response.reference || ref);
          },
          onClose: () => {
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
      setErrorMessage(err.message || 'Payment initialization failed.');
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
        <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-4">
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
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

          <div className="p-6 space-y-6">

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
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      selectedResident.status === 'Active' 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}>
                      {selectedResident.status}
                    </span>
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

                {/* ALREADY PAID STATE */}
                {existingPayment && existingPayment.status.toUpperCase() === 'PAID' ? (
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
                        <span className="font-bold text-slate-900">{formatNaira(existingPayment.amount_paid || 5000)}</span>
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
                        <span className="text-emerald-300 font-bold uppercase tracking-wider">Current Security Levy</span>
                        <span className="font-semibold bg-white/10 px-2 py-0.5 rounded">
                          {periodLabel}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between pt-1">
                        <span className="text-3xl font-black font-display tracking-tight">
                          {formatNaira(levyAmount)}
                        </span>
                        <span className="text-xs text-slate-300 font-medium">Monthly Levy • NGN</span>
                      </div>
                    </div>

                    {/* Pay with Paystack Button */}
                    <button
                      onClick={handleProceedToPayment}
                      disabled={selectedResident.status !== 'Active'}
                      className="w-full py-4 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-md cursor-pointer"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Proceed to Payment ({formatNaira(levyAmount)})</span>
                    </button>

                    <div className="flex items-center justify-center gap-2 text-center text-[11px] text-slate-400">
                      <Lock className="w-3 h-3 text-slate-400" />
                      <span>Secure payment handled directly via Paystack gateway</span>
                    </div>
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
                    Contacting Paystack directly with server key to verify amount (₦5,000), currency, and transaction status...
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
