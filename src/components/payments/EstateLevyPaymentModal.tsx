import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  Building2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Lock,
  ChevronRight
} from 'lucide-react';
import { Building, BuildingEstateLevyReceipt } from '../../types/database';
import { estateLevyService } from '../../services/estateLevyService';

interface EstateLevyPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialBuilding?: Building | null;
  onPaymentSuccess?: (receipt: BuildingEstateLevyReceipt) => void;
}

export const EstateLevyPaymentModal: React.FC<EstateLevyPaymentModalProps> = ({
  isOpen,
  onClose,
  initialBuilding,
  onPaymentSuccess
}) => {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loadingBuildings, setLoadingBuildings] = useState(false);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(initialBuilding?.id || '');

  // Billing month (Default: current month YYYY-MM)
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [billingMonth, setBillingMonth] = useState<string>(currentMonthStr);

  // Payer Details
  const [payerName, setPayerName] = useState('');
  const [payerEmail, setPayerEmail] = useState('');
  const [payerPhone, setPayerPhone] = useState('');

  // Processing state
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [step, setStep] = useState<'DETAILS' | 'SUCCESS'>('DETAILS');
  const [verifiedReceipt, setVerifiedReceipt] = useState<BuildingEstateLevyReceipt | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadBuildings();
      setErrorMsg('');
      setStep('DETAILS');
      if (initialBuilding) {
        setSelectedBuildingId(initialBuilding.id);
        if (initialBuilding.landlord_name) {
          setPayerName(initialBuilding.landlord_name);
        }
      }
    }
  }, [isOpen, initialBuilding]);

  const loadBuildings = async () => {
    setLoadingBuildings(true);
    try {
      const res = await estateLevyService.getBuildings();
      if (res.success && Array.isArray(res.data)) {
        setBuildings(res.data as any);
      }
    } catch (err) {
      console.error('Error fetching estate buildings:', err);
    } finally {
      setLoadingBuildings(false);
    }
  };

  const selectedBuilding = buildings.find(b => b.id === selectedBuildingId);

  // Strict ₦1,000 per building billing rule
  const LEVY_PER_BUILDING = 1000;

  const handleInitiatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBuildingId) {
      setErrorMsg('Please select the building you are paying for.');
      return;
    }
    if (!payerName.trim() || !payerEmail.trim()) {
      setErrorMsg('Please enter your full name and a valid email address.');
      return;
    }

    setProcessing(true);
    setErrorMsg('');

    try {
      const res = await estateLevyService.initializePayment({
        building_id: selectedBuildingId,
        billing_month: billingMonth,
        payer_name: payerName.trim(),
        payer_email: payerEmail.trim(),
        payer_phone: payerPhone.trim() || undefined
      });

      if (!res.success || !res.reference) {
        if (res.alreadyPaid && res.receipt) {
          setVerifiedReceipt(res.receipt);
          setStep('SUCCESS');
          setProcessing(false);
          return;
        }
        setErrorMsg(res.message || 'Payment initialization failed. Please try again.');
        setProcessing(false);
        return;
      }

      // If sandbox simulation mode (development / mock verification)
      if (res.is_simulation) {
        const verifyRes = await estateLevyService.verifyPayment(res.reference);
        if (verifyRes.success && verifyRes.verified && verifyRes.receipt) {
          setVerifiedReceipt(verifyRes.receipt);
          setStep('SUCCESS');
          if (onPaymentSuccess) onPaymentSuccess(verifyRes.receipt);
        } else {
          setErrorMsg(verifyRes.message || 'Verification could not be confirmed.');
        }
        setProcessing(false);
        return;
      }

      // Live Paystack redirect
      if (res.authorization_url) {
        window.location.href = res.authorization_url;
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Server error communicating with payment gateway.');
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <CreditCard className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-sm sm:text-base">Pay Estate Levy</h3>
              <p className="text-[11px] text-slate-300">₦1,000 per building, per month</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === 'DETAILS' && (
            <form onSubmit={handleInitiatePayment} className="space-y-4">
              {/* Select Building */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  1. Select Building
                </label>
                {loadingBuildings ? (
                  <div className="p-3 text-center text-xs text-slate-400">Loading estate buildings...</div>
                ) : (
                  <select
                    value={selectedBuildingId}
                    onChange={e => setSelectedBuildingId(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white"
                    required
                  >
                    <option value="">-- Choose Your Building / House Number --</option>
                    {buildings.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.house_number} {b.building_name ? `(${b.building_name})` : ''} {b.landlord_name ? `• ${b.landlord_name}` : ''}
                      </option>
                    ))}
                  </select>
                )}
                <p className="text-[11px] text-slate-500 mt-1">
                  Billing unit: Per building. Distinct flats or multiple residents within this building are covered under this single charge.
                </p>
              </div>

              {/* Billing Month */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  2. Billing Month
                </label>
                <input
                  type="month"
                  value={billingMonth}
                  onChange={e => setBillingMonth(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white"
                  required
                />
                <span className="text-[11px] text-slate-500 mt-1 block">Due on the 1st of every month</span>
              </div>

              {/* Amount Summary */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                    Amount Due (Authoritative)
                  </span>
                  <span className="text-xs text-slate-600">1 Building × ₦1,000</span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black font-mono text-emerald-950">
                    ₦{LEVY_PER_BUILDING.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Payer Information */}
              <div className="space-y-3 pt-1 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  3. Payer Information
                </label>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payer Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Chief John Okafor"
                    value={payerName}
                    onChange={e => setPayerName(e.target.value)}
                    className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address (for Verified Receipt) *</label>
                  <input
                    type="email"
                    placeholder="e.g. payer@example.com"
                    value={payerEmail}
                    onChange={e => setPayerEmail(e.target.value)}
                    className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    placeholder="08012345678"
                    value={payerPhone}
                    onChange={e => setPayerPhone(e.target.value)}
                    className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl px-3 py-2.5"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Secure Paystack Checkout</span>
                </p>
                <p className="leading-relaxed">
                  Secure online checkout through Paystack, using the payment channels enabled for this account. A verified receipt will be available once payment has been confirmed.
                </p>
              </div>

              <button
                type="submit"
                disabled={processing || !selectedBuildingId}
                className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs sm:text-sm transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <CreditCard className="w-4 h-4" />
                <span>{processing ? 'Connecting Gateway...' : `Proceed to Pay ₦${LEVY_PER_BUILDING.toLocaleString()}`}</span>
              </button>
            </form>
          )}

          {step === 'SUCCESS' && verifiedReceipt && (
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div>
                <h4 className="text-lg font-bold text-slate-900">Payment Confirmed</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Estate levy of ₦{Number(verifiedReceipt.amount_paid || 1000).toLocaleString()} successfully recorded for building {verifiedReceipt.building_house_number}.
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Receipt ID:</span>
                  <span className="font-mono font-bold text-slate-900">{verifiedReceipt.receipt_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Building:</span>
                  <span className="font-semibold text-slate-800">{verifiedReceipt.building_house_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Billing Month:</span>
                  <span className="font-semibold text-slate-800">{verifiedReceipt.billing_month_label || verifiedReceipt.billing_month}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Reference:</span>
                  <span className="font-mono text-slate-700">{verifiedReceipt.paystack_reference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="font-bold text-emerald-800">VERIFIED PAID</span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 cursor-pointer"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
