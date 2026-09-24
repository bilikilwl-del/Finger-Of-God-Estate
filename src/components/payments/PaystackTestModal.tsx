import React, { useState } from 'react';
import { 
  X, 
  CreditCard, 
  ShieldCheck, 
  Building2, 
  Smartphone, 
  Lock, 
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { formatNaira } from '../../lib/paystack';

interface PaystackTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  reference: string;
  amount: number; // in Naira (5000)
  customerEmail: string;
  residentName: string;
  residentNumber: string;
  periodLabel: string;
  onPaymentComplete: (reference: string) => void;
  onPaymentFailed: (reason: string) => void;
}

export const PaystackTestModal: React.FC<PaystackTestModalProps> = ({
  isOpen,
  onClose,
  reference,
  amount,
  customerEmail,
  residentName,
  residentNumber,
  periodLabel,
  onPaymentComplete,
  onPaymentFailed
}) => {
  const [channel, setChannel] = useState<'card' | 'bank' | 'ussd'>('card');
  const [cardNumber, setCardNumber] = useState('4084 0840 8408 4084');
  const [expiry, setExpiry] = useState('12/28');
  const [cvv, setCvv] = useState('408');
  const [pin, setPin] = useState('1234');
  const [isProcessing, setIsProcessing] = useState(false);
  const [testOutcome, setTestOutcome] = useState<'success' | 'failure'>('success');

  if (!isOpen) return null;

  const handleSimulatePayment = () => {
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      if (testOutcome === 'success') {
        onPaymentComplete(reference);
      } else {
        onPaymentFailed('Payment declined: Simulated card failure / insufficient funds.');
      }
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Paystack Test Header */}
        <div className="bg-[#0ba4db] p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-black text-sm tracking-wider">
              P
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black tracking-wide font-display">Paystack</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 uppercase tracking-widest">
                  TEST MODE
                </span>
              </div>
              <p className="text-[11px] text-white/80">{customerEmail}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Cancel payment"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Amount & Purpose Banner */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Security Levy</span>
            <span className="text-xs font-semibold text-slate-800">
              Resident #{residentNumber} • {periodLabel}
            </span>
          </div>
          <div className="text-right">
            <span className="text-xl font-black font-display text-slate-900">
              {formatNaira(amount)}
            </span>
          </div>
        </div>

        {/* Payment Channels Selector */}
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl text-xs font-bold">
            <button
              onClick={() => setChannel('card')}
              className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                channel === 'card' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Card</span>
            </button>
            <button
              onClick={() => setChannel('bank')}
              className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                channel === 'bank' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Bank</span>
            </button>
            <button
              onClick={() => setChannel('ussd')}
              className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                channel === 'ussd' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>USSD</span>
            </button>
          </div>

          {channel === 'card' && (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Card Number (Paystack Test Card)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-medium focus:ring-2 focus:ring-[#0ba4db] focus:border-transparent outline-none"
                    placeholder="4084 0840 8408 4084"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                    TEST
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    Valid Till
                  </label>
                  <input
                    type="text"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-medium focus:ring-2 focus:ring-[#0ba4db] outline-none"
                    placeholder="MM/YY"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    CVV
                  </label>
                  <input
                    type="text"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-medium focus:ring-2 focus:ring-[#0ba4db] outline-none"
                    placeholder="408"
                  />
                </div>
              </div>
            </div>
          )}

          {channel === 'bank' && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
              <span className="text-xs font-bold text-slate-800 block">Paystack Test Bank Transfer</span>
              <p className="text-xs text-slate-600">
                Transfer ₦5,000 to Paystack Test Account: <span className="font-mono font-bold">0123456789 (Wema Bank)</span>
              </p>
            </div>
          )}

          {channel === 'ussd' && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
              <span className="text-xs font-bold text-slate-800 block">Paystack USSD Simulator</span>
              <p className="text-xs font-mono font-bold text-slate-900 bg-white p-2 rounded-lg border border-slate-200">
                *737*000*5000#
              </p>
            </div>
          )}

          {/* Test Outcome Selector (For verifying successful vs failed transactions) */}
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 block flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
              <span>Simulate Paystack Test Gateway Outcome</span>
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => setTestOutcome('success')}
                className={`py-1.5 px-2 rounded-lg border transition-all cursor-pointer ${
                  testOutcome === 'success'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Simulate Success
              </button>
              <button
                type="button"
                onClick={() => setTestOutcome('failure')}
                className={`py-1.5 px-2 rounded-lg border transition-all cursor-pointer ${
                  testOutcome === 'failure'
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Simulate Failure
              </button>
            </div>
          </div>

          {/* Action button */}
          <button
            onClick={handleSimulatePayment}
            disabled={isProcessing}
            className={`w-full py-3.5 px-4 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
              testOutcome === 'success' ? 'bg-[#0ba4db] hover:bg-[#0993c5]' : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing with Paystack...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>
                  {testOutcome === 'success' ? `Pay ${formatNaira(amount)}` : 'Simulate Failed Transaction'}
                </span>
              </>
            )}
          </button>

          {/* Security footnote */}
          <div className="text-center">
            <span className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>Secured by Paystack • PCI-DSS Level 1 Certified</span>
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
