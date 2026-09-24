import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Calendar, 
  User, 
  Hash, 
  CreditCard, 
  Building2, 
  Printer, 
  ExternalLink,
  ArrowRight,
  Clock,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { dbService } from '../../lib/supabase';
import { PublicReceiptVerification } from '../../types/database';
import { formatNaira } from '../../lib/paystack';

interface ReceiptVerificationViewProps {
  initialReceiptNumber?: string;
  onNavigateToPortal?: () => void;
  onNavigateToAdmin?: () => void;
}

export const ReceiptVerificationView: React.FC<ReceiptVerificationViewProps> = ({
  initialReceiptNumber = '',
  onNavigateToPortal,
  onNavigateToAdmin
}) => {
  const [receiptNumber, setReceiptNumber] = useState(initialReceiptNumber);
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<PublicReceiptVerification | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (initialReceiptNumber) {
      setReceiptNumber(initialReceiptNumber);
      handleVerify(initialReceiptNumber);
    }
  }, [initialReceiptNumber]);

  const handleVerify = async (queryNum?: string) => {
    const numToVerify = (queryNum || receiptNumber).trim();
    if (!numToVerify) return;

    setIsVerifying(true);
    setHasSearched(true);
    try {
      const res = await dbService.verifyReceiptPublic(numToVerify);
      setResult(res);
    } catch (err) {
      setResult({
        valid: false,
        status: 'INVALID',
        message: 'An error occurred while connecting to the verification server.'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleQuickFill = (num: string) => {
    setReceiptNumber(num);
    handleVerify(num);
  };

  return (
    <div className="min-h-[85vh] py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">
      {/* Top Banner & Title */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-emerald-700 text-white shadow-lg mb-1">
          <ShieldCheck className="w-10 h-10" />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Official Estate Security Ledger</p>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
            Receipt Verification Portal
          </h1>
          <p className="text-sm text-slate-600 max-w-lg mx-auto">
            Verify the authenticity of Finger of God Estate monthly security levy payment receipts. Enter the unique official receipt number below.
          </p>
        </div>
      </div>

      {/* Verification Input Box */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl p-6 sm:p-8 space-y-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleVerify();
          }}
          className="space-y-4"
        >
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            Digital Receipt Number or Paystack Reference
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                placeholder="e.g. FOGES-REC-202610-001-A7C8E9"
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-300 rounded-2xl font-mono text-sm sm:text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 uppercase tracking-wider"
              />
            </div>
            <button
              type="submit"
              disabled={isVerifying || !receiptNumber.trim()}
              className="px-6 py-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-bold text-sm tracking-wide transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed shrink-0"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>VERIFY RECEIPT</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Quick Testing Chips */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Quick Test Sample:</span>
          <button
            type="button"
            onClick={() => handleQuickFill('FOGES-REC-202610-001-A7C8E9')}
            className="px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono font-semibold hover:bg-emerald-100 transition-colors cursor-pointer"
          >
            FOGES-REC-202610-001-A7C8E9 (Valid)
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('FOGES-REC-999999-FAKE')}
            className="px-3 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-mono font-semibold hover:bg-rose-100 transition-colors cursor-pointer"
          >
            FOGES-REC-999999-FAKE (Invalid)
          </button>
        </div>
      </div>

      {/* Verification Result Display */}
      {hasSearched && result && (
        <div className="animate-in fade-in slide-in-from-bottom-3 duration-300">
          {result.valid && result.receipt ? (
            /* VALID RECEIPT CARD */
            <div className="bg-white rounded-3xl border-2 border-emerald-500 shadow-2xl overflow-hidden">
              {/* Header Badge */}
              <div className="bg-emerald-700 text-white px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-white/20">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider bg-white text-emerald-900 px-2.5 py-0.5 rounded-full">
                        VALID RECEIPT
                      </span>
                      <span className="text-xs text-emerald-100">Live Database Match</span>
                    </div>
                    <p className="text-sm font-semibold text-white mt-0.5">
                      Authentic Security Levy Payment
                    </p>
                  </div>
                </div>
                <div className="text-right font-mono text-xs text-emerald-100">
                  {new Date().toLocaleDateString('en-NG', { dateStyle: 'medium' })}
                </div>
              </div>

              {/* Receipt Details Grid */}
              <div className="p-6 sm:p-8 space-y-6">
                <div className="text-center pb-4 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Finger of God Estate Security Management
                  </p>
                  <p className="text-lg font-black text-slate-900 font-display mt-0.5">
                    Official Security Levy Clearance Pass
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                      Receipt Number
                    </span>
                    <span className="font-mono text-base font-bold text-slate-900 break-all">
                      {result.receipt.receipt_number}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                      Receipt Status
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700 text-sm mt-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{result.receipt.status} (CONFIRMED)</span>
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                      Resident Number
                    </span>
                    <span className="font-mono text-base font-bold text-slate-900">
                      #{result.receipt.resident_number}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                      Resident Name
                    </span>
                    <span className="font-semibold text-slate-900 text-sm">
                      {result.receipt.resident_name}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block">
                      Payment Month
                    </span>
                    <span className="font-bold text-emerald-950 text-base">
                      {result.receipt.period_covered}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-900 text-white">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 block">
                      Amount Verified
                    </span>
                    <span className="font-black text-xl sm:text-2xl font-display">
                      {formatNaira(result.receipt.amount_paid || 5000)}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                      Payment Date
                    </span>
                    <span className="font-semibold text-slate-800 text-sm">
                      {new Date(result.receipt.payment_date).toLocaleDateString('en-NG', {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                      Payment Gateway & Ref
                    </span>
                    <span className="font-mono text-xs font-semibold text-slate-700 break-all block mt-0.5">
                      {result.receipt.payment_gateway} • {result.receipt.paystack_reference}
                    </span>
                  </div>
                </div>

                {/* Privacy & Estate Seal Notice */}
                <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
                    <span>Resident personal identity details are protected per Estate Privacy Guidelines.</span>
                  </div>
                  <span className="font-mono font-bold text-slate-500">Official Pass</span>
                </div>
              </div>
            </div>
          ) : (
            /* INVALID RECEIPT CARD */
            <div className="bg-white rounded-3xl border-2 border-rose-300 shadow-xl overflow-hidden">
              <div className="bg-rose-700 text-white px-6 py-4 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/20">
                  <XCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <span className="text-xs font-black uppercase tracking-wider bg-white text-rose-900 px-2.5 py-0.5 rounded-full">
                    RECEIPT NOT VERIFIED
                  </span>
                  <p className="text-sm font-semibold text-white mt-0.5">
                    No matching official estate payment record found.
                  </p>
                </div>
              </div>

              <div className="p-6 sm:p-8 space-y-4">
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-sm">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Verification Failed</p>
                      <p className="text-xs text-rose-800 mt-1">
                        The receipt number <span className="font-mono font-bold">"{receiptNumber}"</span> was not found as a verified payment in Finger of God Estate Security Management records.
                      </p>
                      <ul className="list-disc pl-5 mt-2 text-xs space-y-1 text-rose-800">
                        <li>Ensure the receipt number was typed correctly without typos.</li>
                        <li>Receipt numbers follow the official format: <span className="font-mono">FOGES-REC-YYYYMM-RESIDENTNUM-HEX</span>.</li>
                        <li>Payments in "Pending" or "Failed" state do not generate valid digital receipts.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => {
                      setReceiptNumber('');
                      setResult(null);
                      setHasSearched(false);
                    }}
                    className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Clear & Search Again
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation Quick Links */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 text-xs text-slate-600">
        <div>
          Finger of God Estate Security Management • Official Verification Service
        </div>
        <div className="flex items-center gap-3">
          {onNavigateToPortal && (
            <button
              onClick={onNavigateToPortal}
              className="text-emerald-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Resident Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
          {onNavigateToAdmin && (
            <button
              onClick={onNavigateToAdmin}
              className="text-slate-600 font-semibold hover:text-slate-900 cursor-pointer"
            >
              Security Admin Login
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
