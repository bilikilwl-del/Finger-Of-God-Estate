import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Phone,
  AlertTriangle,
  Clock,
  Car,
  Users,
  Lock,
  ChevronRight,
  ChevronLeft,
  FileText,
  CheckCircle2,
  ExternalLink,
  MapPin,
  Send,
  Eye,
  Menu,
  X,
  CreditCard,
  UserCheck,
  Bell,
  HelpCircle,
  AlertCircle,
  Coins
} from 'lucide-react';
import { EstateSettings, Announcement, SecurityAlert } from '../../types/database';
import { dbService } from '../../lib/supabase';
import { EstateLogo } from '../common/EstateLogo';

interface PublicSecurityViewProps {
  estateSettings: EstateSettings;
  onNavigateHome: () => void;
  onNavigateToRoadProject: () => void;
  onNavigateToAnnouncements: () => void;
  onNavigateToAnnouncementDetail: (slug: string) => void;
  onNavigateToVerifyReceipt: () => void;
  onNavigateToPortal: () => void;
  onOpenResidentLogin: () => void;
  onOpenPayLevy: () => void;
  onOpenAdminLogin: () => void;
}

export const PublicSecurityView: React.FC<PublicSecurityViewProps> = ({
  estateSettings,
  onNavigateHome,
  onNavigateToRoadProject,
  onNavigateToAnnouncements,
  onNavigateToAnnouncementDetail,
  onNavigateToVerifyReceipt,
  onNavigateToPortal,
  onOpenResidentLogin,
  onOpenPayLevy,
  onOpenAdminLogin
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [securityAnnouncements, setSecurityAnnouncements] = useState<Announcement[]>([]);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);

  // Incident reporting state
  const [reporterName, setReporterName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');
  const [location, setLocation] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [incidentType, setIncidentType] = useState('Suspicious activity');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [isEmergency, setIsEmergency] = useState(false);
  const [description, setDescription] = useState('');
  const [submittingIncident, setSubmittingIncident] = useState(false);
  const [incidentSubmittedRef, setIncidentSubmittedRef] = useState<string | null>(null);
  const [incidentError, setIncidentError] = useState('');

  // Active protocol tab
  const [activeProtocolTab, setActiveProtocolTab] = useState<'gate' | 'traffic' | 'night' | 'contractors'>('gate');

  useEffect(() => {
    async function loadSecurityData() {
      setLoading(true);
      try {
        const [allAnnouncements, alerts] = await Promise.all([
          dbService.getPublicAnnouncements(),
          dbService.getSecurityAlerts()
        ]);

        // Filter security-related notices
        const filtered = allAnnouncements.filter(
          a => a.category === 'Security' || a.category === 'SECURITY' || a.is_emergency || a.priority === 'URGENT' || a.priority === 'Emergency'
        );
        setSecurityAnnouncements(filtered);
        setSecurityAlerts(alerts.filter(a => a.is_active));
      } catch (err) {
        console.warn('Failed to load security department data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSecurityData();
  }, []);

  const handleReportIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !location.trim()) {
      setIncidentError('Please provide the incident location and description.');
      return;
    }

    setSubmittingIncident(true);
    setIncidentError('');

    try {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const res = await dbService.createIncident({
        date: dateStr,
        time: timeStr,
        location: location.trim(),
        house_number: houseNumber.trim() || undefined,
        incident_type: incidentType as any,
        priority: isEmergency ? 'Critical' : priority,
        description: description.trim(),
        reporter_type: 'Resident',
        reported_by: reporterName.trim() || 'Resident (Security Page Form)',
        reporter_phone: reporterPhone.trim() || undefined,
        is_emergency: isEmergency,
        evidence: []
      });

      if (res.success && res.incident) {
        setIncidentSubmittedRef(res.incident.incident_number);
        // Reset form
        setReporterName('');
        setReporterPhone('');
        setLocation('');
        setHouseNumber('');
        setDescription('');
        setIsEmergency(false);
      } else {
        setIncidentError(res.message || 'Failed to submit incident report. Please contact the security desk directly.');
      }
    } catch (err: any) {
      setIncidentError(err.message || 'Failed to submit incident report. Please contact the security desk directly.');
    } finally {
      setSubmittingIncident(false);
    }
  };

  const emergencyContacts = [
    {
      title: 'Chief Security Officer (CSO)',
      phone: estateSettings.contact_phone || '08023456789',
      desc: 'Overall security command, escalations & executive coordination',
      badge: '24/7 Available',
      badgeColor: 'bg-emerald-100 text-emerald-800'
    },
    {
      title: 'Main Gate Security Command Desk',
      phone: '08034567890',
      desc: 'Access barrier control, visitor entry verification & pedestrian turnstile',
      badge: 'Immediate Response',
      badgeColor: 'bg-blue-100 text-blue-800'
    },
    {
      title: 'Mobile Patrol Squad Dispatch',
      phone: '08098765432',
      desc: 'Armed perimeter patrol, nighttime escort & distress dispatch',
      badge: 'Motorized Unit',
      badgeColor: 'bg-amber-100 text-amber-800'
    },
    {
      title: 'Delta State Police (Asaba Division)',
      phone: '112 / 08031234567',
      desc: 'External law enforcement, emergency reinforcement & tactical liaison',
      badge: 'State Emergency',
      badgeColor: 'bg-rose-100 text-rose-800'
    }
  ];

  const protocols = [
    {
      id: 'gate',
      title: 'Gate Access & Resident Clearance',
      icon: Lock,
      points: [
        'All active residents are issued designated RFID gate passes and windshield clearance stickers.',
        'Visitors must be pre-registered by their resident host via the Resident Portal or verified via an authenticated phone call from the gate desk.',
        'Walk-in visitors without prior resident notification will be politely detained at the reception pavilion until host confirmation is achieved.',
        'Gate officers record all entry and departure timestamps in the digital gate log for community audit safety.'
      ]
    },
    {
      id: 'traffic',
      title: 'Speed Limits & Traffic Regulations',
      icon: Car,
      points: [
        'Strict 20 km/h speed limit throughout all estate streets, crescents, and boulevards.',
        'Reckless driving, blaring of loud horns, and blocking designated fire hydration lanes are strictly prohibited.',
        'Vehicles must be parked inside designated residential compounds or approved curbside bays without obstructing road widths.',
        'Commercial delivery bikes must turn off high-beam headlights when approaching residential gates.'
      ]
    },
    {
      id: 'night',
      title: 'Nighttime Curfew & Visitor Protocols',
      icon: Clock,
      points: [
        'Nighttime verification protocol is in effect from 22:00 (10:00 PM) to 05:00 (5:00 AM) daily.',
        'Late-night unannounced visitors must have their host resident physically or verbally verify authorization before entry.',
        'Pedestrians entering during night hours must present verified national or estate resident identification.',
        'Patrol guards provide courtesy security accompaniment for residents arriving on foot after midnight.'
      ]
    },
    {
      id: 'contractors',
      title: 'Contractors & Artisan Working Hours',
      icon: Users,
      points: [
        'Construction, noisy renovation, and artisan operations are permitted only Monday to Saturday from 08:00 to 17:00.',
        'Contractor operations are strictly barred on Sundays and public holidays to ensure resident tranquility.',
        'Lead contractors must register worker headcounts and deposit government-approved identification at the Service Gate.',
        'Heavy building supply trucks must utilize the Service Gate and avoid soft residential verges.'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* 1. Universal Estate Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-18">
            {/* Logo - Takes user back to Main Estate Page */}
            <div 
              className="flex items-center cursor-pointer select-none" 
              onClick={onNavigateHome}
              title="Return to Finger of God Estate Main Page"
            >
              <EstateLogo
                size="sm"
                variant="horizontal"
                theme="light"
                estateName={estateSettings.estate_name || 'Finger of God Estate'}
                subtitle="SECURITY DEPARTMENT • ASABA"
                hideSubtitleOnMobile={true}
              />
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
              <button 
                onClick={onNavigateHome}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Home
              </button>
              <button 
                className="px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 rounded-lg cursor-default border border-emerald-200/60 flex items-center gap-1.5"
              >
                <Shield className="w-3.5 h-3.5 text-emerald-700" />
                <span>Security</span>
              </button>
              <button 
                onClick={onNavigateToRoadProject}
                className="px-3 py-1.5 text-xs font-semibold text-amber-900 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Coins className="w-3.5 h-3.5 text-amber-700" />
                <span>Road Project</span>
              </button>
              <button 
                onClick={onNavigateToPortal}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Residents
              </button>
              <button 
                onClick={() => {
                  onNavigateHome();
                  setTimeout(() => {
                    document.getElementById('estate-info-section')?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Estate Information
              </button>
              <button 
                onClick={onOpenPayLevy}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Payments & Levies
              </button>
              <button 
                onClick={onNavigateToAnnouncements}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Announcements
              </button>
              <button 
                onClick={() => {
                  onNavigateHome();
                  setTimeout(() => {
                    document.getElementById('contact-section')?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Contact
              </button>
            </nav>

            {/* Desktop Action Buttons */}
            <div className="hidden lg:flex items-center gap-2.5">
              <button
                onClick={onOpenResidentLogin}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 cursor-pointer flex items-center gap-1.5"
              >
                <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                <span>Resident Login</span>
              </button>
              <button
                onClick={() => {
                  const elem = document.getElementById('report-incident-section');
                  elem?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Report Incident</span>
              </button>
            </div>

            {/* Mobile / Tablet Buttons */}
            <div className="flex lg:hidden items-center gap-2">
              <button
                onClick={() => {
                  const elem = document.getElementById('report-incident-section');
                  elem?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Report</span>
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                aria-label="Toggle Navigation Menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-1.5 shadow-lg animate-in slide-in-from-top duration-150">
            <button
              onClick={() => { setMobileMenuOpen(false); onNavigateHome(); }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-800 hover:bg-slate-100 cursor-pointer flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4 text-slate-500" />
              <span>Back to Finger of God Estate Home</span>
            </button>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-bold text-emerald-800 bg-emerald-50 cursor-pointer flex items-center gap-2"
            >
              <Shield className="w-4 h-4 text-emerald-700" />
              <span>Security Department (Current)</span>
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); onNavigateToRoadProject(); }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-amber-900 hover:bg-amber-50 cursor-pointer flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-700" />
                <span>Road Project (Transparent Ledger)</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                Live
              </span>
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); onNavigateToPortal(); }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-800 hover:bg-slate-100 cursor-pointer"
            >
              Residents & Household Portal
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigateHome();
                setTimeout(() => {
                  document.getElementById('estate-info-section')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-800 hover:bg-slate-100 cursor-pointer"
            >
              About Estate & Information
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); onOpenPayLevy(); }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-800 hover:bg-slate-100 cursor-pointer"
            >
              Pay Monthly Security Levy
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); onNavigateToAnnouncements(); }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-800 hover:bg-slate-100 cursor-pointer"
            >
              Estate Announcements
            </button>
            <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
              <button
                onClick={() => { setMobileMenuOpen(false); onOpenResidentLogin(); }}
                className="w-full py-2.5 text-center text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Resident Login
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  document.getElementById('report-incident-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full py-2.5 text-center text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl cursor-pointer"
              >
                Report Incident
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 2. Breadcrumb Navigation Bar */}
      <div className="bg-slate-100/80 border-b border-slate-200 py-2 px-4 sm:px-6 lg:px-8 text-xs text-slate-600">
        <div className="max-w-7xl mx-auto flex items-center gap-2">
          <button 
            onClick={onNavigateHome}
            className="hover:text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer font-medium"
          >
            <span>Finger of God Estate</span>
          </button>
          <span className="text-slate-400">/</span>
          <span className="font-semibold text-slate-900">Security Department</span>
        </div>
      </div>

      {/* 3. Hero Section - Security Department */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white py-12 sm:py-16">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b20_1px,transparent_1px),linear-gradient(to_bottom,#1e293b20_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            
            <div className="lg:col-span-8 flex flex-col justify-center text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold w-fit mb-3">
                <Shield className="w-3.5 h-3.5" />
                <span>Finger of God Estate • Department of Security & Access</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight">
                Estate Security & Community Protection
              </h1>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-[680px] mt-3">
                The Security Department of Finger of God Estate operates 24 hours a day, 7 days a week to safeguard lives, assets, and peaceful residential living. Through strictly monitored access barriers, motorized perimeter patrols, digital visitor logging, and swift incident resolution, we guarantee a safe environment for every family.
              </p>

              {/* Action Buttons */}
              <div className="mt-6 flex flex-wrap items-center gap-3 sm:gap-4">
                <button
                  onClick={() => {
                    document.getElementById('report-incident-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-5 py-2.5 sm:py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>Report an Incident</span>
                </button>

                <button
                  onClick={() => {
                    document.getElementById('emergency-contacts-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-5 py-2.5 sm:py-3 bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold rounded-xl text-xs sm:text-sm border border-slate-700 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Phone className="w-4 h-4 text-emerald-400" />
                  <span>Emergency Hotlines</span>
                </button>

                <button
                  onClick={onNavigateHome}
                  className="px-4 py-2.5 sm:py-3 text-slate-300 hover:text-white font-semibold text-xs sm:text-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Main Estate Home</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Badge Column */}
            <div className="lg:col-span-4 flex justify-center lg:justify-end">
              <div className="p-6 rounded-2xl bg-slate-800/90 border border-slate-700/80 shadow-xl backdrop-blur-xs w-full max-w-sm">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-700/80">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Command Status</div>
                    <div className="text-base font-bold text-emerald-400">Normal • Fully Active</div>
                  </div>
                </div>

                <div className="space-y-3.5 mt-4 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Main Gate Manned Lane:</span>
                    <span className="font-semibold text-slate-200">24/7 Monitored</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Motorized Patrol Squad:</span>
                    <span className="font-semibold text-emerald-400">Active On Route</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Perimeter Solar Lighting:</span>
                    <span className="font-semibold text-slate-200">100% Operational</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Speed Limit Inside Estate:</span>
                    <span className="font-mono font-bold text-amber-300">20 km/h Strict</span>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-700/80">
                  <button
                    onClick={onOpenPayLevy}
                    className="w-full py-2 px-3 bg-emerald-600/90 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold text-center transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Pay Security Levy (₦5,000)</span>
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 4. Active Security Alerts & Advisories (If Any) */}
      {securityAlerts.length > 0 && (
        <section className="bg-amber-50 border-b border-amber-200 py-4 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto space-y-2">
            {securityAlerts.map(alert => (
              <div key={alert.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-amber-300 shadow-2xs">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0 mt-0.5">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-200 text-amber-900">
                        {alert.category}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">{alert.alert_code}</span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">{alert.title}</div>
                    <p className="text-xs text-slate-600 mt-0.5">{alert.message}</p>
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 shrink-0 self-end sm:self-center font-medium">
                  Audience: <strong className="text-slate-700">{alert.target_audience}</strong>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. Emergency Command Hotlines Section */}
      <section id="emergency-contacts-section" className="py-12 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold uppercase tracking-wider mb-2">
              <Phone className="w-3.5 h-3.5" />
              <span>Immediate Security Contacts</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Security Desk & Emergency Contacts
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-2">
              In the event of suspicious activity, unauthorized trespass, medical distress, or security emergencies, contact our 24/7 command lines immediately.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {emergencyContacts.map((contact, idx) => (
              <div 
                key={idx} 
                className="bg-slate-50 rounded-2xl p-5 border border-slate-200/90 hover:border-slate-300 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${contact.badgeColor}`}>
                      {contact.badge}
                    </span>
                    <Phone className="w-4 h-4 text-slate-400" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{contact.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{contact.desc}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200">
                  <div className="text-base font-black font-mono text-emerald-800 tracking-wide">
                    {contact.phone}
                  </div>
                  <a
                    href={`tel:${contact.phone.replace(/[^0-9]/g, '')}`}
                    className="mt-2.5 w-full py-1.5 px-3 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold text-center block transition-colors cursor-pointer"
                  >
                    Call Hotline
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Security Guidelines & Protocols */}
      <section className="py-12 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-2">
              <FileText className="w-3.5 h-3.5" />
              <span>Standard Operating Procedures</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Estate Security Guidelines & Protocols
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-2">
              To preserve community safety, all residents, visitors, contractors, and household staff are strictly bound by the following estate security protocols.
            </p>
          </div>

          {/* Protocol Selection Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
            {protocols.map(p => {
              const Icon = p.icon;
              const isActive = activeProtocolTab === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setActiveProtocolTab(p.id as any)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{p.title.split('&')[0].trim()}</span>
                </button>
              );
            })}
          </div>

          {/* Selected Protocol Details Card */}
          {protocols.map(p => {
            if (p.id !== activeProtocolTab) return null;
            const Icon = p.icon;
            return (
              <div key={p.id} className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm max-w-4xl mx-auto">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-100 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{p.title}</h3>
                    <p className="text-xs text-slate-500">Official Finger of God Estate Security Code of Conduct</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {p.points.map((pt, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-700 leading-relaxed">{pt}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. Interactive Incident Reporting Section */}
      <section id="report-incident-section" className="py-12 sm:py-16 bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-800">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold uppercase tracking-wider mb-3">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Incident Command Report</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                Report an Incident or Security Concern
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                If you observe suspicious movement, an electrical hazard, perimeter trespass, excessive noise, or general security concern, submit this direct report. It is recorded immediately in the estate security log and dispatched to the Chief Security Officer.
              </p>
            </div>

            {incidentSubmittedRef ? (
              <div className="mt-8 bg-emerald-950/80 border border-emerald-500/40 p-6 rounded-2xl text-emerald-200">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                  <div className="text-lg font-bold text-white">Report Successfully Logged</div>
                </div>
                <p className="text-xs text-emerald-300 leading-relaxed">
                  Your report has been logged with reference number{' '}
                  <strong className="font-mono text-amber-300 text-sm">{incidentSubmittedRef}</strong>. The duty officer has been notified.
                </p>
                <button
                  onClick={() => setIncidentSubmittedRef(null)}
                  className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Submit Another Report
                </button>
              </div>
            ) : (
              <form onSubmit={handleReportIncident} className="mt-8 space-y-4">
                {incidentError && (
                  <div className="p-3.5 rounded-xl bg-rose-950/90 border border-rose-600 text-rose-200 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{incidentError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Your Full Name (Optional / Anonymous allowed)
                    </label>
                    <input
                      type="text"
                      value={reporterName}
                      onChange={e => setReporterName(e.target.value)}
                      placeholder="e.g. Dr. Chioma / Resident Plot 12"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Contact Phone Number (For follow-up)
                    </label>
                    <input
                      type="tel"
                      value={reporterPhone}
                      onChange={e => setReporterPhone(e.target.value)}
                      placeholder="e.g. 0803 123 4567"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Specific Location / Street Inside Estate <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      placeholder="e.g. Palm View Boulevard near Transformer Pillar"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      House / Plot Number
                    </label>
                    <input
                      type="text"
                      value={houseNumber}
                      onChange={e => setHouseNumber(e.target.value)}
                      placeholder="e.g. Plot 14B"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Incident Category
                    </label>
                    <select
                      value={incidentType}
                      onChange={e => setIncidentType(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="Suspicious activity">Suspicious Activity / Loitering</option>
                      <option value="Unauthorized entry attempt">Unauthorized Entry / Trespass</option>
                      <option value="Traffic/parking violation">Traffic / Speeding Infraction</option>
                      <option value="Noise disturbance">Noise Disturbance / Late Party</option>
                      <option value="Power/electrical emergency">Power / Electrical Sparking</option>
                      <option value="Water/infrastructure fault">Water / Drainage Flooding</option>
                      <option value="Theft/burglary attempt">Theft / Tampering Observation</option>
                      <option value="General safety concern">General Safety Concern</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Priority Level
                    </label>
                    <select
                      value={priority}
                      onChange={e => setPriority(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="Low">Low - Informational / Observation</option>
                      <option value="Medium">Medium - Prompt Attention Needed</option>
                      <option value="High">High - Urgent Security Intervention</option>
                      <option value="Critical">Critical - Immediate Emergency Threat</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Incident Description & Details <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Describe what occurred, any individuals involved, vehicle plate numbers, colors, time observed, etc."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Emergency checkbox */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="emergency-toggle"
                    checked={isEmergency}
                    onChange={e => setIsEmergency(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                  <label htmlFor="emergency-toggle" className="text-xs text-rose-300 font-semibold cursor-pointer">
                    Flag as Urgent Emergency requiring immediate patrol dispatch
                  </label>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="submit"
                    disabled={submittingIncident}
                    className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submittingIncident ? (
                      <span>Dispatching Report...</span>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit Security Report</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* 8. Security Bulletins & Notices Feed */}
      {securityAnnouncements.length > 0 && (
        <section className="py-12 bg-slate-50 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Official Security Notices & Advisories
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Verified security bulletins issued by the Chief Security Officer and Executive Council
                </p>
              </div>

              <button
                onClick={onNavigateToAnnouncements}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer self-start sm:self-auto"
              >
                <span>View All Estate Notices</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {securityAnnouncements.slice(0, 3).map(notice => (
                <div 
                  key={notice.id} 
                  className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                        {notice.category}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(notice.publish_at || notice.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 line-clamp-2">
                      {notice.title}
                    </h3>

                    <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed">
                      {notice.body}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium">By {notice.published_by || notice.author_name || 'CSO Desk'}</span>
                    <button
                      onClick={() => onNavigateToAnnouncementDetail(notice.slug)}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Read Notice</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 9. Security Department Footer */}
      <footer className="bg-slate-950 text-slate-400 py-10 text-xs border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-slate-800/80">
            <div className="md:col-span-2">
              <EstateLogo
                size="sm"
                variant="horizontal"
                theme="dark"
                estateName={estateSettings.estate_name || 'Finger of God Estate'}
                subtitle="DEPARTMENT OF SECURITY • ASABA"
              />
              <p className="mt-3 text-slate-400 text-xs leading-relaxed max-w-sm">
                Dedicated to safeguarding Finger of God Estate, Iyiaba, Asaba, Delta State through professional vigilance, technology-driven access management, and community collaboration.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Estate Links</h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <button onClick={onNavigateHome} className="hover:text-white transition-colors cursor-pointer">
                    Finger of God Estate Home
                  </button>
                </li>
                <li>
                  <button onClick={onNavigateToRoadProject} className="text-amber-400 font-semibold hover:text-amber-300 transition-colors cursor-pointer">
                    Road Project (Transparent Ledger)
                  </button>
                </li>
                <li>
                  <button onClick={onNavigateToPortal} className="hover:text-white transition-colors cursor-pointer">
                    Resident Portal
                  </button>
                </li>
                <li>
                  <button onClick={onNavigateToAnnouncements} className="hover:text-white transition-colors cursor-pointer">
                    Official Announcements
                  </button>
                </li>
                <li>
                  <button onClick={onNavigateToVerifyReceipt} className="hover:text-white transition-colors cursor-pointer">
                    Verify Digital Receipt
                  </button>
                </li>
                <li>
                  <button onClick={onOpenAdminLogin} className="hover:text-white transition-colors cursor-pointer">
                    Admin Console
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Security Desk</h4>
              <p className="text-xs leading-relaxed text-slate-400">
                Main Gatehouse Command Post<br />
                Phase 1 Entrance Boulevard<br />
                Hotline: <strong className="text-white">{estateSettings.contact_phone || '08023456789'}</strong>
              </p>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] text-slate-500">
            <div>
              © {new Date().getFullYear()} Finger of God Estate Management. All rights reserved.
            </div>
            <div>
              Security Operations Center • Delta State, Nigeria
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
