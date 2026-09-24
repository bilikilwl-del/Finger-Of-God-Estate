import React, { useState } from 'react';
import { 
  X, 
  DoorOpen, 
  Car, 
  User, 
  Phone, 
  MapPin, 
  FileText, 
  CheckCircle2, 
  ShieldCheck, 
  AlertCircle,
  Truck,
  Users
} from 'lucide-react';
import { GateLogEntry, GateEntityType, SecurityOfficer } from '../../types/database';

interface GateEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitLog: (logData: {
    movement_type: 'Entry' | 'Exit';
    entity_type: GateEntityType;
    name: string;
    phone_number?: string;
    vehicle_number?: string;
    house_number?: string;
    destination: string;
    pass_code?: string | null;
    officer_badge: string;
    officer_name: string;
    notes?: string | null;
  }) => Promise<GateLogEntry | null>;
  currentOfficer?: SecurityOfficer | null;
  officersList: SecurityOfficer[];
}

export const GateEntryModal: React.FC<GateEntryModalProps> = ({
  isOpen,
  onClose,
  onSubmitLog,
  currentOfficer,
  officersList
}) => {
  const [movementType, setMovementType] = useState<'Entry' | 'Exit'>('Entry');
  const [entityType, setEntityType] = useState<GateEntityType>('Visitor');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [destination, setDestination] = useState('');
  const [passCode, setPassCode] = useState('');
  const [notes, setNotes] = useState('');
  
  // Officer selection
  const [selectedOfficerBadge, setSelectedOfficerBadge] = useState(
    currentOfficer?.officer_badge_id || (officersList[0]?.officer_badge_id || 'FOG-SEC-01')
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !destination.trim()) return;

    const officer = officersList.find(o => o.officer_badge_id === selectedOfficerBadge) || currentOfficer || {
      full_name: 'Officer on Gate Duty',
      officer_badge_id: 'FOG-SEC-01'
    };

    setIsSubmitting(true);
    try {
      const created = await onSubmitLog({
        movement_type: movementType,
        entity_type: entityType,
        name: name.trim(),
        phone_number: phone.trim() || undefined,
        vehicle_number: vehicleNumber.trim() || undefined,
        house_number: houseNumber.trim() || undefined,
        destination: destination.trim(),
        pass_code: passCode.trim() || null,
        officer_badge: officer.officer_badge_id,
        officer_name: officer.full_name,
        notes: notes.trim() || null
      });
      if (created) {
        onClose();
      }
    } catch (err) {
      console.error('Failed to log gate movement:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full shadow-2xl overflow-hidden text-slate-900 my-8">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <DoorOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/30">
                Gate Security Controller
              </span>
              <h2 className="text-lg font-black font-display tracking-tight text-white mt-0.5">
                RECORD GATE ENTRY / EXIT
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Movement Type Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setMovementType('Entry')}
              className={`py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                movementType === 'Entry'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Gate Inflow (Entry)
            </button>
            <button
              type="button"
              onClick={() => setMovementType('Exit')}
              className={`py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                movementType === 'Exit'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Gate Outflow (Exit)
            </button>
          </div>

          {/* Entity Type Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Party Classification *
            </label>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value as GateEntityType)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="Visitor">Visitor / Guest</option>
              <option value="Resident">Resident</option>
              <option value="Contractor">Contractor / Artisan</option>
              <option value="Delivery">Delivery Courier</option>
              <option value="Staff">Estate Staff / Maintenance</option>
              <option value="Service Vehicle">Service / Utility Truck</option>
              <option value="Security Patrol">Security Patrol Unit</option>
            </select>
          </div>

          {/* Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Full Name / Driver Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alhaji Mustapha"
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08023456789"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Vehicle & Pass Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Vehicle Plate Number
              </label>
              <input
                type="text"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                placeholder="e.g. KSF-901-BD"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Pass Code (If pre-registered)
              </label>
              <input
                type="text"
                value={passCode}
                onChange={(e) => setPassCode(e.target.value)}
                placeholder="e.g. FOG-VIS-9812"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase"
              />
            </div>
          </div>

          {/* House / Destination */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                House / Plot Being Visited
              </label>
              <input
                type="text"
                value={houseNumber}
                onChange={(e) => setHouseNumber(e.target.value)}
                placeholder="e.g. Plot 4A"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Destination / Purpose *
              </label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="e.g. Hibiscus Crescent, Delivery"
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* On-Duty Officer */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Recording Officer on Duty *
            </label>
            <select
              value={selectedOfficerBadge}
              onChange={(e) => setSelectedOfficerBadge(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {officersList.map((off) => (
                <option key={off.id} value={off.officer_badge_id}>
                  {off.full_name} ({off.officer_badge_id}) • {off.rank}
                </option>
              ))}
            </select>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Gate Officer Remarks (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Cleared by host via call, verified driver ID"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim() || !destination.trim()}
              className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-md transition-all flex items-center gap-2"
            >
              {isSubmitting ? 'Recording Log...' : `Confirm Gate ${movementType}`}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
