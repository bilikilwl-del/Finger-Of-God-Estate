import React from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  Flame, 
  HeartPulse, 
  Lock, 
  MapPin, 
  Phone, 
  Send, 
  X, 
  CheckCircle2, 
  Radio,
  FileText
} from 'lucide-react';
import { Incident } from '../../types/database';

interface EmergencyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitEmergency: (emergencyData: {
    type: 'Security emergency' | 'Fire' | 'Medical emergency' | 'Crime/trespassing' | 'Other';
    location: string;
    description: string;
    contactNumber: string;
    houseNumber?: string;
  }) => Promise<Incident | null>;
  currentResident?: {
    full_name: string;
    resident_number: string;
    phone_number: string;
    house_number: string;
  } | null;
}

export const EmergencyReportModal: React.FC<EmergencyReportModalProps> = ({
  isOpen,
  onClose,
  onSubmitEmergency,
  currentResident
}) => {
  const [emergencyType, setEmergencyType] = React.useState<
    'Security emergency' | 'Fire' | 'Medical emergency' | 'Crime/trespassing' | 'Other'
  >('Security emergency');
  const [location, setLocation] = React.useState(currentResident?.house_number ? `${currentResident.house_number}, Finger of God Estate` : '');
  const [description, setDescription] = React.useState('');
  const [contactNumber, setContactNumber] = React.useState(currentResident?.phone_number || '');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submittedIncident, setSubmittedIncident] = React.useState<Incident | null>(null);

  React.useEffect(() => {
    if (currentResident) {
      if (!location) setLocation(`${currentResident.house_number}, Finger of God Estate`);
      if (!contactNumber) setContactNumber(currentResident.phone_number);
    }
  }, [currentResident]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !contactNumber.trim() || !location.trim()) return;

    setIsSubmitting(true);
    try {
      const created = await onSubmitEmergency({
        type: emergencyType,
        location: location.trim(),
        description: description.trim(),
        contactNumber: contactNumber.trim(),
        houseNumber: currentResident?.house_number
      });
      if (created) {
        setSubmittedIncident(created);
      }
    } catch (err) {
      console.error('Emergency submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmittedIncident(null);
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border-2 border-rose-500 max-w-lg w-full shadow-2xl overflow-hidden text-slate-900">
        
        {/* Header with Red Emergency Styling */}
        <div className="bg-rose-600 text-white p-5 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-xs shrink-0">
              <ShieldAlert className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-white text-rose-700 text-[10px] font-black uppercase tracking-wider">
                  URGENT DISPATCH
                </span>
                <span className="text-xs font-semibold text-rose-100 flex items-center gap-1">
                  <Radio className="w-3 h-3 animate-ping" /> Live Command
                </span>
              </div>
              <h2 className="text-lg font-black font-display tracking-tight text-white mt-0.5">
                ESTATE EMERGENCY SOS REPORT
              </h2>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="p-1.5 rounded-xl text-rose-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submittedIncident ? (
          <div className="p-6 sm:p-8 space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold uppercase tracking-wider">
                Emergency Alert Broadcasted
              </span>
              <h3 className="text-xl font-black text-slate-900 font-display">
                Emergency Reference Generated
              </h3>
              <p className="font-mono text-base font-black text-rose-600 bg-rose-50 p-2 rounded-xl border border-rose-200 inline-block">
                {submittedIncident.incident_number}
              </p>
              <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                Estate Security Command Desk and On-Duty Patrol officers have been immediately alerted with your location details.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-semibold">Incident Type:</span>
                <span className="font-bold text-slate-800">{submittedIncident.incident_type}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-semibold">Reported Location:</span>
                <span className="font-bold text-slate-800">{submittedIncident.location}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-semibold">Priority Level:</span>
                <span className="font-bold text-rose-600 uppercase">{submittedIncident.priority}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 font-semibold">Estate Security Hotline:</span>
                <span className="font-mono font-bold text-emerald-700">08023456789 / 08034567890</span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 font-medium text-left">
              <strong>Notice:</strong> For life-threatening medical or severe fire incidents, our security desk coordinates entry for state emergency first responders (Lagos Fire Service & LASAMBUS).
            </div>

            <button
              onClick={handleReset}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-md"
            >
              Done & Track Incident Status
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            
            {/* Emergency Type Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Select Emergency Category *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'Security emergency', label: 'Security Threat', icon: ShieldAlert, color: 'border-rose-300 text-rose-700 bg-rose-50' },
                  { id: 'Fire', label: 'Fire Outbreak', icon: Flame, color: 'border-orange-300 text-orange-700 bg-orange-50' },
                  { id: 'Medical emergency', label: 'Medical Urgent', icon: HeartPulse, color: 'border-red-300 text-red-700 bg-red-50' },
                  { id: 'Crime/trespassing', label: 'Trespass / Robbery', icon: Lock, color: 'border-amber-300 text-amber-700 bg-amber-50' },
                  { id: 'Other', label: 'Other Urgent', icon: AlertTriangle, color: 'border-slate-300 text-slate-700 bg-slate-50' },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = emergencyType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setEmergencyType(item.id as any)}
                      className={`p-3 rounded-2xl border text-left flex flex-col items-start gap-1.5 transition-all cursor-pointer ${
                        isSelected 
                          ? 'border-rose-600 bg-rose-600 text-white shadow-md' 
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-600'}`} />
                      <span className="text-xs font-bold">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Location & House Number */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Exact Location / House / Landmark *
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Plot 4A, Hibiscus Crescent or North Gate Boulevard"
                  required
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            {/* Contact Number */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Immediate Contact Phone *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="08023456789"
                  required
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            {/* Emergency Description */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Brief Situation Summary *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="State clearly what is happening right now so patrol responders can prepare appropriate equipment..."
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {/* Verification Note */}
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-900 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>
                This will trigger an immediate high-priority emergency dispatch signal at the Security Control Desk. Please ensure details are accurate.
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !description.trim() || !contactNumber.trim()}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg shadow-rose-600/30 transition-all"
              >
                {isSubmitting ? (
                  <span>Dispatching...</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>BROADCAST EMERGENCY SOS</span>
                  </>
                )}
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
