import React, { useState } from 'react';
import { 
  ShieldCheck, 
  User, 
  Phone, 
  KeyRound, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  X,
  HelpCircle,
  Building2,
  Lock
} from 'lucide-react';
import { dbService } from '../../lib/supabase';
import { Resident } from '../../types/database';

interface ResidentLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (resident: Resident) => void;
}

export const ResidentLoginModal: React.FC<ResidentLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [residentNumber, setResidentNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!residentNumber.trim() || !phoneNumber.trim()) {
      setErrorMessage('Please provide both your Resident Number and registered Phone Number.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await dbService.authResident(residentNumber.trim(), phoneNumber.trim());
      if (res.success && res.resident) {
        onSuccess(res.resident);
        onClose();
      } else {
        setErrorMessage(res.message || 'Verification failed. Please check your credentials.');
      }
    } catch (err: any) {
      setErrorMessage('A network error occurred while verifying resident information.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSelect = (num: string, phone: string) => {
    setResidentNumber(num);
    setPhoneNumber(phone);
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-4">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 sm:p-7 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Finger of God Estate</p>
              <h2 className="text-lg font-black tracking-tight text-white font-display">Resident Access Portal</h2>
              <p className="text-xs text-slate-300">My Security Levy & Digital Receipts</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 space-y-6">
          <p className="text-xs text-slate-600">
            Sign in to view your monthly levy status, payment history, and download official digital receipts.
          </p>

          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Authentication Notice</p>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Resident Number
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm font-bold">
                  #
                </div>
                <input
                  type="text"
                  value={residentNumber}
                  onChange={(e) => setResidentNumber(e.target.value)}
                  placeholder="001"
                  maxLength={5}
                  required
                  className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Your 3-digit estate registration identifier (e.g. 001)</p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Registered Phone Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="08023456789"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Must match the registered phone on your estate profile</p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-bold text-sm tracking-wide transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isLoading ? (
                <span>Verifying Resident...</span>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>ACCESS MY DASHBOARD</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Test Buttons */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Quick Test Profile Selection:
            </span>
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => handleQuickSelect('001', '08023456789')}
                className="w-full text-left p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/70 transition-colors flex items-center justify-between cursor-pointer text-xs"
              >
                <div>
                  <span className="font-mono font-bold text-emerald-950">#001</span> • <span className="font-semibold text-emerald-900">Engr. Babatunde Adeleke</span>
                  <span className="block text-[10px] text-emerald-700">Phone: 08023456789 (Status: Paid Oct 2026)</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-bold">PAID</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSelect('002', '08098765432')}
                className="w-full text-left p-2.5 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-100/70 transition-colors flex items-center justify-between cursor-pointer text-xs"
              >
                <div>
                  <span className="font-mono font-bold text-amber-950">#002</span> • <span className="font-semibold text-amber-900">Dr. Chioma Nwachukwu</span>
                  <span className="block text-[10px] text-amber-700">Phone: 08098765432 (Status: Unpaid)</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-bold">UNPAID</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSelect('003', '08123459876')}
                className="w-full text-left p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between cursor-pointer text-xs"
              >
                <div>
                  <span className="font-mono font-bold text-slate-900">#003</span> • <span className="font-semibold text-slate-800">Alhaji Usman Danladi</span>
                  <span className="block text-[10px] text-slate-500">Phone: 08123459876 (Status: Unpaid)</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">UNPAID</span>
              </button>
            </div>
          </div>

          {/* Privacy Note */}
          <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1">
            <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Estate RLS security restricts access strictly to your records.</span>
          </div>
        </div>

      </div>
    </div>
  );
};
