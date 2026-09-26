import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Filter, 
  Download, 
  Eye, 
  Edit3, 
  UserCheck, 
  UserX, 
  Phone, 
  Home, 
  CheckCircle2, 
  XCircle, 
  Users, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw,
  CreditCard,
  Building
} from 'lucide-react';
import { Resident, EstateSettings } from '../../types/database';
import { normalizeNigerianPhone } from '../../lib/phoneUtils';

interface ResidentListProps {
  residents: Resident[];
  estateSettings: EstateSettings;
  onAddResident: () => void;
  onEditResident: (resident: Resident) => void;
  onViewResident: (resident: Resident) => void;
  onToggleStatus: (resident: Resident) => void;
  loading: boolean;
}

export const ResidentList: React.FC<ResidentListProps> = ({
  residents,
  estateSettings,
  onAddResident,
  onEditResident,
  onViewResident,
  onToggleStatus,
  loading
}) => {
  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [houseFilter, setHouseFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'All' | 'Starting Oct 2026'>('All');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Extract distinct house/plots for quick filter
  const distinctHouses = useMemo(() => {
    const set = new Set<string>();
    residents.forEach(r => {
      if (r.house_number) set.add(r.house_number.trim());
    });
    return Array.from(set).sort();
  }, [residents]);

  // Filtered residents list
  const filteredResidents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const cleanSearchPhone = normalizeNigerianPhone(searchQuery);

    return residents.filter((r) => {
      // Status filter
      if (statusFilter !== 'All' && r.status !== statusFilter) {
        return false;
      }

      // House/Plot filter
      if (houseFilter && !r.house_number.toLowerCase().includes(houseFilter.toLowerCase())) {
        return false;
      }

      // Search filter across Resident No, Name, Phone, and House/Plot
      if (!q) return true;

      const matchesResidentNo = r.resident_number.toLowerCase().includes(q);
      const matchesName = r.full_name.toLowerCase().includes(q);
      const matchesHouse = r.house_number.toLowerCase().includes(q);
      const matchesPhone = r.phone_number.includes(q) || 
        (cleanSearchPhone && normalizeNigerianPhone(r.phone_number).includes(cleanSearchPhone)) ||
        (r.additional_phone && (r.additional_phone.includes(q) || (cleanSearchPhone && normalizeNigerianPhone(r.additional_phone).includes(cleanSearchPhone))));
      const matchesAddress = r.address.toLowerCase().includes(q);

      return matchesResidentNo || matchesName || matchesHouse || matchesPhone || matchesAddress;
    });
  }, [residents, searchQuery, statusFilter, houseFilter]);

  // Reset pagination when filter or search changes
  useMemo(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, houseFilter]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredResidents.length / pageSize) || 1;
  const paginatedResidents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredResidents.slice(start, start + pageSize);
  }, [filteredResidents, currentPage, pageSize]);

  // Statistics
  const activeCount = useMemo(() => residents.filter(r => r.status === 'Active').length, [residents]);
  const inactiveCount = useMemo(() => residents.filter(r => r.status === 'Inactive').length, [residents]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Resident Number',
      'Full Name',
      'Primary Phone',
      'Additional Phone',
      'Email',
      'House/Plot Number',
      'Address',
      'State',
      'LGA',
      'Registration Date',
      'Resident Status',
      'Notes'
    ];

    const rows = filteredResidents.map(r => [
      `"${r.resident_number}"`,
      `"${r.full_name.replace(/"/g, '""')}"`,
      `"${r.phone_number}"`,
      `"${r.additional_phone || ''}"`,
      `"${r.email || ''}"`,
      `"${r.house_number.replace(/"/g, '""')}"`,
      `"${r.address.replace(/"/g, '""')}"`,
      `"${r.state}"`,
      `"${r.lga}"`,
      r.registration_date,
      r.status,
      `"${(r.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `finger_of_god_residents_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('All');
    setHouseFilter('');
    setPaymentFilter('All');
  };

  const isFiltered = Boolean(searchQuery || statusFilter !== 'All' || houseFilter || paymentFilter !== 'All');

  return (
    <div className="space-y-6">
      {/* Top Controls & Search Bar */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display font-bold text-lg sm:text-xl text-slate-900">Resident Management Directory</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified database of Finger of God Estate residents and property identification
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <button
              onClick={handleExportCSV}
              disabled={filteredResidents.length === 0}
              className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={onAddResident}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Resident</span>
            </button>
          </div>
        </div>

        {/* Search Input & Quick Status Filter */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-3 border-t border-slate-100">
          {/* Main Search Input */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Resident No (e.g. 001), Name, Phone, or House/Plot..."
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-semibold"
              >
                ✕
              </button>
            )}
          </div>

          {/* House / Plot Quick Filter Dropdown */}
          <div className="md:col-span-3">
            <div className="relative">
              <Home className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <select
                value={houseFilter}
                onChange={(e) => setHouseFilter(e.target.value)}
                className="w-full pl-8 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="">All Houses / Plots</option>
                {distinctHouses.map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Status Segmented Buttons */}
          <div className="md:col-span-4 flex items-center justify-end gap-1 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setStatusFilter('All')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all text-center ${
                statusFilter === 'All'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({residents.length})
            </button>
            <button
              onClick={() => setStatusFilter('Active')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all text-center ${
                statusFilter === 'Active'
                  ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ACTIVE ({activeCount})
            </button>
            <button
              onClick={() => setStatusFilter('Inactive')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all text-center ${
                statusFilter === 'Inactive'
                  ? 'bg-slate-700 text-white shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              INACTIVE ({inactiveCount})
            </button>
          </div>
        </div>

        {/* Future Stage Filters Bar (Payment Filter Interface Preparation) */}
        <div className="flex flex-wrap items-center justify-between text-xs pt-2 text-slate-500 gap-2 border-t border-slate-100/80">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600 flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5 text-slate-400" />
              <span>Levy Cycle:</span>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/60 font-medium text-[11px]">
              ₦{estateSettings.monthly_security_levy.toLocaleString()}/mo starting {estateSettings.first_payment_month}
            </span>
          </div>

          {isFiltered && (
            <button
              onClick={handleClearFilters}
              className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset All Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Residents Table View */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs">Loading registered estate residents...</p>
          </div>
        ) : filteredResidents.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No Residents Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              {isFiltered 
                ? 'No residents matched your search criteria. Try modifying your search or reset filters.'
                : 'No residents have been registered in the Finger of God Estate database yet.'}
            </p>
            {isFiltered ? (
              <button
                onClick={handleClearFilters}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
              >
                Clear Search & Filters
              </button>
            ) : (
              <button
                onClick={onAddResident}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Register First Resident</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4 w-24">Resident No.</th>
                  <th className="py-3.5 px-4">Resident Name</th>
                  <th className="py-3.5 px-4">Phone Number</th>
                  <th className="py-3.5 px-4">Building / House</th>
                  <th className="py-3.5 px-4">Account Status</th>
                  <th className="py-3.5 px-4">Profile Setup</th>
                  <th className="py-3.5 px-4">Oct 2026 Levy</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedResidents.map((resident) => {
                  const isActivated = Boolean(resident.account_activated);
                  const isProfileDone = Boolean(resident.profile_completed);
                  const accountStatus = resident.account_status || (
                    !isActivated ? 'NOT ACTIVATED' : (isProfileDone ? 'ACTIVE' : 'PROFILE UPDATE REQUIRED')
                  );

                  return (
                    <tr 
                      key={resident.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Resident No. */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 tabular-nums">
                        <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-900 border border-slate-200 font-extrabold text-xs">
                          {resident.resident_number.padStart(3, '0')}
                        </span>
                      </td>

                      {/* Name */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => onViewResident(resident)}
                          className="font-bold text-slate-900 hover:text-emerald-700 transition-colors text-left block"
                        >
                          {resident.full_name}
                        </button>
                        {resident.email && (
                          <span className="text-[11px] text-slate-400 block truncate max-w-[180px]">
                            {resident.email}
                          </span>
                        )}
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-4 font-mono text-slate-700 tabular-nums whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-semibold text-slate-800">{resident.phone_number}</span>
                        </div>
                        {resident.additional_phone && (
                          <span className="text-[10px] text-slate-400 block ml-5">
                            Alt: {resident.additional_phone}
                          </span>
                        )}
                      </td>

                      {/* House/Plot */}
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <Home className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="font-bold text-slate-900">{resident.house_number}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 block truncate max-w-[180px]">
                          {resident.address}
                        </span>
                      </td>

                      {/* Account Status */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wide uppercase ${
                          accountStatus === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                            : accountStatus === 'PROFILE UPDATE REQUIRED'
                            ? 'bg-blue-50 text-blue-800 border border-blue-300'
                            : accountStatus === 'SUSPENDED'
                            ? 'bg-rose-50 text-rose-800 border border-rose-300'
                            : 'bg-amber-50 text-amber-900 border border-amber-300'
                        }`}>
                          {accountStatus === 'ACTIVE' ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <XCircle className="w-3 h-3 text-amber-600" />
                          )}
                          <span>{accountStatus}</span>
                        </span>
                      </td>

                      {/* Profile Setup Status */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                          isProfileDone 
                            ? 'bg-emerald-50 text-emerald-800 font-bold' 
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {isProfileDone ? 'Completed' : 'Pending'}
                        </span>
                      </td>

                      {/* Payment Status (Oct 2026) */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          resident.resident_number === '001'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}>
                          {resident.resident_number === '001' ? 'PAID' : 'UNPAID'}
                        </span>
                      </td>

                      {/* Actions: View, Edit, Activate/Deactivate */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onViewResident(resident)}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors inline-flex items-center gap-1 shadow-2xs"
                            title="View Profile"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span className="hidden sm:inline">View</span>
                          </button>

                          <button
                            onClick={() => onEditResident(resident)}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 text-slate-700 hover:text-emerald-700 text-xs font-semibold transition-colors inline-flex items-center gap-1 shadow-2xs"
                            title="Edit Resident"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                            <span className="hidden sm:inline">Edit</span>
                          </button>

                          <button
                            onClick={() => onToggleStatus(resident)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1 border shadow-2xs ${
                              resident.status === 'Active'
                                ? 'bg-white border-slate-200 text-slate-600 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300'
                                : 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                            }`}
                            title={resident.status === 'Active' ? 'Deactivate Resident' : 'Activate Resident'}
                          >
                            {resident.status === 'Active' ? (
                              <>
                                <UserX className="w-3.5 h-3.5 text-slate-400" />
                                <span className="hidden sm:inline">Deactivate</span>
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="hidden sm:inline">Activate</span>
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination & Footer Controls */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>
              Showing <strong className="text-slate-900 font-mono font-bold">{filteredResidents.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</strong> to{' '}
              <strong className="text-slate-900 font-mono font-bold">{Math.min(currentPage * pageSize, filteredResidents.length)}</strong> of{' '}
              <strong className="text-slate-900 font-mono font-bold">{filteredResidents.length}</strong> residents
            </span>

            <div className="flex items-center gap-1 ml-3 border-l border-slate-200 pl-3">
              <span className="text-[11px] text-slate-400">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-700 outline-none"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          {/* Page Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => {
              if (
                p === 1 || 
                p === totalPages || 
                (p >= currentPage - 1 && p <= currentPage + 1)
              ) {
                return (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition-all ${
                      currentPage === p
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {p}
                  </button>
                );
              }
              if (p === 2 && currentPage > 3) {
                return <span key="dots-1" className="px-1 text-slate-400">...</span>;
              }
              if (p === totalPages - 1 && currentPage < totalPages - 2) {
                return <span key="dots-2" className="px-1 text-slate-400">...</span>;
              }
              return null;
            })}

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
