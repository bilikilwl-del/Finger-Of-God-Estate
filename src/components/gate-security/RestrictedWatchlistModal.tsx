import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  X, 
  Plus, 
  Search, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Ban, 
  Car, 
  UserX,
  Phone,
  Calendar
} from 'lucide-react';
import { RestrictedWatchlistEntry, WatchlistCategory, WatchlistSeverity } from '../../types/database';
import { dbService } from '../../lib/supabase';

interface RestrictedWatchlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWatchlistUpdated?: () => void;
}

const CATEGORIES: WatchlistCategory[] = [
  'Suspicious Vehicle',
  'Banned Contractor',
  'Defaulting Resident',
  'Trespasser',
  'Security Threat',
  'Court Order / Police Notice',
  'Unpaid Fines',
  'Other'
];

export const RestrictedWatchlistModal: React.FC<RestrictedWatchlistModalProps> = ({
  isOpen,
  onClose,
  onWatchlistUpdated
}) => {
  const [list, setList] = useState<RestrictedWatchlistEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Form State
  const [entityName, setEntityName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [category, setCategory] = useState<WatchlistCategory>('Suspicious Vehicle');
  const [severity, setSeverity] = useState<WatchlistSeverity>('Strict Denial');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    try {
      const res = await dbService.getWatchlist();
      setList(res);
    } catch {
      console.error('Error fetching watchlist');
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entityName.trim() || !reason.trim()) {
      setMessage({ type: 'error', text: 'Please fill in entity name and reason for restriction.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await dbService.addToWatchlist({
        entity_name: entityName.trim(),
        phone_number: phoneNumber.trim() || null,
        plate_number: plateNumber.trim() ? plateNumber.trim().toUpperCase() : null,
        category,
        severity,
        reason: reason.trim(),
        date_added: new Date().toISOString().split('T')[0],
        added_by: 'Chief Security Officer',
        is_active: true,
        notes: notes.trim() || null
      });

      if (res.success) {
        setMessage({ type: 'success', text: `Added "${entityName}" to security watchlist.` });
        setIsAdding(false);
        setEntityName('');
        setPhoneNumber('');
        setPlateNumber('');
        setReason('');
        setNotes('');
        await loadData();
        if (onWatchlistUpdated) onWatchlistUpdated();
      }
    } catch {
      setMessage({ type: 'error', text: 'Error adding to watchlist.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this record from the security restricted list?')) return;
    try {
      await dbService.deleteWatchlistEntry(id);
      await loadData();
      if (onWatchlistUpdated) onWatchlistUpdated();
    } catch (e) {
      console.error('Error deleting watchlist entry:', e);
    }
  };

  const filtered = list.filter(item => {
    const q = searchTerm.toLowerCase();
    return item.entity_name.toLowerCase().includes(q) ||
           (item.plate_number && item.plate_number.toLowerCase().includes(q)) ||
           (item.phone_number && item.phone_number.includes(q)) ||
           item.category.toLowerCase().includes(q) ||
           item.reason.toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl max-w-3xl w-full text-slate-100 overflow-hidden my-6">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black font-display text-white uppercase tracking-tight">
                Restricted Watchlist & Blacklist Directory
              </h3>
              <p className="text-xs text-slate-400">
                Manage restricted persons, suspect vehicle plates, and banned contractors
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-6 bg-slate-900/90 border-b border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search watchlist by name, plate, reason..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 font-medium"
            />
          </div>

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-rose-950 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{isAdding ? 'Close Form' : 'Add Watchlist Entry'}</span>
          </button>
        </div>

        {/* Add Entry Form Drawer */}
        {isAdding && (
          <div className="p-6 bg-slate-950 border-b border-slate-800 space-y-4 animate-in slide-in-from-top-2">
            <div className="text-xs font-black uppercase tracking-wider text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>Record New Restricted Entry</span>
            </div>

            <form onSubmit={handleAddEntry} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-slate-300">
                    Subject / Entity Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={entityName}
                    onChange={(e) => setEntityName(e.target.value)}
                    placeholder="e.g. Emeka Obinna or Unregistered Black Corolla"
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-slate-300">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as WatchlistCategory)}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-medium"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-slate-300">
                    Vehicle Plate (Optional)
                  </label>
                  <input
                    type="text"
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value)}
                    placeholder="e.g. KTU-882-AB"
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono uppercase"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-slate-300">
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="e.g. 08099881122"
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-slate-300">
                    Restriction Severity *
                  </label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as WatchlistSeverity)}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold text-rose-300"
                  >
                    <option value="Strict Denial">Strict Denial (Refuse Entry)</option>
                    <option value="Immediate Apprehension">Immediate Apprehension (Detain)</option>
                    <option value="Warning">Warning / Escort Required</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold uppercase tracking-wider text-slate-300">
                  Reason for Restriction & Incident Reference *
                </label>
                <textarea
                  required
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Caught attempting unauthorized copper wire removal on Plot 14B..."
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold uppercase tracking-wider text-slate-300">
                  Officer Action Directive / Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Hold at barrier, summon patrol team immediately."
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-lg shadow-rose-950"
                >
                  {loading ? 'Saving...' : 'Confirm Blacklist Entry'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Directory List */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
          {message && (
            <div className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
              message.type === 'success' ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300' : 'bg-rose-950/80 border-rose-500 text-rose-300'
            }`}>
              {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              <span>{message.text}</span>
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-800 rounded-2xl bg-slate-950/40 text-xs text-slate-400">
              No restricted watchlist records matching your search.
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-rose-900 transition-colors space-y-2.5 text-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
                        <Ban className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm">{item.entity_name}</h4>
                        <span className="text-[10px] text-slate-400">{item.category} • Added {item.date_added}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                        item.severity === 'Immediate Apprehension'
                          ? 'bg-rose-600 text-white animate-pulse'
                          : item.severity === 'Strict Denial'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}>
                        {item.severity}
                      </span>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-900 cursor-pointer"
                        title="Delete entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-slate-300 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                    <strong className="text-rose-400">Reason:</strong> {item.reason}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                    {item.plate_number && (
                      <span className="font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-white">
                        Plate: {item.plate_number}
                      </span>
                    )}
                    {item.phone_number && (
                      <span className="font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-slate-300">
                        Phone: {item.phone_number}
                      </span>
                    )}
                    {item.notes && (
                      <span className="text-slate-400 italic">
                        Directive: {item.notes}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Active Watchlist Entries: {list.length}</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
