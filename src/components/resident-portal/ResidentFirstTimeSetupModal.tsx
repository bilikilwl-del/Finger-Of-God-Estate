import React, { useState } from 'react';
import { 
  User, 
  Phone, 
  Mail, 
  Home, 
  MapPin, 
  ShieldCheck, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  RotateCw,
  Sparkles,
  Lock
} from 'lucide-react';
import { Resident, EstateSettings } from '../../types/database';
import { dbService } from '../../lib/supabase';
import { validateNigerianPhone } from '../../lib/phoneUtils';
import { EstateLogo } from '../common/EstateLogo';

interface ResidentFirstTimeSetupModalProps {
  isOpen: boolean;
  resident: Resident;
  estateSettings?: EstateSettings;
  onComplete: (updatedResident: Resident) => void;
}

export const ResidentFirstTimeSetupModal: React.FC<ResidentFirstTimeSetupModalProps> = ({
  isOpen,
  resident,
  estateSettings,
  onComplete
}) => {
  const [fullName, setFullName] = useState(resident.full_name || '');
  const [phoneNumber, setPhoneNumber] = useState(resident.phone_number || '');
  const [additionalPhone, setAdditionalPhone] = useState(resident.additional_phone || '');
  const [houseNumber, setHouseNumber] = useState(resident.house_number || '');
  const [address, setAddress] = useState(resident.address || 'Phase 1, Finger of God Estate, Iyiaba, Asaba');
  const [email, setEmail] = useState(resident.email || '');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim() || fullName.trim().length < 2) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    const phoneVal = validateNigerianPhone(phoneNumber);
    if (!phoneVal.isValid) {
      setErrorMessage(phoneVal.error || 'Please enter a valid Nigerian phone number.');
      return;
    }

    if (additionalPhone.trim()) {
      const addVal = validateNigerianPhone(additionalPhone);
      if (!addVal.isValid) {
        setErrorMessage(`Additional Phone Error: ${addVal.error}`);
        return;
      }
    }

    if (!houseNumber.trim()) {
      setErrorMessage('Please enter your building or house number.');
      return;
    }

    if (!address.trim()) {
      setErrorMessage('Please enter your estate address.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await dbService.completeFirstTimeProfileSetup(resident.resident_number, {
        full_name: fullName.trim(),
        phone_number: phoneNumber.trim(),
        additional_phone: additionalPhone.trim() ? additionalPhone.trim() : null,
        house_number: houseNumber.trim(),
        address: address.trim(),
        email: email.trim() ? email.trim() : null
      });

      if (res.success && res.resident) {
        onComplete(res.resident);
      } else {
        setErrorMessage(res.message || 'Failed to save account details. Please try again.');
      }
    } catch {
      setErrorMessage("We couldn't complete the request. Please check your internet connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Header Branding */}
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white p-6 sm:p-7 border-b border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <EstateLogo
              size="sm"
              variant="horizontal"
              theme="dark"
              estateName={estateSettings?.estate_name || 'Finger of God Estate'}
              subtitle="RESIDENT PORTAL • ASABA"
            />
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold border border-emerald-500/30">
              FIRST LOGIN SETUP
            </span>
          </div>

          <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
            Welcome to Finger of God Estate Resident Portal
          </h2>
          <p className="text-xs text-slate-300 font-medium mt-1 leading-relaxed">
            This is your first login. Please confirm/update your account details before continuing.
          </p>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold">Assigned Estate Identifier:</span>
              <span className="px-2.5 py-0.5 rounded-lg bg-emerald-900/80 text-emerald-200 font-mono font-black text-sm border border-emerald-700/60">
                #{resident.resident_number.padStart(3, '0')}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">One-Time Verification</span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-4">
          {/* Error Message */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Required Details Notice</p>
                <p className="mt-0.5 leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Full Legal Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Engr. Babatunde Adeleke"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Primary Phone Number */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Primary Phone Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="080XXXXXXXX"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Additional Secondary Phone */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Secondary Contact Phone
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={additionalPhone}
                  onChange={(e) => setAdditionalPhone(e.target.value)}
                  placeholder="Optional alternate phone"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Building / House Number */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Building / House Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Home className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={houseNumber}
                  onChange={(e) => setHouseNumber(e.target.value)}
                  placeholder="e.g. Plot 4A / House 12"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Street / Estate Address */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Street / Estate Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Hibiscus Crescent, Phase 1, Finger of God Estate, Iyiaba, Asaba"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              This setup is required once. On future logins, you will be taken directly to your Resident Dashboard.
            </span>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 px-6 rounded-2xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-black text-sm tracking-wide transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Saving Profile & Activating Dashboard...</span>
                </span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>CONFIRM DETAILS & ENTER DASHBOARD</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
