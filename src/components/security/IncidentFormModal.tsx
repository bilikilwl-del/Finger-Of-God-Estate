import React, { useState } from 'react';
import { 
  X, 
  Shield, 
  Upload, 
  Image as ImageIcon, 
  Car, 
  Users, 
  MapPin, 
  Calendar, 
  Clock, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  Paperclip,
  Trash2
} from 'lucide-react';
import { Incident, IncidentType, IncidentPriority, IncidentEvidence } from '../../types/database';

interface IncidentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitIncident: (incidentData: {
    incident_type: IncidentType;
    priority: IncidentPriority;
    date: string;
    time: string;
    location: string;
    house_number?: string | null;
    description: string;
    people_involved?: string | null;
    vehicle_details?: string | null;
    additional_notes?: string | null;
    reporter_type: 'Resident' | 'Security Officer' | 'Visitor' | 'Staff' | 'Anonymous';
    reported_by: string;
    reporter_phone?: string | null;
    reporter_resident_number?: string | null;
    evidence?: IncidentEvidence[];
  }) => Promise<Incident | null>;
  currentUser?: {
    full_name?: string;
    role?: string;
    email?: string;
  } | null;
  currentResident?: {
    full_name: string;
    resident_number: string;
    phone_number: string;
    house_number: string;
  } | null;
  isStaffMode?: boolean;
}

const INCIDENT_TYPES: IncidentType[] = [
  'Suspicious activity',
  'Theft',
  'Burglary',
  'Trespassing',
  'Property damage',
  'Fight/disturbance',
  'Vehicle-related incident',
  'Gate/security breach',
  'Power/electrical emergency',
  'Fire',
  'Medical emergency',
  'Missing person',
  'Other'
];

