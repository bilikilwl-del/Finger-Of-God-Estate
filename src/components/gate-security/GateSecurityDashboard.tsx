import React, { useState, useEffect, useMemo } from 'react';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  DoorOpen, 
  Users, 
  UserCheck, 
  Car, 
  Truck, 
  Wrench, 
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
  Phone, 
  Radio, 
  AlertTriangle, 
  QrCode, 
  Eye, 
  LogIn, 
  LogOut, 
  Ban, 
  UserPlus, 
  ExternalLink,
  SlidersHorizontal,
  Flame
} from 'lucide-react';
import { 
  EstateSettings, 
  GateLogEntry, 
  VisitorPass, 
  ResidentVehicle, 
  ContractorAccessPass, 
  DeliveryAccessPass, 
  RestrictedWatchlistEntry, 
  SecurityOfficer, 
  SecurityAlert, 
  GateSecurityOverviewStats 
} from '../../types/database';
import { dbService } from '../../lib/supabase';
import { ResidentVerificationModal } from './ResidentVerificationModal';
import { GateVisitorScannerModal } from './GateVisitorScannerModal';
import { WalkInVisitorModal } from './WalkInVisitorModal';
import { DeliveryEntryModal } from './DeliveryEntryModal';
import { ContractorPermitModal } from './ContractorPermitModal';
import { VehicleScannerModal } from './VehicleScannerModal';
import { RestrictedWatchlistModal } from './RestrictedWatchlistModal';
import { VisitorPassModal } from '../security/VisitorPassModal';
import { IncidentFormModal } from '../security/IncidentFormModal';
import { EmergencyReportModal } from '../security/EmergencyReportModal';

interface GateSecurityDashboardProps {
  estateSettings: EstateSettings;
  adminUser?: {
    email: string;
    full_name?: string;
    role?: string;
  } | null;
  onNavigateToResident?: (residentNumber: string) => void;
}

