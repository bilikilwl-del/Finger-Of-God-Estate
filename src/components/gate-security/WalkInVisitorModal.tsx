import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  X, 
  Phone, 
  Home, 
  Car, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ShieldCheck,
  Send,
  PhoneCall,
  UserCheck
} from 'lucide-react';
import { Resident, VisitorPass } from '../../types/database';
import { dbService } from '../../lib/supabase';

interface WalkInVisitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (pass: VisitorPass) => void;
}

export const WalkInVisitorModal: React.FC<WalkInVisitorModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [residentName, setResidentName] = useState('');
  const [residentPhone, setResidentPhone] = useState('');
  const [purposeOfVisit, setPurposeOfVisit] = useState('Personal / Family Visit');
  const [officerName, setOfficerName] = useState('Guard Sunday Eze');
  const [notes, setNotes] = useState('');
  
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdPass, setCreatedPass] = useState<VisitorPass | null>(null);

  useEffect(() => {
    if (isOpen) {
      dbService.getResidents().then(setResidents);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleHouseSelect = (selectedHouse: string) => {
    setHouseNumber(selectedHouse);
    const matched = residents.find(r => r.house_number.toUpperCase() === selectedHouse.toUpperCase());
    if (matched) {
      setResidentName(matched.full_name);
      setResidentPhone(matched.phone_number);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName.trim() || !visitorPhone.trim() || !houseNumber.trim()) {
      setError('Please fill in visitor name, phone number, and destination house.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await dbService.requestWalkInApproval({
        visitor_name: visitorName.trim(),
        visitor_phone: visitorPhone.trim(),
        house_number: houseNumber.trim(),
        resident_name: residentName.trim() || 'Host Resident',
        resident_phone: residentPhone.trim() || '08000000000',
        purpose_of_visit: purposeOfVisit,
        vehicle_number: vehicleNumber.trim() ? vehicleNumber.trim().toUpperCase() : undefined,
        officer_name: officerName,
        notes: notes.trim()
      });

      if (res.success && res.pass) {
        setCreatedPass(res.pass);
        if (onSuccess) onSuccess(res.pass);
      } else {
        setError(res.message || 'Failed to record walk-in visitor.');
      }
    } catch {
      setError('Server error processing walk-in request.');
    } finally {
      setLoading(false);
    }
  };

  const handleInstantPhoneApproval = async () => {
    if (!createdPass) return;
    setLoading(true);
    try {
      const res = await dbService.respondWalkInApproval(
        createdPass.id,
        true,
        'Verbal confirmation received from resident host via security phone call',
        `Phone Approval (${residentName || 'Host'})`
      );
      if (res.success && res.pass) {
        setCreatedPass(res.pass);
        if (onSuccess) onSuccess(res.pass);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl max-w-xl w-full text-slate-100 overflow-hidden my-6">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black font-display text-white uppercase tracking-tight">
                Walk-In Visitor Clearance Flow
              </h3>
              <p className="text-xs text-slate-400">
                Register non-pre-registered guest & request host resident authorization
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

        {/* Form Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-950/80 border border-rose-600/60 rounded-xl text-rose-300 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {createdPass ? (
            <div className="space-y-4 p-5 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  createdPass.status === 'Arrived'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse'
                }`}>
                  {createdPass.status === 'Arrived' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Walk-In Access Reference</div>
                  <div className="text-lg font-black font-mono text-emerald-400">{createdPass.pass_code}</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1.5">
                <div><span className="text-slate-400">Visitor:</span> <strong className="text-white">{createdPass.visitor_name}</strong> ({createdPass.visitor_phone})</div>
                <div><span className="text-slate-400">Host Plot:</span> <strong className="text-emerald-400">{createdPass.house_number}</strong> ({createdPass.resident_name})</div>
                <div><span className="text-slate-400">Status:</span> <strong className="uppercase text-amber-400 font-bold">{createdPass.status === 'Expected' ? 'WAITING FOR RESIDENT APPROVAL' : 'APPROVED — INSIDE ESTATE'}</strong></div>
              </div>

              {createdPass.status === 'Expected' && (
                <div className="pt-2 space-y-2">
                  <p className="text-xs text-slate-400">
                    A notification has been dispatched to the host resident's portal. You may also call the resident directly on <strong className="text-white font-mono">{createdPass.resident_phone}</strong> to confirm authorization.
                  </p>
                  <button
                    onClick={handleInstantPhoneApproval}
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950 transition-colors"
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>Resident Confirmed via Call — Authorize Entry</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-slate-300">
                    Visitor Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    placeholder="e.g. Chief Anthony Okafor"
                    className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-slate-300">
                    Visitor Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={visitorPhone}
                    onChange={(e) => setVisitorPhone(e.target.value)}
                    placeholder="e.g. 08031122334"
                    className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-slate-300">
                    Destination House / Plot *
                  </label>
                  <input
                    type="text"
                    required
                    value={houseNumber}
                    onChange={(e) => handleHouseSelect(e.target.value)}
                    placeholder="e.g. Plot 4A or House 12"
                    className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold text-emerald-400 focus:border-amber-500"
                  />
                  {residents.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {residents.slice(0, 4).map(r => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => handleHouseSelect(r.house_number)}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-300"
                        >
                          {r.house_number}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-slate-300">
                    Resident Being Visited
                  </label>
                  <input
                    type="text"
                    value={residentName}
                    onChange={(e) => setResidentName(e.target.value)}
                    placeholder="Auto-filled from house selection"
                    className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-slate-300">
                    Vehicle Plate Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    placeholder="e.g. KJA-542-AA (Leave blank if pedestrian)"
                    className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono uppercase"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-slate-300">
                    Purpose of Visit
                  </label>
                  <select
                    value={purposeOfVisit}
                    onChange={(e) => setPurposeOfVisit(e.target.value)}
                    className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium"
                  >
                    <option value="Personal / Family Visit">Personal / Family Visit</option>
                    <option value="Official / Business Meeting">Official / Business Meeting</option>
                    <option value="Delivery / Courier Drop-off">Delivery / Courier Drop-off</option>
                    <option value="Artisan / Contractor Work">Artisan / Contractor Work</option>
                    <option value="Event / Party Guest">Event / Party Guest</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold uppercase tracking-wider text-slate-300">
                  Officer Notes / Physical Observations
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Guest presented National ID card, 2 adult passengers in vehicle..."
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white resize-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-2 py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-950 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  <span>{loading ? 'Processing...' : 'Submit Walk-In Intake'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Walk-In Gate Clearance Console</span>
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
