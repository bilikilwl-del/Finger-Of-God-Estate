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
  const [selectedDurationForPay, setSelectedDurationForPay] = useState<1 | 12>(1);

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

  const handleOpenPayment = (building?: any, duration: 1 | 12 = 1) => {
    setSelectedBuildingForPay(building || null);
    setSelectedDurationForPay(duration);
    setIsPayModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 font-sans flex flex-col">
      <SEOHead
        title="Monthly Estate Levy — Finger of God Estate"
        description="Pay your monthly or annual building estate levy online, track your building clearance status, and access verified payment receipts."
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

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        {/* 1. Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-stone-200 pb-6">
          <div>
            <button
              onClick={() => onNavigate('home')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#064E3B] transition-colors mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Estate Homepage</span>
            </button>
            <div className="text-xs font-semibold text-[#064E3B] mb-1">
              Building Maintenance &amp; Civic Administration · ₦1,000 Per Building
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-display">
              Building Estate Levy
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1.5 max-w-3xl leading-relaxed">
              Pay your building estate levy online for 1 Month (₦1,000) or 12 Months (₦12,000), track your building clearance status, and download verified digital receipts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => handleOpenPayment(undefined, 1)}
              className="px-4 py-2.5 bg-[#064E3B] hover:bg-emerald-900 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              <span>Pay 1 Month (₦1,000)</span>
            </button>
            <button
              onClick={() => handleOpenPayment(undefined, 12)}
              className="px-4 py-2.5 bg-white hover:bg-stone-100 text-slate-900 border border-stone-300 font-semibold text-xs rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-[#064E3B]" />
              <span>Pay 12 Months (₦12,000)</span>
            </button>
          </div>
        </div>

        {/* 2. Professional Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-2xs space-y-2">
            <p className="text-xs font-semibold text-slate-500">Approved Building Rate</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-[#064E3B] font-mono tabular-nums">₦1,000</p>
              <span className="text-xs text-slate-500">/ month per building</span>
            </div>
            <p className="text-xs text-slate-600">
              1 Month (<strong className="font-mono">₦1,000</strong>) or 12 Months (<strong className="font-mono">₦12,000</strong>) option available.
            </p>
            <div className="pt-2 flex items-center gap-1.5 text-xs text-[#064E3B] font-medium">
              <Calendar className="w-3.5 h-3.5" />
              <span>Due date: 1st of every calendar month</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-2xs space-y-2">
            <p className="text-xs font-semibold text-slate-500">Payment Channel</p>
            <p className="text-base font-bold text-slate-900">Paystack Online Checkout</p>
            <p className="text-xs text-slate-600 leading-relaxed">
              Verified online checkout via card, bank transfer, or USSD with automatic server-side ledger allocation.
            </p>
            <div className="pt-2 flex items-center gap-1.5 text-xs text-slate-600">
              <Lock className="w-3.5 h-3.5 text-[#064E3B]" />
              <span>PCI-DSS certified payment gateway</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-2xs space-y-2">
            <p className="text-xs font-semibold text-slate-500">Official Receipting</p>
            <p className="text-base font-bold text-slate-900">Instant Digital Receipt</p>
            <p className="text-xs text-slate-600 leading-relaxed">
              A stamped digital receipt covering 1 month or 12 consecutive months is issued immediately upon confirmation.
            </p>
            <div className="pt-2 flex items-center gap-1.5 text-xs text-slate-600">
              <FileCheck2 className="w-3.5 h-3.5 text-[#064E3B]" />
              <span>Verifiable building payment record</span>
            </div>
          </div>
        </div>

        {/* 3. Building Status Lookup & Policy */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Building Status Lookup */}
          <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-stone-200 shadow-2xs space-y-5">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Search className="w-4 h-4 text-[#064E3B]" />
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
                className="flex-1 px-3.5 py-2.5 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#064E3B] focus:bg-white text-slate-900 font-medium"
              />
              <button
                type="submit"
                disabled={searching}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {searching ? 'Checking...' : 'Check Status'}
              </button>
            </form>

            {searchError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{searchError}</span>
              </div>
            )}

            {lookupResult && lookupResult.building && (
              <div className="p-5 bg-stone-50 border border-stone-200 rounded-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-3">
                  <div>
                    <span className="text-xs font-semibold text-[#064E3B] block">
                      Verified Building Record
                    </span>
                    <p className="text-base font-bold text-slate-900">
                      Building: {lookupResult.building.house_number}
                      {lookupResult.building.building_name ? ` (${lookupResult.building.building_name})` : ''}
                    </p>
                    {lookupResult.building.landlord_name && (
                      <p className="text-xs text-slate-600">
                        Responsible Account: {lookupResult.building.landlord_name}
                      </p>
                    )}
                  </div>

                  {lookupResult.obligation?.status === 'PAID' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-100 text-emerald-900 font-semibold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-[#064E3B]" />
                      <span>PAID FOR {selectedMonth}</span>
                    </span>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleOpenPayment(lookupResult.building, 1)}
                        className="px-3.5 py-2 bg-[#064E3B] hover:bg-emerald-900 text-white font-semibold text-xs rounded-lg shadow-2xs cursor-pointer flex items-center gap-1.5"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>1 Month (₦1,000)</span>
                      </button>
                      <button
                        onClick={() => handleOpenPayment(lookupResult.building, 12)}
                        className="px-3.5 py-2 bg-white hover:bg-stone-100 text-slate-900 border border-stone-300 font-semibold text-xs rounded-lg cursor-pointer"
                      >
                        12 Months (₦12,000)
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="bg-white p-3 rounded-lg border border-stone-200">
                    <p className="text-[11px] text-slate-500">Billing Unit</p>
                    <p className="font-semibold text-slate-900 mt-0.5">1 Building</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-stone-200">
                    <p className="text-[11px] text-slate-500">Monthly / Annual Rate</p>
                    <p className="font-mono font-bold text-[#064E3B] mt-0.5 tabular-nums">₦1,000 / ₦12,000</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-stone-200 col-span-2 sm:col-span-1">
                    <p className="text-[11px] text-slate-500">Status ({selectedMonth})</p>
                    <p className="font-bold text-slate-900 mt-0.5">
                      {lookupResult.obligation?.status || 'UNPAID'}
                    </p>
                  </div>
                </div>

                {/* Receipts for this building */}
                {lookupResult.receipts && lookupResult.receipts.length > 0 && (
                  <div className="pt-2 border-t border-stone-200 space-y-2">
                    <p className="text-xs font-semibold text-slate-900">Verified Payment Receipts:</p>
                    <div className="space-y-1.5">
                      {lookupResult.receipts.map((r) => (
                        <div
                          key={r.receipt_number}
                          className="bg-white p-2.5 rounded-lg border border-stone-200 flex items-center justify-between text-xs"
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
                            className="text-[#064E3B] hover:underline font-semibold text-xs flex items-center gap-1 cursor-pointer"
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
          <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-stone-200 shadow-2xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building className="w-4 h-4 text-[#064E3B]" />
              <span>Estate Levy Billing Policy</span>
            </h3>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3.5 bg-stone-50 rounded-lg border border-stone-200 space-y-1">
                <p className="font-bold text-slate-900">₦1,000 Per Building Rate</p>
                <p className="leading-relaxed">
                  The monthly estate levy is fixed at ₦1,000 per billable building (or ₦12,000 for 12 months). A building containing multiple residents or flats is assessed as a single building unit.
                </p>
              </div>

              <div className="p-3.5 bg-stone-50 rounded-lg border border-stone-200 space-y-1">
                <p className="font-bold text-slate-900">1-Month &amp; 12-Month Schedules</p>
                <p className="leading-relaxed">
                  Dues are assessed on the 1st of every calendar month. Building owners and representatives may pay for 1 month (₦1,000) or 12 consecutive months (₦12,000) in a single transaction.
                </p>
              </div>

              <div className="p-3.5 bg-stone-50 rounded-lg border border-stone-200 space-y-1">
                <p className="font-bold text-slate-900">Dedicated Building Ledger</p>
                <p className="leading-relaxed">
                  Monthly estate levy dues are maintained in a dedicated building ledger and managed strictly separate from capital infrastructure contributions and other estate collections.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Active Buildings Directory */}
        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building className="w-4 h-4 text-[#064E3B]" />
                <span>Estate Buildings Directory &amp; Payment Ledger</span>
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
                className="px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg bg-white font-medium text-slate-800"
              />
            </div>
          </div>

          {loadingList ? (
            <div className="py-10 text-center text-xs text-slate-500">Loading building records...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 text-slate-600 font-semibold">
                    <th className="py-3 px-4">Building Tag</th>
                    <th className="py-3 px-4">Building Description</th>
                    <th className="py-3 px-4">Responsible Account</th>
                    <th className="py-3 px-4">Monthly Levy</th>
                    <th className="py-3 px-4">Payment Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {buildingsList.slice(0, 15).map((b) => (
                    <tr key={b.id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 tabular-nums">
                        {b.house_number}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {b.building_name || 'Residential Property'}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {b.landlord_name || 'Registered Landlord'}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900 tabular-nums">
                        ₦1,000
                      </td>
                      <td className="py-3 px-4">
                        {b.obligation?.status === 'PAID' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#064E3B]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Paid</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Unpaid</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {b.obligation?.status === 'PAID' ? (
                          <span className="text-xs font-medium text-slate-400">Cleared</span>
                        ) : (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => handleOpenPayment(b, 1)}
                              className="px-2.5 py-1 bg-[#064E3B] hover:bg-emerald-900 text-white font-semibold text-xs rounded-md transition-colors cursor-pointer"
                            >
                              1m (₦1k)
                            </button>
                            <button
                              onClick={() => handleOpenPayment(b, 12)}
                              className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-slate-800 border border-stone-300 font-semibold text-xs rounded-md transition-colors cursor-pointer"
                            >
                              12m (₦12k)
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {buildingsList.length > 15 && (
                <p className="text-xs text-slate-500 text-center pt-4">
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
          initialDuration={selectedDurationForPay}
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
