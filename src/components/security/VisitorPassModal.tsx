import React, { useState } from 'react';
import { 
  X, 
  UserCheck, 
  QrCode, 
  Copy, 
  Check, 
  Car, 
  Phone, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  Share2, 
  FileText, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { VisitorPass, Resident, EstateSettings } from '../../types/database';

interface VisitorPassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitVisitor: (visitorData: {
    visitor_name: string;
    visitor_phone: string;
    vehicle_number?: string | null;
    vehicle_description?: string | null;
    purpose_of_visit: string;
    expected_arrival: string;
    expected_departure?: string;
    notes?: string | null;
    resident_id: string;
    resident_number: string;
    resident_name: string;
    house_number: string;
    resident_phone: string;
  }) => Promise<VisitorPass | null>;
  currentResident?: Resident | null;
  estateSettings?: EstateSettings;
}

export const VisitorPassModal: React.FC<VisitorPassModalProps> = ({
  isOpen,
  onClose,
  onSubmitVisitor,
  currentResident,
  estateSettings
}) => {
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleDesc, setVehicleDesc] = useState('');
  const [purpose, setPurpose] = useState('Personal / Family Visit');
  const [expectedArrival, setExpectedArrival] = useState<string>(
    new Date(Date.now() + 3600000).toISOString().slice(0, 16)
  );
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedPass, setGeneratedPass] = useState<VisitorPass | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName.trim() || !visitorPhone.trim() || !currentResident) return;

    setIsSubmitting(true);
    try {
      const pass = await onSubmitVisitor({
        visitor_name: visitorName.trim(),
        visitor_phone: visitorPhone.trim(),
        vehicle_number: vehicleNumber.trim() || null,
        vehicle_description: vehicleDesc.trim() || null,
        purpose_of_visit: purpose,
        expected_arrival: expectedArrival,
        notes: notes.trim() || null,
        resident_id: currentResident.id,
        resident_number: currentResident.resident_number,
        resident_name: currentResident.full_name,
        house_number: currentResident.house_number,
        resident_phone: currentResident.phone_number
      });
      if (pass) {
        setGeneratedPass(pass);
      }
    } catch (err) {
      console.error('Failed to create visitor pass:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyPassText = () => {
    if (!generatedPass) return;
    const shareText = `*FINGER OF GOD ESTATE GATE PASS*\nPass Code: *${generatedPass.pass_code}*\nVisitor: ${generatedPass.visitor_name}\nHost: ${generatedPass.resident_name} (${generatedPass.house_number})\nExpected: ${new Date(generatedPass.expected_arrival).toLocaleString('en-NG')}\nEstate: Finger of God Estate, Lagos`;
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleReset = () => {
    setGeneratedPass(null);
    setVisitorName('');
    setVisitorPhone('');
    setVehicleNumber('');
    setVehicleDesc('');
    setNotes('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full shadow-2xl overflow-hidden text-slate-900 my-8">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/30">
                Gate Access Control
              </span>
              <h2 className="text-lg font-black font-display tracking-tight text-white mt-0.5">
                PRE-REGISTER VISITOR PASS
              </h2>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {generatedPass ? (
          <div className="p-6 sm:p-8 space-y-6 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8 text-emerald-700" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900 font-display">
                Visitor Pass Generated Successfully
              </h3>
              <p className="text-xs text-slate-500">
                Provide this digital pass code to your guest for expedited security clearance at the main gate.
              </p>
            </div>

            {/* Pass Card */}
            <div className="p-5 rounded-3xl bg-slate-900 text-white border border-slate-800 text-left space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
                    Finger of God Estate
                  </span>
                  <p className="text-xs font-bold text-slate-200">Security Gate Pass</p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
                  <QrCode className="w-4 h-4" />
                </div>
              </div>

              {/* Pass Code Box */}
              <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Official Visitor Pass Code
                </span>
                <span className="font-mono text-2xl font-black text-emerald-400 tracking-wider block mt-1">
                  {generatedPass.pass_code}
                </span>
              </div>

              {/* Guest & Host Details */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Guest Name</span>
                  <span className="font-bold text-slate-100 truncate block mt-0.5">{generatedPass.visitor_name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Host Resident</span>
                  <span className="font-bold text-slate-100 truncate block mt-0.5">{generatedPass.resident_name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">House Allocation</span>
                  <span className="font-bold text-emerald-300 block mt-0.5">{generatedPass.house_number}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Expected Time</span>
                  <span className="font-mono text-[11px] text-slate-200 block mt-0.5">
                    {new Date(generatedPass.expected_arrival).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Share Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={handleCopyPassText}
                className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Pass Copied to Clipboard</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Pass for WhatsApp / SMS</span>
                  </>
                )}
              </button>
              <button
                onClick={handleReset}
                className="w-full sm:w-auto py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Done
              </button>
            </div>

          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            
            {/* Host Resident Banner */}
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-950">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="font-semibold">
                  Host: {currentResident?.full_name} ({currentResident?.house_number})
                </span>
              </div>
              <span className="font-mono font-bold text-emerald-800">
                #{currentResident?.resident_number}
              </span>
            </div>

            {/* Guest Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Visitor Full Name *
                </label>
                <input
                  type="text"
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  placeholder="e.g. Chief Emeka Obi"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Visitor Phone Number *
                </label>
                <input
                  type="tel"
                  value={visitorPhone}
                  onChange={(e) => setVisitorPhone(e.target.value)}
                  placeholder="08031122334"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Vehicle Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Vehicle Plate No (Optional)
                </label>
                <input
                  type="text"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  placeholder="e.g. ABC-123-XY"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Vehicle Model / Color
                </label>
                <input
                  type="text"
                  value={vehicleDesc}
                  onChange={(e) => setVehicleDesc(e.target.value)}
                  placeholder="e.g. Silver Lexus RX350"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Purpose & Expected Arrival */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Purpose of Visit
                </label>
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Personal / Family Visit">Personal / Family Visit</option>
                  <option value="Contractor / Repair Work">Contractor / Repair Work</option>
                  <option value="Delivery / Courier">Delivery / Courier</option>
                  <option value="Business / Meeting">Business / Meeting</option>
                  <option value="Event / Celebration">Event / Celebration</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Expected Arrival Time *
                </label>
                <input
                  type="datetime-local"
                  value={expectedArrival}
                  onChange={(e) => setExpectedArrival(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Gate Instructions / Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Guest is carrying work tools, allow parking on driveway"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !visitorName.trim() || !visitorPhone.trim()}
                className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-md transition-all flex items-center gap-2"
              >
                {isSubmitting ? 'Generating Pass...' : 'Generate Visitor Pass'}
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
