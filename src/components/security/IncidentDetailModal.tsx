import React, { useState } from 'react';
import { 
  X, 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  UserCheck, 
  MapPin, 
  Calendar, 
  FileText, 
  Phone, 
  Car, 
  Users, 
  Image as ImageIcon, 
  Paperclip, 
  Send, 
  Lock, 
  Sparkles, 
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { 
  Incident, 
  IncidentStatus, 
  IncidentPriority, 
  SecurityOfficer, 
  EstateSettings 
} from '../../types/database';

interface IncidentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  incident: Incident | null;
  officersList: SecurityOfficer[];
  onUpdateStatus: (incidentId: string, newStatus: IncidentStatus, note?: string) => Promise<void>;
  onAssignOfficer: (incidentId: string, officerId: string, officerName: string, officerPhone: string) => Promise<void>;
  onAddInvestigationNote: (incidentId: string, note: string, actionTaken?: string) => Promise<void>;
  isStaff: boolean; // Admin or Security Supervisor / Officer
}

export const IncidentDetailModal: React.FC<IncidentDetailModalProps> = ({
  isOpen,
  onClose,
  incident,
  officersList,
  onUpdateStatus,
  onAssignOfficer,
  onAddInvestigationNote,
  isStaff
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'timeline' | 'investigation' | 'evidence'>('details');
  const [selectedOfficerId, setSelectedOfficerId] = useState('');
  const [statusUpdate, setStatusUpdate] = useState<IncidentStatus>('Investigating');
  const [statusNote, setStatusNote] = useState('');
  const [investigationText, setInvestigationText] = useState('');
  const [actionTakenText, setActionTakenText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  React.useEffect(() => {
    if (incident) {
      setStatusUpdate(incident.status);
      setSelectedOfficerId(incident.assigned_officer_id || '');
    }
  }, [incident]);

  if (!isOpen || !incident) return null;

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOfficerId) return;

    const officer = officersList.find(o => o.id === selectedOfficerId);
    if (!officer) return;

    setIsProcessing(true);
    setMsg(null);
    try {
      await onAssignOfficer(incident.id, officer.id, officer.full_name, officer.phone_number);
      setMsg({ type: 'success', text: `Assigned to Officer ${officer.full_name} (${officer.officer_badge_id})` });
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to assign officer' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setMsg(null);
    try {
      await onUpdateStatus(incident.id, statusUpdate, statusNote.trim() || undefined);
      setStatusNote('');
      setMsg({ type: 'success', text: `Incident status transitioned to ${statusUpdate}` });
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to update status' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!investigationText.trim()) return;

    setIsProcessing(true);
    setMsg(null);
    try {
      await onAddInvestigationNote(incident.id, investigationText.trim(), actionTakenText.trim() || undefined);
      setInvestigationText('');
      setActionTakenText('');
      setMsg({ type: 'success', text: 'Investigation note and action logged to timeline.' });
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to add note' });
    } finally {
      setIsProcessing(false);
    }
  };

  const getPriorityBadge = (p: IncidentPriority) => {
    switch (p) {
      case 'Critical':
        return <span className="px-3 py-1 rounded-full bg-rose-600 text-white text-[11px] font-black uppercase tracking-wider animate-pulse">Critical Alert</span>;
      case 'High':
        return <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-900 border border-orange-300 text-[11px] font-bold uppercase">High Priority</span>;
      case 'Medium':
        return <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold uppercase">Medium Priority</span>;
      default:
        return <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-300 text-[11px] font-bold uppercase">Low Priority</span>;
    }
  };

  const getStatusBadge = (s: IncidentStatus) => {
    switch (s) {
      case 'Resolved':
      case 'Closed':
        return <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[11px] font-black uppercase flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> {s}</span>;
      case 'Investigating':
        return <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-900 border border-blue-300 text-[11px] font-bold uppercase flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-blue-700" /> Investigating</span>;
      case 'Action Required':
        return <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-900 border border-purple-300 text-[11px] font-bold uppercase">Action Required</span>;
      case 'Acknowledged':
        return <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold uppercase">Acknowledged</span>;
      default:
        return <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-900 border border-rose-300 text-[11px] font-bold uppercase">New Report</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 max-w-3xl w-full shadow-2xl overflow-hidden text-slate-900 my-8">
        
        {/* Top Header */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-md ${
              incident.priority === 'Critical' ? 'bg-rose-600 animate-pulse' : 'bg-emerald-700'
            }`}>
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black tracking-wider text-emerald-400 bg-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-700">
                  {incident.incident_number}
                </span>
                {incident.is_emergency && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider">
                    SOS EMERGENCY
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-black font-display tracking-tight text-white mt-1">
                {incident.incident_type}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {getPriorityBadge(incident.priority)}
            {getStatusBadge(incident.status)}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-slate-200 bg-slate-50/70 overflow-x-auto">
          {[
            { id: 'details', label: 'Incident Details' },
            { id: 'timeline', label: `Timeline (${incident.timeline?.length || 0})` },
            { id: 'evidence', label: `Evidence (${incident.evidence?.length || 0})` },
            ...(isStaff ? [{ id: 'investigation', label: 'Investigation & Action' }] : [])
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-emerald-600 text-emerald-800 bg-white rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Feedback Alert */}
        {msg && (
          <div className={`mx-6 mt-4 p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
            msg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}>
            {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span>{msg.text}</span>
          </div>
        )}

        <div className="p-6 max-h-[65vh] overflow-y-auto space-y-6">
          
          {/* TAB 1: DETAILS */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              
              {/* Core Information Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Date & Time</span>
                  <div className="flex items-center gap-1.5 mt-1 font-bold text-slate-900 text-xs">
                    <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{incident.date} at {incident.time}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Location / House</span>
                  <div className="flex items-center gap-1.5 mt-1 font-bold text-slate-900 text-xs truncate">
                    <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span className="truncate">{incident.location} {incident.house_number ? `(${incident.house_number})` : ''}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Reported By</span>
                  <div className="flex items-center gap-1.5 mt-1 font-bold text-slate-900 text-xs truncate">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span className="truncate">{incident.reported_by} ({incident.reporter_type})</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-700" />
                  <span>Occurrence Description</span>
                </h4>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">
                  {incident.description}
                </p>
              </div>

              {/* People & Vehicle Details */}
              {(incident.people_involved || incident.vehicle_details) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {incident.people_involved && (
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                        <Users className="w-3 h-3" /> Persons Involved
                      </span>
                      <p className="text-xs font-semibold text-slate-800 mt-1">{incident.people_involved}</p>
                    </div>
                  )}
                  {incident.vehicle_details && (
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                        <Car className="w-3 h-3" /> Vehicle Information
                      </span>
                      <p className="text-xs font-semibold text-slate-800 mt-1">{incident.vehicle_details}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Security Officer Assigned */}
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                      Lead Security Responder
                    </span>
                    <p className="text-xs font-black text-slate-900">
                      {incident.assigned_officer_name ? incident.assigned_officer_name : 'No Officer Assigned Yet'}
                    </p>
                    {incident.assigned_officer_phone && (
                      <p className="text-[11px] font-mono text-emerald-900 font-semibold">
                        Hotline: {incident.assigned_officer_phone}
                      </p>
                    )}
                  </div>
                </div>

                {isStaff && (
                  <button
                    onClick={() => setActiveTab('investigation')}
                    className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto"
                  >
                    {incident.assigned_officer_name ? 'Reassign / Manage' : 'Assign Officer'}
                  </button>
                )}
              </div>

              {/* Resolution Summary if resolved */}
              {(incident.resolution_summary || incident.status === 'Resolved' || incident.status === 'Closed') && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>Incident Resolution & Closure</span>
                  </div>
                  <p className="text-xs text-emerald-950 font-medium leading-relaxed">
                    {incident.resolution_summary || 'Incident resolved and secured by Finger of God Estate Security team.'}
                  </p>
                  {incident.resolved_at && (
                    <span className="text-[10px] text-emerald-800 block font-mono">
                      Resolved on: {new Date(incident.resolved_at).toLocaleString('en-NG')}
                    </span>
                  )}
                </div>
              )}

            </div>
          )}

          {/* TAB 2: TIMELINE */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                Official Chain-of-Custody & Response Log
              </h4>

              {incident.timeline && incident.timeline.length > 0 ? (
                <div className="relative pl-6 border-l-2 border-emerald-500 space-y-6 ml-2 my-2">
                  {incident.timeline.map((entry) => (
                    <div key={entry.id} className="relative group">
                      {/* Timeline Node */}
                      <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-emerald-600 border-2 border-white shadow-xs" />
                      
                      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-900">{entry.title}</span>
                          <span className="font-mono text-[10px] text-slate-500">
                            {new Date(entry.timestamp).toLocaleString('en-NG', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed font-medium">
                          {entry.description}
                        </p>
                        <div className="text-[10px] text-emerald-800 font-semibold pt-1 flex items-center gap-1">
                          <span>Logged by: {entry.performed_by}</span>
                          {entry.performed_by_role && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-100 border border-emerald-300 font-mono">
                              {entry.performed_by_role}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic p-4 bg-slate-50 rounded-2xl border border-dashed text-center">
                  No timeline entries recorded yet.
                </p>
              )}
            </div>
          )}

          {/* TAB 3: EVIDENCE */}
          {activeTab === 'evidence' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Recorded Evidence & Visual Files ({incident.evidence?.length || 0})
                </h4>
              </div>

              {incident.evidence && incident.evidence.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {incident.evidence.map((ev) => (
                    <div key={ev.id} className="p-3 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-emerald-700" />
                        <span className="text-xs font-bold text-slate-900 truncate">{ev.file_name}</span>
                      </div>
                      {ev.url && ev.url.startsWith('http') && (
                        <div className="h-32 rounded-xl overflow-hidden bg-slate-200 relative group">
                          <img 
                            src={ev.url} 
                            alt={ev.file_name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                          />
                        </div>
                      )}
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                        <span>Uploaded by: {ev.uploaded_by}</span>
                        <span>{new Date(ev.uploaded_at).toLocaleDateString('en-NG')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-300 text-xs text-slate-500 space-y-2">
                  <Paperclip className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="font-semibold">No visual evidence files attached to this report.</p>
                  <p className="text-[11px] text-slate-400">Security officers can attach photos during site patrol inspection.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: STAFF INVESTIGATION & ACTION */}
          {activeTab === 'investigation' && isStaff && (
            <div className="space-y-6">
              
              {/* 1. Officer Assignment Form */}
              <form onSubmit={handleAssign} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Assign / Reassign Security Personnel
                </h4>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <select
                    value={selectedOfficerId}
                    onChange={(e) => setSelectedOfficerId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select On-Duty Officer...</option>
                    {officersList.map((off) => (
                      <option key={off.id} value={off.id}>
                        {off.full_name} ({off.officer_badge_id}) • {off.status} • {off.shift}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={isProcessing || !selectedOfficerId}
                    className="w-full sm:w-auto px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer shadow-xs"
                  >
                    Assign Officer
                  </button>
                </div>
              </form>

              {/* 2. Status Transition Form */}
              <form onSubmit={handleStatusChange} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Update Investigation Status
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      New Status
                    </label>
                    <select
                      value={statusUpdate}
                      onChange={(e) => setStatusUpdate(e.target.value as IncidentStatus)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="New">New</option>
                      <option value="Acknowledged">Acknowledged</option>
                      <option value="Investigating">Investigating</option>
                      <option value="Action Required">Action Required</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Status Change Note (Optional)
                    </label>
                    <input
                      type="text"
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      placeholder="e.g. Suspect identified, perimeter secured"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-xs"
                >
                  Confirm Status Change
                </button>
              </form>

              {/* 3. Add Investigation Note & Actions Taken */}
              <form onSubmit={handleAddNote} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Log Field Findings & Actions Taken
                </h4>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Investigation Findings *
                  </label>
                  <textarea
                    value={investigationText}
                    onChange={(e) => setInvestigationText(e.target.value)}
                    rows={2}
                    placeholder="Document interview statements, gate camera footage review, patrol inspection notes..."
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Specific Actions Executed
                  </label>
                  <input
                    type="text"
                    value={actionTakenText}
                    onChange={(e) => setActionTakenText(e.target.value)}
                    placeholder="e.g. Dispatched 2 patrol officers, contacted police zonal division"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isProcessing || !investigationText.trim()}
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-xs"
                >
                  Log Investigation Finding
                </button>
              </form>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-mono">
            Finger of God Estate Security Operations Registry
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold cursor-pointer"
          >
            Close Window
          </button>
        </div>

      </div>
    </div>
  );
};
