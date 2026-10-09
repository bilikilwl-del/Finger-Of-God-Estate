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
  FileText,
  CheckCircle2,
  Send,
  CreditCard,
  AlertCircle,
  Wrench,
  Building2,
  Home,
  Layers,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { EstateSettings, Announcement, SecurityAlert, Resident } from '../../types/database';
import { dbService } from '../../lib/supabase';
import { EstateLogo } from '../common/EstateLogo';
import { PublicNavbar } from '../layout/PublicNavbar';
import { SEOHead } from '../common/SEOHead';
import { PaystackPaymentModal } from '../payments/PaystackPaymentModal';
import { FlatSecurityPaymentModal } from '../payments/FlatSecurityPaymentModal';

interface PublicSecurityViewProps {
  estateSettings: EstateSettings;
  currentResident?: Resident | null;
  onNavigateHome: () => void;
  onNavigateToRoadProject: () => void;
  onNavigateToAnnouncements: () => void;
  onNavigateToAnnouncementDetail: (slug: string) => void;
  onNavigateToVerifyReceipt: () => void;
  onNavigateToPortal: () => void;
  onOpenResidentLogin: () => void;
  onOpenPayLevy: () => void;
}

export const PublicSecurityView: React.FC<PublicSecurityViewProps> = ({
  estateSettings,
  currentResident,
  onNavigateHome,
  onNavigateToRoadProject,
  onNavigateToAnnouncements,
  onNavigateToAnnouncementDetail,
  onNavigateToVerifyReceipt,
  onNavigateToPortal,
  onOpenResidentLogin,
  onOpenPayLevy
}) => {
  const [securityAnnouncements, setSecurityAnnouncements] = useState<Announcement[]>([]);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);

  // Payment Modals
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isFlatPayModalOpen, setIsFlatPayModalOpen] = useState(false);
  const [targetResident, setTargetResident] = useState<Resident | null>(currentResident || null);

  // Resident Lookup for Payment
  const [lookupNumber, setLookupNumber] = useState(currentResident?.resident_number || '');
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupMessage, setLookupMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

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
    if (currentResident) {
      setTargetResident(currentResident);
      setLookupNumber(currentResident.resident_number);
    }
  }, [currentResident]);

  useEffect(() => {
    async function loadSecurityData() {
      setLoading(true);
      try {
        const [allAnnouncements, alerts] = await Promise.all([
          dbService.getPublicAnnouncements(),
          dbService.getSecurityAlerts()
        ]);

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

  const handleLookupResident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupNumber.trim()) {
      setLookupMessage({ text: 'Please enter a valid Resident Number (e.g. 001–300)', type: 'error' });
      return;
    }

    setLookingUp(true);
    setLookupMessage(null);
    try {
      const clean = lookupNumber.trim().padStart(3, '0');
      const res = await dbService.lookupResidentPublic(clean);
      if (res.found && res.resident) {
        setTargetResident(res.resident as Resident);
        setLookupMessage({ text: `Identified: ${res.resident.full_name} (${res.resident.house_number || 'Plot ' + clean})`, type: 'success' });
        setIsPayModalOpen(true);
      } else {
        setLookupMessage({ text: res.message || `Resident ${clean} not found in verified registry.`, type: 'error' });
      }
    } catch {
      setLookupMessage({ text: 'Could not connect to database. Please check connection.', type: 'error' });
    } finally {
      setLookingUp(false);
    }
  };

  const handleReportIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !location.trim()) {
      setIncidentError('Please provide the incident location and a description of what occurred.');
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
        reported_by: reporterName.trim() || 'Resident (Community Security Form)',
        reporter_phone: reporterPhone.trim() || undefined,
        is_emergency: isEmergency,
        evidence: []
      });

      if (res.success && res.incident) {
        setIncidentSubmittedRef(res.incident.incident_number);
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
      desc: 'Estate security command, resident coordination, and duty escalation.',
      badge: 'Verified Primary',
      badgeClass: 'text-emerald-800 bg-emerald-50 border border-emerald-200'
    },
    {
      title: 'Main Gate Duty Desk & Intercom',
      phone: '08034567890',
      desc: 'Front entrance gatehouse, access control verification, and on-site patrol dispatch.',
      badge: '24/7 Gatehouse',
      badgeClass: 'text-slate-700 bg-slate-100 border border-slate-200'
    },
    {
      title: 'Delta State Unified Vigilante (School Boy Units)',
      phone: estateSettings.contact_phone || '08023456789',
      desc: 'Operational vigilante command covering Finger of God Estate and surrounding areas. Coordinated through estate gate command.',
      badge: 'Operational Partner',
      badgeClass: 'text-emerald-800 bg-emerald-50 border border-emerald-200'
    },
    {
      title: 'National Emergency Response Service',
      phone: '112',
      desc: 'Official national emergency dispatch for police, fire service, and medical emergency escalation.',
      badge: 'National Service',
      badgeClass: 'text-rose-800 bg-rose-50 border border-rose-200'
    }
  ];

  const protocols = [
    {
      id: 'gate',
      title: 'Gate Access & Resident Clearance',
      icon: Lock,
      description: 'Standard access procedure at the main gatehouse.',
      points: [
        'Registered residents present designated clearance passes or verified resident credentials for expedited entry.',
        'Visitors must provide the resident host name and compound number. Gate staff confirm clearance with the resident before allowing entry.',
        'Commercial delivery riders and taxis must register vehicle details at the gatehouse and observe estate speed limits.',
        'Entry and exit logs are recorded digitally to ensure community traceability and perimeter safety.'
      ]
    },
    {
      id: 'traffic',
      title: 'Traffic & Road Guidelines',
      icon: Car,
      description: 'Vehicle management and parking safety across all estate avenues.',
      points: [
        'A maximum speed limit of 20 km/h applies across all estate streets and crescents.',
        'Vehicles must be parked within compound premises or designated parking bays without obstructing emergency access routes.',
        'Use of excessive horns and loud exhaust systems is restricted at all times to preserve residential tranquility.',
        'Heavy supply vehicles must coordinate unloading schedules during daytime working hours.'
      ]
    },
    {
      id: 'night',
      title: 'Nighttime Safety & Patrol Protocol',
      icon: Clock,
      description: 'Heightened security coverage between 22:00 (10:00 PM) and 05:00 (5:00 AM).',
      points: [
        'Nighttime perimeter patrols are conducted continuously by uniformed vigilante personnel.',
        'Non-resident visitors arriving after 22:00 require direct telephone clearance from their host resident.',
        'Pedestrians entering during late hours should carry valid identification.',
        'Residents arriving late may request courtesy escort from the gatehouse to their compound.'
      ]
    },
    {
      id: 'contractors',
      title: 'Contractors & Artisan Working Hours',
      icon: Users,
      description: 'Regulations governing construction, renovation, and external workers.',
      points: [
        'External construction and noisy renovation work is permitted Monday to Saturday from 08:00 to 17:00.',
        'Contractor operations are paused on Sundays and recognized public holidays.',
        'Lead artisans must register personnel names and leave valid identification at the gatehouse.',
        'Construction materials must be stored inside compound boundaries without blocking public gutters or roads.'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col">
      <SEOHead
        title="Community Security & Vigilante Operations — Finger of God Estate"
        description="Community security operations for Finger of God Estate in partnership with Delta State Unified Vigilante (School Boy Units). 24/7 vigilante protection, operational support, equipment maintenance, and emergency response."
        keywords={['Community Security', 'Finger of God Estate', 'Delta State Unified Vigilante', 'School Boy Units', 'Estate Security Operations', 'Asaba Security']}
        canonicalPath="/#security"
        ogType="website"
      />

      {/* Universal Estate Header */}
      <PublicNavbar
        currentTab="security_public"
        estateSettings={estateSettings}
        onNavigate={(tab) => {
          if (tab === 'home') onNavigateHome();
          else if (tab === 'road_project') onNavigateToRoadProject();
          else if (tab === 'public_announcements') onNavigateToAnnouncements();
          else if (tab === 'verify_receipt') onNavigateToVerifyReceipt();
          else if (tab === 'public_residents' || tab === 'resident_portal') onNavigateToPortal();
          else if (tab === 'estate_levy') onOpenPayLevy();
          else onNavigateHome();
        }}
        onOpenResidentLogin={onOpenResidentLogin}
      />

      {/* Breadcrumb Navigation */}
      <div className="bg-slate-50 border-b border-slate-200 py-3 px-4 sm:px-6 lg:px-8 text-xs text-slate-600">
        <div className="max-w-6xl mx-auto flex items-center gap-2">
          <button 
            onClick={onNavigateHome}
            className="hover:text-emerald-700 hover:underline cursor-pointer font-medium text-slate-700"
          >
            Finger of God Estate
          </button>
          <span className="text-slate-400">/</span>
          <span className="font-semibold text-slate-900">Community Security</span>
        </div>
      </div>

      <main className="flex-1">
        {/* SECTION 1: Security Overview Hero */}
        <section className="bg-white border-b border-slate-200 py-12 sm:py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              
              <div className="lg:col-span-7">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 mb-3">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Delta State Unified Vigilante (School Boy Units) Partnership</span>
                </div>

                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                  Estate Security Operations & Community Safety
                </h1>

                <p className="mt-4 text-base text-slate-600 leading-relaxed">
                  Finger of God Estate is protected through an active community security partnership with the{' '}
                  <strong className="text-slate-900 font-semibold">Delta State Unified Vigilante (School Boy Units)</strong>,
                  providing coordinated coverage across the estate and surrounding access routes.
                </p>

                <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                  Community contributions sustain 24-hour gatehouse monitoring, perimeter patrols, operational equipment upkeep, and rapid response coordination to safeguard residents and property.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <a
                    href="#contribution-section"
                    className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-medium rounded-lg text-sm transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Contribute Security Levy</span>
                  </a>

                  <a
                    href="#report-incident-section"
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg text-sm transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span>Report Security Concern</span>
                  </a>

                  <a
                    href="#emergency-contacts-section"
                    className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-medium rounded-lg text-sm transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Phone className="w-4 h-4 text-emerald-700" />
                    <span>Emergency Contacts</span>
                  </a>
                </div>
              </div>

              {/* Operational Profile Card */}
              <div className="lg:col-span-5">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 sm:p-7 shadow-xs">
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Operational Unit</div>
                      <div className="text-sm font-bold text-slate-900">Community Protection Command</div>
                    </div>
                  </div>

                  <dl className="mt-5 space-y-3.5 text-xs sm:text-sm">
                    <div className="flex items-start justify-between pb-3 border-b border-slate-200/80">
                      <dt className="text-slate-500">Operating Partner</dt>
                      <dd className="font-semibold text-slate-900 text-right">Delta State Unified Vigilante</dd>
                    </div>

                    <div className="flex items-start justify-between pb-3 border-b border-slate-200/80">
                      <dt className="text-slate-500">Designated Unit</dt>
                      <dd className="font-semibold text-slate-900">School Boy Units</dd>
                    </div>

                    <div className="flex items-start justify-between pb-3 border-b border-slate-200/80">
                      <dt className="text-slate-500">Service Coverage</dt>
                      <dd className="font-semibold text-emerald-800">24/7 Gate & Perimeter Patrol</dd>
                    </div>

                    <div className="flex items-start justify-between pb-3 border-b border-slate-200/80">
                      <dt className="text-slate-500">Jurisdiction</dt>
                      <dd className="font-semibold text-slate-900 text-right">Estate & Adjoining Access Roads</dd>
                    </div>

                    <div className="flex items-start justify-between">
                      <dt className="text-slate-500">Receipting & Audit</dt>
                      <dd className="font-semibold text-slate-900">Instant Digital Verification</dd>
                    </div>
                  </dl>

                  <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-xs text-slate-500">Status: <strong className="text-emerald-700">Active Operational Patrol</strong></span>
                    <button
                      onClick={onNavigateToVerifyReceipt}
                      className="text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Verify Receipt</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Active Security Alerts (if any exist) */}
        {securityAlerts.length > 0 && (
          <section className="bg-amber-50/70 border-b border-amber-200 py-4 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto space-y-3">
              {securityAlerts.map(alert => (
                <div key={alert.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-lg border border-amber-300">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-md bg-amber-100 text-amber-900 shrink-0 mt-0.5">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-amber-900 uppercase">{alert.category}</span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-500 font-mono">{alert.alert_code}</span>
                      </div>
                      <div className="text-sm font-bold text-slate-900 mt-0.5">{alert.title}</div>
                      <p className="text-xs text-slate-600 mt-1">{alert.message}</p>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 shrink-0 self-end sm:self-center">
                    Notice: <span className="text-slate-800 font-medium">{alert.target_audience}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SECTION 2: Operational Support */}
        <section className="py-12 sm:py-16 bg-slate-50 border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mb-10">
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block mb-1">
                Operational Support
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                How Security Contributions Support Operations
              </h2>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Security funds collected from residents are applied strictly toward the operational requirements of protecting the estate and supporting vigilante personnel.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl p-6 border border-slate-200">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center mb-4">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Personnel & Duty Logistics
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Support for stationed gatehouse personnel and mobile vigilante patrol operatives conducting rotational checks across all quadrants and boundary lines.
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 border border-slate-200">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center mb-4">
                  <Wrench className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Equipment Maintenance
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Servicing and replacement of security hardware, communication sets, entrance access barriers, solar gate lighting, and emergency torches.
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 border border-slate-200">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Operational Response Needs
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Sustaining day-to-day coordination with Delta State Unified Vigilante command, external security liaisons, and emergency dispatch logistics.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: Contribution & Transparency */}
        <section id="contribution-section" className="py-12 sm:py-16 bg-white border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mb-10">
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block mb-1">
                Contributions & Financial Accountability
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Security Levy Payments
              </h2>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Security contributions are tracked independently from capital infrastructure projects. Every payment generates an immediate digital receipt that can be verified at any time.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Primary Approved Card: Flat Security Levy Payment */}
              <div className="lg:col-span-7 bg-slate-50 border border-slate-200 rounded-xl p-6 sm:p-8">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 mb-2">
                  <Building2 className="w-4 h-4 text-emerald-700" />
                  <span>Approved Structure</span>
                </div>

                <h3 className="text-xl font-bold text-slate-900">
                  Flat Security Levy Contribution
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-slate-600">
                  Approved Rate: <strong className="text-slate-900 font-semibold font-mono">₦1,500</strong> per flat monthly.
                </p>

                <div className="mt-6 space-y-4">
                  <div className="p-4 bg-white rounded-lg border border-slate-200 flex items-start gap-3">
                    <Home className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-slate-900">Individual Flat Occupants</div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Select your building house number, choose your flat (e.g. Flat 1, Suite A), and complete payment online.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-lg border border-slate-200 flex items-start gap-3">
                    <Layers className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-slate-900">Landlords & Compound Bulk Payment</div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Building owners can select multiple flats under their property and clear dues in a single consolidated transaction.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
                  <button
                    onClick={() => setIsFlatPayModalOpen(true)}
                    className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-medium rounded-lg text-sm transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Pay Flat Levy Online</span>
                  </button>

                  <button
                    onClick={onNavigateToVerifyReceipt}
                    className="text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Verify Past Receipt</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Secondary Card: Registered Resident ID Lookup */}
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 sm:p-7">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-2">
                  <Users className="w-4 h-4 text-slate-500" />
                  <span>Resident Directory</span>
                </div>

                <h3 className="text-base font-bold text-slate-900">
                  Pay by Registered Resident ID
                </h3>
                <p className="mt-1 text-xs text-slate-600">
                  For residents registered in the estate directory paying by assigned resident number (001–300).
                </p>

                <form onSubmit={handleLookupResident} className="mt-5">
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Enter Resident Number
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={lookupNumber}
                      onChange={e => setLookupNumber(e.target.value)}
                      placeholder="e.g. 016"
                      className="flex-1 px-3.5 py-2 rounded-lg border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                    <button
                      type="submit"
                      disabled={lookingUp}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {lookingUp ? 'Checking...' : 'Continue'}
                    </button>
                  </div>

                  {lookupMessage && (
                    <div className={`mt-3 p-3 rounded-lg text-xs flex items-center gap-2 ${
                      lookupMessage.type === 'success' 
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}>
                      {lookupMessage.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      )}
                      <span>{lookupMessage.text}</span>
                    </div>
                  )}
                </form>

                <div className="mt-6 pt-5 border-t border-slate-200 text-xs text-slate-500 space-y-2">
                  <p className="leading-relaxed">
                    Security Levy accounts are maintained separately from the Road Modernization Project.
                  </p>
                  <div>
                    <button
                      type="button"
                      onClick={onNavigateToRoadProject}
                      className="text-emerald-700 hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>View Road Modernization Public Ledger</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: Emergency Contacts */}
        <section id="emergency-contacts-section" className="py-12 sm:py-16 bg-slate-50 border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mb-10">
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block mb-1">
                Emergency Hotlines
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Verified Security Contacts
              </h2>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                In case of immediate distress, unauthorized perimeter entry, or urgent security assistance, contact these verified duty lines directly.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {emergencyContacts.map((contact, idx) => (
                <div 
                  key={idx} 
                  className="bg-white rounded-xl p-5 border border-slate-200 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide ${contact.badgeClass}`}>
                        {contact.badge}
                      </span>
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">{contact.title}</h3>
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{contact.desc}</p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-200">
                    <div className="text-base font-bold font-mono text-slate-900 tracking-tight">
                      {contact.phone}
                    </div>
                    <a
                      href={`tel:${contact.phone.replace(/[^0-9]/g, '')}`}
                      className="mt-2.5 w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-lg text-xs font-medium text-center block transition-colors cursor-pointer"
                    >
                      Call Duty Line
                    </a>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 p-4 bg-white rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  External police division escalation is coordinated through the Chief Security Officer and national dispatch (112).
                </span>
              </div>
              <span className="text-slate-500 font-mono text-[11px]">
                Command Post: Phase 1 Gatehouse
              </span>
            </div>
          </div>
        </section>

        {/* SECTION 5: Report a Security Concern */}
        <section id="report-incident-section" className="py-12 sm:py-16 bg-white border-b border-slate-200">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider block mb-1">
                Incident Reporting
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Report a Security Concern
              </h2>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Submit an observation, perimeter concern, or safety hazard directly to estate security. Reports are entered into the duty log and reviewed by the Chief Security Officer.
              </p>
            </div>

            {incidentSubmittedRef ? (
              <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-xl text-emerald-900">
                <div className="flex items-center gap-2.5 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                  <div className="text-base font-bold text-emerald-950">Report Logged Successfully</div>
                </div>
                <p className="text-xs sm:text-sm text-emerald-800 leading-relaxed">
                  Your incident has been logged with reference number{' '}
                  <strong className="font-mono text-emerald-950 font-bold">{incidentSubmittedRef}</strong>.
                  Estate security staff have received the notification.
                </p>
                <button
                  onClick={() => setIncidentSubmittedRef(null)}
                  className="mt-4 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
                >
                  Submit Another Report
                </button>
              </div>
            ) : (
              <form onSubmit={handleReportIncident} className="bg-slate-50 border border-slate-200 rounded-xl p-6 sm:p-8 space-y-4">
                {incidentError && (
                  <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{incidentError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Your Name (Optional / Anonymous allowed)
                    </label>
                    <input
                      type="text"
                      value={reporterName}
                      onChange={e => setReporterName(e.target.value)}
                      placeholder="e.g. Resident Plot 12"
                      className="w-full px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Contact Phone (For follow-up, optional)
                    </label>
                    <input
                      type="tel"
                      value={reporterPhone}
                      onChange={e => setReporterPhone(e.target.value)}
                      placeholder="e.g. 0802 345 6789"
                      className="w-full px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Location / Street Inside Estate <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      placeholder="e.g. Main Boulevard near East Gate"
                      className="w-full px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      House / Plot Number
                    </label>
                    <input
                      type="text"
                      value={houseNumber}
                      onChange={e => setHouseNumber(e.target.value)}
                      placeholder="e.g. Plot 14B"
                      className="w-full px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Category
                    </label>
                    <select
                      value={incidentType}
                      onChange={e => setIncidentType(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
                    >
                      <option value="Suspicious activity">Suspicious Activity / Loitering</option>
                      <option value="Unauthorized entry attempt">Unauthorized Entry / Trespass</option>
                      <option value="Traffic/parking violation">Traffic / Speeding Infraction</option>
                      <option value="Noise disturbance">Noise Disturbance / Late Gathering</option>
                      <option value="Power/electrical emergency">Power / Electrical Sparking</option>
                      <option value="Water/infrastructure fault">Water / Drainage Fault</option>
                      <option value="Theft/burglary attempt">Theft / Tampering Concern</option>
                      <option value="General safety concern">General Safety Concern</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Priority Level
                    </label>
                    <select
                      value={priority}
                      onChange={e => setPriority(e.target.value as any)}
                      className="w-full px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
                    >
                      <option value="Low">Low - Informational observation</option>
                      <option value="Medium">Medium - Prompt attention requested</option>
                      <option value="High">High - Urgent security check</option>
                      <option value="Critical">Critical - Immediate security response</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Incident Description <span className="text-rose-600">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Provide relevant details: time observed, vehicles, descriptions, or specific location points."
                    className="w-full px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="emergency-toggle"
                    checked={isEmergency}
                    onChange={e => setIsEmergency(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                  <label htmlFor="emergency-toggle" className="text-xs text-rose-800 font-medium cursor-pointer">
                    Flag as urgent emergency requiring immediate patrol check
                  </label>
                </div>

                <div className="pt-2 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={submittingIncident}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg text-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submittingIncident ? (
                      <span>Logging Report...</span>
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
        </section>

        {/* SECTION 6: Security Notices */}
        {securityAnnouncements.length > 0 && (
          <section className="py-12 sm:py-16 bg-slate-50 border-b border-slate-200">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                  <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block mb-1">
                    Official Bulletins
                  </span>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                    Security Notices & Advisories
                  </h2>
                  <p className="mt-1 text-xs text-slate-600">
                    Official security communications issued by the Chief Security Officer and Estate Council.
                  </p>
                </div>

                <button
                  onClick={onNavigateToAnnouncements}
                  className="text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer self-start sm:self-auto"
                >
                  <span>View All Estate Notices</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {securityAnnouncements.slice(0, 3).map(notice => (
                  <div 
                    key={notice.id} 
                    className="bg-white rounded-xl p-5 border border-slate-200 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mb-2">
                        <span className="font-semibold text-emerald-800 uppercase text-[11px]">{notice.category}</span>
                        <span>{new Date(notice.publish_at || notice.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 line-clamp-2">
                        {notice.title}
                      </h3>

                      <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed">
                        {notice.body}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-medium">
                        By {notice.published_by || notice.author_name || 'CSO Desk'}
                      </span>
                      <button
                        onClick={() => onNavigateToAnnouncementDetail(notice.slug)}
                        className="text-xs font-medium text-emerald-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>Read</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* SECTION 7: Security Procedures */}
        <section className="py-12 sm:py-16 bg-white border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mb-8">
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block mb-1">
                Standard Protocols
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Estate Security Guidelines & Protocols
              </h2>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Clear operating guidelines to maintain orderly access, neighbor tranquility, and community protection.
              </p>
            </div>

            {/* Protocol Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg max-w-fit mb-8">
              {protocols.map(p => {
                const Icon = p.icon;
                const isActive = activeProtocolTab === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setActiveProtocolTab(p.id as any)}
                    className={`px-3.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{p.title.split('&')[0].trim()}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Protocol Panel */}
            {protocols.map(p => {
              if (p.id !== activeProtocolTab) return null;
              const Icon = p.icon;
              return (
                <div key={p.id} className="bg-slate-50 rounded-xl p-6 sm:p-8 border border-slate-200 max-w-4xl">
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-200 mb-6">
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{p.title}</h3>
                      <p className="text-xs text-slate-500">{p.description}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {p.points.map((pt, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3.5 bg-white rounded-lg border border-slate-200/80">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                        <p className="text-xs text-slate-700 leading-relaxed">{pt}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Estate Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10 text-xs border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-slate-800">
            <div className="md:col-span-2">
              <EstateLogo
                size="sm"
                variant="horizontal"
                theme="dark"
                estateName={estateSettings.estate_name || 'Finger of God Estate'}
                subtitle="COMMUNITY SECURITY • ASABA"
              />
              <p className="mt-3 text-slate-400 text-xs leading-relaxed max-w-sm">
                Safeguarding Finger of God Estate, Iyiaba, Asaba, Delta State in operational partnership with the Delta State Unified Vigilante (School Boy Units).
              </p>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Quick Links</h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <button onClick={onNavigateHome} className="hover:text-white transition-colors cursor-pointer">
                    Estate Home
                  </button>
                </li>
                <li>
                  <button onClick={onNavigateToRoadProject} className="text-emerald-400 font-medium hover:underline transition-colors cursor-pointer">
                    Road Project Public Ledger
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
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Security Desk</h4>
              <p className="text-xs leading-relaxed text-slate-400">
                Gatehouse Command Post<br />
                Phase 1 Boulevard<br />
                Hotline: <strong className="text-white">{estateSettings.contact_phone || '08023456789'}</strong>
              </p>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] text-slate-500">
            <div>
              © {new Date().getFullYear()} Finger of God Estate Management. All rights reserved.
            </div>
            <div>
              Community Security Operations • Delta State Unified Vigilante (School Boy Units)
            </div>
          </div>
        </div>
      </footer>

      {/* Payment Modals (Preserved Without Breaking Any Flows) */}
      {isPayModalOpen && (
        <PaystackPaymentModal
          isOpen={isPayModalOpen}
          onClose={() => setIsPayModalOpen(false)}
          preselectedResident={targetResident}
          estateSettings={estateSettings}
          targetMonth={new Date().getMonth() + 1}
          targetYear={new Date().getFullYear()}
          onPaymentSuccess={() => {
            setIsPayModalOpen(false);
          }}
        />
      )}

      {isFlatPayModalOpen && (
        <FlatSecurityPaymentModal
          isOpen={isFlatPayModalOpen}
          onClose={() => setIsFlatPayModalOpen(false)}
        />
      )}
    </div>
  );
};
