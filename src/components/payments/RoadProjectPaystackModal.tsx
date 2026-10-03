import React, { useState } from 'react';
import {
  Coins,
  X,
  CreditCard,
  Building,
  User,
  Phone,
  Mail,
  AlertCircle,
  Loader2,
  Lock,
  ArrowRight
} from 'lucide-react';
import { EstateSettings, RoadProjectCategory, RoadProjectTransaction } from '../../types/database';
import { dbService } from '../../lib/supabase';

interface RoadProjectPaystackModalProps {
  isOpen: boolean;
  onClose: () => void;
  estateSettings: EstateSettings;
  onPaymentVerified: (tx: RoadProjectTransaction) => void;
}

export const MIN_ROAD_CONTRIBUTION = 100;

const ROAD_CONTRIBUTION_PRESETS = [
  { label: '₦100', val: 100, desc: 'Supporter' },
  { label: '₦500', val: 500, desc: 'Community' },
  { label: '₦1,000', val: 1000, desc: 'Friend' },
  { label: '₦5,000', val: 5000, desc: 'Active' },
  { label: '₦10,000', val: 10000, desc: 'Pillar' },
  { label: '₦100,000', val: 100000, desc: 'Assessment' }
];

export const RoadProjectPaystackModal: React.FC<RoadProjectPaystackModalProps> = ({
  isOpen,
  onClose,
  estateSettings,
  onPaymentVerified
}) => {
  const [buildingNumber, setBuildingNumber] = useState('');
  const [payerName, setPayerName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [category, setCategory] = useState<RoadProjectCategory>('Building Contribution');
  const [selectedPreset, setSelectedPreset] = useState<number>(1000);
  const [customAmount, setCustomAmount] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [isAnonymous, setIsAnonymous] = useState(false);

  if (!isOpen) return null;

  const currentAmount = selectedPreset > 0 ? selectedPreset : (parseFloat(customAmount) || 0);

  const handlePresetSelect = (amt: number) => {
    setSelectedPreset(amt);
    setCustomAmount('');
    setErrorMsg('');
  };

  const handleCustomChange = (val: string) => {
    setSelectedPreset(0);
    setCustomAmount(val);
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buildingNumber.trim()) {
      setErrorMsg('Please enter your Building or Compound Number (e.g., Plot 14B, Bldg 024).');
      return;
    }
    if (!isAnonymous && !payerName.trim()) {
      setErrorMsg('Please enter Contributor or Landlord Name, or select Anonymous Contributor.');
      return;
    }
    if (isNaN(currentAmount) || currentAmount < MIN_ROAD_CONTRIBUTION) {
      setErrorMsg(`Minimum contribution amount is ₦${MIN_ROAD_CONTRIBUTION.toLocaleString()}.`);
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const effectiveDisplayName = isAnonymous ? 'Anonymous Contributor' : payerName.trim();

    try {
      const initRes = await dbService.initializeRoadPaystackPayment({
        amount: currentAmount,
        email: email.trim() || undefined,
        buildingNumber: buildingNumber.trim(),
        payerName: effectiveDisplayName,
        phone: phoneNumber.trim() || undefined,
        category,
        is_anonymous: isAnonymous
      } as any);

      if (!initRes.success || !initRes.reference) {
        setLoading(false);
        setErrorMsg(initRes.message || 'Payment gateway is temporarily unavailable. Please try again later.');
        return;
      }

      const authorizationUrl = String(initRes.authorization_url || '').trim();

      if (!authorizationUrl || !/^https:\/\/checkout\.paystack\.com\//i.test(authorizationUrl)) {
        setLoading(false);
        setErrorMsg('Payment gateway is temporarily unavailable. Please try again later.');
        return;
      }

      // Redirect to official Paystack hosted checkout URL
      window.location.assign(authorizationUrl);
    } catch (err: any) {
      setLoading(false);
      setErrorMsg(err.message || 'Payment gateway is temporarily unavailable. Please try again later.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-full text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-xs text-emerald-200">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-200">
                Official Road Modernization Fund
              </span>
              <h3 className="text-xl font-black text-white font-display">
                Online Road Contribution
              </h3>
            </div>
          </div>
          <p className="text-xs text-emerald-100/90 mt-2">
            Securely pay with Nigerian Debit Card, Bank Transfer, or USSD via Paystack. Your contribution will be verified and recorded on the public ledger in real-time.
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Amount Presets */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700">
                    Select Contribution Amount:
                  </label>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    Minimum contribution: ₦100
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {ROAD_CONTRIBUTION_PRESETS.map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => handlePresetSelect(opt.val)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                        selectedPreset === opt.val
                          ? 'border-emerald-600 bg-emerald-50/90 text-emerald-950 shadow-2xs font-bold ring-2 ring-emerald-500/20'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50/50'
                      }`}
                    >
                      <span className="text-xs font-black">{opt.label}</span>
                      <span className="text-[9px] text-slate-500 mt-0.5 leading-tight">{opt.desc}</span>
                    </button>
                  ))}
                </div>

                {/* Custom Amount */}
                <div className="mt-2.5">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₦</span>
                    <input
                      type="number"
                      min={MIN_ROAD_CONTRIBUTION}
                      placeholder="Or enter custom amount (minimum ₦100)..."
                      value={customAmount}
                      onChange={(e) => handleCustomChange(e.target.value)}
                      className={`w-full pl-8 pr-3 py-2 text-xs border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 ${
                        selectedPreset === 0 ? 'border-emerald-600 bg-white font-bold' : 'border-slate-200 bg-slate-50'
                      }`}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Enter any amount of at least ₦100 (e.g. ₦200, ₦500, ₦1,000, ₦50,000, ₦100,000).
                  </p>
                </div>
              </div>

              {/* Building & Contributor Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-slate-500" />
                    <span>Building / Plot No *</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Plot 14B or Bldg 024"
                    value={buildingNumber}
                    onChange={(e) => setBuildingNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400">Used for building reconciliation</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>Contributor / Landlord Name {!isAnonymous && '*'}</span>
                  </label>
                  <input
                    type="text"
                    required={!isAnonymous}
                    disabled={isAnonymous}
                    placeholder={isAnonymous ? "Anonymous Contributor" : "e.g. Chief Adeleke"}
                    value={isAnonymous ? "" : payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                    className={`w-full px-3 py-2 text-xs border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 ${
                      isAnonymous ? 'bg-slate-100 border-slate-300 text-slate-500 italic' : 'bg-white border-slate-200'
                    }`}
                  />
                  <label className="flex items-center gap-1.5 mt-1.5 text-[11px] text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                    />
                    <span>Display as <strong>Anonymous Contributor</strong> on public ledger</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>Phone Number (Optional)</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="080XXXXXXXX"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span>Email (For Paystack Receipt)</span>
                  </label>
                  <input
                    type="email"
                    placeholder="your.email@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Category / Classification:
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as RoadProjectCategory)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="Building Contribution">Building Contribution (₦100,000 Assessment)</option>
                  <option value="Landlord Levy">Landlord Levy</option>
                  <option value="Special Donation">Special Donation / Matching Grant</option>
                  <option value="Commercial Store Levy">Commercial Store Infrastructure Levy</option>
                </select>
              </div>

              {/* Security info box */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 flex items-start gap-2">
                <Lock className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900">Official Paystack Hosted Checkout:</span> You will be securely redirected to Paystack to complete your contribution. Once confirmed server-side, the public ledger and balances update in real-time.
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || currentAmount <= 0}
                className="w-full py-3.5 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Redirecting to Paystack...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Proceed to Pay ₦{currentAmount.toLocaleString()}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
        </div>
      </div>
    </div>
  );
};
