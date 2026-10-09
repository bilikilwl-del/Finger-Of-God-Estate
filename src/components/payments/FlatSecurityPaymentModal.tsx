import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  Building2,
  Home,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Shield,
  Printer,
  ChevronRight,
  Clock,
  Layers,
  Check
} from 'lucide-react';
import { Building, Flat, FlatPaymentAllocation } from '../../types/database';
import { securityLevyService } from '../../services/securityLevyService';

interface FlatSecurityPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess?: (receiptData: any) => void;
}

export const FlatSecurityPaymentModal: React.FC<FlatSecurityPaymentModalProps> = ({
  isOpen,
  onClose,
  onPaymentSuccess
}) => {
  const [step, setStep] = useState<'SELECT' | 'DETAILS' | 'PAYING' | 'SUCCESS'>('SELECT');
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loadingBuildings, setLoadingBuildings] = useState(false);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
  const [flats, setFlats] = useState<Flat[]>([]);
  const [loadingFlats, setLoadingFlats] = useState(false);

  // Selection
  const [paymentMode, setPaymentMode] = useState<'SINGLE' | 'BULK'>('SINGLE');
  const [selectedFlatIds, setSelectedFlatIds] = useState<string[]>([]);
  const [billingMonth, setBillingMonth] = useState<string>(new Date().toISOString().slice(0, 7));

  // Payer Details
  const [payerName, setPayerName] = useState('');
  const [payerEmail, setPayerEmail] = useState('');
  const [payerPhone, setPayerPhone] = useState('');
  const [payerType, setPayerType] = useState<'LANDLORD' | 'AGENT' | 'RESIDENT'>('RESIDENT');

  // Processing state
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [verifiedReceipt, setVerifiedReceipt] = useState<{
    reference: string;
    amount: number;
    totalUnits: number;
    billingMonth: string;
    allocations: FlatPaymentAllocation[];
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadBuildings();
      setErrorMsg('');
      setStep('SELECT');
    }
  }, [isOpen]);

  const loadBuildings = async () => {
    setLoadingBuildings(true);
    try {
      const data = await securityLevyService.getBuildings();
      setBuildings(data.filter(b => b.status === 'ACTIVE'));
    } catch (err) {
      console.error('Error fetching buildings:', err);
    } finally {
      setLoadingBuildings(false);
    }
  };

  const handleSelectBuilding = async (buildingId: string) => {
    setSelectedBuildingId(buildingId);
    setSelectedFlatIds([]);
    setLoadingFlats(true);
    try {
      const fData = await securityLevyService.getFlats(buildingId);
      // Only billing active flats
      setFlats(fData.filter(f => f.status === 'ACTIVE' && f.is_billing_active));
    } catch (err) {
      console.error('Error fetching flats:', err);
    } finally {
      setLoadingFlats(false);
    }
  };

  const handleToggleFlat = (flatId: string) => {
    if (paymentMode === 'SINGLE') {
      setSelectedFlatIds([flatId]);
    } else {
      if (selectedFlatIds.includes(flatId)) {
        setSelectedFlatIds(prev => prev.filter(id => id !== flatId));
      } else {
        setSelectedFlatIds(prev => [...prev, flatId]);
      }
    }
  };

  const handleSelectAllFlats = () => {
    if (selectedFlatIds.length === flats.length) {
      setSelectedFlatIds([]);
    } else {
      setSelectedFlatIds(flats.map(f => f.id));
    }
  };

  const ratePerFlat = 1500;
  const totalAmount = selectedFlatIds.length * ratePerFlat;

  const handleProceedToDetails = () => {
    if (selectedFlatIds.length === 0) {
      setErrorMsg('Please select at least one flat to pay for.');
      return;
    }
    setErrorMsg('');
    setStep('DETAILS');
  };

  const handleInitiatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payerName.trim() || !payerEmail.trim()) {
      setErrorMsg('Please enter your name and a valid email address.');
      return;
    }

    setProcessing(true);
    setErrorMsg('');

    try {
      const res = await securityLevyService.initializePayment({
        transaction_type: selectedFlatIds.length > 1 ? 'BULK_FLATS' : 'INDIVIDUAL_FLAT',
        building_id: selectedBuildingId,
        flat_ids: selectedFlatIds,
        billing_month: billingMonth,
        payer_name: payerName.trim(),
        payer_email: payerEmail.trim(),
        payer_phone: payerPhone.trim() || undefined,
        payer_type: payerType
      });

      if (!res.success || !res.reference) {
        setErrorMsg(res.message || 'Payment initialization failed. Please try again.');
        setProcessing(false);
        return;
      }

      // If sandbox simulation mode
      if (res.is_simulation) {
        // Complete automatic simulation verification
        const verifyRes = await securityLevyService.verifyPayment(res.reference);
        if (verifyRes.success && verifyRes.verified) {
          setVerifiedReceipt({
            reference: res.reference,
            amount: totalAmount,
            totalUnits: selectedFlatIds.length,
            billingMonth,
            allocations: verifyRes.allocations || []
          });
          setStep('SUCCESS');
          if (onPaymentSuccess) onPaymentSuccess(verifyRes);
        } else {
          setErrorMsg(verifyRes.message || 'Verification could not be completed.');
        }
        setProcessing(false);
        return;
      }

      // If live Paystack authorization URL
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
              <Shield className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-sm sm:text-base">Monthly Security Levy</h3>
              <p className="text-[11px] text-slate-300">Approved ₦1,500/flat monthly contribution</p>
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

          {/* STEP 1: SELECT BUILDING & FLATS */}
          {step === 'SELECT' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  1. Select Building / Compound
                </label>
                {loadingBuildings ? (
                  <div className="p-3 text-center text-xs text-slate-400">Loading estate buildings...</div>
                ) : (
                  <select
                    value={selectedBuildingId}
                    onChange={e => handleSelectBuilding(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="">-- Choose Your House / Plot Number --</option>
                    {buildings.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.house_number} {b.building_name ? `(${b.building_name})` : ''} - {b.landlord_name ? `Landlord: ${b.landlord_name}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {selectedBuildingId && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      2. Payment Mode
                    </label>

                    <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentMode('SINGLE');
                          setSelectedFlatIds([]);
                        }}
                        className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                          paymentMode === 'SINGLE' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                        }`}
                      >
                        Single Flat
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentMode('BULK');
                          setPayerType('LANDLORD');
                        }}
                        className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                          paymentMode === 'BULK' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                        }`}
                      >
                        Bulk Compound / Landlord
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-slate-600 font-medium">
                        {paymentMode === 'SINGLE' ? 'Select your flat:' : 'Select flats to pay for:'}
                      </span>
                      {paymentMode === 'BULK' && flats.length > 0 && (
                        <button
                          type="button"
                          onClick={handleSelectAllFlats}
                          className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                        >
                          {selectedFlatIds.length === flats.length ? 'Deselect All' : 'Select All Flats'}
                        </button>
                      )}
                    </div>

                    {loadingFlats ? (
                      <div className="p-4 text-center text-xs text-slate-400">Loading flats...</div>
                    ) : flats.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                        No active billing flats configured for this building yet. Please contact the security desk.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                        {flats.map(flat => {
                          const isSelected = selectedFlatIds.includes(flat.id);
                          return (
                            <button
                              key={flat.id}
                              type="button"
                              onClick={() => handleToggleFlat(flat.id)}
                              className={`p-2.5 rounded-lg border text-left flex items-center justify-between transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold'
                                  : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
                              }`}
                            >
                              <div>
                                <span className="text-xs block font-semibold">{flat.flat_number}</span>
                                {flat.occupant_name && (
                                  <span className="text-[10px] text-slate-400 block truncate max-w-[120px]">
                                    {flat.occupant_name}
                                  </span>
                                )}
                              </div>
                              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                                isSelected ? 'bg-emerald-600 text-white' : 'border border-slate-300'
                              }`}>
                                {isSelected && <Check className="w-2.5 h-2.5" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Summary Bar */}
                  {selectedFlatIds.length > 0 && (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-xs text-emerald-900 font-semibold block">
                          {selectedFlatIds.length} flat(s) selected
                        </span>
                        <span className="text-[11px] text-emerald-700">₦1,500 per flat</span>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-black text-emerald-900 font-mono">
                          ₦{totalAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: ENTER PAYER DETAILS */}
          {step === 'DETAILS' && (
            <form onSubmit={handleInitiatePayment} className="space-y-3.5">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                <div>
                  <span className="text-slate-500 block">Covering:</span>
                  <span className="font-bold text-slate-900">
                    {selectedFlatIds.length} flat(s) in {buildings.find(b => b.id === selectedBuildingId)?.house_number}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block">Total Due:</span>
                  <span className="font-black text-emerald-700 font-mono text-sm">₦{totalAmount.toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payer Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Chukwudi Eze or Landlord Compound Rep"
                  value={payerName}
                  onChange={e => setPayerName(e.target.value)}
                  className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address (for Digital Receipt) *</label>
                <input
                  type="email"
                  placeholder="e.g. resident@gmail.com"
                  value={payerEmail}
                  onChange={e => setPayerEmail(e.target.value)}
                  className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="080..."
                    value={payerPhone}
                    onChange={e => setPayerPhone(e.target.value)}
                    className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl px-3 py-2.5"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">I am a</label>
                  <select
                    value={payerType}
                    onChange={e => setPayerType(e.target.value as any)}
                    className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl px-3 py-2.5 bg-white"
                  >
                    <option value="RESIDENT">Resident / Tenant</option>
                    <option value="LANDLORD">Landlord / Owner</option>
                    <option value="AGENT">Caretaker / Agent</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900 flex items-start gap-2">
                <CreditCard className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <span>
                  Payments are processed via our verified Paystack Security Account. Instant electronic receipts issued upon clearance.
                </span>
              </div>

              <button
                type="submit"
                disabled={processing}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <CreditCard className="w-4 h-4" />
                <span>{processing ? 'Connecting Gateway...' : `Pay ₦${totalAmount.toLocaleString()} via Paystack`}</span>
              </button>
            </form>
          )}

          {/* STEP 3: SUCCESSFUL RECEIPT */}
          {step === 'SUCCESS' && verifiedReceipt && (
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div>
                <h4 className="text-lg font-bold text-slate-900">Payment Confirmed!</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Security levy of ₦{verifiedReceipt.amount.toLocaleString()} successfully credited.
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Official Reference:</span>
                  <span className="font-mono font-bold text-slate-900">{verifiedReceipt.reference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Billing Month:</span>
                  <span className="font-semibold text-slate-800">{verifiedReceipt.billingMonth}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Flats Credited:</span>
                  <span className="font-semibold text-emerald-700">{verifiedReceipt.totalUnits} unit(s)</span>
                </div>

                <div className="pt-2 border-t border-slate-200 mt-2">
                  <span className="text-slate-600 font-bold block mb-1">Receipt Breakdown:</span>
                  {verifiedReceipt.allocations.map(a => (
                    <div key={a.id} className="flex justify-between py-1 text-[11px]">
                      <span className="text-slate-700">Receipt #{a.receipt_number}</span>
                      <span className="font-bold text-emerald-600">₦{Number(a.allocated_amount).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Receipt
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer (for Step 1) */}
        {step === 'SELECT' && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={selectedFlatIds.length === 0}
              onClick={handleProceedToDetails}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <span>Continue to Checkout</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
