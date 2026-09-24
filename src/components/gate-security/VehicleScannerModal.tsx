import React, { useState } from 'react';
import { 
  Car, 
  Search, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  X, 
  CheckCircle2, 
  LogIn, 
  LogOut, 
  Camera, 
  Clock, 
  UserCheck, 
  Package, 
  Wrench,
  Ban
} from 'lucide-react';
import { dbService } from '../../lib/supabase';
import { 
  ResidentVehicle, 
  VisitorPass, 
  DeliveryAccessPass, 
  ContractorAccessPass, 
  RestrictedWatchlistEntry 
} from '../../types/database';

interface VehicleScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogMovement?: (data: any) => void;
}

export const VehicleScannerModal: React.FC<VehicleScannerModalProps> = ({
  isOpen,
  onClose,
  onLogMovement
}) => {
  const [plateQuery, setPlateQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchDone, setSearchDone] = useState(false);
  
  // Lookup Matches
  const [matchedVehicle, setMatchedVehicle] = useState<ResidentVehicle | null>(null);
  const [matchedVisitor, setMatchedVisitor] = useState<VisitorPass | null>(null);
  const [matchedDelivery, setMatchedDelivery] = useState<DeliveryAccessPass | null>(null);
  const [matchedWatchlist, setMatchedWatchlist] = useState<RestrictedWatchlistEntry | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearch = async (term?: string) => {
    const plate = (term || plateQuery).trim();
    if (!plate) return;

    setLoading(true);
    setSearchDone(false);
    setActionSuccess(null);

    try {
      const cleanPlate = plate.toUpperCase().replace(/[\s-]/g, '');

      // Check watchlist first
      const wlMatch = await dbService.checkWatchlistMatch(plate);
      setMatchedWatchlist(wlMatch);

      // Check resident vehicles
      const resVeh = await dbService.getVehicleByPlate(plate);
      setMatchedVehicle(resVeh);

      // Check active visitor passes
      const visitors = await dbService.getVisitorPasses();
      const visMatch = visitors.find(v => 
        v.vehicle_number && v.vehicle_number.toUpperCase().replace(/[\s-]/g, '').includes(cleanPlate)
      );
      setMatchedVisitor(visMatch || null);

      // Check deliveries
      const deliveries = await dbService.getDeliveryPasses();
      const delMatch = deliveries.find(d => 
        d.vehicle_plate && d.vehicle_plate.toUpperCase().replace(/[\s-]/g, '').includes(cleanPlate)
      );
      setMatchedDelivery(delMatch || null);

      setSearchDone(true);
    } catch {
      console.error('Error during vehicle lookup');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLog = async (type: 'Entry' | 'Exit') => {
    const plate = plateQuery.trim().toUpperCase();
    const entityName = matchedVehicle?.resident_name || matchedVisitor?.visitor_name || matchedDelivery?.rider_name || 'Unregistered Vehicle';
    const destination = matchedVehicle ? `Plot ${matchedVehicle.house_number}` : matchedVisitor ? `Plot ${matchedVisitor.house_number}` : 'Estate Grounds';

    try {
      await dbService.createGateLog({
        movement_type: type,
        entity_type: matchedVehicle ? 'Resident' : matchedVisitor ? 'Visitor' : matchedDelivery ? 'Delivery' : 'Service Vehicle',
        name: entityName,
        vehicle_number: plate,
        house_number: matchedVehicle?.house_number || matchedVisitor?.house_number || matchedDelivery?.house_number,
        destination: destination,
        officer_badge: 'FOG-SEC-01',
        officer_name: 'Gate Controller',
        notes: `License plate scan ${type} logged.`
      });

      setActionSuccess(`Recorded ${type.toUpperCase()} for Vehicle [${plate}] — ${entityName}`);
      if (onLogMovement) onLogMovement({ movement: type, vehicle: plate, name: entityName });
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (e) {
      console.error('Error logging vehicle:', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl max-w-2xl w-full text-slate-100 overflow-hidden my-6">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black font-display text-white uppercase tracking-tight">
                Plate & Vehicle Access Scanner
              </h3>
              <p className="text-xs text-slate-400">
                Automatic License Plate Recognition (ALPR) & Multi-Registry Lookup
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

        {/* Input Bar */}
        <div className="p-6 bg-slate-900/90 border-b border-slate-800 space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={plateQuery}
                onChange={(e) => setPlateQuery(e.target.value)}
                placeholder="Enter License Plate (e.g. ABC-819-LS, LSR-210-FK, KRD-990-ZZ)..."
                className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-hidden focus:border-emerald-500 font-mono uppercase font-bold"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading || !plateQuery.trim()}
              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl cursor-pointer shadow-lg shadow-emerald-950 flex items-center gap-2 transition-colors"
            >
              {loading ? 'Searching...' : 'Scan Plate'}
            </button>
          </form>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
            <span className="font-semibold text-slate-400">Preset Plate Scans:</span>
            <button
              type="button"
              onClick={() => { setPlateQuery('ABC-819-LS'); handleSearch('ABC-819-LS'); }}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer border border-slate-700 font-mono"
            >
              ABC-819-LS (Resident)
            </button>
            <button
              type="button"
              onClick={() => { setPlateQuery('KJA-542-AA'); handleSearch('KJA-542-AA'); }}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer border border-slate-700 font-mono"
            >
              KJA-542-AA (Visitor)
            </button>
            <button
              type="button"
              onClick={() => { setPlateQuery('KJA-881-XY'); handleSearch('KJA-881-XY'); }}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer border border-slate-700 font-mono"
            >
              KJA-881-XY (Delivery)
            </button>
            <button
              type="button"
              onClick={() => { setPlateQuery('KRD-990-ZZ'); handleSearch('KRD-990-ZZ'); }}
              className="px-2.5 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-300 cursor-pointer border border-rose-800 font-mono"
            >
              KRD-990-ZZ (Watchlist)
            </button>
          </div>
        </div>

        {/* Results Body */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-5">
          {actionSuccess && (
            <div className="p-3.5 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {!searchDone ? (
            <div className="text-center py-12 px-4 border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
              <Camera className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-300">Ready for Vehicle Plate Recognition</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                Enter any Nigerian vehicle plate. Instantly determines whether it belongs to a registered resident, authorized guest, dispatch courier, contractor, or restricted watchlist.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* WATCHLIST ALERT BANNER */}
              {matchedWatchlist && (
                <div className="p-4 rounded-2xl bg-rose-950 border-2 border-rose-500 text-rose-200 space-y-2 animate-in fade-in shadow-xl shadow-rose-950">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0 animate-bounce">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-black tracking-widest text-rose-300">
                        RESTRICTED VEHICLE WATCHLIST HIT
                      </div>
                      <div className="text-base sm:text-lg font-black tracking-tight uppercase font-display text-white">
                        {matchedWatchlist.severity} — DENY BARRIER CLEARANCE
                      </div>
                    </div>
                  </div>
                  <div className="p-3 bg-rose-900/50 rounded-xl text-xs space-y-1">
                    <div><strong>Subject:</strong> {matchedWatchlist.entity_name} ({matchedWatchlist.category})</div>
                    <div><strong>Reason:</strong> {matchedWatchlist.reason}</div>
                    <div><strong>Instructions:</strong> {matchedWatchlist.notes}</div>
                  </div>
                </div>
              )}

              {/* RESIDENT VEHICLE MATCH */}
              {matchedVehicle && (
                <div className="p-5 rounded-2xl bg-slate-950 border border-emerald-500/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                      <span className="text-xs font-black uppercase text-emerald-400">
                        REGISTERED RESIDENT VEHICLE
                      </span>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase">
                      {matchedVehicle.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Plate Number</div>
                      <div className="font-mono font-black text-emerald-400 text-base">{matchedVehicle.plate_number}</div>
                      <div className="text-slate-300 mt-0.5">{matchedVehicle.make} {matchedVehicle.model} ({matchedVehicle.color})</div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Owner & Residence</div>
                      <div className="font-bold text-white text-sm">{matchedVehicle.resident_name}</div>
                      <div className="text-emerald-400 font-semibold mt-0.5">House / Plot {matchedVehicle.house_number}</div>
                    </div>
                  </div>

                  {matchedVehicle.notes && (
                    <p className="text-xs text-slate-400 italic">
                      Note: {matchedVehicle.notes}
                    </p>
                  )}
                </div>
              )}

              {/* VISITOR PASS MATCH */}
              {matchedVisitor && (
                <div className="p-5 rounded-2xl bg-slate-950 border border-blue-500/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-blue-400">
                      AUTHORIZED VISITOR VEHICLE
                    </span>
                    <span className="px-2.5 py-1 rounded bg-blue-500/20 text-blue-300 text-xs font-bold uppercase">
                      Pass: {matchedVisitor.pass_code}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Visitor Name</div>
                      <div className="font-bold text-white">{matchedVisitor.visitor_name}</div>
                      <div className="font-mono text-slate-300">{matchedVisitor.visitor_phone}</div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Destination</div>
                      <div className="font-bold text-emerald-400">Plot {matchedVisitor.house_number}</div>
                      <div className="text-slate-300">Host: {matchedVisitor.resident_name}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* DELIVERY COURIER MATCH */}
              {matchedDelivery && (
                <div className="p-5 rounded-2xl bg-slate-950 border border-purple-500/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-purple-400">
                      COURIER / DISPATCH VEHICLE
                    </span>
                    <span className="px-2.5 py-1 rounded bg-purple-500/20 text-purple-300 text-xs font-bold uppercase">
                      {matchedDelivery.courier_company}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Rider Name</div>
                      <div className="font-bold text-white">{matchedDelivery.rider_name}</div>
                      <div className="font-mono text-slate-300">{matchedDelivery.rider_phone}</div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Package Destination</div>
                      <div className="font-bold text-emerald-400">House {matchedDelivery.house_number}</div>
                      <div className="text-slate-300">{matchedDelivery.package_type}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* UNREGISTERED / NOT FOUND */}
              {!matchedVehicle && !matchedVisitor && !matchedDelivery && !matchedWatchlist && (
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-2">
                  <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
                  <h4 className="text-sm font-bold text-white">Unregistered Vehicle</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Plate [{plateQuery.toUpperCase()}] is not in the resident vehicle directory or active guest pass list. Check driver ID or use Walk-In clearance.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap gap-3">
                <button
                  onClick={() => handleQuickLog('Entry')}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950 transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Log Vehicle Entry</span>
                </button>
                <button
                  onClick={() => handleQuickLog('Exit')}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer border border-slate-700 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Vehicle Exit</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>ALPR Plate Verification System</span>
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
