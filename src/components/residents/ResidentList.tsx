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
  MapPin, 
  Home, 
  CheckCircle2, 
  XCircle,
  MoreVertical,
  Users
} from 'lucide-react';
import { Resident, EstateSettings } from '../../types/database';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Filtered residents list
  const filteredResidents = useMemo(() => {
    return residents.filter((r) => {
      // Status filter
      if (statusFilter !== 'All' && r.status !== statusFilter) {
        return false;
      }
      // Search filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        r.full_name.toLowerCase().includes(q) ||
        r.resident_number.toLowerCase().includes(q) ||
        r.phone_number.toLowerCase().includes(q) ||
        (r.email && r.email.toLowerCase().includes(q)) ||
        r.house_number.toLowerCase().includes(q) ||
        r.address.toLowerCase().includes(q) ||
        r.lga.toLowerCase().includes(q)
      );
    });
  }, [residents, searchQuery, statusFilter]);

  // Statistics
  const activeCount = useMemo(() => residents.filter(r => r.status === 'Active').length, [residents]);
  const inactiveCount = useMemo(() => residents.filter(r => r.status === 'Inactive').length, [residents]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Resident ID', 'Full Name', 'Phone Number', 'Email', 'House/Plot No', 'Address', 'State', 'LGA', 'Registration Date', 'Status'];
    const rows = filteredResidents.map(r => [
      r.resident_number,
      `"${r.full_name.replace(/"/g, '""')}"`,
      `"${r.phone_number}"`,
      `"${r.email || ''}"`,
      `"${r.house_number.replace(/"/g, '""')}"`,
      `"${r.address.replace(/"/g, '""')}"`,
      `"${r.state}"`,
      `"${r.lga}"`,
      r.registration_date,
      r.status
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `residents_registry_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Controls & Metrics Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-display font-bold text-lg text-slate-900">Resident Registry</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Managing all registered household units and security levy identities
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleExportCSV}
              disabled={filteredResidents.length === 0}
              className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={onAddResident}
              className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register Resident</span>
            </button>
          </div>
        </div>

        {/* Filter Bar & Search */}
        <div className="flex flex-col md:flex-row gap-3 pt-2 border-t border-slate-100">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by resident number (e.g. 001), name, phone, plot or street..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-medium"
              >
                Clear
              </button>
            )}
          </div>

          {/* Status Segmented Buttons */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl shrink-0 self-start">
            <button
              onClick={() => setStatusFilter('All')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === 'All'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({residents.length})
            </button>
            <button
              onClick={() => setStatusFilter('Active')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === 'Active'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setStatusFilter('Inactive')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === 'Inactive'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Inactive ({inactiveCount})
            </button>
          </div>
        </div>
      </div>

      {/* Residents Table / Card View */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
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
            <h4 className="text-sm font-bold text-slate-800">No Residents Found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              {searchQuery 
                ? `No residents matched "${searchQuery}". Try searching with a different term or clear the filter.`
                : 'No residents have been registered in the estate database yet.'}
            </p>
            {searchQuery ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('All');
                }}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
              >
                Reset Search
              </button>
            ) : (
              <button
                onClick={onAddResident}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
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
                  <th className="py-3 px-4 w-20">ID #</th>
                  <th className="py-3 px-4">Resident Full Name</th>
                  <th className="py-3 px-4">Contact Phone</th>
                  <th className="py-3 px-4">House / Plot</th>
                  <th className="py-3 px-4">Address / LGA</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredResidents.map((resident) => (
                  <tr 
                    key={resident.id}
                    className="hover:bg-slate-50/60 transition-colors group"
                  >
                    {/* Resident Number */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 tabular-nums">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200/60">
                        {resident.resident_number}
                      </span>
                    </td>

                    {/* Name & Email */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => onViewResident(resident)}
                        className="font-semibold text-slate-900 hover:text-emerald-600 transition-colors text-left block"
                      >
                        {resident.full_name}
                      </button>
                      {resident.email && (
                        <span className="text-[11px] text-slate-400 block truncate max-w-[200px]">
                          {resident.email}
                        </span>
                      )}
                    </td>

                    {/* Phone */}
                    <td className="py-3.5 px-4 font-mono text-slate-700 tabular-nums">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{resident.phone_number}</span>
                      </div>
                    </td>

                    {/* House/Plot */}
                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <Home className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{resident.house_number}</span>
                      </div>
                    </td>

                    {/* Address & LGA */}
                    <td className="py-3.5 px-4 text-slate-600 max-w-[220px]">
                      <div className="truncate font-medium text-slate-800">{resident.address}</div>
                      <div className="text-[11px] text-slate-400 truncate">{resident.lga}, {resident.state}</div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        resident.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {resident.status === 'Active' ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <XCircle className="w-3 h-3 text-slate-400" />
                        )}
                        <span>{resident.status}</span>
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onViewResident(resident)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                          title="View Profile & ID Card"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onEditResident(resident)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                          title="Edit Resident"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onToggleStatus(resident)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            resident.status === 'Active'
                              ? 'text-slate-400 hover:text-amber-700 hover:bg-amber-50'
                              : 'text-slate-400 hover:text-emerald-700 hover:bg-emerald-50'
                          }`}
                          title={resident.status === 'Active' ? 'Deactivate' : 'Activate'}
                        >
                          {resident.status === 'Active' ? (
                            <UserX className="w-4 h-4" />
                          ) : (
                            <UserCheck className="w-4 h-4 text-emerald-600" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer info banner */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div>
            Showing <strong className="text-slate-800 font-mono">{filteredResidents.length}</strong> of{' '}
            <strong className="text-slate-800 font-mono">{residents.length}</strong> registered residents
          </div>
          <div className="text-[11px] text-slate-400">
            Monthly security levy billing starting October 2026 at ₦{estateSettings.monthly_security_levy.toLocaleString()}/resident
          </div>
        </div>
      </div>
    </div>
  );
};
