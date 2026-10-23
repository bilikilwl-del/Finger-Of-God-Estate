import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  Building2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Lock,
  UserCheck,
  Hash,
  User,
  Home,
  Phone,
  Mail,
  LogIn
} from 'lucide-react';
import { Building, BuildingEstateLevyReceipt, Resident } from '../../types/database';
import { estateLevyService } from '../../services/estateLevyService';
import { residentSessionService } from '../../lib/supabase';
import { getPaystackConfig, loadPaystackInlineScript, PaystackConfig } from '../../lib/paystack';

interface EstateLevyPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialBuilding?: Building | null;
  preselectedResident?: Resident | null;
  initialDurationMonths?: 1 | 12;
  onPaymentSuccess?: (receipt: BuildingEstateLevyReceipt) => void;
  onRequestLogin?: () => void;
}

export const EstateLevyPaymentModal: React.FC<EstateLevyPaymentModalProps> = ({
  isOpen,
  onClose,
  initialBuilding,
  preselectedResident,
  initialDurationMonths = 1,
  onPaymentSuccess,
  onRequestLogin
}) => {
  const activeResident = preselectedResident || residentSessionService.getCurrentResident();

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loadingBuildings, setLoadingBuildings] = useState(false);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(initialBuilding?.id || '');
  const [durationMonths, setDurationMonths] = useState<1 | 12>(initialDurationMonths === 12 ? 12 : 1);
  const [paystackConfig, setPaystackConfig] = useState<PaystackConfig | null>(null);

  // Billing month (Default: current month YYYY-MM)
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [billingMonth, setBillingMonth] = useState<string>(currentMonthStr);

  // Payer Details (pre-populated from logged-in resident)
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
      setDurationMonths(initialDurationMonths === 12 ? 12 : 1);
      getPaystackConfig('estate_levy').then(cfg => setPaystackConfig(cfg));
      loadPaystackInlineScript();
      loadBuildings();
      setErrorMsg('');
      setStep('DETAILS');
      if (activeResident) {
        const cleanNum = String(activeResident.resident_number).trim().padStart(3, '0');
        setPayerName(activeResident.full_name || `Resident #${cleanNum}`);
        setPayerEmail(activeResident.email || `resident${cleanNum}@fingerofgodestate.org`);
        setPayerPhone(
          activeResident.phone_number && !activeResident.phone_number.startsWith('08000000')
            ? activeResident.phone_number
            : ''
        );
      }
      if (initialBuilding) {
        setSelectedBuildingId(initialBuilding.id);
      }
    }
  }, [isOpen, initialBuilding, preselectedResident, initialDurationMonths]);

  const loadBuildings = async () => {
    setLoadingBuildings(true);
    try {
      const res = await estateLevyService.getBuildings();
      let list: Building[] = res.success && Array.isArray(res.data) ? (res.data as any) : [];

      if (activeResident) {
        const cleanNum = String(activeResident.resident_number).trim().padStart(3, '0');
        const resHouse = (activeResident.house_number || `Plot ${cleanNum}`).trim();
        const existingMatch = list.find(
          b =>
            b.house_number.trim().toLowerCase() === resHouse.toLowerCase() ||
            b.house_number.trim().toLowerCase().replace(/^plot\s*/i, '') === resHouse.toLowerCase().replace(/^plot\s*/i, '')
        );
        if (initialBuilding) {
          setSelectedBuildingId(initialBuilding.id);
        } else if (existingMatch) {
          setSelectedBuildingId(existingMatch.id);
        } else {
          const virtualId = `res_bldg_${cleanNum}`;
          const virtualBuilding: Building = {
            id: virtualId,
            house_number: resHouse,
            building_name: `Resident #${cleanNum} (${activeResident.full_name})`,
            total_flats_count: 1,
            landlord_name: activeResident.full_name,
            landlord_phone: activeResident.phone_number,
            landlord_email: activeResident.email,
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          list = [virtualBuilding, ...list];
          setSelectedBuildingId(virtualId);
        }
      }

      setBuildings(list);
    } catch (err) {
      console.error('Error fetching estate buildings:', err);
    } finally {
      setLoadingBuildings(false);
    }
  };

  const selectedBuilding = buildings.find(b => b.id === selectedBuildingId);

  // Strict ₦1,000 per building per month billing rule (₦1,000 for 1 month, ₦12,000 for 12 months)
  const LEVY_PER_BUILDING = 1000;
  const totalAmount = LEVY_PER_BUILDING * durationMonths;

  const verifyEstateLevyReference = async (reference: string) => {
    try {
      const verifyRes = await estateLevyService.verifyPayment(reference);
      if (verifyRes.success && verifyRes.verified && verifyRes.receipt) {
        setVerifiedReceipt(verifyRes.receipt);
        setStep('SUCCESS');
        if (onPaymentSuccess) onPaymentSuccess(verifyRes.receipt);
      } else {
        setErrorMsg(verifyRes.message || 'Verification could not be confirmed.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error verifying payment.');
    } finally {
      setProcessing(false);
    }
  };

  const handleInitiatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeResident) {
      setErrorMsg('Please log in with your Resident ID Number and password before making an Estate Levy payment.');
      return;
    }
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
        house_number: selectedBuilding?.house_number || activeResident.house_number,
        billing_month: billingMonth,
        duration_months: durationMonths,
        resident_id: activeResident.id,
        resident_number: activeResident.resident_number,
        payer_name: payerName.trim(),
        payer_email: payerEmail.trim(),
        payer_phone: payerPhone.trim() || activeResident.phone_number || undefined
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
        await verifyEstateLevyReference(res.reference);
        return;
      }

      // If Paystack Inline Popup is available, open inline checkout
      if (paystackConfig?.publicKey && (window as any).PaystackPop && res.access_code) {
        const handler = (window as any).PaystackPop.setup({
          key: paystackConfig.publicKey,
          email: payerEmail.trim(),
          amount: totalAmount * 100,
          currency: 'NGN',
          ref: res.reference,
          callback: (response: any) => {
            verifyEstateLevyReference(response.reference || res.reference!);
          },
          onClose: () => {
            if (res.reference) {
              estateLevyService.cancelPayment(res.reference, 'CANCELLED').catch(() => {});
            }
            setProcessing(false);
            setErrorMsg('Payment cancelled. Transaction was not completed.');
          }
        });
        handler.openIframe();
        return;
      }

      // Live Paystack redirect fallback
      if (res.authorization_url) {
        window.location.href = res.authorization_url;
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Server error communicating with payment gateway.');
      setProcessing(false);
    }
  };

  if (!isOpen) return null;

  const formattedResidentId = activeResident
    ? `#${String(activeResident.resident_number).trim().padStart(3, '0')}`
    : null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <CreditCard className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base">Pay Estate Levy</h3>
                {formattedResidentId && (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-mono text-[11px] font-bold">
                    ID {formattedResidentId}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300">₦1,000 per building / month (1 Month or 12 Months)</p>
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

          {/* Require Resident Login if not authenticated */}
          {!activeResident ? (
            <div className="py-6 px-3 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
                <Lock className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-base font-black text-slate-900">Resident Login Required Before Payment</h4>
                <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                  Please log in with your <strong>Resident ID Number (#001–#100)</strong> and password before making an Estate Levy payment. Once logged in, your <strong>Full Name, Resident ID Number, Building/House Number, and Contact Details</strong> will automatically appear on your payment and official receipt.
                </p>
              </div>
              <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
                {onRequestLogin && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onRequestLogin();
                    }}
                    className="px-5 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs sm:text-sm inline-flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Login with Resident ID to Pay</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : step === 'DETAILS' ? (
            <form onSubmit={handleInitiatePayment} className="space-y-4">
              {/* Verified Logged-in Resident Identity Banner */}
              <div className="p-3.5 rounded-xl bg-emerald-950 text-white border border-emerald-800 space-y-2.5">
                <div className="flex items-center justify-between border-b border-emerald-800/80 pb-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Verified Resident Account</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-mono text-xs font-black">
                    Resident ID: {formattedResidentId}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-emerald-400/80 block">Full Name</span>
                    <span className="font-bold text-white truncate block">{activeResident.full_name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-emerald-400/80 block">House / Plot Number</span>
                    <span className="font-mono font-bold text-emerald-200 block">
                      {selectedBuilding?.house_number || activeResident.house_number || `Plot ${activeResident.resident_number}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-emerald-400/80 block">Phone Number</span>
                    <span className="font-mono text-emerald-100 block">{payerPhone || activeResident.phone_number || 'On File'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-emerald-400/80 block">Account Status</span>
                    <span className="font-semibold text-emerald-300 block">Resident • {activeResident.status || 'Active'}</span>
                  </div>
                </div>
              </div>

              {/* Select Building */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  1. Building / House Number
                </label>
                {loadingBuildings ? (
                  <div className="p-3 text-center text-xs text-slate-400">Loading estate buildings...</div>
                ) : (
                  <select
                    value={selectedBuildingId}
                    onChange={e => setSelectedBuildingId(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white font-semibold text-slate-900"
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
                  Automatically matched to your registered residence ({activeResident.house_number}). You may also select another estate building if paying on its behalf.
                </p>
              </div>

              {/* Payment Duration Option: 1 Month or 12 Months Only */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  2. Select Payment Option (1 Month or 12 Months)
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setDurationMonths(1);
                      setErrorMsg('');
                    }}
                    className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                      durationMonths === 1
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold uppercase">1 Month</span>
                      {durationMonths === 1 && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <div className="text-base font-black font-mono mt-1 text-slate-900">
                      ₦{LEVY_PER_BUILDING.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-slate-500 block">1 Month Estate Levy</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDurationMonths(12);
                      setErrorMsg('');
                    }}
                    className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                      durationMonths === 12
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold uppercase">12 Months</span>
                      {durationMonths === 12 && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <div className="text-base font-black font-mono mt-1 text-slate-900">
                      ₦{(LEVY_PER_BUILDING * 12).toLocaleString()}
                    </div>
                    <span className="text-[10px] text-slate-500 block">1 Year (12 × ₦1,000)</span>
                  </button>
                </div>
              </div>

              {/* Starting Billing Month */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  3. {durationMonths === 12 ? 'Starting Billing Month (Covers 12 Months)' : 'Billing Month'}
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
                    Amount Due • Resident {formattedResidentId}
                  </span>
                  <span className="text-xs text-slate-600">
                    1 Building × ₦1,000 × {durationMonths} {durationMonths === 12 ? 'Months (1 Year)' : 'Month'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black font-mono text-emerald-950">
                    ₦{totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Payer Information (Pre-filled from Resident Profile) */}
              <div className="space-y-3 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    4. Resident Details on Receipt
                  </label>
                  <span className="text-[11px] font-semibold text-emerald-700">Auto-filled from your account</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Resident ID Number</label>
                    <input
                      type="text"
                      value={formattedResidentId || ''}
                      readOnly
                      className="w-full text-xs sm:text-sm border border-slate-200 bg-slate-100 text-slate-800 font-mono font-bold rounded-xl px-3 py-2.5 cursor-not-allowed"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Resident Full Name *</label>
                    <input
                      type="text"
                      value={payerName}
                      readOnly
                      className="w-full text-xs sm:text-sm border border-slate-200 bg-slate-100 text-slate-900 font-bold rounded-xl px-3 py-2.5 cursor-not-allowed"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Email Address (for Receipt) *</label>
                    <input
                      type="email"
                      placeholder="e.g. payer@example.com"
                      value={payerEmail}
                      onChange={e => setPayerEmail(e.target.value)}
                      className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      placeholder="08012345678"
                      value={payerPhone}
                      onChange={e => setPayerPhone(e.target.value)}
                      className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl px-3 py-2"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Secure Paystack Checkout</span>
                </p>
                <p className="leading-relaxed">
                  Your Resident ID (<strong>{formattedResidentId}</strong>), Full Name (<strong>{payerName}</strong>), and Building (<strong>{selectedBuilding?.house_number || activeResident.house_number}</strong>) will be stamped on your verified Estate Levy receipt.
                </p>
              </div>

              <button
                type="submit"
                disabled={processing || !selectedBuildingId}
                className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs sm:text-sm transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <CreditCard className="w-4 h-4" />
                <span>
                  {processing
                    ? 'Connecting Gateway...'
                    : `Proceed to Pay ${durationMonths === 12 ? '12 Months' : '1 Month'} (₦${totalAmount.toLocaleString()})`}
                </span>
              </button>
            </form>
          ) : null}

          {step === 'SUCCESS' && verifiedReceipt && (
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div>
                <h4 className="text-lg font-bold text-slate-900">Payment Confirmed</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Estate levy of ₦{Number(verifiedReceipt.amount_paid || totalAmount).toLocaleString()} successfully recorded for{' '}
                  <strong>{verifiedReceipt.payer_name}</strong> (Resident ID:{' '}
                  <strong>#{verifiedReceipt.resident_number || activeResident?.resident_number}</strong>).
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Receipt ID:</span>
                  <span className="font-mono font-bold text-slate-900">{verifiedReceipt.receipt_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Resident ID Number:</span>
                  <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    #{verifiedReceipt.resident_number || activeResident?.resident_number}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Resident Full Name:</span>
                  <span className="font-bold text-slate-900">{verifiedReceipt.payer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Building / House No:</span>
                  <span className="font-semibold text-slate-800">{verifiedReceipt.building_house_number}</span>
                </div>
                {(verifiedReceipt.payer_phone || payerPhone) && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Phone Number:</span>
                    <span className="font-mono text-slate-800">{verifiedReceipt.payer_phone || payerPhone}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Period Covered:</span>
                  <span className="font-semibold text-slate-800">{verifiedReceipt.billing_month_label || verifiedReceipt.billing_month}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount Paid:</span>
                  <span className="font-bold text-slate-900">₦{Number(verifiedReceipt.amount_paid || totalAmount).toLocaleString()}</span>
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
