import React, { useRef } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  ShieldCheck, 
  CheckCircle2, 
  Calendar, 
  User, 
  Home, 
  Hash, 
  CreditCard,
  Building2,
  FileCheck
} from 'lucide-react';
import { Receipt, EstateSettings } from '../../types/database';
import { formatNaira } from '../../lib/paystack';

interface ReceiptModalProps {
  receipt: Receipt | null;
  isOpen: boolean;
  onClose: () => void;
  estateSettings?: EstateSettings;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  receipt,
  isOpen,
  onClose,
  estateSettings
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = receipt.payment_date 
    ? new Date(receipt.payment_date).toLocaleString('en-NG', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : new Date().toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-4 print:shadow-none print:border-none print:m-0 print:rounded-none">
        
        {/* Modal Top Bar (Hidden during printing) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Official Payment Receipt</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700 cursor-pointer"
              title="Print Receipt"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span>Print</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer"
              title="Download Receipt"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-2 cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div ref={printRef} className="p-6 sm:p-10 space-y-8 bg-white print:p-8">
          
          {/* Official Estate Header */}
          <div className="text-center pb-6 border-b-2 border-slate-900/10 space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-600 text-white shadow-md mb-2">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h1 className="text-lg sm:text-2xl font-black tracking-tight text-slate-900 uppercase font-display">
              {estateSettings?.estate_name || 'FINGER OF GOD ESTATE SECURITY MANAGEMENT'}
            </h1>
            <p className="text-xs sm:text-sm font-medium text-slate-600 max-w-md mx-auto">
              {estateSettings?.estate_address || 'Phase 1, Security Gate Boulevard, Eti-Osa, Lagos'}
            </p>
            <div className="pt-2">
              <span className="inline-block px-4 py-1 rounded-full bg-slate-900 text-white text-xs font-black tracking-widest uppercase">
                SECURITY LEVY PAYMENT RECEIPT
              </span>
            </div>
          </div>

          {/* Receipt Number & Date Banner */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Receipt Number</span>
              <span className="font-mono text-sm sm:text-base font-bold text-slate-900">{receipt.receipt_number}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Payment Date</span>
              <span className="text-xs sm:text-sm font-semibold text-slate-900">{formattedDate}</span>
            </div>
          </div>

          {/* Key Details Matrix */}
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
            <div className="flex justify-between items-center px-4 py-3.5 bg-white text-xs sm:text-sm">
              <span className="text-slate-500 font-medium flex items-center gap-2">
                <Hash className="w-4 h-4 text-slate-400" />
                <span>Resident Number:</span>
              </span>
              <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-md">
                {receipt.resident_number}
              </span>
            </div>

            <div className="flex justify-between items-center px-4 py-3.5 bg-slate-50/50 text-xs sm:text-sm">
              <span className="text-slate-500 font-medium flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                <span>Resident Name:</span>
              </span>
              <span className="font-bold text-slate-900">{receipt.resident_name}</span>
            </div>

            <div className="flex justify-between items-center px-4 py-3.5 bg-white text-xs sm:text-sm">
              <span className="text-slate-500 font-medium flex items-center gap-2">
                <Home className="w-4 h-4 text-slate-400" />
                <span>House / Plot:</span>
              </span>
              <span className="font-semibold text-slate-800">{receipt.house_number}</span>
            </div>

            <div className="flex justify-between items-center px-4 py-3.5 bg-slate-50/50 text-xs sm:text-sm">
              <span className="text-slate-500 font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>Payment Month:</span>
              </span>
              <span className="font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                {receipt.period_covered}
              </span>
            </div>

            <div className="flex justify-between items-center px-4 py-3.5 bg-white text-xs sm:text-sm">
              <span className="text-slate-500 font-medium flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-slate-400" />
                <span>Payment Reference:</span>
              </span>
              <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                {receipt.paystack_reference}
              </span>
            </div>

            <div className="flex justify-between items-center px-4 py-3.5 bg-slate-50/50 text-xs sm:text-sm">
              <span className="text-slate-500 font-medium flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-slate-400" />
                <span>Payment Status:</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-black text-xs uppercase tracking-wider">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>PAID</span>
              </span>
            </div>
          </div>

          {/* Amount Paid Box */}
          <div className="p-5 rounded-2xl bg-emerald-900 text-white flex items-center justify-between shadow-sm">
            <div>
              <span className="text-xs uppercase tracking-widest font-bold text-emerald-300 block">Total Amount Paid</span>
              <span className="text-xs text-emerald-200 font-medium">Five Thousand Naira Only</span>
            </div>
            <div className="text-right">
              <span className="text-2xl sm:text-3xl font-black font-display tracking-tight text-white">
                {formatNaira(receipt.amount_paid || 5000)}
              </span>
            </div>
          </div>

          {/* Verification Badge & Footer Seal */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Verified server-side with Paystack payment gateway.</span>
            </div>
            <div className="text-center sm:text-right font-mono text-[11px] text-slate-400">
              Valid Estate Security Levy Pass
            </div>
          </div>
        </div>

        {/* Footer actions (Hidden during printing) */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 print:hidden">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Close Receipt
          </button>
          <button
            onClick={handlePrint}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save as PDF</span>
          </button>
        </div>

      </div>
    </div>
  );
};
