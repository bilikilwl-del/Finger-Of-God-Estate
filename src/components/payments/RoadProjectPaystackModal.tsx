import React, { useState } from 'react';
import {
  Coins,
  X,
  CreditCard,
  Building,
  User,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { EstateSettings, RoadProjectCategory, RoadProjectTransaction } from '../../types/database';
import { dbService } from '../../lib/supabase';

interface RoadProjectPaystackModalProps {
  isOpen: boolean;
  onClose: () => void;
  estateSettings: EstateSettings;
  onPaymentVerified: (tx: RoadProjectTransaction) => void;
}

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
  const [selectedPreset, setSelectedPreset] = useState<number>(100000);
  const [customAmount, setCustomAmount] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successTx, setSuccessTx] = useState<RoadProjectTransaction | null>(null);

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
    if (!payerName.trim()) {
      setErrorMsg('Please enter Contributor or Landlord Name.');
      return;
    }
    if (currentAmount < 5000) {
      setErrorMsg('Minimum contribution amount is ₦5,000.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const initRes = await dbService.initializeRoadPaystackPayment({
        amount: currentAmount,
        email: email.trim() || undefined,
        buildingNumber: buildingNumber.trim(),
        payerName: payerName.trim(),
        phone: phoneNumber.trim() || undefined,
        category
      });

      if (!initRes.success || !initRes.reference) {
        throw new Error(initRes.message || 'Failed to initialize Paystack contribution session.');
      }

      const reference = initRes.reference;

      // Check if Paystack Inline SDK is loaded in window
      const paystackWin = window as any;
      if (typeof paystackWin.PaystackPop !== 'undefined' && initRes.access_code && !initRes.authorization_url?.includes('paystack_simulation')) {
        const handler = paystackWin.PaystackPop.setup({
          key: estateSettings.currency || 'pk_test_sample',
          email: email.trim() || `donor.${Date.now()}@fingerofgodestate.ng`,
          amount: Math.round(currentAmount * 100),
          ref: reference,
          callback: async (response: any) => {
            setVerifying(true);
            const verifyRes = await dbService.verifyRoadPaystackPayment({
              reference: response.reference || reference,
              amount: currentAmount,
              buildingNumber: buildingNumber.trim(),
              payerName: payerName.trim()
            });

            setVerifying(false);
            if (verifyRes.success && verifyRes.transaction) {
              setSuccessTx(verifyRes.transaction);
              onPaymentVerified(verifyRes.transaction);
            } else {
              setErrorMsg(verifyRes.message || 'Payment received but verification pending. It will update momentarily via webhook.');
            }
          },
          onClose: () => {
            setLoading(false);
          }
        });
        handler.openIframe();
      } else {
        // Simulation or Sandbox Verification Flow
        setVerifying(true);
        setTimeout(async () => {
          const verifyRes = await dbService.verifyRoadPaystackPayment({
            reference,
            amount: currentAmount,
            buildingNumber: buildingNumber.trim(),
            payerName: payerName.trim()
          });

          setLoading(false);
          setVerifying(false);

          if (verifyRes.success && verifyRes.transaction) {
            setSuccessTx(verifyRes.transaction);
            onPaymentVerified(verifyRes.transaction);
          } else {
            setErrorMsg(verifyRes.message || 'Verification failed. Please contact admin.');
          }
        }, 1200);
      }
    } catch (err: any) {
      setLoading(false);
      setVerifying(false);
      setErrorMsg(err.message || 'Error processing online contribution.');
    }
  };

  const handleFinish = () => {
    onClose();
    setSuccessTx(null);
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
          {successTx ? (
            /* Success Screen */
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h4 className="text-xl font-black text-slate-900 font-display">
                  Contribution Verified & Recorded!
                </h4>
                <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
                  Thank you! Your payment has been server-verified and automatically entered into the Road Project transparent ledger.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200/80">
                  <span className="text-slate-500">Transaction Reference:</span>
                  <span className="font-mono font-bold text-slate-800">{successTx.reference}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/80">
                  <span className="text-slate-500">Amount Credited:</span>
                  <span className="font-bold text-emerald-700 text-sm">₦{successTx.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/80">
                  <span className="text-slate-500">Building / Compound:</span>
                  <span className="font-semibold text-slate-900">{successTx.building_number || 'General'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/80">
                  <span className="text-slate-500">Contributor:</span>
                  <span className="font-semibold text-slate-900">{successTx.payer_or_vendor}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Verification Source:</span>
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-800">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Paystack Verified (Server Ledger)
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleFinish}
                className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer"
              >
                Close & View on Live Ledger
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Amount Presets */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Select Contribution Amount:
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { label: '₦50,000', val: 50000, desc: 'Half Assessment' },
                    { label: '₦100,000', val: 100000, desc: 'Full Assessment' },
                    { label: '₦200,000', val: 200000, desc: 'Double Assessment' }
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => handlePresetSelect(opt.val)}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center ${
                        selectedPreset === opt.val
                          ? 'border-emerald-600 bg-emerald-50/80 text-emerald-900 shadow-2xs font-bold ring-2 ring-emerald-500/20'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50/50'
                      }`}
                    >
                      <span className="text-sm font-black">{opt.label}</span>
                      <span className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</span>
                    </button>
                  ))}
                </div>

                {/* Custom Amount */}
                <div className="mt-2.5">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₦</span>
                    <input
                      type="number"
                      placeholder="Or enter custom amount (minimum ₦5,000)..."
                      value={customAmount}
                      onChange={(e) => handleCustomChange(e.target.value)}
                      className={`w-full pl-8 pr-3 py-2 text-xs border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 ${
                        selectedPreset === 0 ? 'border-emerald-600 bg-white font-bold' : 'border-slate-200 bg-slate-50'
                      }`}
                    />
                  </div>
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
                    <span>Contributor / Landlord Name *</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chief Adeleke"
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
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
                  <span className="font-bold text-slate-900">Automated Server Verification:</span> Your transaction is verified on the backend before being recorded. Once confirmed, the website total credit and available balance will update instantly via live SSE.
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || verifying || currentAmount <= 0}
                className="w-full py-3.5 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading || verifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{verifying ? 'Verifying with Paystack...' : 'Connecting Gateway...'}</span>
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
          )}
        </div>
      </div>
    </div>
  );
};