export const GateSecurityDashboard: React.FC<GateSecurityDashboardProps> = ({
  estateSettings,
  adminUser,
  onNavigateToResident
}) => {
  // Sub-Navigation Tabs
  const [activeSubTab, setActiveSubTab] = useState<
    'console' | 'visitors' | 'deliveries' | 'contractors' | 'vehicles' | 'watchlist' | 'audit_log'
  >('console');

  // Real-time Clock
  const [liveTime, setLiveTime] = useState<string>(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  const [liveDate] = useState<string>(new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Data States
  const [officers, setOfficers] = useState<SecurityOfficer[]>([]);
  const [visitorPasses, setVisitorPasses] = useState<VisitorPass[]>([]);
  const [gateLogs, setGateLogs] = useState<GateLogEntry[]>([]);
  const [vehicles, setVehicles] = useState<ResidentVehicle[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryAccessPass[]>([]);
  const [contractors, setContractors] = useState<ContractorAccessPass[]>([]);
  const [watchlist, setWatchlist] = useState<RestrictedWatchlistEntry[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [stats, setStats] = useState<GateSecurityOverviewStats>({
    officer_on_duty: null,
    current_time: '',
    visitors_inside_count: 0,
    expected_visitors_today: 0,
    recent_entries_count: 0,
    recent_exits_count: 0,
    pending_walk_in_approvals: 0,
    active_alerts_count: 0,
    restricted_access_attempts: 0,
    emergency_alerts_count: 0,
    active_contractors_count: 0,
    active_deliveries_count: 0,
    total_registered_vehicles: 0
  });

  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [movementFilter, setMovementFilter] = useState<'All' | 'Entry' | 'Exit'>('All');
  const [entityFilter, setEntityFilter] = useState<string>('All');

  // Modal States
  const [isResidentModalOpen, setIsResidentModalOpen] = useState(false);
  const [isVisitorScannerOpen, setIsVisitorScannerOpen] = useState(false);
  const [isRegisterVisitorOpen, setIsRegisterVisitorOpen] = useState(false);
  const [isWalkInOpen, setIsWalkInOpen] = useState(false);
  const [isDeliveryOpen, setIsDeliveryOpen] = useState(false);
  const [isContractorOpen, setIsContractorOpen] = useState(false);
  const [isVehicleScannerOpen, setIsVehicleScannerOpen] = useState(false);
  const [isWatchlistOpen, setIsWatchlistOpen] = useState(false);
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);

  // Load All Gate Data
  const loadGateData = async () => {
    setLoading(true);
    try {
      const [
        loadedOfficers,
        loadedVisitors,
        loadedLogs,
        loadedVehicles,
        loadedDeliveries,
        loadedContractors,
        loadedWatchlist,
        loadedAlerts,
        loadedStats
      ] = await Promise.all([
        dbService.getSecurityOfficers(),
        dbService.getVisitorPasses(),
        dbService.getGateLogs(),
        dbService.getResidentVehicles(),
        dbService.getDeliveryPasses(),
        dbService.getContractorPasses(),
        dbService.getWatchlist(),
        dbService.getSecurityAlerts(),
        dbService.getGateSecurityOverviewStats()
      ]);

      setOfficers(loadedOfficers);
      setVisitorPasses(loadedVisitors);
      setGateLogs(loadedLogs);
      setVehicles(loadedVehicles);
      setDeliveries(loadedDeliveries);
      setContractors(loadedContractors);
      setWatchlist(loadedWatchlist);
      setAlerts(loadedAlerts);
      setStats(loadedStats);
    } catch (e) {
      console.error('Error loading gate data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGateData();
  }, []);

  const activeOfficer = stats.officer_on_duty || officers[0] || {
    full_name: 'Sgt. Audu Momoh',
    officer_badge_id: 'FOG-SEC-01',
    rank: 'Chief Security Officer',
    shift: 'Morning (06:00 - 14:00)',
    status: 'On Duty',
    phone_number: '08023456789'
  };

  // Quick 1-Click Checkouts
  const handleDirectVisitorCheckout = async (passId: string) => {
    try {
      await dbService.updateVisitorStatus(passId, 'Departed', activeOfficer.full_name);
      await loadGateData();
    } catch (e) {
      console.error('Error checking out visitor:', e);
    }
  };

  const handleDirectDeliveryCheckout = async (passId: string) => {
    try {
      await dbService.updateDeliveryStatus(passId, 'Exited', activeOfficer.full_name);
      await loadGateData();
    } catch (e) {
      console.error('Error exiting delivery:', e);
    }
  };

  const handleDirectContractorCheckout = async (passId: string) => {
    try {
      await dbService.updateContractorStatus(passId, 'Completed', activeOfficer.full_name);
      await loadGateData();
    } catch (e) {
      console.error('Error completing contractor pass:', e);
    }
  };

  // Filtered Gate Logs
  const filteredLogs = useMemo(() => {
    return gateLogs.filter(log => {
      const matchSearch = searchTerm === '' ||
        log.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.vehicle_number && log.vehicle_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.house_number && log.house_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.pass_code && log.pass_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
        log.destination.toLowerCase().includes(searchTerm.toLowerCase());

      const matchMovement = movementFilter === 'All' || log.movement_type === movementFilter;
      const matchEntity = entityFilter === 'All' || log.entity_type === entityFilter;

      return matchSearch && matchMovement && matchEntity;
    });
  }, [gateLogs, searchTerm, movementFilter, entityFilter]);

  // Export Gate Movements to CSV
  const handleExportCSV = () => {
    const headers = ['Log Number', 'Timestamp', 'Movement', 'Entity Type', 'Subject Name', 'Vehicle Plate', 'House Number', 'Destination', 'Pass Code', 'Officer'];
    const rows = filteredLogs.map(l => [
      l.log_number,
      new Date(l.timestamp).toLocaleString('en-NG'),
      l.movement_type,
      l.entity_type,
      `"${l.name.replace(/"/g, '""')}"`,
      l.vehicle_number || 'N/A',
      l.house_number || 'N/A',
      `"${l.destination.replace(/"/g, '""')}"`,
      l.pass_code || 'N/A',
      `"${l.officer_name}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `FOG_Gate_Movements_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Gate Audit Report
  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* 1. TOP GATE HEADER BAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>MAIN GATE CONTROL POST • ASABA</span>
            </span>
            <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-mono font-bold">
              LANE 1 & 2 ACTIVE
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-white uppercase">
            ESTATE GATE ACCESS CONTROL
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Real-time biometric & pass verification terminal for Finger of God Estate. Clear residents, authorize registered guests, track commercial deliveries, and enforce perimeter watchlist denials.
          </p>
        </div>

        {/* Live Duty Officer & Clock Widget */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-5 shrink-0 shadow-inner">
          <div className="text-center sm:text-right border-b sm:border-b-0 sm:border-r border-slate-800 pb-3 sm:pb-0 sm:pr-5">
            <div className="font-mono text-2xl sm:text-3xl font-black text-emerald-400 tracking-wider">
              {liveTime}
            </div>
            <div className="text-[11px] font-semibold text-slate-400 mt-0.5">
              {liveDate}
            </div>
          </div>

          <div className="flex items-center gap-3 text-left">
            <div className="w-11 h-11 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 font-black text-sm">
              {activeOfficer.officer_badge_id?.split('-')[2] || '01'}
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <span>Officer on Duty</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </div>
              <div className="font-bold text-white text-sm">
                {activeOfficer.full_name}
              </div>
              <div className="text-[11px] text-slate-400">
                {activeOfficer.shift} • {activeOfficer.phone_number}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. PROMINENT QUICK ACTIONS RIBBON */}
      <div className="bg-slate-950 border border-slate-800/90 rounded-3xl p-4 sm:p-5 shadow-lg">
        <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
          <span>Gate Clearance & Fast Actions</span>
          <span className="text-[10px] text-emerald-400 font-mono">Touch & Keyboard Optimized</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-2.5">
          <button
            onClick={() => setIsResidentModalOpen(true)}
            className="p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white flex flex-col items-center justify-center text-center gap-2 cursor-pointer shadow-lg shadow-emerald-950 transition-all hover:scale-102"
          >
            <UserCheck className="w-5 h-5 text-white" />
            <span className="text-xs font-black uppercase tracking-tight">Verify Resident</span>
          </button>

          <button
            onClick={() => setIsVisitorScannerOpen(true)}
            className="p-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white flex flex-col items-center justify-center text-center gap-2 cursor-pointer shadow-lg shadow-blue-950 transition-all hover:scale-102"
          >
            <QrCode className="w-5 h-5 text-white" />
            <span className="text-xs font-black uppercase tracking-tight">Scan Pass (QR)</span>
          </button>

          <button
            onClick={() => setIsWalkInOpen(true)}
            className="p-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-slate-950 flex flex-col items-center justify-center text-center gap-2 cursor-pointer shadow-lg shadow-amber-950 transition-all hover:scale-102"
          >
            <UserPlus className="w-5 h-5 text-slate-950" />
            <span className="text-xs font-black uppercase tracking-tight">Walk-In Visitor</span>
          </button>

          <button
            onClick={() => setIsVehicleScannerOpen(true)}
            className="p-3 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white flex flex-col items-center justify-center text-center gap-2 cursor-pointer shadow-lg shadow-teal-950 transition-all hover:scale-102"
          >
            <Car className="w-5 h-5 text-white" />
            <span className="text-xs font-black uppercase tracking-tight">Plate Scanner</span>
          </button>

          <button
            onClick={() => setIsDeliveryOpen(true)}
            className="p-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white flex flex-col items-center justify-center text-center gap-2 cursor-pointer shadow-lg shadow-purple-950 transition-all hover:scale-102"
          >
            <Truck className="w-5 h-5 text-white" />
            <span className="text-xs font-black uppercase tracking-tight">Courier Entry</span>
          </button>

          <button
            onClick={() => setIsContractorOpen(true)}
            className="p-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white flex flex-col items-center justify-center text-center gap-2 cursor-pointer shadow-lg shadow-indigo-950 transition-all hover:scale-102"
          >
            <Wrench className="w-5 h-5 text-white" />
            <span className="text-xs font-black uppercase tracking-tight">Work Permit</span>
          </button>

          <button
            onClick={() => setIsWatchlistOpen(true)}
            className="p-3 rounded-2xl bg-rose-950 hover:bg-rose-900 border border-rose-700 text-rose-200 flex flex-col items-center justify-center text-center gap-2 cursor-pointer transition-all hover:scale-102"
          >
            <Ban className="w-5 h-5 text-rose-400" />
            <span className="text-xs font-black uppercase tracking-tight">Watchlist</span>
          </button>

          <button
            onClick={() => setIsEmergencyModalOpen(true)}
            className="p-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white flex flex-col items-center justify-center text-center gap-2 cursor-pointer shadow-lg shadow-rose-950 animate-pulse transition-all hover:scale-102"
          >
            <Flame className="w-5 h-5 text-white" />
            <span className="text-xs font-black uppercase tracking-tight">SOS EMERGENCY</span>
          </button>
        </div>
      </div>

      {/* 3. REAL-TIME KPI SUMMARY STATS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Visitors Inside */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Guests Inside</span>
            <DoorOpen className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-emerald-400 font-mono">
              {stats.visitors_inside_count}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Expected Today: {stats.expected_visitors_today}
            </div>
          </div>
        </div>

        {/* 24h Inbound Entries */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Gate Entries</span>
            <LogIn className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-blue-400 font-mono">
              {stats.recent_entries_count}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Exits Logged: {stats.recent_exits_count}
            </div>
          </div>
        </div>

        {/* Active Couriers */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Deliveries</span>
            <Truck className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-purple-400 font-mono">
              {stats.active_deliveries_count}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Avg turnaround: 18m
            </div>
          </div>
        </div>

        {/* Active Artisans */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Work Permits</span>
            <Wrench className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-amber-400 font-mono">
              {stats.active_contractors_count}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Contractors on-site
            </div>
          </div>
        </div>

        {/* Registered Vehicles */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Registered Cars</span>
            <Car className="w-4 h-4 text-teal-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-teal-400 font-mono">
              {stats.total_registered_vehicles}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Linked to plots
            </div>
          </div>
        </div>

        {/* Watchlist Alerts */}
        <div className={`border rounded-2xl p-4 flex flex-col justify-between ${
          stats.restricted_access_attempts > 0
            ? 'bg-rose-950/70 border-rose-600/70 text-rose-200'
            : 'bg-slate-900 border-slate-800 text-slate-100'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider">Watchlist Items</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-rose-400 font-mono">
              {stats.restricted_access_attempts}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Restricted targets
            </div>
          </div>
        </div>
      </div>

      {/* 4. SUB-NAVIGATION TABS */}
      <div className="border-b border-slate-800 pb-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 sm:gap-2">
          <button
            onClick={() => setActiveSubTab('console')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'console'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <DoorOpen className="w-4 h-4" />
            <span>Gate Console</span>
          </button>

          <button
            onClick={() => setActiveSubTab('visitors')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'visitors'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Visitor Clearance ({visitorPasses.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('deliveries')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'deliveries'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Deliveries ({deliveries.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('contractors')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'contractors'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Contractors ({contractors.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('vehicles')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'vehicles'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Car className="w-4 h-4" />
            <span>Resident Vehicles ({vehicles.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('watchlist')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'watchlist'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Ban className="w-4 h-4" />
            <span>Watchlist ({watchlist.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('audit_log')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'audit_log'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Audit Log</span>
          </button>
        </div>

        <button
          onClick={loadGateData}
          disabled={loading}
          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 text-xs"
          title="Refresh live gate records"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* 5. SUB-TAB VIEWPORT CONTENT */}
      
      {/* TAB 1: GATE CONSOLE & LIVE MOVEMENT FEED */}
      {activeSubTab === 'console' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left: Active Inside Subjects Table */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <h3 className="font-bold text-white text-base">
                    Active Visitors & Service Vehicles Currently Inside Estate
                  </h3>
                </div>
                <span className="text-xs font-mono bg-slate-950 px-2.5 py-1 rounded-lg text-emerald-400 border border-slate-800">
                  {visitorPasses.filter(v => v.status === 'Arrived').length + deliveries.filter(d => d.status === 'Inside Estate').length + contractors.filter(c => c.status === 'Active On-Site').length} on premises
                </span>
              </div>

              {/* Table of active entities */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Subject / Entity</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Destination</th>
                      <th className="py-2.5 px-3">Entry Time</th>
                      <th className="py-2.5 px-3 text-right">Quick Exit Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {/* Active Visitors */}
                    {visitorPasses.filter(v => v.status === 'Arrived').map((v) => (
                      <tr key={v.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-white">{v.visitor_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{v.vehicle_number || v.visitor_phone}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold uppercase">
                            Visitor
                          </span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-emerald-400">
                          {v.house_number} ({v.resident_name})
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-400">
                          {v.entry_time ? new Date(v.entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleDirectVisitorCheckout(v.id)}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-[11px] uppercase cursor-pointer border border-slate-700 inline-flex items-center gap-1"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Check Out</span>
                          </button>
                        </td>
                      </tr>
                    ))}

                    {/* Active Deliveries */}
                    {deliveries.filter(d => d.status === 'Inside Estate').map((d) => (
                      <tr key={d.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-white">{d.rider_name}</div>
                          <div className="text-[10px] text-purple-400">{d.courier_company} ({d.vehicle_plate || d.vehicle_type})</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold uppercase">
                            Courier
                          </span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-emerald-400">
                          {d.house_number} ({d.resident_name})
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-400">
                          {new Date(d.entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleDirectDeliveryCheckout(d.id)}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-[11px] uppercase cursor-pointer border border-slate-700 inline-flex items-center gap-1"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Record Exit</span>
                          </button>
                        </td>
                      </tr>
                    ))}

                    {/* Active Contractors */}
                    {contractors.filter(c => c.status === 'Active On-Site').map((c) => (
                      <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-white">{c.company_name}</div>
                          <div className="text-[10px] text-amber-400">{c.lead_contractor_name} ({c.worker_count} workers)</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase">
                            Contractor
                          </span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-emerald-400">
                          House {c.house_number} ({c.resident_name})
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-400">
                          {c.entry_time ? new Date(c.entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleDirectContractorCheckout(c.id)}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-[11px] uppercase cursor-pointer border border-slate-700 inline-flex items-center gap-1"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Work Done</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right: Live Gate Movement Stream */}
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-base">
                  Recent Barrier Activity
                </h3>
                <span className="text-[10px] uppercase font-mono text-slate-400">Auto-Audited</span>
              </div>

              <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                {gateLogs.slice(0, 8).map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        log.movement_type === 'Entry'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {log.movement_type === 'Entry' ? <LogIn className="w-3.5 h-3.5" /> : <LogOut className="w-3.5 h-3.5" />}
                      </div>

                      <div className="space-y-0.5">
                        <div className="font-bold text-white">{log.name}</div>
                        <div className="text-[11px] text-slate-400">
                          {log.entity_type} {log.vehicle_number ? `• Plate ${log.vehicle_number}` : ''}
                        </div>
                        <div className="text-[10px] text-emerald-400 font-medium">
                          {log.destination}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono text-[10px] text-slate-400">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: VISITOR CLEARANCE & PASS VERIFIER */}
      {activeSubTab === 'visitors' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight">
                Guest Pass Clearance Registry
              </h3>
              <p className="text-xs text-slate-400">
                Pre-registered guest credentials, arrival check-in, and visitor duration auditing
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsRegisterVisitorOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Pre-Register Visitor</span>
              </button>
              <button
                onClick={() => setIsWalkInOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-950"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Walk-In Guest</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px]">
                <tr>
                  <th className="py-3 px-3">Pass Ref</th>
                  <th className="py-3 px-3">Visitor Details</th>
                  <th className="py-3 px-3">Vehicle</th>
                  <th className="py-3 px-3">Host Resident & Plot</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Timing</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {visitorPasses.map((pass) => (
                  <tr key={pass.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-blue-400">
                      {pass.pass_code}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-white">{pass.visitor_name}</div>
                      <div className="font-mono text-slate-400 text-[10px]">{pass.visitor_phone}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300">
                      {pass.vehicle_number || 'Pedestrian'}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-emerald-400">{pass.house_number}</div>
                      <div className="text-[10px] text-slate-400">{pass.resident_name}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        pass.status === 'Arrived'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : pass.status === 'Expected'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : pass.status === 'Departed'
                          ? 'bg-slate-800 text-slate-300 border border-slate-700'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
                        {pass.status === 'Arrived' ? 'INSIDE ESTATE' : pass.status === 'Departed' ? 'EXITED' : pass.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[10px] text-slate-400">
                      {pass.entry_time
                        ? `Entered: ${new Date(pass.entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        : `Expected: ${new Date(pass.expected_arrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                    </td>
                    <td className="py-3 px-3 text-right space-x-1">
                      {pass.status === 'Expected' && (
                        <button
                          onClick={async () => {
                            await dbService.updateVisitorStatus(pass.id, 'Arrived', activeOfficer.full_name);
                            await loadGateData();
                          }}
                          className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] uppercase cursor-pointer"
                        >
                          Check In
                        </button>
                      )}
                      {pass.status === 'Arrived' && (
                        <button
                          onClick={() => handleDirectVisitorCheckout(pass.id)}
                          className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] uppercase cursor-pointer"
                        >
                          Check Out
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DELIVERIES & COURIERS */}
      {activeSubTab === 'deliveries' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight">
                Courier & Logistics Dispatches
              </h3>
              <p className="text-xs text-slate-400">
                Turnaround management for food orders, e-commerce packages and postal couriers
              </p>
            </div>

            <button
              onClick={() => setIsDeliveryOpen(true)}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-lg shadow-purple-950"
            >
              <Plus className="w-4 h-4" />
              <span>Record New Delivery</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px]">
                <tr>
                  <th className="py-3 px-3">Pass Ref</th>
                  <th className="py-3 px-3">Courier & Rider</th>
                  <th className="py-3 px-3">Package Category</th>
                  <th className="py-3 px-3">Vehicle Plate / Bike</th>
                  <th className="py-3 px-3">Destination Plot</th>
                  <th className="py-3 px-3">Entry Time</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {deliveries.map((del) => (
                  <tr key={del.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-purple-400">{del.pass_code}</td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-white">{del.courier_company}</div>
                      <div className="text-[10px] text-slate-400">{del.rider_name} ({del.rider_phone})</div>
                    </td>
                    <td className="py-3 px-3 text-slate-300">{del.package_type}</td>
                    <td className="py-3 px-3 font-mono text-purple-300">{del.vehicle_plate || del.vehicle_type}</td>
                    <td className="py-3 px-3 font-semibold text-emerald-400">House {del.house_number} ({del.resident_name})</td>
                    <td className="py-3 px-3 font-mono text-slate-400">{new Date(del.entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        del.status === 'Inside Estate'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {del.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {del.status === 'Inside Estate' && (
                        <button
                          onClick={() => handleDirectDeliveryCheckout(del.id)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[10px] uppercase cursor-pointer"
                        >
                          Mark Exited
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: CONTRACTORS & ARTISANS */}
      {activeSubTab === 'contractors' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight">
                Contractors & Artisan Permits
              </h3>
              <p className="text-xs text-slate-400">
                Work site permits, worker headcounts, and verified artisan identification
              </p>
            </div>

            <button
              onClick={() => setIsContractorOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-950"
            >
              <Plus className="w-4 h-4" />
              <span>Issue Work Permit</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px]">
                <tr>
                  <th className="py-3 px-3">Permit Ref</th>
                  <th className="py-3 px-3">Company & Lead</th>
                  <th className="py-3 px-3">Service Type</th>
                  <th className="py-3 px-3">Headcount</th>
                  <th className="py-3 px-3">ID Verification</th>
                  <th className="py-3 px-3">Host Plot</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {contractors.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-amber-400">{c.pass_code}</td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-white">{c.company_name}</div>
                      <div className="text-[10px] text-slate-400">{c.lead_contractor_name} ({c.lead_phone})</div>
                    </td>
                    <td className="py-3 px-3 text-amber-300">{c.service_type}</td>
                    <td className="py-3 px-3 font-bold text-white">{c.worker_count} Workers</td>
                    <td className="py-3 px-3 font-mono text-[10px] text-slate-300">{c.id_type_recorded}: {c.id_number}</td>
                    <td className="py-3 px-3 font-semibold text-emerald-400">House {c.house_number} ({c.resident_name})</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        c.status === 'Active On-Site'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {c.status === 'Active On-Site' && (
                        <button
                          onClick={() => handleDirectContractorCheckout(c.id)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[10px] uppercase cursor-pointer"
                        >
                          Complete Work
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: RESIDENT VEHICLE DIRECTORY */}
      {activeSubTab === 'vehicles' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight">
                Resident Vehicle Registry
              </h3>
              <p className="text-xs text-slate-400">
                Verified estate vehicles registered to resident plots with electronic gate pass clearance
              </p>
            </div>

            <button
              onClick={() => setIsVehicleScannerOpen(true)}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-lg shadow-teal-950"
            >
              <Car className="w-4 h-4" />
              <span>Plate Scanner</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px]">
                <tr>
                  <th className="py-3 px-3">Plate Number</th>
                  <th className="py-3 px-3">Vehicle Details</th>
                  <th className="py-3 px-3">Vehicle Type</th>
                  <th className="py-3 px-3">Resident Owner</th>
                  <th className="py-3 px-3">Plot / House</th>
                  <th className="py-3 px-3">Access Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {vehicles.map((veh) => (
                  <tr key={veh.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-mono font-black text-emerald-400 text-sm">
                      {veh.plate_number}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-white">{veh.make} {veh.model}</div>
                      <div className="text-[10px] text-slate-400">{veh.color}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-300">{veh.vehicle_type}</td>
                    <td className="py-3 px-3 font-semibold text-white">{veh.resident_name}</td>
                    <td className="py-3 px-3 font-bold text-emerald-400">{veh.house_number}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        veh.status === 'Active'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
                        {veh.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: RESTRICTED WATCHLIST */}
      {activeSubTab === 'watchlist' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight text-rose-400 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5" />
                <span>Restricted Watchlist & Perimeter Blacklist</span>
              </h3>
              <p className="text-xs text-slate-400">
                Active security bans, trespassers, suspicious vehicles and defaulting occupants
              </p>
            </div>

            <button
              onClick={() => setIsWatchlistOpen(true)}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-lg shadow-rose-950"
            >
              <Plus className="w-4 h-4" />
              <span>Manage Watchlist</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px]">
                <tr>
                  <th className="py-3 px-3">Subject / Description</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Plate / Phone</th>
                  <th className="py-3 px-3">Severity</th>
                  <th className="py-3 px-3">Reason for Ban</th>
                  <th className="py-3 px-3">Date Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {watchlist.map((item) => (
                  <tr key={item.id} className="hover:bg-rose-950/20 transition-colors">
                    <td className="py-3 px-3 font-bold text-white">{item.entity_name}</td>
                    <td className="py-3 px-3 text-slate-300">{item.category}</td>
                    <td className="py-3 px-3 font-mono text-rose-300">
                      {item.plate_number || item.phone_number || 'N/A'}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        item.severity === 'Immediate Apprehension'
                          ? 'bg-rose-600 text-white animate-pulse'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}>
                        {item.severity}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-300 max-w-xs truncate">{item.reason}</td>
                    <td className="py-3 px-3 text-slate-400">{item.date_added}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: AUDIT LOG & REPORT GENERATION */}
      {activeSubTab === 'audit_log' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight">
                Gate Movement Audit Logs & Export
              </h3>
              <p className="text-xs text-slate-400">
                Audited barrier entry and exit records for compliance and incident investigations
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer border border-slate-700"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={handlePrintReport}
                className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950"
              >
                <Printer className="w-4 h-4" />
                <span>Print Gate Report</span>
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter by name, plate, house..."
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-medium"
              />
            </div>

            <div>
              <select
                value={movementFilter}
                onChange={(e) => setMovementFilter(e.target.value as any)}
                className="w-full py-2 px-3 bg-slate-900 border border-slate-700 rounded-xl text-white font-medium"
              >
                <option value="All">All Movements (Entry & Exit)</option>
                <option value="Entry">Inbound Entries Only</option>
                <option value="Exit">Outbound Exits Only</option>
              </select>
            </div>

            <div>
              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="w-full py-2 px-3 bg-slate-900 border border-slate-700 rounded-xl text-white font-medium"
              >
                <option value="All">All Entity Types</option>
                <option value="Resident">Residents</option>
                <option value="Visitor">Visitors</option>
                <option value="Delivery">Deliveries</option>
                <option value="Contractor">Contractors</option>
                <option value="Service Vehicle">Service Vehicles</option>
              </select>
            </div>
          </div>

          {/* Movement Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px]">
                <tr>
                  <th className="py-3 px-3">Log #</th>
                  <th className="py-3 px-3">Time</th>
                  <th className="py-3 px-3">Direction</th>
                  <th className="py-3 px-3">Entity</th>
                  <th className="py-3 px-3">Subject Name</th>
                  <th className="py-3 px-3">Vehicle Plate</th>
                  <th className="py-3 px-3">Destination</th>
                  <th className="py-3 px-3">Officer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-slate-400">{log.log_number}</td>
                    <td className="py-3 px-3 font-mono text-slate-300">
                      {new Date(log.timestamp).toLocaleString('en-NG', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        log.movement_type === 'Entry'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-blue-500/20 text-blue-300'
                      }`}>
                        {log.movement_type}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-300">{log.entity_type}</td>
                    <td className="py-3 px-3 font-bold text-white">{log.name}</td>
                    <td className="py-3 px-3 font-mono text-emerald-400">{log.vehicle_number || '—'}</td>
                    <td className="py-3 px-3 text-slate-300">{log.destination}</td>
                    <td className="py-3 px-3 text-slate-400 font-mono text-[10px]">{log.officer_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. MODALS SUITE */}
      <ResidentVerificationModal
        isOpen={isResidentModalOpen}
        onClose={() => setIsResidentModalOpen(false)}
        onLogGateMovement={() => loadGateData()}
      />

      <GateVisitorScannerModal
        isOpen={isVisitorScannerOpen}
        onClose={() => setIsVisitorScannerOpen(false)}
        onVisitorUpdated={() => loadGateData()}
      />

      <WalkInVisitorModal
        isOpen={isWalkInOpen}
        onClose={() => setIsWalkInOpen(false)}
        onSuccess={() => loadGateData()}
      />

      <DeliveryEntryModal
        isOpen={isDeliveryOpen}
        onClose={() => setIsDeliveryOpen(false)}
        onSuccess={() => loadGateData()}
      />

      <ContractorPermitModal
        isOpen={isContractorOpen}
        onClose={() => setIsContractorOpen(false)}
        onSuccess={() => loadGateData()}
      />

      <VehicleScannerModal
        isOpen={isVehicleScannerOpen}
        onClose={() => setIsVehicleScannerOpen(false)}
        onLogMovement={() => loadGateData()}
      />

      <RestrictedWatchlistModal
        isOpen={isWatchlistOpen}
        onClose={() => setIsWatchlistOpen(false)}
        onWatchlistUpdated={() => loadGateData()}
      />

      <VisitorPassModal
        isOpen={isRegisterVisitorOpen}
        onClose={() => setIsRegisterVisitorOpen(false)}
        onSubmitVisitor={async (data) => {
          const res = await dbService.createVisitorPass(data as any);
          if (res.success && res.pass) {
            await loadGateData();
            return res.pass;
          }
          return null;
        }}
        estateSettings={estateSettings}
      />

      <IncidentFormModal
        isOpen={isIncidentModalOpen}
        onClose={() => setIsIncidentModalOpen(false)}
        onSubmitIncident={async (data) => {
          const res = await dbService.createIncident(data as any);
          if (res.success && res.incident) {
            await loadGateData();
            return res.incident;
          }
          return null;
        }}
        isStaffMode={true}
      />

      <EmergencyReportModal
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
        onSubmitEmergency={async (data) => {
          const res = await dbService.createEmergencyIncident(data);
          if (res.success && res.incident) {
            await loadGateData();
            return res.incident;
          }
          return null;
        }}
      />
    </div>
  );
};
