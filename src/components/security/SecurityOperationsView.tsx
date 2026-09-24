import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Shield, 
  AlertTriangle, 
  Flame, 
  HeartPulse, 
  Lock, 
  Users, 
  UserCheck, 
  UserX, 
  DoorOpen, 
  Car, 
  Bell, 
  Search, 
  Filter, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText, 
  Printer, 
  Download, 
  RefreshCw, 
  MapPin, 
  Phone, 
  Radio, 
  Sparkles, 
  ChevronRight, 
  ExternalLink,
  SlidersHorizontal,
  Compass,
  QrCode,
  Truck,
  Eye,
  History
} from 'lucide-react';
import { 
  Incident, 
  IncidentType, 
  IncidentPriority, 
  IncidentStatus, 
  SecurityOfficer, 
  SecurityAlert, 
  VisitorPass, 
  GateLogEntry, 
  PatrolRecord, 
  SecurityOperationsSummary, 
  EstateSettings, 
  Resident,
  GateEntityType
} from '../../types/database';
import { dbService } from '../../lib/supabase';
import { IncidentDetailModal } from './IncidentDetailModal';
import { IncidentFormModal } from './IncidentFormModal';
import { EmergencyReportModal } from './EmergencyReportModal';
import { VisitorPassModal } from './VisitorPassModal';
import { GateEntryModal } from './GateEntryModal';
import { SecurityAlertModal } from './SecurityAlertModal';

interface SecurityOperationsViewProps {
  estateSettings: EstateSettings;
  adminUser?: {
    email: string;
    full_name?: string;
    role?: string;
  } | null;
  onNavigateToResident?: (residentNumber: string) => void;
}