export const IncidentFormModal: React.FC<IncidentFormModalProps> = ({
  isOpen,
  onClose,
  onSubmitIncident,
  currentUser,
  currentResident,
  isStaffMode = false
}) => {
  const [incidentType, setIncidentType] = useState<IncidentType>('Suspicious activity');
  const [priority, setPriority] = useState<IncidentPriority>('Medium');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState<string>(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
  const [location, setLocation] = useState(currentResident?.house_number ? `${currentResident.house_number}, Finger of God Estate` : '');
  const [houseNumber, setHouseNumber] = useState(currentResident?.house_number || '');
  const [description, setDescription] = useState('');
  const [peopleInvolved, setPeopleInvolved] = useState('');
  const [vehicleDetails, setVehicleDetails] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Reporter Info
  const [reporterName, setReporterName] = useState(
    currentResident ? currentResident.full_name : (currentUser?.full_name || 'Officer / Security Desk')
  );
  const [reporterPhone, setReporterPhone] = useState(currentResident?.phone_number || '');
  const [reporterType, setReporterType] = useState<'Resident' | 'Security Officer' | 'Visitor' | 'Staff' | 'Anonymous'>(
    currentResident ? 'Resident' : 'Security Officer'
  );

  // Simulated Evidence Attachments
  const [evidenceList, setEvidenceList] = useState<Array<{ name: string; type: 'image' | 'video' | 'document'; url: string }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (currentResident) {
      setReporterName(currentResident.full_name);
      setReporterPhone(currentResident.phone_number);
      setHouseNumber(currentResident.house_number);
      if (!location) setLocation(`${currentResident.house_number}, Finger of God Estate`);
      setReporterType('Resident');
    }
  }, [currentResident]);

  if (!isOpen) return null;

  // Mock upload handler for images / docs
  const handleSimulatedFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setTimeout(() => {
      const newItems: Array<{ name: string; type: 'image' | 'video' | 'document'; url: string }> = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isImg = file.type.startsWith('image/');
        const isVid = file.type.startsWith('video/');
        newItems.push({
          name: file.name,
          type: isImg ? 'image' : isVid ? 'video' : 'document',
          url: isImg 
            ? 'https://images.unsplash.com/photo-1590856029826-c7a73142bbf1?auto=format&fit=crop&w=600&q=80' 
            : '#'
        });
      }
      setEvidenceList(prev => [...prev, ...newItems]);
      setIsUploading(false);
    }, 600);
  };

  const handleRemoveEvidence = (index: number) => {
    setEvidenceList(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!description.trim() || !location.trim() || !reporterName.trim()) {
      setErrorMsg('Please complete all mandatory fields marked with an asterisk (*).');
      return;
    }

    setIsSubmitting(true);
    try {
      const formattedEvidence: IncidentEvidence[] = evidenceList.map((item, idx) => ({
        id: `ev-${Date.now()}-${idx}`,
        incident_id: '',
        file_name: item.name,
        file_type: item.type,
        url: item.url,
        uploaded_by: reporterName,
        uploaded_at: new Date().toISOString()
      }));

      const created = await onSubmitIncident({
        incident_type: incidentType,
        priority: isStaffMode ? priority : 'Medium',
        date,
        time,
        location: location.trim(),
        house_number: houseNumber.trim() || null,
        description: description.trim(),
        people_involved: peopleInvolved.trim() || null,
        vehicle_details: vehicleDetails.trim() || null,
        additional_notes: additionalNotes.trim() || null,
        reporter_type: reporterType,
        reported_by: reporterName.trim(),
        reporter_phone: reporterPhone.trim() || null,
        reporter_resident_number: currentResident?.resident_number || null,
        evidence: formattedEvidence
      });

      if (created) {
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit incident report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 max-w-2xl w-full shadow-2xl overflow-hidden text-slate-900 my-8">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/30">
                  Incident Log Form
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {currentResident ? `Resident #${currentResident.resident_number}` : 'Security Desk'}
                </span>
              </div>
              <h2 className="text-lg font-black font-display tracking-tight text-white mt-0.5">
                SUBMIT SECURITY INCIDENT REPORT
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

        {errorMsg && (
          <div className="mx-6 mt-6 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {/* Incident Type & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Incident Classification *
              </label>
              <select
                value={incidentType}
                onChange={(e) => setIncidentType(e.target.value as IncidentType)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {INCIDENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {isStaffMode ? (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Priority Assessment
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as IncidentPriority)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Low">Low Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="High">High Priority</option>
                  <option value="Critical">Critical Alert</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  House / Plot Number (If applicable)
                </label>
                <input
                  type="text"
                  value={houseNumber}
                  onChange={(e) => setHouseNumber(e.target.value)}
                  placeholder="e.g. Plot 4A or House 12"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}
          </div>

          {/* Date, Time & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Time *
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Location / Street Landmark *
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Hibiscus Crescent near Gate"
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Incident Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Detailed Description of Occurrence *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Provide a clear, factual account of what was observed, who was seen, timing, and current situation..."
              required
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
            />
          </div>

          {/* People & Vehicles Involved */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                <span>Persons Involved / Descriptions</span>
              </label>
              <input
                type="text"
                value={peopleInvolved}
                onChange={(e) => setPeopleInvolved(e.target.value)}
                placeholder="e.g. 2 men in dark shirts, visitor contractor"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1">
                <Car className="w-3.5 h-3.5 text-slate-500" />
                <span>Vehicle Details (Plate / Model)</span>
              </label>
              <input
                type="text"
                value={vehicleDetails}
                onChange={(e) => setVehicleDetails(e.target.value)}
                placeholder="e.g. Black Toyota Corolla (LND-482-AA)"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Evidence Attachments */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Evidence Attachments (Photos / Videos / Files)
              </label>
              <label className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5 text-slate-600" />
                <span>Upload Evidence</span>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*,.pdf"
                  onChange={handleSimulatedFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {isUploading && (
              <p className="text-xs text-emerald-700 font-semibold animate-pulse">
                Attaching evidence files securely...
              </p>
            )}

            {evidenceList.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {evidenceList.map((item, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate pr-2">
                      <Paperclip className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="font-semibold text-slate-800 truncate">{item.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveEvidence(idx)}
                      className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2.5 rounded-xl border border-dashed border-slate-200">
                No attachments uploaded yet. Optional photo/video captures assist investigation officers.
              </p>
            )}
          </div>

          {/* Reporter Identification */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Reporter Identification & Contact
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  required
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={reporterPhone}
                  onChange={(e) => setReporterPhone(e.target.value)}
                  placeholder="08023456789"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Internal / Confidential Notes (Optional)
            </label>
            <input
              type="text"
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="Any other relevant details or security follow-up recommendations"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Submit Actions */}
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
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-md transition-all flex items-center gap-2"
            >
              {isSubmitting ? (
                <span>Generating Incident Number...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submit Security Report</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
