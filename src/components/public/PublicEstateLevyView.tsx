import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  CheckCircle2,
  Calendar,
  Search,
  ArrowLeft,
  AlertCircle,
  Building,
  FileCheck2,
  Lock,
  ChevronRight,
  Clock
} from 'lucide-react';
import {
  EstateSettings,
  Resident,
  NavigationTab,
  BuildingEstateLevyReceipt
} from '../../types/database';
import { PublicNavbar } from '../layout/PublicNavbar';
import { PublicFooter } from '../layout/PublicFooter';
import { SEOHead } from '../common/SEOHead';
import { EstateLevyPaymentModal } from '../payments/EstateLevyPaymentModal';
import { EstateLevyReceiptModal } from '../payments/EstateLevyReceiptModal';
import { estateLevyService, EstateLevyLookupResult, EstateLevyBuildingItem } from '../../services/estateLevyService';

interface PublicEstateLevyViewProps {
  estateSettings: EstateSettings;
  currentResident?: Resident | null;
  onNavigate: (tab: NavigationTab) => void;
  onOpenResidentLogin: () => void;
}

export const PublicEstateLevyView: React.FC<PublicEstateLevyViewProps> = ({
  estateSettings,
  currentResident,
  onNavigate,
  onOpenResidentLogin
}) => {
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedBuildingForPay, setSelectedBuildingForPay] = useState<any | null>(null);

  // Search / Lookup state
  const [searchBuildingTag, setSearchBuildingTag] = useState(currentResident?.house_number || '');
  const [lookupResult, setLookupResult] = useState<EstateLevyLookupResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Selected Billing Month
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  // Directory of buildings
  const [buildingsList, setBuildingsList] = useState<EstateLevyBuildingItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  // Receipt Modal State
  const [viewingReceipt, setViewingReceipt] = useState<BuildingEstateLevyReceipt | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // URL Query Parameters check (e.g. ?verify_reference=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verifyRef = params.get('verify_reference') || params.get('reference');
    if (verifyRef) {
      handleAutoVerify(verifyRef);
    }
  }, []);

  useEffect(() => {
    loadBuildings();
  }, [selectedMonth]);

  const loadBuildings = async () => {
    setLoadingList(true);
    try {
      const res = await estateLevyService.getBuildings(selectedMonth);
      if (res.success && Array.isArray(res.data)) {
        setBuildingsList(res.data);
      }
    } catch (err) {
      console.error('Error fetching estate levy buildings:', err);
    } finally {
      setLoadingList(false);
    }
  };

  const handleAutoVerify = async (ref: string) => {
    try {
      const res = await estateLevyService.verifyPayment(ref);
      if (res.success && res.verified && res.receipt) {
        setViewingReceipt(res.receipt);
        setIsReceiptModalOpen(true);
      }
    } catch (err) {
      console.warn('Auto verification error:', err);
    }
  };

  const handleLookupBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchBuildingTag.trim()) {
      setSearchError('Please enter a building tag or house number (e.g. 016, 238, Plot 14).');
      return;
    }

    setSearching(true);
    setSearchError('');
    try {
      const res = await estateLevyService.lookupBuilding(searchBuildingTag.trim(), selectedMonth);
      if (!res.success || !res.building) {
        setSearchError(res.message || `Building "${searchBuildingTag}" was not found in the estate registry.`);
        setLookupResult(null);
      } else {
        setLookupResult(res);
      }
    } catch {
      setSearchError('Unable to connect to the estate directory. Please check your network.');
      setLookupResult(null);
    } finally {
      setSearching(false);
    }
  };

  const handleOpenPayment = (building?: any) => {
    setSelectedBuildingForPay(building || null);
    setIsPayModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <SEOHead
        title="Monthly Estate Levy — Finger of God Estate"
        description="Pay your monthly estate levy online, track your payment status, and access your verified payment receipts."
        keywords={['Monthly Estate Levy', 'Finger of God Estate', 'Paystack Online Checkout', 'Estate Dues Receipt', 'Asaba Delta State']}
        canonicalPath="/#estate-levy"
        ogType="website"
      />

      <PublicNavbar
        currentTab="estate_levy"
        estateSettings={estateSettings}
        currentResident={currentResident}
        onNavigate={onNavigate}
        onOpenResidentLogin={onOpenResidentLogin}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* 1. Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <button
              onClick={() => onNavigate('home')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-700 transition-colors mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home Dashboard</span>
            </button>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
              Monthly Estate Levy
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl">
              Pay your monthly estate levy online, track your payment status, and access your verified payment receipts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleOpenPayment()}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              <span>Pay Estate Levy</span>
            </button>
          </div>
        </div>

        {/* 2. Professional Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Monthly Levy</p>
            <p className="text-3xl font-black text-emerald-950 font-mono">₦1,000</p>
            <p className="text-xs text-slate-600">Per building, per month.</p>
            <div className="pt-2 flex items-center gap-1.5 text-[11px] text-emerald-800 font-semibold">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>Due date: 1st of every month</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Payment Channel</p>
            <p className="text-sm font-bold text-slate-900">Secure Online Checkout</p>
            <p className="text-xs text-slate-600 leading-relaxed">
              Secure online checkout through Paystack, using the payment channels actually enabled for this account.
            </p>
            <div className="pt-2 flex items-center gap-1.5 text-[11px] text-slate-600">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span>PCI-DSS certified gateway</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Receipt Information</p>
            <p className="text-sm font-bold text-slate-900">Verified Payment Receipt</p>
            <p className="text-xs text-slate-600 leading-relaxed">
              A verified receipt will be available once payment has been confirmed.
            </p>
            <div className="pt-2 flex items-center gap-1.5 text-[11px] text-slate-600">
              <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Instant digital confirmation</span>
            </div>
          </div>
        </div>

        {/* 3. Building Status Lookup & Quick Payment */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Building Status Lookup */}
          <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-5">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Search className="w-4 h-4 text-emerald-700" />
                <span>Check Building Levy Status</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Enter your building identifier or house number to verify payment status and access verified receipts.
              </p>
            </div>

            <form onSubmit={handleLookupBuilding} className="flex gap-2">
              <input
                type="text"
                placeholder="Enter building or house number (e.g. 016, 238, Plot 14)"
                value={searchBuildingTag}
                onChange={(e) => setSearchBuildingTag(e.target.value)}
                className="flex-1 px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 text-slate-900 font-medium"
              />
              <button
                type="submit"
                disabled={searching}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {searching ? 'Checking...' : 'Check Status'}
              </button>
            </form>

            {searchError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{searchError}</span>
              </div>
            )}

            {lookupResult && lookupResult.building && (
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/70 pb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                      Verified Building Record
                    </span>
                    <p className="text-sm font-bold text-emerald-950">
                      Building: {lookupResult.building.house_number}
                      {lookupResult.building.building_name ? ` (${lookupResult.building.building_name})` : ''}
                    </p>
                    {lookupResult.building.landlord_name && (
                      <p className="text-xs text-emerald-800">
                        Responsible Account: {lookupResult.building.landlord_name}
                      </p>
                    )}
                  </div>

                  {lookupResult.obligation?.status === 'PAID' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-200/80 text-emerald-900 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                      <span>PAID FOR {selectedMonth}</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => handleOpenPayment(lookupResult.building)}
                      className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Pay ₦1,000</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Billing Unit</p>
                    <p className="font-semibold text-slate-800">1 Building</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Monthly Rate</p>
                    <p className="font-mono font-bold text-emerald-900">₦1,000</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-emerald-100 col-span-2 sm:col-span-1">
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Status ({selectedMonth})</p>
                    <p className="font-bold text-slate-800">
                      {lookupResult.obligation?.status || 'UNPAID'}
                    </p>
                  </div>
                </div>

                {/* Receipts for this building */}
                {lookupResult.receipts && lookupResult.receipts.length > 0 && (
                  <div className="pt-2 border-t border-emerald-200/70 space-y-1.5">
                    <p className="text-[11px] font-bold text-emerald-950">Verified Payment Receipts:</p>
                    <div className="space-y-1">
                      {lookupResult.receipts.map((r) => (
                        <div
                          key={r.receipt_number}
                          className="bg-white p-2.5 rounded-lg border border-emerald-100 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-mono font-bold text-slate-900">#{r.receipt_number}</span>
                            <span className="text-slate-500 ml-2">({r.billing_month_label || r.billing_month})</span>
                          </div>
                          <button
                            onClick={() => {
                              setViewingReceipt(r);
                              setIsReceiptModalOpen(true);
                            }}
                            className="text-emerald-700 hover:text-emerald-800 font-bold text-xs flex items-center gap-1 cursor-pointer"
                          >
                            <FileCheck2 className="w-3.5 h-3.5" />
                            <span>View Receipt</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Policy & Billing Rules */}
          <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-700" />
              <span>Estate Levy Billing Policy</span>
            </h3>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <p className="font-bold text-slate-900">₦1,000 Per Building Rate</p>
                <p className="leading-relaxed">
                  The monthly estate levy is fixed at exactly ₦1,000 per billable building. A building containing multiple residents or flats is not charged multiple times merely because several residents reside in that building.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <p className="font-bold text-slate-900">Billing Schedule</p>
                <p className="leading-relaxed">
                  Dues are assessed on the 1st of every calendar month. Payments made online are verified server-side and recorded immediately against the building ledger.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <p className="font-bold text-slate-900">Fund Separation</p>
                <p className="leading-relaxed">
                  Monthly estate levy dues are maintained in a dedicated estate account and managed strictly separate from road modernization contributions and gate security operations.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Active Buildings Directory */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building className="w-4 h-4 text-emerald-700" />
                <span>Estate Buildings Directory & Payment Ledger</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Overview of billable buildings and monthly levy clearance status.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">Billing Period:</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white"
              />
            </div>
          </div>

          {loadingList ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading building records...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Building Tag</th>
                    <th className="py-3 px-4">Building Description</th>
                    <th className="py-3 px-4">Responsible Account</th>
                    <th className="py-3 px-4">Monthly Levy</th>
                    <th className="py-3 px-4">Payment Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {buildingsList.slice(0, 15).map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {b.house_number}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {b.building_name || 'Residential Property'}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {b.landlord_name || 'Registered Landlord'}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        ₦1,000
                      </td>
                      <td className="py-3 px-4">
                        {b.obligation?.status === 'PAID' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            PAID
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            <Clock className="w-3 h-3" />
                            UNPAID
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {b.obligation?.status === 'PAID' ? (
                          <span className="text-[11px] font-medium text-slate-400">Clear</span>
                        ) : (
                          <button
                            onClick={() => handleOpenPayment(b)}
                            className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                          >
                            Pay ₦1,000
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {buildingsList.length > 15 && (
                <p className="text-[11px] text-slate-400 text-center pt-3">
                  Showing 15 of {buildingsList.length} estate buildings. Use the lookup tool above to search for any specific building tag.
                </p>
              )}
            </div>
          )}
        </div>
      </main>

      <PublicFooter
        estateSettings={estateSettings}
        onNavigate={onNavigate}
        onOpenResidentLogin={onOpenResidentLogin}
      />

      {/* Payment Modal */}
      {isPayModalOpen && (
        <EstateLevyPaymentModal
          isOpen={isPayModalOpen}
          initialBuilding={selectedBuildingForPay}
          onClose={() => {
            setIsPayModalOpen(false);
            setSelectedBuildingForPay(null);
          }}
          onPaymentSuccess={(rcpt) => {
            setViewingReceipt(rcpt);
            setIsReceiptModalOpen(true);
            loadBuildings();
          }}
        />
      )}

      {/* Receipt Modal */}
      {isReceiptModalOpen && viewingReceipt && (
        <EstateLevyReceiptModal
          isOpen={isReceiptModalOpen}
          receipt={viewingReceipt}
          onClose={() => {
            setIsReceiptModalOpen(false);
            setViewingReceipt(null);
          }}
        />
      )}
    </div>
  );
};
