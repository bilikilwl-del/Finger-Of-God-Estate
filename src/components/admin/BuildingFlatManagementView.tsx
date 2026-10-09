import React, { useState, useEffect } from 'react';
import {
  Building2,
  Home,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  CreditCard,
  FileText,
  Shield,
  Users,
  Coins,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Edit2,
  Archive,
  Eye,
  Check,
  X,
  RefreshCw,
  Layers,
  Calendar,
  Lock,
  DollarSign
} from 'lucide-react';
import {
  EstateSettings,
  Building,
  Flat,
  FlatObligation,
  SecurityLevyTransaction,
  FlatPaymentAllocation,
  Resident
} from '../../types/database';
import { securityLevyService } from '../../services/securityLevyService';

interface BuildingFlatManagementViewProps {
  estateSettings: EstateSettings;
  adminUser: { email: string; full_name?: string; role?: string } | null;
  residents: Resident[];
}

export const BuildingFlatManagementView: React.FC<BuildingFlatManagementViewProps> = ({
  estateSettings,
  adminUser,
  residents
}) => {
  const [activeTab, setActiveTab] = useState<'buildings' | 'obligations' | 'transactions' | 'manual' | 'audit'>('buildings');
  const [loading, setLoading] = useState(true);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [flatsByBuilding, setFlatsByBuilding] = useState<Record<string, Flat[]>>({});
  const [expandedBuildingId, setExpandedBuildingId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [obligations, setObligations] = useState<FlatObligation[]>([]);
  const [transactions, setTransactions] = useState<SecurityLevyTransaction[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'ARCHIVED'>('ACTIVE');

  // Modals
  const [isAddBuildingOpen, setIsAddBuildingOpen] = useState(false);
  const [isEditBuildingOpen, setIsEditBuildingOpen] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);

  const [isAddFlatOpen, setIsAddFlatOpen] = useState(false);
  const [isEditFlatOpen, setIsEditFlatOpen] = useState(false);
  const [targetBuildingIdForFlat, setTargetBuildingIdForFlat] = useState<string | null>(null);
  const [selectedFlat, setSelectedFlat] = useState<Flat | null>(null);

  // Manual payment state
  const [manualBuildingId, setManualBuildingId] = useState<string>('');
  const [manualSelectedFlatIds, setManualSelectedFlatIds] = useState<string[]>([]);
  const [manualPayerName, setManualPayerName] = useState('');
  const [manualPayerEmail, setManualPayerEmail] = useState('');
  const [manualPayerPhone, setManualPayerPhone] = useState('');
  const [manualPaymentMethod, setManualPaymentMethod] = useState<'MANUAL_BANK_TRANSFER' | 'MANUAL_CASH' | 'MANUAL_POS'>('MANUAL_BANK_TRANSFER');
  const [manualBankRef, setManualBankRef] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [submittingManual, setSubmittingManual] = useState(false);

  // Building form
  const [buildingForm, setBuildingForm] = useState({
    house_number: '',
    building_name: '',
    total_flats_count: 1,
    landlord_name: '',
    landlord_phone: '',
    landlord_email: '',
    notes: ''
  });

  // Flat form
  const [flatForm, setFlatForm] = useState({
    flat_number: '',
    label: '',
    occupant_type: 'TENANT' as 'TENANT' | 'LANDLORD' | 'VACANT' | 'COMMERCIAL',
    occupant_name: '',
    occupant_phone: '',
    occupant_email: '',
    is_billing_active: true,
    monthly_levy_amount: 1500
  });

  // Receipt modal state
  const [viewingReceipt, setViewingReceipt] = useState<any | null>(null);

  // Feedback message
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const adminToken = localStorage.getItem('fog_admin_token') || 'local_session';

  const loadData = async () => {
    setLoading(true);
    try {
      const bList = await securityLevyService.getBuildings();
      setBuildings(bList);

      const obList = await securityLevyService.getObligations({ billingMonth: selectedMonth });
      setObligations(obList);

      const txList = await securityLevyService.getTransactions(adminToken);
      setTransactions(txList);

      const aLogs = await securityLevyService.getAuditLogs(adminToken);
      setAuditLogs(aLogs);
    } catch (err) {
      console.error('Error loading building management data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  const loadFlatsForBuilding = async (buildingId: string) => {
    try {
      const fList = await securityLevyService.getFlats(buildingId);
      setFlatsByBuilding(prev => ({ ...prev, [buildingId]: fList }));
    } catch (err) {
      console.error('Error fetching flats for building:', err);
    }
  };

  const handleToggleExpandBuilding = (buildingId: string) => {
    if (expandedBuildingId === buildingId) {
      setExpandedBuildingId(null);
    } else {
      setExpandedBuildingId(buildingId);
      if (!flatsByBuilding[buildingId]) {
        loadFlatsForBuilding(buildingId);
      }
    }
  };

  const handleSaveBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buildingForm.house_number.trim()) {
      setFeedback({ text: 'House number is required.', type: 'error' });
      return;
    }

    try {
      if (selectedBuilding) {
        const res = await securityLevyService.updateBuilding(selectedBuilding.id, buildingForm, adminToken);
        if (res.success) {
          setFeedback({ text: 'Building updated successfully.', type: 'success' });
          setIsEditBuildingOpen(false);
          loadData();
        } else {
          setFeedback({ text: res.message || 'Failed to update building.', type: 'error' });
        }
      } else {
        const res = await securityLevyService.createBuilding(buildingForm, adminToken);
        if (res.success) {
          setFeedback({ text: `Building ${buildingForm.house_number} created successfully.`, type: 'success' });
          setIsAddBuildingOpen(false);
          setBuildingForm({
            house_number: '',
            building_name: '',
            total_flats_count: 1,
            landlord_name: '',
            landlord_phone: '',
            landlord_email: '',
            notes: ''
          });
          loadData();
        } else {
          setFeedback({ text: res.message || 'Failed to register building.', type: 'error' });
        }
      }
    } catch (err: any) {
      setFeedback({ text: err.message || 'Error saving building.', type: 'error' });
    }
  };

  const handleArchiveBuilding = async (building: Building) => {
    if (!window.confirm(`Are you sure you want to archive ${building.house_number}? All historical transactions and flats will be safely preserved.`)) {
      return;
    }
    try {
      const res = await securityLevyService.archiveBuilding(building.id, adminToken);
      if (res.success) {
        setFeedback({ text: `Building ${building.house_number} archived.`, type: 'success' });
        loadData();
      } else {
        setFeedback({ text: res.message || 'Could not archive building.', type: 'error' });
      }
    } catch (err: any) {
      setFeedback({ text: err.message || 'Error archiving building.', type: 'error' });
    }
  };

  const handleSaveFlat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flatForm.flat_number.trim()) {
      setFeedback({ text: 'Flat number is required.', type: 'error' });
      return;
    }

    try {
      if (selectedFlat) {
        const res = await securityLevyService.updateFlat(selectedFlat.id, flatForm, adminToken);
        if (res.success) {
          setFeedback({ text: 'Flat updated successfully.', type: 'success' });
          setIsEditFlatOpen(false);
          if (selectedFlat.building_id) loadFlatsForBuilding(selectedFlat.building_id);
          loadData();
        } else {
          setFeedback({ text: res.message || 'Failed to update flat.', type: 'error' });
        }
      } else if (targetBuildingIdForFlat) {
        const res = await securityLevyService.createFlat(targetBuildingIdForFlat, flatForm, adminToken);
        if (res.success) {
          setFeedback({ text: `Flat ${flatForm.flat_number} registered successfully.`, type: 'success' });
          setIsAddFlatOpen(false);
          setFlatForm({
            flat_number: '',
            label: '',
            occupant_type: 'TENANT',
            occupant_name: '',
            occupant_phone: '',
            occupant_email: '',
            is_billing_active: true,
            monthly_levy_amount: 1500
          });
          loadFlatsForBuilding(targetBuildingIdForFlat);
          loadData();
        } else {
          setFeedback({ text: res.message || 'Failed to create flat.', type: 'error' });
        }
      }
    } catch (err: any) {
      setFeedback({ text: err.message || 'Error saving flat.', type: 'error' });
    }
  };

  const handleToggleFlatBilling = async (flat: Flat) => {
    try {
      const newActive = !flat.is_billing_active;
      const res = await securityLevyService.updateFlat(flat.id, { is_billing_active: newActive }, adminToken);
      if (res.success) {
        setFeedback({
          text: `Flat ${flat.flat_number} billing set to ${newActive ? 'ACTIVE (₦1,500/mo)' : 'INACTIVE'}`,
          type: 'success'
        });
        loadFlatsForBuilding(flat.building_id);
        loadData();
      }
    } catch (err: any) {
      setFeedback({ text: err.message || 'Error updating billing status.', type: 'error' });
    }
  };

  const handleGenerateMonthlyBills = async () => {
    if (!window.confirm(`Generate official ₦1,500 Security Levy obligations for billing month ${selectedMonth}?`)) {
      return;
    }
    try {
      const res = await securityLevyService.generateObligations(selectedMonth, adminToken);
      if (res.success) {
        setFeedback({
          text: `Generated ${res.data?.generated_count || 0} obligations for ${selectedMonth} (${res.data?.skipped_count || 0} already existed).`,
          type: 'success'
        });
        loadData();
      } else {
        setFeedback({ text: res.message || 'Failed to generate obligations.', type: 'error' });
      }
    } catch (err: any) {
      setFeedback({ text: err.message || 'Error generating obligations.', type: 'error' });
    }
  };

  const handleRecordManualPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBuildingId || manualSelectedFlatIds.length === 0) {
      setFeedback({ text: 'Please select a building and at least one flat.', type: 'error' });
      return;
    }
    if (!manualPayerName.trim() || !manualNotes.trim()) {
      setFeedback({ text: 'Payer name and administrative notes are required.', type: 'error' });
      return;
    }

    setSubmittingManual(true);
    try {
      const res = await securityLevyService.recordManualPayment({
        transaction_type: manualSelectedFlatIds.length > 1 ? 'BULK_FLATS' : 'INDIVIDUAL_FLAT',
        building_id: manualBuildingId,
        flat_ids: manualSelectedFlatIds,
        billing_month: selectedMonth,
        payer_name: manualPayerName.trim(),
        payer_email: manualPayerEmail.trim() || adminUser?.email,
        payer_phone: manualPayerPhone.trim(),
        payment_method: manualPaymentMethod,
        bank_reference: manualBankRef.trim() || undefined,
        notes: manualNotes.trim()
      }, adminToken);

      if (res.success) {
        setFeedback({
          text: `Payment of ₦${(manualSelectedFlatIds.length * 1500).toLocaleString()} successfully recorded and allocated!`,
          type: 'success'
        });
        // Reset form
        setManualSelectedFlatIds([]);
        setManualPayerName('');
        setManualPayerPhone('');
        setManualBankRef('');
        setManualNotes('');
        setActiveTab('transactions');
        loadData();
      } else {
        setFeedback({ text: res.message || 'Failed to record manual payment.', type: 'error' });
      }
    } catch (err: any) {
      setFeedback({ text: err.message || 'Error recording manual payment.', type: 'error' });
    } finally {
      setSubmittingManual(false);
    }
  };

  // KPI calculations
  const totalBuildingsCount = buildings.filter(b => b.status !== 'ARCHIVED').length;
  const totalFlatsCount = buildings.reduce((acc, b) => acc + (b.flats_count || 0), 0);
  const activeBillingFlatsCount = buildings.reduce((acc, b) => acc + (b.active_billing_flats_count || 0), 0);
  const expectedMonthlyRevenue = activeBillingFlatsCount * 1500;

  const currentMonthPaidObligations = obligations.filter(o => o.status === 'PAID');
  const currentMonthUnpaidObligations = obligations.filter(o => o.status === 'UNPAID');
  const collectedThisMonth = currentMonthPaidObligations.length * 1500;
  const outstandingThisMonth = currentMonthUnpaidObligations.length * 1500;

  const filteredBuildings = buildings.filter(b => {
    if (filterStatus !== 'ALL' && b.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchHouse = b.house_number.toLowerCase().includes(q);
      const matchName = b.building_name?.toLowerCase().includes(q);
      const matchLandlord = b.landlord_name?.toLowerCase().includes(q);
      return matchHouse || matchName || matchLandlord;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-50 text-blue-700 rounded-lg">
              <Building2 className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900">Building & Flat Management</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Official ₦1,500 monthly Security Levy per active flat. Multi-flat compounds & Landlord bulk billing console.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSelectedBuilding(null);
              setBuildingForm({
                house_number: '',
                building_name: '',
                total_flats_count: 1,
                landlord_name: '',
                landlord_phone: '',
                landlord_email: '',
                notes: ''
              });
              setIsAddBuildingOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Register Building
          </button>

          <button
            onClick={loadData}
            title="Refresh Data"
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div className={`p-4 rounded-lg flex items-center justify-between text-xs sm:text-sm font-medium ${
          feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Registered Buildings</span>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{totalBuildingsCount}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{totalFlatsCount} total flats registered</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Active Billing Flats</span>
            <Home className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{activeBillingFlatsCount}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">@ ₦1,500/month flat levy</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Collected ({selectedMonth})</span>
            <CheckCircle2 className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-600 mt-2">₦{collectedThisMonth.toLocaleString()}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{currentMonthPaidObligations.length} flat(s) paid</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Outstanding ({selectedMonth})</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-2">₦{outstandingThisMonth.toLocaleString()}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{currentMonthUnpaidObligations.length} flat(s) unpaid</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 bg-white rounded-t-xl px-4 flex gap-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('buildings')}
          className={`py-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'buildings'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Buildings & Flats Directory
        </button>

        <button
          onClick={() => setActiveTab('obligations')}
          className={`py-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'obligations'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Monthly Bills ({selectedMonth})
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`py-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'transactions'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Transactions & Allocations
        </button>

        <button
          onClick={() => setActiveTab('manual')}
          className={`py-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'manual'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Record Manual Payment
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`py-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'audit'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Lock className="w-4 h-4" />
          Audit Trail
        </button>
      </div>

      {/* TAB 1: BUILDINGS & FLATS */}
      {activeTab === 'buildings' && (
        <div className="bg-white rounded-b-xl border border-t-0 border-slate-200 p-5 space-y-4 shadow-xs">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search house no. or landlord..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <label className="text-xs text-slate-500 font-medium">Status:</label>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as any)}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden"
              >
                <option value="ACTIVE">Active Buildings</option>
                <option value="ALL">All Buildings</option>
                <option value="ARCHIVED">Archived Only</option>
              </select>
            </div>
          </div>

          {/* Buildings List */}
          {filteredBuildings.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
              <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700">No buildings registered yet</p>
              <p className="text-xs text-slate-400 mt-1">Click "Register Building" to add house numbers and flats.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBuildings.map(b => {
                const isExpanded = expandedBuildingId === b.id;
                const buildingFlats = flatsByBuilding[b.id] || [];

                return (
                  <div key={b.id} className="border border-slate-200 rounded-xl overflow-hidden transition-all">
                    {/* Building Row Header */}
                    <div
                      onClick={() => handleToggleExpandBuilding(b.id)}
                      className="p-4 bg-slate-50 hover:bg-slate-100/80 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="p-2 bg-white border border-slate-200 rounded-lg text-blue-600 shadow-2xs">
                          <Home className="w-4 h-4" />
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm sm:text-base">{b.house_number}</span>
                            {b.building_name && (
                              <span className="text-xs text-slate-500">({b.building_name})</span>
                            )}
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                              b.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                            }`}>
                              {b.status}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-3">
                            <span>Landlord: {b.landlord_name || 'Not specified'}</span>
                            {b.landlord_phone && <span>Tel: {b.landlord_phone}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 self-end md:self-auto">
                        <div className="text-right">
                          <span className="text-xs font-semibold text-slate-700 block">
                            {b.active_billing_flats_count || 0} / {b.flats_count || 0} flats active
                          </span>
                          <span className="text-[11px] text-slate-400">
                            ₦{((b.active_billing_flats_count || 0) * 1500).toLocaleString()}/month
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              setSelectedBuilding(b);
                              setBuildingForm({
                                house_number: b.house_number,
                                building_name: b.building_name || '',
                                total_flats_count: b.total_flats_count,
                                landlord_name: b.landlord_name || '',
                                landlord_phone: b.landlord_phone || '',
                                landlord_email: b.landlord_email || '',
                                notes: b.notes || ''
                              });
                              setIsEditBuildingOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-colors"
                            title="Edit Building"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleArchiveBuilding(b)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                            title="Archive Building"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </div>

                    {/* Expanded Flats Accordion */}
                    {isExpanded && (
                      <div className="p-4 bg-white border-t border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Flats inside {b.house_number} ({buildingFlats.length})
                          </h4>

                          <button
                            onClick={() => {
                              setSelectedFlat(null);
                              setTargetBuildingIdForFlat(b.id);
                              setFlatForm({
                                flat_number: `Flat ${buildingFlats.length + 1}`,
                                label: '',
                                occupant_type: 'TENANT',
                                occupant_name: '',
                                occupant_phone: '',
                                occupant_email: '',
                                is_billing_active: true,
                                monthly_levy_amount: 1500
                              });
                              setIsAddFlatOpen(true);
                            }}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add Flat
                          </button>
                        </div>

                        {buildingFlats.length === 0 ? (
                          <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                            No flats added yet. Click "+ Add Flat" to add individual flats to this building.
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                              <thead className="bg-slate-50 text-slate-600 font-semibold border-y border-slate-200">
                                <tr>
                                  <th className="py-2.5 px-3">Flat Identifier</th>
                                  <th className="py-2.5 px-3">Occupant Type</th>
                                  <th className="py-2.5 px-3">Resident / Tenant</th>
                                  <th className="py-2.5 px-3">Billing Status</th>
                                  <th className="py-2.5 px-3">Current Month</th>
                                  <th className="py-2.5 px-3 text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {buildingFlats.map(flat => (
                                  <tr key={flat.id} className="hover:bg-slate-50/50">
                                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                                      {flat.flat_number}
                                      {flat.label && <span className="text-[11px] text-slate-400 block font-normal">{flat.label}</span>}
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                        flat.occupant_type === 'LANDLORD' ? 'bg-purple-100 text-purple-800' :
                                        flat.occupant_type === 'TENANT' ? 'bg-blue-100 text-blue-800' :
                                        flat.occupant_type === 'COMMERCIAL' ? 'bg-amber-100 text-amber-800' :
                                        'bg-slate-100 text-slate-600'
                                      }`}>
                                        {flat.occupant_type}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <span className="font-medium text-slate-800">{flat.occupant_name || 'Vacant / Unassigned'}</span>
                                      {flat.occupant_phone && <span className="text-[11px] text-slate-400 block">{flat.occupant_phone}</span>}
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <button
                                        onClick={() => handleToggleFlatBilling(flat)}
                                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-colors ${
                                          flat.is_billing_active
                                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                        title="Click to toggle billing active status"
                                      >
                                        {flat.is_billing_active ? 'Active (₦1,500)' : 'Deactivated'}
                                      </button>
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                        flat.current_month_status === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                                        flat.current_month_status === 'UNPAID' ? 'bg-rose-100 text-rose-800' :
                                        'bg-slate-100 text-slate-600'
                                      }`}>
                                        {flat.current_month_status || 'UNPAID'}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3 text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        <button
                                          onClick={() => {
                                            setSelectedFlat(flat);
                                            setFlatForm({
                                              flat_number: flat.flat_number,
                                              label: flat.label || '',
                                              occupant_type: flat.occupant_type,
                                              occupant_name: flat.occupant_name || '',
                                              occupant_phone: flat.occupant_phone || '',
                                              occupant_email: flat.occupant_email || '',
                                              is_billing_active: flat.is_billing_active,
                                              monthly_levy_amount: 1500
                                            });
                                            setIsEditFlatOpen(true);
                                          }}
                                          className="p-1 text-slate-400 hover:text-slate-700 rounded-sm"
                                          title="Edit Flat"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MONTHLY BILLING & OBLIGATIONS */}
      {activeTab === 'obligations' && (
        <div className="bg-white rounded-b-xl border border-t-0 border-slate-200 p-5 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-700">Billing Month:</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-hidden"
              />
            </div>

            <button
              onClick={handleGenerateMonthlyBills}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Generate Monthly Obligations for {selectedMonth}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-y border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Building (House #)</th>
                  <th className="py-2.5 px-3">Flat Identifier</th>
                  <th className="py-2.5 px-3">Occupant</th>
                  <th className="py-2.5 px-3">Rate Due</th>
                  <th className="py-2.5 px-3">Amount Paid</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {obligations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No obligations generated for {selectedMonth}. Click "Generate Monthly Obligations" above.
                    </td>
                  </tr>
                ) : (
                  obligations.map(o => (
                    <tr key={o.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{o.building_house_number}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">{o.flat_number}</td>
                      <td className="py-2.5 px-3 text-slate-600">{o.occupant_name || 'Unassigned'}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">₦{Number(o.amount_due).toLocaleString()}</td>
                      <td className="py-2.5 px-3 font-semibold text-emerald-600">₦{Number(o.amount_paid).toLocaleString()}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          o.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                          o.status === 'UNPAID' ? 'bg-rose-100 text-rose-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {o.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: TRANSACTIONS & ALLOCATIONS */}
      {activeTab === 'transactions' && (
        <div className="bg-white rounded-b-xl border border-t-0 border-slate-200 p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Unified Security Levy Ledger</h3>
            <span className="text-xs text-slate-500">{transactions.length} recorded transaction(s)</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-y border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Reference</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Payer Details</th>
                  <th className="py-2.5 px-3">Month</th>
                  <th className="py-2.5 px-3">Flats Count</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      No security levy transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  transactions.map(tx => (
                    <tr key={tx.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">{tx.paystack_reference}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          tx.transaction_type === 'BULK_FLATS' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {tx.transaction_type === 'BULK_FLATS' ? 'Bulk Compounds' : 'Single Flat'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-900">{tx.payer_name}</span>
                        <span className="text-[11px] text-slate-400 block">{tx.payer_email}</span>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-700">{tx.billing_month}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{tx.total_units} unit(s)</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">₦{Number(tx.expected_amount).toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-slate-600">{tx.payment_method}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          tx.payment_status === 'SUCCESSFUL' ? 'bg-emerald-100 text-emerald-800' :
                          tx.payment_status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {tx.payment_status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={async () => {
                            const allocs = await securityLevyService.getAllocations({ transactionId: tx.id });
                            setViewingReceipt({ tx, allocations: allocs });
                          }}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                        >
                          View Breakdown
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: RECORD MANUAL PAYMENT */}
      {activeTab === 'manual' && (
        <div className="bg-white rounded-b-xl border border-t-0 border-slate-200 p-5 space-y-4 shadow-xs max-w-2xl">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Record Manual Security Levy Payment</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Admin-authorized offline collection (Cash, Direct Bank Transfer, POS). Allocates ₦1,500 per selected flat with audit logs.
            </p>
          </div>

          <form onSubmit={handleRecordManualPayment} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Select Building *</label>
              <select
                value={manualBuildingId}
                onChange={async e => {
                  const bId = e.target.value;
                  setManualBuildingId(bId);
                  setManualSelectedFlatIds([]);
                  if (bId) {
                    await loadFlatsForBuilding(bId);
                  }
                }}
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">-- Choose Building / House Number --</option>
                {buildings.filter(b => b.status === 'ACTIVE').map(b => (
                  <option key={b.id} value={b.id}>
                    {b.house_number} {b.building_name ? `(${b.building_name})` : ''} - Landlord: {b.landlord_name || 'N/A'}
                  </option>
                ))}
              </select>
            </div>

            {manualBuildingId && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Flats to Credit * ({manualSelectedFlatIds.length} selected = ₦{(manualSelectedFlatIds.length * 1500).toLocaleString()})
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200 max-h-48 overflow-y-auto">
                  {(flatsByBuilding[manualBuildingId] || []).map(f => {
                    const isChecked = manualSelectedFlatIds.includes(f.id);
                    return (
                      <label key={f.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer p-1.5 hover:bg-white rounded-md">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            if (e.target.checked) {
                              setManualSelectedFlatIds(prev => [...prev, f.id]);
                            } else {
                              setManualSelectedFlatIds(prev => prev.filter(id => id !== f.id));
                            }
                          }}
                          className="rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-medium">{f.flat_number}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payer Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Chief Okafor (Landlord)"
                  value={manualPayerName}
                  onChange={e => setManualPayerName(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payer Phone</label>
                <input
                  type="tel"
                  placeholder="e.g. 08012345678"
                  value={manualPayerPhone}
                  onChange={e => setManualPayerPhone(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={manualPaymentMethod}
                  onChange={e => setManualPaymentMethod(e.target.value as any)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2"
                >
                  <option value="MANUAL_BANK_TRANSFER">Direct Bank Transfer</option>
                  <option value="MANUAL_CASH">Cash Collection</option>
                  <option value="MANUAL_POS">POS Terminal</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Reference / Teller #</label>
                <input
                  type="text"
                  placeholder="e.g. TRF-938271 or Cash Slip"
                  value={manualBankRef}
                  onChange={e => setManualBankRef(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Administrative Notes / Justification *</label>
              <textarea
                placeholder="Details of bank receipt, person who deposited, or cash verified..."
                value={manualNotes}
                onChange={e => setManualNotes(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg p-2.5 h-20"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submittingManual || manualSelectedFlatIds.length === 0}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {submittingManual
                ? 'Processing Allocation...'
                : `Confirm & Allocate ₦${(manualSelectedFlatIds.length * 1500).toLocaleString()}`}
            </button>
          </form>
        </div>
      )}

      {/* TAB 5: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-b-xl border border-t-0 border-slate-200 p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Security Levy Audit Trail</h3>
            <span className="text-xs text-slate-500">Immutable ledger events</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-y border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Actor</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Entity</th>
                  <th className="py-2.5 px-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No audit events recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {log.actor_identifier}
                        <span className="text-[10px] text-slate-400 block font-normal">{log.actor_type}</span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-blue-700">{log.action}</td>
                      <td className="py-2.5 px-3 text-slate-700">{log.entity_type}</td>
                      <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">
                        {log.details ? JSON.stringify(log.details) : 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: REGISTER / EDIT BUILDING */}
      {(isAddBuildingOpen || isEditBuildingOpen) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {selectedBuilding ? `Edit Building: ${selectedBuilding.house_number}` : 'Register New Building'}
              </h3>
              <button
                onClick={() => {
                  setIsAddBuildingOpen(false);
                  setIsEditBuildingOpen(false);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBuilding} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">House / Plot Identifier *</label>
                <input
                  type="text"
                  placeholder="e.g. House 238, Plot 4A, Block C"
                  value={buildingForm.house_number}
                  onChange={e => setBuildingForm(prev => ({ ...prev, house_number: e.target.value }))}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Building / Compound Name</label>
                <input
                  type="text"
                  placeholder="e.g. Grace Haven Villa"
                  value={buildingForm.building_name}
                  onChange={e => setBuildingForm(prev => ({ ...prev, building_name: e.target.value }))}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Total Flats *</label>
                  <input
                    type="number"
                    min="1"
                    value={buildingForm.total_flats_count}
                    onChange={e => setBuildingForm(prev => ({ ...prev, total_flats_count: Number(e.target.value) }))}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Landlord Name</label>
                  <input
                    type="text"
                    placeholder="Chief / Engr. ..."
                    value={buildingForm.landlord_name}
                    onChange={e => setBuildingForm(prev => ({ ...prev, landlord_name: e.target.value }))}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Landlord Phone</label>
                  <input
                    type="tel"
                    placeholder="080..."
                    value={buildingForm.landlord_phone}
                    onChange={e => setBuildingForm(prev => ({ ...prev, landlord_phone: e.target.value }))}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Landlord Email</label>
                  <input
                    type="email"
                    placeholder="landlord@..."
                    value={buildingForm.landlord_email}
                    onChange={e => setBuildingForm(prev => ({ ...prev, landlord_email: e.target.value }))}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Administrative Notes</label>
                <textarea
                  placeholder="Notes on flat structure, meter configuration, etc."
                  value={buildingForm.notes}
                  onChange={e => setBuildingForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 h-16"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddBuildingOpen(false);
                    setIsEditBuildingOpen(false);
                  }}
                  className="px-3 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  {selectedBuilding ? 'Save Changes' : 'Register Building'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT FLAT */}
      {(isAddFlatOpen || isEditFlatOpen) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {selectedFlat ? `Edit Flat: ${selectedFlat.flat_number}` : 'Register New Flat'}
              </h3>
              <button
                onClick={() => {
                  setIsAddFlatOpen(false);
                  setIsEditFlatOpen(false);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFlat} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Flat Identifier *</label>
                  <input
                    type="text"
                    placeholder="e.g. Flat 1, Suite A"
                    value={flatForm.flat_number}
                    onChange={e => setFlatForm(prev => ({ ...prev, flat_number: e.target.value }))}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Occupant Type</label>
                  <select
                    value={flatForm.occupant_type}
                    onChange={e => setFlatForm(prev => ({ ...prev, occupant_type: e.target.value as any }))}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2"
                  >
                    <option value="TENANT">Tenant</option>
                    <option value="LANDLORD">Landlord Occupied</option>
                    <option value="VACANT">Vacant</option>
                    <option value="COMMERCIAL">Commercial / Office</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Occupant Name</label>
                <input
                  type="text"
                  placeholder="Full name of resident"
                  value={flatForm.occupant_name}
                  onChange={e => setFlatForm(prev => ({ ...prev, occupant_name: e.target.value }))}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Occupant Phone</label>
                  <input
                    type="tel"
                    placeholder="080..."
                    value={flatForm.occupant_phone}
                    onChange={e => setFlatForm(prev => ({ ...prev, occupant_phone: e.target.value }))}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Occupant Email</label>
                  <input
                    type="email"
                    placeholder="email@..."
                    value={flatForm.occupant_email}
                    onChange={e => setFlatForm(prev => ({ ...prev, occupant_email: e.target.value }))}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={flatForm.is_billing_active}
                    onChange={e => setFlatForm(prev => ({ ...prev, is_billing_active: e.target.checked }))}
                    className="rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">Activate Monthly Security Billing</span>
                    <span className="text-[11px] text-slate-500">Official rate: ₦1,500/month flat levy</span>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddFlatOpen(false);
                    setIsEditFlatOpen(false);
                  }}
                  className="px-3 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  {selectedFlat ? 'Save Changes' : 'Register Flat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TRANSACTION RECEIPT & ALLOCATIONS BREAKDOWN */}
      {viewingReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Payment Breakdown & Digital Receipts</h3>
              <button onClick={() => setViewingReceipt(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Reference:</span>
                  <span className="font-mono font-semibold text-slate-900">{viewingReceipt.tx.paystack_reference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payer:</span>
                  <span className="font-semibold text-slate-900">{viewingReceipt.tx.payer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Billing Month:</span>
                  <span className="font-semibold text-slate-900">{viewingReceipt.tx.billing_month}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Units Credited:</span>
                  <span className="font-semibold text-blue-600">{viewingReceipt.tx.total_units} flat(s)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Amount:</span>
                  <span className="font-bold text-slate-900">₦{Number(viewingReceipt.tx.expected_amount).toLocaleString()}</span>
                </div>
              </div>

              <h4 className="font-bold text-slate-700 text-xs mt-3 uppercase tracking-wider">Per-Flat Allocations:</h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {viewingReceipt.allocations.map((a: FlatPaymentAllocation) => (
                  <div key={a.id} className="p-2 border border-slate-200 rounded-md flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-900 block">{a.flat_number || 'Flat'} ({a.building_house_number || 'House'})</span>
                      <span className="font-mono text-[10px] text-slate-500">Receipt: {a.receipt_number}</span>
                    </div>
                    <span className="font-bold text-emerald-600">₦{Number(a.allocated_amount).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewingReceipt(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
