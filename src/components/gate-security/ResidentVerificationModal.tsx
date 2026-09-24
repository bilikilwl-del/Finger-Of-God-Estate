import React, { useState } from 'react';
import { 
  Search, 
  UserCheck, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  X, 
  Car, 
  Home, 
  Phone, 
  CheckCircle2, 
  ArrowRight, 
  LogIn, 
  LogOut, 
  Sparkles,
  MapPin,
  Calendar,
  Layers,
  KeyRound
} from 'lucide-react';
import { ResidentAccessVerificationResult } from '../../types/database';
import { dbService } from '../../lib/supabase';

interface ResidentVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogGateMovement?: (entry: { movement: 'Entry' | 'Exit'; name: string; house: string; vehicle?: string }) => void;
}

export const ResidentVerificationModal: React.FC<ResidentVerificationModalProps> = ({
  isOpen,
  onClose,
  onLogGateMovement
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResidentAccessVerificationResult | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setActionSuccess(null);
    try {
      const res = await dbService.verifyResidentAccess(searchQuery.trim());
      setResult(res);
    } catch {
      setResult({
        status: 'NOT FOUND — MANUAL VERIFICATION REQUIRED',
        is_allowed: false,
        vehicles: [],
        active_visitor_passes: [],
        message: 'System error during verification. Check network connection.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogMovement = async (movementType: 'Entry' | 'Exit', vehiclePlate?: string) => {
    if (!result?.resident) return;

    try {
      await dbService.createGateLog({
        movement_type: movementType,
        entity_type: 'Resident',
        name: result.resident.full_name,
        phone_number: result.resident.phone_number,
        vehicle_number: vehiclePlate || (result.vehicles[0]?.plate_number ?? undefined),
        house_number: result.resident.house_number,
        destination: `Plot ${result.resident.house_number}`,
        officer_badge: 'FOG-SEC-01',
        officer_name: 'Gate Controller',
        notes: `Resident ${movementType} logged at barrier via verification screen.`
      });

      setActionSuccess(`Recorded ${movementType.toUpperCase()} for ${result.resident.full_name} (${vehiclePlate || 'Resident'})`);
      if (onLogGateMovement) {
        onLogGateMovement({
          movement: movementType,
          name: result.resident.full_name,
          house: result.resident.house_number,
          vehicle: vehiclePlate
        });
      }
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (e) {
      console.error('Error logging gate movement:', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl max-w-2xl w-full text-slate-100 overflow-hidden my-6">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black font-display text-white uppercase tracking-tight">
                Resident Gate Verification
              </h3>
              <p className="text-xs text-slate-400">
                Instant identity, house entitlement & registered vehicle lookup
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

        {/* Search Bar */}
        <div className="p-6 bg-slate-900/90 border-b border-slate-800">
          <form onSubmit={handleSearch} className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Search by House Number, Resident Name, Phone, or Plate Number
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. Plot 4A, Babatunde, 08034567890, ABC-819-LS"
                  className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-medium"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={loading || !searchQuery.trim()}
                className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl cursor-pointer shadow-lg shadow-emerald-950 flex items-center gap-2 transition-colors"
              >
                {loading ? 'Searching...' : 'Verify'}
              </button>
            </div>

            {/* Quick Filter Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-400">
              <span className="font-semibold text-slate-400">Quick Test Searches:</span>
              <button
                type="button"
                onClick={() => { setSearchQuery('Plot 4A'); setTimeout(handleSearch, 50); }}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer border border-slate-700"
              >
                Plot 4A (Active)
              </button>
              <button
                type="button"
                onClick={() => { setSearchQuery('LSR-210-FK'); setTimeout(handleSearch, 50); }}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer border border-slate-700 font-mono"
              >
                LSR-210-FK (Plate)
              </button>
              <button
                type="button"
                onClick={() => { setSearchQuery('Flat 3, Block C'); setTimeout(handleSearch, 50); }}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer border border-slate-700"
              >
                Flat 3 (Suspended)
              </button>
              <button
                type="button"
                onClick={() => { setSearchQuery('KRD-990-ZZ'); setTimeout(handleSearch, 50); }}
                className="px-2.5 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-300 cursor-pointer border border-rose-800 font-mono"
              >
                KRD-990-ZZ (Watchlist)
              </button>
            </div>
          </form>
        </div>

        {/* Verification Results Display */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
          {actionSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {!result ? (
            <div className="text-center py-12 px-4 border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
              <ShieldCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-300">Ready for Resident Verification</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                Enter house number, full name, phone number or vehicle plate to check authorization status against estate records.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              
              {/* STATUS BANNER */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
                result.status === 'ACTIVE — ACCESS ALLOWED'
                  ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-200'
                  : result.status === 'SUSPENDED — VERIFY WITH ADMIN'
                  ? 'bg-amber-950/70 border-amber-500/60 text-amber-200'
                  : 'bg-rose-950/70 border-rose-500/60 text-rose-200'
              }`}>
                <div className="flex items-center gap-3">
                  {result.status === 'ACTIVE — ACCESS ALLOWED' ? (
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/40">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/40 animate-pulse">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <div className="text-xs uppercase tracking-widest font-black text-slate-400">
                      Access Determination
                    </div>
                    <div className="text-base sm:text-lg font-black tracking-tight font-display">
                      {result.status}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${
                    result.is_allowed
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-rose-600 text-white'
                  }`}>
                    {result.is_allowed ? 'BARRIER OPEN' : 'HOLD AT GATE'}
                  </span>
                </div>
              </div>

              {result.warning && (
                <div className="p-3.5 bg-rose-900/40 border border-rose-600/70 rounded-xl text-xs text-rose-200 font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{result.warning}</span>
                </div>
              )}

              {/* RESIDENT CARD */}
              {result.resident && (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                        {result.resident.resident_number ? `RESIDENT REF: FOG-RES-${result.resident.resident_number}` : 'ESTATE RESIDENT'}
                      </span>
                      <h4 className="text-xl font-black text-white mt-0.5">
                        {result.resident.full_name}
                      </h4>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${
                      result.resident.status === 'Active'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {result.resident.status} Resident
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center gap-2.5">
                      <Home className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">House / Plot</div>
                        <div className="font-bold text-white text-sm">{result.resident.house_number}</div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center gap-2.5">
                      <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Location / Address</div>
                        <div className="font-bold text-white truncate">{result.resident.address}</div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center gap-2.5">
                      <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Registered Phone</div>
                        <div className="font-mono font-bold text-white">{result.resident.phone_number}</div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center gap-2.5">
                      <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Registration Date</div>
                        <div className="font-bold text-white">{result.resident.registration_date || 'Enrolled'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Registered Vehicles Section */}
                  <div className="pt-2 border-t border-slate-800/80">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                        <Car className="w-3.5 h-3.5 text-emerald-400" />
                        Registered Vehicles ({result.vehicles.length})
                      </span>
                    </div>

                    {result.vehicles.length === 0 ? (
                      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 italic">
                        No registered vehicles recorded for this resident.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {result.vehicles.map((veh) => (
                          <div
                            key={veh.id}
                            className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between"
                          >
                            <div className="space-y-0.5">
                              <div className="font-mono font-black text-emerald-400 text-sm tracking-wide">
                                {veh.plate_number}
                              </div>
                              <div className="text-xs text-slate-300 font-medium">
                                {veh.make} {veh.model} ({veh.color})
                              </div>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              veh.status === 'Active'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}>
                              {veh.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quick Gate Action Buttons */}
                  {result.is_allowed && (
                    <div className="pt-4 border-t border-slate-800 flex flex-wrap gap-3">
                      <button
                        onClick={() => handleQuickLogMovement('Entry')}
                        className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950 transition-colors"
                      >
                        <LogIn className="w-4 h-4" />
                        <span>Log Inbound Entry</span>
                      </button>
                      <button
                        onClick={() => handleQuickLogMovement('Exit')}
                        className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer border border-slate-700 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Log Outbound Exit</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Gate Controller Mode: Real-time Live Database Sync</span>
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