export const SecurityOperationsView: React.FC<SecurityOperationsViewProps> = ({
  estateSettings,
  adminUser,
  onNavigateToResident
}) => {
  // Operational Mode Toggle (Simulating Role-Based Access Control)
  const [activeRole, setActiveRole] = useState<'Admin' | 'Security Supervisor' | 'Security Officer'>(
    adminUser?.role?.includes('Security Officer') ? 'Security Officer' : 'Admin'
  );

  // Sub-Navigation Tabs inside Security Operations
  const [activeSubTab, setActiveSubTab] = useState<
    'overview' | 'incidents' | 'visitors' | 'gatelog' | 'officers' | 'alerts' | 'audit'
  >('overview');

  // Core Data States
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [officers, setOfficers] = useState<SecurityOfficer[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [visitorPasses, setVisitorPasses] = useState<VisitorPass[]>([]);
  const [gateLogs, setGateLogs] = useState<GateLogEntry[]>([]);
  const [patrols, setPatrols] = useState<PatrolRecord[]>([]);
  const [stats, setStats] = useState<SecurityOperationsSummary>({
    security_status: 'Normal',
    active_incidents_count: 0,
    open_incidents_count: 0,
    investigating_count: 0,
    resolved_incidents_count: 0,
    pending_reports_count: 0,
    critical_incidents_count: 0,
    active_alerts_count: 0,
    visitors_inside_count: 0,
    expected_visitors_today: 0,
    emergency_reports_count: 0,
    officers_on_duty_count: 0,
    active_patrols_count: 0
  });
  const [residents, setResidents] = useState<Resident[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals State
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isIncidentDetailOpen, setIsIncidentDetailOpen] = useState(false);
  const [isIncidentFormOpen, setIsIncidentFormOpen] = useState(false);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [isVisitorModalOpen, setIsVisitorModalOpen] = useState(false);
  const [isGateEntryOpen, setIsGateEntryOpen] = useState(false);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);

  // Incident Filtering & Search State
  const [incidentSearch, setIncidentSearch] = useState('');
  const [incidentTypeFilter, setIncidentTypeFilter] = useState<string>('All');
  const [incidentPriorityFilter, setIncidentPriorityFilter] = useState<string>('All');
  const [incidentStatusFilter, setIncidentStatusFilter] = useState<string>('All');

  // Visitor Pass Search & Filter State
  const [visitorSearch, setVisitorSearch] = useState('');
  const [visitorStatusFilter, setVisitorStatusFilter] = useState<string>('All');
  const [quickVerifyCode, setQuickVerifyCode] = useState('');
  const [verifyResultMsg, setVerifyResultMsg] = useState<{ type: 'success' | 'error'; text: string; pass?: VisitorPass } | null>(null);

  // Gate Log Search & Filter State
  const [gateLogSearch, setGateLogSearch] = useState('');
  const [gateLogTypeFilter, setGateLogTypeFilter] = useState<string>('All');
  const [gateLogMovementFilter, setGateLogMovementFilter] = useState<string>('All');

  // Toast message
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Load All Security Operations Data
  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [
        loadedIncidents,
        loadedOfficers,
        loadedAlerts,
        loadedVisitors,
        loadedGateLogs,
        loadedPatrols,
        loadedStats,
        loadedResidents
      ] = await Promise.all([
        dbService.getIncidents(),
        dbService.getSecurityOfficers(),
        dbService.getSecurityAlerts(),
        dbService.getVisitorPasses(),
        dbService.getGateLogs(),
        dbService.getPatrols(),
        dbService.getSecurityStats(),
        dbService.getResidents()
      ]);

      setIncidents(loadedIncidents);
      setOfficers(loadedOfficers);
      setAlerts(loadedAlerts);
      setVisitorPasses(loadedVisitors);
      setGateLogs(loadedGateLogs);
      setPatrols(loadedPatrols);
      setStats(loadedStats);
      setResidents(loadedResidents);
    } catch (err) {
      console.error('Failed to load security operations data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Filtered Incidents List
  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      // Role scope check: Security Officer only sees assigned or all general incidents
      if (activeRole === 'Security Officer' && inc.assigned_officer_id) {
        // can view all or assigned
      }

      if (incidentTypeFilter !== 'All' && inc.incident_type !== incidentTypeFilter) return false;
      if (incidentPriorityFilter !== 'All' && inc.priority !== incidentPriorityFilter) return false;
      if (incidentStatusFilter !== 'All' && inc.status !== incidentStatusFilter) return false;

      if (!incidentSearch.trim()) return true;
      const q = incidentSearch.toLowerCase();
      return (
        inc.incident_number.toLowerCase().includes(q) ||
        inc.incident_type.toLowerCase().includes(q) ||
        inc.location.toLowerCase().includes(q) ||
        (inc.house_number && inc.house_number.toLowerCase().includes(q)) ||
        inc.reported_by.toLowerCase().includes(q) ||
        inc.description.toLowerCase().includes(q) ||
        (inc.assigned_officer_name && inc.assigned_officer_name.toLowerCase().includes(q))
      );
    });
  }, [incidents, incidentTypeFilter, incidentPriorityFilter, incidentStatusFilter, incidentSearch, activeRole]);

  // Filtered Visitor Passes List
  const filteredVisitors = useMemo(() => {
    return visitorPasses.filter((v) => {
      if (visitorStatusFilter !== 'All' && v.status !== visitorStatusFilter) return false;
      if (!visitorSearch.trim()) return true;
      const q = visitorSearch.toLowerCase();
      return (
        v.pass_code.toLowerCase().includes(q) ||
        v.visitor_name.toLowerCase().includes(q) ||
        v.visitor_phone.includes(q) ||
        (v.vehicle_number && v.vehicle_number.toLowerCase().includes(q)) ||
        v.resident_name.toLowerCase().includes(q) ||
        v.house_number.toLowerCase().includes(q)
      );
    });
  }, [visitorPasses, visitorStatusFilter, visitorSearch]);

  // Filtered Gate Logs
  const filteredGateLogs = useMemo(() => {
    return gateLogs.filter((log) => {
      if (gateLogMovementFilter !== 'All' && log.movement_type !== gateLogMovementFilter) return false;
      if (gateLogTypeFilter !== 'All' && log.entity_type !== gateLogTypeFilter) return false;
      if (!gateLogSearch.trim()) return true;
      const q = gateLogSearch.toLowerCase();
      return (
        log.log_number.toLowerCase().includes(q) ||
        log.name.toLowerCase().includes(q) ||
        (log.vehicle_number && log.vehicle_number.toLowerCase().includes(q)) ||
        (log.destination && log.destination.toLowerCase().includes(q)) ||
        (log.house_number && log.house_number.toLowerCase().includes(q)) ||
        (log.pass_code && log.pass_code.toLowerCase().includes(q)) ||
        log.officer_name.toLowerCase().includes(q)
      );
    });
  }, [gateLogs, gateLogMovementFilter, gateLogTypeFilter, gateLogSearch]);

  // Handlers for Security Operations
  const handleOpenIncidentDetails = (inc: Incident) => {
    setSelectedIncident(inc);
    setIsIncidentDetailOpen(true);
  };

  const handleCreateIncident = async (data: any) => {
    const res = await dbService.createIncident(data);
    if (res.success && res.incident) {
      showToast(`Incident #${res.incident.incident_number} logged successfully!`, 'success');
      await loadAllData();
      return res.incident;
    }
    showToast(res.message || 'Failed to submit incident', 'error');
    return null;
  };

  const handleCreateEmergency = async (data: any) => {
    const res = await dbService.createEmergencyIncident(data);
    if (res.success && res.incident) {
      showToast(`EMERGENCY SOS #${res.incident.incident_number} DISPATCHED!`, 'error');
      await loadAllData();
      return res.incident;
    }
    showToast(res.message || 'Emergency dispatch error', 'error');
    return null;
  };

  const handleUpdateIncidentStatus = async (id: string, status: IncidentStatus, note?: string) => {
    const res = await dbService.updateIncidentStatus(id, status, note, adminUser?.full_name || 'Security Controller');
    if (res.success) {
      showToast(`Incident status updated to ${status}`, 'success');
      await loadAllData();
      if (selectedIncident?.id === id) {
        setSelectedIncident(res.incident || null);
      }
    } else {
      showToast(res.message || 'Failed to update status', 'error');
    }
  };

  const handleAssignOfficer = async (incidentId: string, officerId: string, officerName: string, officerPhone: string) => {
    const res = await dbService.assignIncidentOfficer(incidentId, officerId, officerName, officerPhone, adminUser?.full_name || 'Security Supervisor');
    if (res.success) {
      showToast(`Incident assigned to ${officerName}`, 'success');
      await loadAllData();
      if (selectedIncident?.id === incidentId) {
        setSelectedIncident(res.incident || null);
      }
    } else {
      showToast(res.message || 'Failed to assign officer', 'error');
    }
  };

  const handleAddInvestigationNote = async (incidentId: string, note: string, actionTaken?: string) => {
    const res = await dbService.addIncidentInvestigationNote(incidentId, note, actionTaken, adminUser?.full_name || 'Investigating Officer');
    if (res.success) {
      showToast('Investigation findings saved to timeline', 'success');
      await loadAllData();
      if (selectedIncident?.id === incidentId) {
        setSelectedIncident(res.incident || null);
      }
    } else {
      showToast(res.message || 'Failed to log note', 'error');
    }
  };

  const handleCreateVisitorPass = async (data: any) => {
    const res = await dbService.createVisitorPass(data);
    if (res.success && res.pass) {
      showToast(`Visitor Pass #${res.pass.pass_code} generated for ${res.pass.visitor_name}`, 'success');
      await loadAllData();
      return res.pass;
    }
    showToast(res.message || 'Failed to generate pass', 'error');
    return null;
  };

  const handleVerifyPassCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickVerifyCode.trim()) return;

    setVerifyResultMsg(null);
    const pass = visitorPasses.find(
      p => p.pass_code.toLowerCase() === quickVerifyCode.trim().toLowerCase() ||
           p.visitor_phone === quickVerifyCode.trim() ||
           (p.vehicle_number && p.vehicle_number.toLowerCase() === quickVerifyCode.trim().toLowerCase())
    );

    if (pass) {
      setVerifyResultMsg({
        type: 'success',
        text: `VALID PASS: ${pass.visitor_name} visiting ${pass.resident_name} (${pass.house_number})`,
        pass
      });
    } else {
      setVerifyResultMsg({
        type: 'error',
        text: 'NO ACTIVE PASS FOUND for this code or vehicle. Check credentials or register as new visitor.'
      });
    }
  };

  const handleUpdateVisitorStatus = async (passId: string, status: 'Arrived' | 'Departed' | 'Denied', denialReason?: string) => {
    const res = await dbService.updateVisitorStatus(
      passId, 
      status, 
      adminUser?.full_name || 'Gate Officer', 
      denialReason
    );
    if (res.success) {
      showToast(`Visitor marked as ${status}`, 'success');
      await loadAllData();
      if (verifyResultMsg?.pass?.id === passId && res.pass) {
        setVerifyResultMsg(prev => prev ? { ...prev, pass: res.pass } : null);
      }
    } else {
      showToast(res.message || 'Failed to update visitor status', 'error');
    }
  };

  const handleCreateGateLog = async (data: any) => {
    const res = await dbService.createGateLog(data);
    if (res.success && res.log) {
      showToast(`Gate ${data.movement_type} recorded: ${data.name}`, 'success');
      await loadAllData();
      return res.log;
    }
    showToast('Failed to log gate movement', 'error');
    return null;
  };

  const handleCreateSecurityAlert = async (data: any) => {
    const res = await dbService.createSecurityAlert({
      ...data,
      created_by: adminUser?.full_name || 'Security Command Desk'
    });
    if (res.success && res.alert) {
      showToast(`Security Alert "${res.alert.title}" broadcasted estate-wide!`, 'success');
      await loadAllData();
      return res.alert;
    }
    showToast(res.message || 'Failed to broadcast alert', 'error');
    return null;
  };

  const handleToggleAlertStatus = async (alertId: string, isActive: boolean) => {
    const res = await dbService.toggleSecurityAlertStatus(alertId, isActive, adminUser?.email || 'admin');
    if (res.success) {
      showToast(`Alert status updated to ${isActive ? 'Active' : 'Deactivated'}`, 'info');
      await loadAllData();
    }
  };

  const handleToggleOfficerStatus = async (officerId: string, newStatus: any) => {
    const res = await dbService.updateOfficerStatus(officerId, newStatus, adminUser?.email || 'admin');
    if (res.success) {
      showToast(`Officer status changed to ${newStatus}`, 'info');
      await loadAllData();
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className={`px-4 py-3 rounded-xl shadow-xl border text-xs font-bold flex items-center gap-2.5 max-w-md ${
            toast.type === 'success' 
              ? 'bg-slate-900 text-white border-slate-800' 
              : toast.type === 'error'
              ? 'bg-rose-900 text-white border-rose-800'
              : 'bg-emerald-900 text-white border-emerald-800'
          }`}>
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {toast.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
            {toast.type === 'info' && <Radio className="w-4 h-4 text-blue-400 shrink-0" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Security Operations Master Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>24/7 Security Command Centre</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono">
                Asaba, Delta State
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-white uppercase">
              SECURITY OPERATIONS & INCIDENT MANAGEMENT
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Real-time monitoring, incident dispatching, visitor gate clearance, perimeter patrol logs, and emergency response for Finger of God Estate.
            </p>
          </div>

          {/* Quick Action Buttons & RBAC Role Switcher */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            
            {/* SOS Emergency Button */}
            <button
              onClick={() => setIsEmergencyModalOpen(true)}
              className="px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-rose-600/30 transition-all"
            >
              <ShieldAlert className="w-4 h-4 animate-pulse" />
              <span>EMERGENCY SOS DISPATCH</span>
            </button>

            {/* Log Incident Button */}
            <button
              onClick={() => setIsIncidentFormOpen(true)}
              className="px-4 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Report Incident</span>
            </button>

            {/* Broadcast Alert */}
            <button
              onClick={() => setIsAlertModalOpen(true)}
              className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Bell className="w-4 h-4" />
              <span>Post Alert</span>
            </button>
          </div>

        </div>

        {/* Role Access Context Toggle */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-semibold">Active Security View Role:</span>
            <div className="inline-flex p-1 bg-slate-800/80 rounded-xl border border-slate-700/60">
              {(['Admin', 'Security Supervisor', 'Security Officer'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setActiveRole(r);
                    showToast(`Switched operational view to ${r}`, 'info');
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeRole === r 
                      ? 'bg-emerald-600 text-white shadow-xs' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 text-slate-400 text-xs">
            <span className="flex items-center gap-1.5 font-mono">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-ping" />
              <span>Gate Station 1: Online</span>
            </span>
            <span>•</span>
            <span className="font-mono text-emerald-400">
              {stats.officers_on_duty_count} Officers On Duty
            </span>
          </div>
        </div>

      </div>

      {/* Active Security Alerts Broadcast Strip (If active alerts exist) */}
      {alerts.filter(a => a.is_active).length > 0 && (
        <div className="space-y-2">
          {alerts.filter(a => a.is_active).map((alert) => (
            <div 
              key={alert.id}
              className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                alert.priority === 'Critical'
                  ? 'bg-rose-50 border-rose-300 text-rose-950'
                  : alert.priority === 'High'
                  ? 'bg-amber-50 border-amber-300 text-amber-950'
                  : 'bg-blue-50 border-blue-200 text-blue-950'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                  alert.priority === 'Critical' ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'
                }`}>
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/80 border">
                      {alert.category}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/80 border">
                      {alert.priority} Priority
                    </span>
                    <span className="text-[10px] text-slate-600 font-semibold">
                      Audience: {alert.target_audience}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mt-1">{alert.title}</h4>
                  <p className="text-xs text-slate-700 mt-0.5 leading-relaxed">{alert.message}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto text-xs font-semibold shrink-0">
                <span className="text-[11px] text-slate-500 font-mono">
                  Expires: {new Date(alert.expiry_time).toLocaleDateString('en-NG')}
                </span>
                {activeRole === 'Admin' && (
                  <button
                    onClick={() => handleToggleAlertStatus(alert.id, false)}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 cursor-pointer"
                  >
                    Deactivate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Real-Time Security Operations Key KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        
        {/* 1. Security Status */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Estate Status</span>
          <div className="flex items-center gap-1.5 font-black text-sm text-emerald-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{stats.security_status}</span>
          </div>
          <span className="text-[10px] text-slate-400 block font-medium">Main Gates Normal</span>
        </div>

        {/* 2. Active Incidents */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Active Incidents</span>
          <div className="font-mono text-xl font-black text-rose-600">
            {incidents.filter(i => i.status === 'New' || i.status === 'Acknowledged' || i.status === 'Investigating' || i.status === 'Action Required').length}
          </div>
          <span className="text-[10px] text-slate-400 block font-medium">{stats.critical_incidents_count} Critical Alert</span>
        </div>

        {/* 3. Under Investigation */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Investigating</span>
          <div className="font-mono text-xl font-black text-blue-600">
            {incidents.filter(i => i.status === 'Investigating').length}
          </div>
          <span className="text-[10px] text-slate-400 block font-medium">Assigned to Patrol</span>
        </div>

        {/* 4. Resolved Incidents */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Resolved Cases</span>
          <div className="font-mono text-xl font-black text-emerald-700">
            {incidents.filter(i => i.status === 'Resolved' || i.status === 'Closed').length}
          </div>
          <span className="text-[10px] text-slate-400 block font-medium">100% Closure Record</span>
        </div>

        {/* 5. Visitors Inside Estate */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Visitors Inside</span>
          <div className="font-mono text-xl font-black text-purple-700">
            {visitorPasses.filter(v => v.status === 'Arrived').length}
          </div>
          <span className="text-[10px] text-slate-400 block font-medium">Currently Checked In</span>
        </div>

        {/* 6. Officers On Duty */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">On Duty Officers</span>
          <div className="font-mono text-xl font-black text-slate-900">
            {officers.filter(o => o.status === 'On Duty' || o.status === 'On Patrol' || o.status === 'Responding').length}
          </div>
          <span className="text-[10px] text-slate-400 block font-medium">Roster & Patrol Units</span>
        </div>

      </div>

      {/* Sub-Navigation Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-2xs overflow-x-auto flex items-center gap-1.5">
        {[
          { id: 'overview', label: 'Overview & Fast Actions', icon: Compass },
          { id: 'incidents', label: `Incidents (${incidents.length})`, icon: ShieldAlert },
          { id: 'visitors', label: `Visitor Passes (${visitorPasses.length})`, icon: UserCheck },
          { id: 'gatelog', label: `Gate Security Log (${gateLogs.length})`, icon: DoorOpen },
          { id: 'officers', label: `Officers & Patrols (${officers.length})`, icon: Shield },
          { id: 'alerts', label: `Security Alerts (${alerts.length})`, icon: Bell },
          { id: 'audit', label: 'Audit Trail', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW & FAST ACTIONS */}
      {/* ========================================================================= */}
      {activeSubTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left 2 Cols: Live Incident Stream & Rapid Gate Verification */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Quick Visitor Pass Gate Verification Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 font-display uppercase tracking-tight">
                      Gate Security: Quick Visitor Pass Verification
                    </h3>
                    <p className="text-xs text-slate-500">Scan QR Code or enter Pass Code / Phone / Vehicle Plate to verify entry</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsGateEntryOpen(true)}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  + Manual Gate Log
                </button>
              </div>

              {/* Quick Lookup Form */}
              <form onSubmit={handleVerifyPassCode} className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={quickVerifyCode}
                    onChange={(e) => setQuickVerifyCode(e.target.value)}
                    placeholder="Enter Pass Code (e.g. FOG-VIS-9812), Guest Phone or Plate No..."
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-xs whitespace-nowrap"
                >
                  Verify Visitor
                </button>
              </form>

              {/* Verification Result Card */}
              {verifyResultMsg && (
                <div className={`p-4 rounded-2xl border text-xs space-y-3 animate-in fade-in duration-200 ${
                  verifyResultMsg.type === 'success'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : 'bg-rose-50 border-rose-300 text-rose-950'
                }`}>
                  <div className="flex items-center gap-2 font-bold">
                    {verifyResultMsg.type === 'success' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    )}
                    <span>{verifyResultMsg.text}</span>
                  </div>

                  {verifyResultMsg.pass && (
                    <div className="p-3 bg-white rounded-xl border border-emerald-200 text-xs space-y-2 text-slate-800">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold uppercase">Pass Code</span>
                          <p className="font-mono font-bold text-emerald-800">{verifyResultMsg.pass.pass_code}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold uppercase">Guest Name</span>
                          <p className="font-bold">{verifyResultMsg.pass.visitor_name}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold uppercase">Host Resident</span>
                          <p className="font-bold">{verifyResultMsg.pass.resident_name} ({verifyResultMsg.pass.house_number})</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold uppercase">Pass Status</span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold text-[10px]">
                            {verifyResultMsg.pass.status}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                        {verifyResultMsg.pass.status === 'Expected' && (
                          <button
                            onClick={() => handleUpdateVisitorStatus(verifyResultMsg.pass!.id, 'Arrived')}
                            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold cursor-pointer"
                          >
                            Mark as Admitted / Arrived
                          </button>
                        )}
                        {verifyResultMsg.pass.status === 'Arrived' && (
                          <button
                            onClick={() => handleUpdateVisitorStatus(verifyResultMsg.pass!.id, 'Departed')}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold cursor-pointer"
                          >
                            Mark as Departed
                          </button>
                        )}
                        <button
                          onClick={() => handleUpdateVisitorStatus(verifyResultMsg.pass!.id, 'Denied', 'Unverified credentials')}
                          className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg text-xs font-bold cursor-pointer"
                        >
                          Deny Entry
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Live Incidents Recent Stream */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 font-display uppercase tracking-tight">
                    Recent Incidents & Dispatch Log
                  </h3>
                  <p className="text-xs text-slate-500">Live security logs submitted by residents & patrol officers</p>
                </div>
                <button
                  onClick={() => setActiveSubTab('incidents')}
                  className="text-xs text-emerald-700 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>View All ({incidents.length})</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {incidents.slice(0, 4).map((inc) => (
                  <div
                    key={inc.id}
                    onClick={() => handleOpenIncidentDetails(inc)}
                    className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 mt-0.5 ${
                        inc.priority === 'Critical' ? 'bg-rose-600 animate-pulse' : 'bg-slate-900'
                      }`}>
                        <Shield className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-900">
                            {inc.incident_number}
                          </span>
                          <span className="text-xs font-black text-slate-800">
                            {inc.incident_type}
                          </span>
                          {inc.is_emergency && (
                            <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white font-mono text-[9px] font-bold">
                              SOS
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">
                          {inc.description}
                        </p>
                        <div className="flex items-center gap-3 text-[10px] text-slate-500 pt-1 font-semibold">
                          <span>Location: {inc.location}</span>
                          <span>•</span>
                          <span>Reported: {inc.date} at {inc.time}</span>
                          <span>•</span>
                          <span>By: {inc.reported_by}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                        inc.status === 'Resolved' || inc.status === 'Closed'
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : inc.status === 'Investigating'
                          ? 'bg-blue-100 text-blue-900 border border-blue-300'
                          : 'bg-rose-100 text-rose-900 border border-rose-300'
                      }`}>
                        {inc.status}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column: Security Officer Roster & Live Gate Flow Feed */}
          <div className="space-y-6">
            
            {/* Security Officer Duty Roster */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 font-display uppercase tracking-tight">
                    On-Duty Security Team
                  </h3>
                  <p className="text-xs text-slate-500">Active roster & patrol unit coverage</p>
                </div>
                <button
                  onClick={() => setActiveSubTab('officers')}
                  className="text-xs text-emerald-700 hover:underline font-bold cursor-pointer"
                >
                  Manage Roster
                </button>
              </div>

              <div className="space-y-2.5">
                {officers.slice(0, 5).map((off) => (
                  <div key={off.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                        {off.full_name.charAt(0)}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block">{off.full_name}</span>
                        <span className="text-[10px] text-slate-500 font-mono block">
                          {off.officer_badge_id} • {off.rank}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase block ${
                        off.status === 'On Duty'
                          ? 'bg-emerald-100 text-emerald-900'
                          : off.status === 'On Patrol'
                          ? 'bg-blue-100 text-blue-900'
                          : off.status === 'Responding'
                          ? 'bg-rose-100 text-rose-900'
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        {off.status}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                        {off.phone_number}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Gate Log Entries */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 font-display uppercase tracking-tight">
                    Recent Gate Inflow & Outflow
                  </h3>
                  <p className="text-xs text-slate-500">Live vehicle & pedestrian gate passage</p>
                </div>
                <button
                  onClick={() => setActiveSubTab('gatelog')}
                  className="text-xs text-emerald-700 hover:underline font-bold cursor-pointer"
                >
                  View Gate Log
                </button>
              </div>

              <div className="space-y-2">
                {gateLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span className={`px-1.5 py-0.5 rounded font-black text-[10px] uppercase ${
                        log.movement_type === 'Entry' ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-200 text-slate-800'
                      }`}>
                        {log.movement_type}
                      </span>
                      <div className="truncate">
                        <span className="font-bold text-slate-900 truncate block">{log.name}</span>
                        <span className="text-[10px] text-slate-500 block truncate">
                          {log.entity_type} {log.vehicle_number ? `(${log.vehicle_number})` : ''} • {log.destination}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400 shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: INCIDENTS & REPORTS */}
      {/* ========================================================================= */}
      {activeSubTab === 'incidents' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-lg font-black text-slate-900 font-display uppercase tracking-tight">
                ESTATE INCIDENT REGISTRY & INVESTIGATION MANAGEMENT
              </h3>
              <p className="text-xs text-slate-500">
                Official security incident reports, officer assignments, timeline audits and case resolution
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsIncidentFormOpen(true)}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Log New Incident</span>
              </button>
            </div>
          </div>

          {/* Incident Filter & Search Toolbar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="relative sm:col-span-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={incidentSearch}
                onChange={(e) => setIncidentSearch(e.target.value)}
                placeholder="Search Incident #, Type, House, Person..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <select
                value={incidentTypeFilter}
                onChange={(e) => setIncidentTypeFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="All">All Incident Types</option>
                <option value="Suspicious activity">Suspicious Activity</option>
                <option value="Theft">Theft</option>
                <option value="Burglary">Burglary</option>
                <option value="Trespassing">Trespassing</option>
                <option value="Property damage">Property Damage</option>
                <option value="Fight/disturbance">Fight / Disturbance</option>
                <option value="Vehicle-related incident">Vehicle Incident</option>
                <option value="Gate/security breach">Gate / Security Breach</option>
                <option value="Fire">Fire</option>
                <option value="Medical emergency">Medical Emergency</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <select
                value={incidentPriorityFilter}
                onChange={(e) => setIncidentPriorityFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="All">All Priorities</option>
                <option value="Critical">Critical Alert</option>
                <option value="High">High Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="Low">Low Priority</option>
              </select>
            </div>

            <div>
              <select
                value={incidentStatusFilter}
                onChange={(e) => setIncidentStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="All">All Statuses</option>
                <option value="New">New</option>
                <option value="Acknowledged">Acknowledged</option>
                <option value="Investigating">Investigating</option>
                <option value="Action Required">Action Required</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>

          {/* Incidents Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider bg-slate-50/50">
                  <th className="py-3 px-3">Ref Number</th>
                  <th className="py-3 px-3">Classification</th>
                  <th className="py-3 px-3">Priority</th>
                  <th className="py-3 px-3">Location / House</th>
                  <th className="py-3 px-3">Reported By</th>
                  <th className="py-3 px-3">Assigned Officer</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredIncidents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      No security incidents found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredIncidents.map((inc) => (
                    <tr key={inc.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-3 font-mono font-bold text-slate-900">
                        {inc.incident_number}
                        {inc.is_emergency && (
                          <span className="ml-1.5 px-1.5 py-0.2 rounded bg-rose-600 text-white font-mono text-[9px] font-bold">
                            SOS
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 font-bold text-slate-800">
                        {inc.incident_type}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                          inc.priority === 'Critical'
                            ? 'bg-rose-600 text-white animate-pulse'
                            : inc.priority === 'High'
                            ? 'bg-orange-100 text-orange-900'
                            : inc.priority === 'Medium'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {inc.priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-700 font-semibold truncate max-w-[150px]">
                        {inc.location} {inc.house_number ? `(${inc.house_number})` : ''}
                      </td>
                      <td className="py-3.5 px-3 text-slate-700 font-medium">
                        {inc.reported_by}
                      </td>
                      <td className="py-3.5 px-3 text-slate-800 font-semibold">
                        {inc.assigned_officer_name || <span className="text-slate-400 italic">Unassigned</span>}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          inc.status === 'Resolved' || inc.status === 'Closed'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : inc.status === 'Investigating'
                            ? 'bg-blue-100 text-blue-900 border border-blue-300'
                            : inc.status === 'Action Required'
                            ? 'bg-purple-100 text-purple-900 border border-purple-300'
                            : 'bg-rose-100 text-rose-900 border border-rose-300'
                        }`}>
                          {inc.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <button
                          onClick={() => handleOpenIncidentDetails(inc)}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: VISITOR MANAGEMENT */}
      {/* ========================================================================= */}
      {activeSubTab === 'visitors' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-lg font-black text-slate-900 font-display uppercase tracking-tight">
                VISITOR PASS CONTROL & GATE VERIFICATION
              </h3>
              <p className="text-xs text-slate-500">
                Pre-registered resident guest passes, digital verification QR codes, and entry status tracking
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (residents.length > 0) {
                    setIsVisitorModalOpen(true);
                  } else {
                    showToast('Register at least 1 resident first', 'error');
                  }
                }}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Issue Visitor Pass</span>
              </button>
            </div>
          </div>

          {/* Visitor Pass Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="relative sm:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={visitorSearch}
                onChange={(e) => setVisitorSearch(e.target.value)}
                placeholder="Search Pass Code, Guest Name, Phone, Vehicle, Resident Host..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <select
                value={visitorStatusFilter}
                onChange={(e) => setVisitorStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="All">All Pass Statuses</option>
                <option value="Expected">Expected / Scheduled</option>
                <option value="Arrived">Arrived / Inside Estate</option>
                <option value="Departed">Departed</option>
                <option value="Denied">Denied Entry</option>
                <option value="Expired">Expired</option>
              </select>
            </div>
          </div>

          {/* Visitor Passes Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider bg-slate-50/50">
                  <th className="py-3 px-3">Pass Code</th>
                  <th className="py-3 px-3">Visitor Name & Phone</th>
                  <th className="py-3 px-3">Vehicle Details</th>
                  <th className="py-3 px-3">Host Resident</th>
                  <th className="py-3 px-3">Expected Time</th>
                  <th className="py-3 px-3">Pass Status</th>
                  <th className="py-3 px-3 text-right">Gate Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVisitors.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No visitor passes found matching your filter.
                    </td>
                  </tr>
                ) : (
                  filteredVisitors.map((pass) => (
                    <tr key={pass.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-3 font-mono font-black text-emerald-800">
                        {pass.pass_code}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="font-bold text-slate-900 block">{pass.visitor_name}</span>
                        <span className="text-[10px] text-slate-500 font-mono block">{pass.visitor_phone}</span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-700 font-medium">
                        {pass.vehicle_number ? `${pass.vehicle_number} (${pass.vehicle_description || 'Vehicle'})` : 'Pedestrian / None'}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="font-bold text-slate-900 block">{pass.resident_name}</span>
                        <span className="text-[10px] text-emerald-700 font-semibold block">{pass.house_number} (#{pass.resident_number})</span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-700 font-mono text-[11px]">
                        {new Date(pass.expected_arrival).toLocaleString('en-NG', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          pass.status === 'Arrived'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : pass.status === 'Departed'
                            ? 'bg-slate-100 text-slate-700 border border-slate-300'
                            : pass.status === 'Denied'
                            ? 'bg-rose-100 text-rose-900 border border-rose-300'
                            : 'bg-blue-100 text-blue-900 border border-blue-300'
                        }`}>
                          {pass.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        {pass.status === 'Expected' ? (
                          <button
                            onClick={() => handleUpdateVisitorStatus(pass.id, 'Arrived')}
                            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg cursor-pointer shadow-2xs"
                          >
                            Admit Entry
                          </button>
                        ) : pass.status === 'Arrived' ? (
                          <button
                            onClick={() => handleUpdateVisitorStatus(pass.id, 'Departed')}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg cursor-pointer"
                          >
                            Mark Departed
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs font-semibold">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: GATE SECURITY LOG */}
      {/* ========================================================================= */}
      {activeSubTab === 'gatelog' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-lg font-black text-slate-900 font-display uppercase tracking-tight">
                ESTATE MAIN GATE ACCESS REGISTER
              </h3>
              <p className="text-xs text-slate-500">
                Audit trail of all vehicle & pedestrian entries, exits, contractors, deliveries and security patrols
              </p>
            </div>

            <button
              onClick={() => setIsGateEntryOpen(true)}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <DoorOpen className="w-4 h-4" />
              <span>Record Gate Movement</span>
            </button>
          </div>

          {/* Gate Log Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="relative sm:col-span-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={gateLogSearch}
                onChange={(e) => setGateLogSearch(e.target.value)}
                placeholder="Search Name, Vehicle, House, Pass #..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <select
                value={gateLogMovementFilter}
                onChange={(e) => setGateLogMovementFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="All">All Inflow / Outflow</option>
                <option value="Entry">Inflow (Gate Entry)</option>
                <option value="Exit">Outflow (Gate Exit)</option>
              </select>
            </div>

            <div>
              <select
                value={gateLogTypeFilter}
                onChange={(e) => setGateLogTypeFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="All">All Categories</option>
                <option value="Visitor">Visitor</option>
                <option value="Resident">Resident</option>
                <option value="Contractor">Contractor</option>
                <option value="Delivery">Delivery</option>
                <option value="Staff">Estate Staff</option>
                <option value="Service Vehicle">Service Vehicle</option>
                <option value="Security Patrol">Security Patrol</option>
              </select>
            </div>
          </div>

          {/* Gate Logs Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider bg-slate-50/50">
                  <th className="py-3 px-3">Log Ref</th>
                  <th className="py-3 px-3">Movement</th>
                  <th className="py-3 px-3">Classification</th>
                  <th className="py-3 px-3">Person / Driver</th>
                  <th className="py-3 px-3">Vehicle Plate</th>
                  <th className="py-3 px-3">Destination / House</th>
                  <th className="py-3 px-3">Time</th>
                  <th className="py-3 px-3 text-right">Gate Officer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredGateLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      No gate movement entries logged yet.
                    </td>
                  </tr>
                ) : (
                  filteredGateLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-3 font-mono font-bold text-slate-900">
                        {log.log_number}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full font-black text-[10px] uppercase ${
                          log.movement_type === 'Entry'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : 'bg-slate-900 text-white'
                        }`}>
                          {log.movement_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-bold text-slate-800">
                        {log.entity_type}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="font-bold text-slate-900 block">{log.name}</span>
                        {log.phone_number && (
                          <span className="text-[10px] text-slate-500 font-mono block">{log.phone_number}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 font-mono font-bold text-slate-900 uppercase">
                        {log.vehicle_number || '—'}
                      </td>
                      <td className="py-3.5 px-3 text-slate-700 font-semibold">
                        {log.destination} {log.house_number ? `(${log.house_number})` : ''}
                      </td>
                      <td className="py-3.5 px-3 text-slate-600 font-mono text-[11px]">
                        {new Date(log.timestamp).toLocaleString('en-NG', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-semibold text-slate-700">
                        {log.officer_name} ({log.officer_badge})
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: OFFICERS & PATROLS */}
      {/* ========================================================================= */}
      {activeSubTab === 'officers' && (
        <div className="space-y-6">
          
          {/* Officers Roster */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-black text-slate-900 font-display uppercase tracking-tight">
                  SECURITY OFFICER ROSTER & COMMAND DECK
                </h3>
                <p className="text-xs text-slate-500">
                  Personnel shifts, active duty assignments and patrol status
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {officers.map((off) => (
                <div key={off.id} className="p-5 rounded-3xl bg-slate-50 border border-slate-200 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-900 text-emerald-400 flex items-center justify-center font-black text-base shadow-xs">
                        {off.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <span className="font-mono text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                          {off.officer_badge_id}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 mt-1">{off.full_name}</h4>
                        <p className="text-[11px] text-slate-500 font-semibold">{off.rank}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-700">
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Shift Schedule:</span>
                      <span className="font-semibold text-slate-900">{off.shift}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Assigned Area:</span>
                      <span className="font-semibold text-slate-900">{off.assigned_area || 'Phase 1 & Gate'}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Telephone:</span>
                      <span className="font-mono font-bold text-emerald-800">{off.phone_number}</span>
                    </div>
                  </div>

                  {activeRole === 'Admin' || activeRole === 'Security Supervisor' ? (
                    <div className="pt-2 border-t border-slate-200/80">
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Update Duty Status
                      </label>
                      <select
                        value={off.status}
                        onChange={(e) => handleToggleOfficerStatus(off.id, e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="On Duty">On Duty</option>
                        <option value="On Patrol">On Patrol</option>
                        <option value="Responding">Responding to Call</option>
                        <option value="Off Duty">Off Duty</option>
                        <option value="Unavailable">Unavailable</option>
                      </select>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          {/* Patrol Records */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-black text-slate-900 font-display uppercase tracking-tight">
              Estate Perimeter Patrol Log & Discovery Log
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider bg-slate-50/50">
                    <th className="py-3 px-3">Patrol Code</th>
                    <th className="py-3 px-3">Lead Officer</th>
                    <th className="py-3 px-3">Patrol Area</th>
                    <th className="py-3 px-3">Checkpoints</th>
                    <th className="py-3 px-3">Start & End</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Discovery Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {patrols.map((ptr) => (
                    <tr key={ptr.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-3 font-mono font-bold text-slate-900">
                        {ptr.patrol_code}
                      </td>
                      <td className="py-3.5 px-3 font-bold text-slate-800">
                        {ptr.officer_name} ({ptr.officer_badge})
                      </td>
                      <td className="py-3.5 px-3 text-slate-700 font-semibold">
                        {ptr.patrol_area}
                      </td>
                      <td className="py-3.5 px-3 font-mono font-bold text-emerald-800">
                        {ptr.checkpoints_completed} / {ptr.checkpoints_count}
                      </td>
                      <td className="py-3.5 px-3 text-slate-600 font-mono text-[11px]">
                        {ptr.start_time} - {ptr.end_time || 'In Progress'}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          ptr.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : ptr.status === 'In Progress'
                            ? 'bg-blue-100 text-blue-900 border border-blue-300'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {ptr.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-600 font-medium">
                        {ptr.notes || 'All perimeter fence sensors and street lights intact.'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: SECURITY ALERTS */}
      {/* ========================================================================= */}
      {activeSubTab === 'alerts' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-lg font-black text-slate-900 font-display uppercase tracking-tight">
                ESTATE SECURITY ALERTS & ADVISORIES
              </h3>
              <p className="text-xs text-slate-500">
                Broadcasted security warnings, gate restrictions, and emergency notifications
              </p>
            </div>

            <button
              onClick={() => setIsAlertModalOpen(true)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Bell className="w-4 h-4" />
              <span>Broadcast New Alert</span>
            </button>
          </div>

          <div className="space-y-4">
            {alerts.length === 0 ? (
              <p className="py-8 text-center text-slate-500 text-xs">No security alerts published.</p>
            ) : (
              alerts.map((alert) => (
                <div key={alert.id} className="p-5 rounded-3xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black text-slate-900 bg-white px-2 py-0.5 rounded border">
                        {alert.alert_code}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        alert.priority === 'Critical' ? 'bg-rose-600 text-white' : 'bg-amber-500/20 text-amber-900'
                      }`}>
                        {alert.priority} Priority
                      </span>
                      <span className="text-xs font-bold text-slate-600">
                        {alert.category}
                      </span>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase self-start sm:self-auto ${
                      alert.is_active ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {alert.is_active ? 'Active on Public & Resident Portal' : 'Archived / Expired'}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-slate-900">{alert.title}</h4>
                    <p className="text-xs text-slate-700 mt-1 leading-relaxed">{alert.message}</p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200/80 text-[11px] text-slate-500">
                    <div>
                      <span>Target Audience: <strong className="text-slate-800">{alert.target_audience}</strong></span>
                      <span className="mx-2">•</span>
                      <span>Published by: <strong className="text-slate-800">{alert.created_by}</strong></span>
                    </div>
                    <div className="font-mono">
                      <span>Valid: {new Date(alert.start_time).toLocaleDateString('en-NG')}</span>
                      <span> - {new Date(alert.expiry_time).toLocaleDateString('en-NG')}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: SECURITY AUDIT TRAIL */}
      {/* ========================================================================= */}
      {activeSubTab === 'audit' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-lg font-black text-slate-900 font-display uppercase tracking-tight">
                SECURITY ACTIVITY AUDIT LEDGER
              </h3>
              <p className="text-xs text-slate-500">
                Immutable record of all incident transitions, visitor approvals, gate passages and officer dispatches
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {incidents.flatMap(inc => (inc.timeline || []).map(tl => ({ ...tl, incidentRef: inc.incident_number })))
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .slice(0, 15)
              .map((entry, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-4 text-xs">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center font-bold shrink-0 mt-0.5">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">{(entry as any).incidentRef}</span>
                        <span className="font-bold text-slate-800">{entry.title}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{entry.description}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 pt-1 font-semibold">
                        <span>User: {entry.performed_by}</span>
                        {entry.performed_by_role && <span>({entry.performed_by_role})</span>}
                      </div>
                    </div>
                  </div>

                  <span className="font-mono text-[10px] text-slate-500 shrink-0">
                    {new Date(entry.timestamp).toLocaleString('en-NG', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* MODALS */}
      {/* 1. Incident Detail & Investigation Modal */}
      {selectedIncident && (
        <IncidentDetailModal
          isOpen={isIncidentDetailOpen}
          onClose={() => {
            setIsIncidentDetailOpen(false);
            setSelectedIncident(null);
          }}
          incident={selectedIncident}
          officersList={officers}
          onUpdateStatus={handleUpdateIncidentStatus}
          onAssignOfficer={handleAssignOfficer}
          onAddInvestigationNote={handleAddInvestigationNote}
          isStaff={activeRole === 'Admin' || activeRole === 'Security Supervisor' || activeRole === 'Security Officer'}
        />
      )}

      {/* 2. New Incident Form Modal */}
      {isIncidentFormOpen && (
        <IncidentFormModal
          isOpen={isIncidentFormOpen}
          onClose={() => setIsIncidentFormOpen(false)}
          onSubmitIncident={handleCreateIncident}
          currentUser={adminUser}
          isStaffMode={true}
        />
      )}

      {/* 3. Emergency SOS Dispatch Modal */}
      {isEmergencyModalOpen && (
        <EmergencyReportModal
          isOpen={isEmergencyModalOpen}
          onClose={() => setIsEmergencyModalOpen(false)}
          onSubmitEmergency={handleCreateEmergency}
        />
      )}

      {/* 4. Visitor Pass Pre-Registration Modal */}
      {isVisitorModalOpen && (
        <VisitorPassModal
          isOpen={isVisitorModalOpen}
          onClose={() => setIsVisitorModalOpen(false)}
          onSubmitVisitor={handleCreateVisitorPass}
          currentResident={residents[0] || null}
          estateSettings={estateSettings}
        />
      )}

      {/* 5. Gate Entry/Exit Recording Modal */}
      {isGateEntryOpen && (
        <GateEntryModal
          isOpen={isGateEntryOpen}
          onClose={() => setIsGateEntryOpen(false)}
          onSubmitLog={handleCreateGateLog}
          officersList={officers}
        />
      )}

      {/* 6. Security Alert Broadcast Modal */}
      {isAlertModalOpen && (
        <SecurityAlertModal
          isOpen={isAlertModalOpen}
          onClose={() => setIsAlertModalOpen(false)}
          onSubmitAlert={handleCreateSecurityAlert}
          currentUser={adminUser}
        />
      )}

    </div>
  );
};
