import React, { useRef } from 'react';
import {
  X,
  Printer,
  Download,
  CheckCircle2,
  Calendar,
  User,
  Home,
  CreditCard,
  Building2,
  FileCheck2
} from 'lucide-react';
import { BuildingEstateLevyReceipt } from '../../types/database';

interface EstateLevyReceiptModalProps {
  receipt: BuildingEstateLevyReceipt | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EstateLevyReceiptModal: React.FC<EstateLevyReceiptModalProps> = ({
  receipt,
  isOpen,
  onClose
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-auto flex flex-col print:max-h-none print:shadow-none print:border-none print:m-0 print:rounded-none">
        {/* Top Action Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Verified Payment Receipt
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-300" />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div ref={printRef} className="p-6 sm:p-8 space-y-6 bg-white overflow-y-auto print:p-8 print:overflow-visible">
          {/* Header */}
          <div className="text-center pb-5 border-b border-slate-200 space-y-1">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 font-display tracking-tight">
              Finger of God Estate
            </h2>
            <p className="text-xs text-slate-600">
              Iyiaba / Asaba, Delta State, Nigeria
            </p>
            <div className="pt-2">
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold uppercase tracking-wider">
                Monthly Estate Levy Receipt
              </span>
            </div>
          </div>

          {/* Receipt Info Strip */}
          <div className="grid grid-cols-2 gap-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Receipt ID</span>
              <span className="font-mono font-bold text-slate-900 text-sm">{receipt.receipt_number}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Payment Date</span>
              <span className="font-semibold text-slate-800">{formattedDate}</span>
            </div>
          </div>

          {/* Details Table */}
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
            <div className="flex justify-between items-center px-4 py-3 bg-white">
              <span className="text-slate-500 font-medium flex items-center gap-2">
                <Home className="w-3.5 h-3.5 text-slate-400" />
                <span>Building / House Number:</span>
              </span>
              <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded">
                {receipt.building_house_number}
              </span>
            </div>

            {receipt.building_name && (
              <div className="flex justify-between items-center px-4 py-3 bg-slate-50/50">
                <span className="text-slate-500 font-medium flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Building Description:</span>
                </span>
                <span className="font-semibold text-slate-800">{receipt.building_name}</span>
              </div>
            )}

            <div className="flex justify-between items-center px-4 py-3 bg-white">
              <span className="text-slate-500 font-medium flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Payer Name:</span>
              </span>
              <span className="font-bold text-slate-900">{receipt.payer_name}</span>
            </div>

            <div className="flex justify-between items-center px-4 py-3 bg-slate-50/50">
              <span className="text-slate-500 font-medium flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Billing Month:</span>
              </span>
              <span className="font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                {receipt.billing_month_label || receipt.billing_month}
              </span>
            </div>

            <div className="flex justify-between items-center px-4 py-3 bg-white">
              <span className="text-slate-500 font-medium flex items-center gap-2">
                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                <span>Transaction Reference:</span>
              </span>
              <span className="font-mono text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                {receipt.paystack_reference}
              </span>
            </div>

            <div className="flex justify-between items-center px-4 py-3 bg-slate-50/50">
              <span className="text-slate-500 font-medium">Payment Status:</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold text-[11px]">
                <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                <span>VERIFIED PAID</span>
              </span>
            </div>
          </div>

          {/* Amount Paid Box */}
          <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
                Amount Paid (Per Building)
              </span>
              <span className="text-xs text-slate-300 font-medium">One Thousand Naira Only</span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black font-mono text-emerald-400">
                ₦{Number(receipt.amount_paid || 1000).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Footer Clearance Notice */}
          <div className="pt-2 text-center text-[11px] text-slate-500 space-y-0.5">
            <p className="font-medium">Verified online checkout through Paystack.</p>
            <p className="text-slate-400">Finger of God Estate Administration Desk</p>
          </div>
        </div>
      </div>
    </div>
  );
};
