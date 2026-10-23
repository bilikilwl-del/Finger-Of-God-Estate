import React, { useState, useEffect } from 'react';
import {
  Shield,
  CreditCard,
  UserCheck,
  ChevronRight,
  Bell,
  Phone,
  Mail,
  MapPin,
  Send,
  CheckCircle2,
  Users,
  Search,
  ArrowRight,
  ArrowUpRight,
  ShieldAlert,
  AlertCircle,
  Landmark,
  Calendar,
  Clock,
  FileCheck,
  Lock,
  Compass
} from 'lucide-react';
import {
  EstateSettings,
  Announcement,
  Resident,
  RoadProjectSummary,
  NavigationTab,
  MonthlyPayment
} from '../../types/database';
import { dbService } from '../../lib/supabase';
import { SEOHead } from '../common/SEOHead';
import { PublicNavbar } from '../layout/PublicNavbar';
import { PublicFooter } from '../layout/PublicFooter';
import { PaystackPaymentModal } from '../payments/PaystackPaymentModal';

interface PublicHomeViewProps {
  estateSettings: EstateSettings;
  currentResident?: Resident | null;
  onNavigate: (tab: NavigationTab) => void;
  onNavigateToAnnouncementDetail: (slug: string) => void;
  onOpenResidentLogin: (initialTab?: 'login' | 'activate') => void;
}

export const PublicHomeView: React.FC<PublicHomeViewProps> = ({
  estateSettings,
  currentResident,
  onNavigate,
  onNavigateToAnnouncementDetail,
  onOpenResidentLogin
}) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [roadSummary, setRoadSummary] = useState<RoadProjectSummary | null>(null);
  const [, setResidentPayments] = useState<MonthlyPayment[]>([]);

  // Quick Security Pay Modal State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [quickPayResidentNumber, setQuickPayResidentNumber] = useState('');
  const [quickPayResident, setQuickPayResident] = useState<Resident | null>(null);
  const [quickPayVerifying, setQuickPayVerifying] = useState(false);
  const [quickPayError, setQuickPayError] = useState('');

  // Contact Form State
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSubmitted, setContactSubmitted] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [publicAnnouncements, rSummary] = await Promise.all([
          dbService.getPublicAnnouncements(),
          dbService.getRoadProjectSummary(35000000)
        ]);
        setAnnouncements(publicAnnouncements);
        setRoadSummary(rSummary);

        if (currentResident) {
          const p = await dbService.getMonthlyPayments({ residentNumber: currentResident.resident_number });
          setResidentPayments(p);
        }
      } catch (err) {
        console.warn('Failed to load homepage public data:', err);
      } finally {
        setLoadingAnnouncements(false);
      }
    }
    loadData();
  }, [currentResident]);

  // Urgent Notice Check
  const urgentNotice = announcements.find(
    a => (a.priority === 'URGENT' || a.priority === 'Emergency' || a.priority === 'Important' || a.priority === 'Urgent') &&
         (a.status === 'PUBLISHED' || a.status === 'Published')
  );

  // Verification for Quick Security Payment
  const handleVerifyForQuickPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPayResidentNumber.trim()) {
      setQuickPayError('Please enter your Resident Number (e.g. 001, 024)');
      return;
    }

    setQuickPayVerifying(true);
    setQuickPayError('');
    try {
      const allResidents = await dbService.getResidents();
      const cleanInput = quickPayResidentNumber.trim().padStart(3, '0');
      let resident = allResidents.find(
        r => r.resident_number === cleanInput ||
             r.resident_number.padStart(3, '0') === cleanInput
      );

      if (!resident) {
        const lookup = await dbService.lookupResidentPublic(cleanInput);
        if (lookup.found && lookup.resident) {
          resident = lookup.resident as Resident;
        }
      }

      if (!resident) {
        setQuickPayError(`Resident Number "${cleanInput}" was not found in the estate directory.`);
      } else if (resident.status !== 'Active') {
        setQuickPayError(`Resident record (${resident.full_name}) is currently inactive. Please contact administration.`);
      } else {
        setQuickPayResident(resident);
        setIsPayModalOpen(true);
      }
    } catch {
      setQuickPayError('Unable to connect to registry. Please try again.');
    } finally {
      setQuickPayVerifying(false);
    }
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContactSubmitted(true);
    setTimeout(() => {
      setContactName('');
      setContactEmail('');
      setContactPhone('');
      setContactMessage('');
      setContactSubmitted(false);
    }, 4000);
  };

  const monthlySecurityLevy = estateSettings.monthly_security_levy || 1500;
  const monthlyEstateLevy = estateSettings.monthly_estate_levy || 1000;
  const levyAmountFormatted = `₦${monthlySecurityLevy.toLocaleString()}`;
  const annualLevyFormatted = `₦${(monthlySecurityLevy * 12).toLocaleString()}`;
  const estateLevyFormatted = `₦${monthlyEstateLevy.toLocaleString()}`;

  // Editorial Estate Directory (Clean human numbering, zero pill clutter)
  const estateServices = [
    {
      index: '01',
      id: 'residents',
      title: 'Resident Portal & Household Registry',
      meta: 'Plots 001 – 100 · Verified Access',
      description: 'Access your personal plot ledger, manage household vehicles, pre-register guests for gate clearance, and review official payment records.',
      highlights: ['Digital plot ledger & statement', 'Visitor pass generation', 'Household profile & vehicle registry'],
      actionLabel: 'Open Resident Portal',
      tab: 'resident_portal' as NavigationTab,
      icon: Users,
      featured: true
    },
    {
      index: '02',
      id: 'levy',
      title: 'Security & Statutory Estate Levies',
      meta: `${levyAmountFormatted}/mo Security · ${estateLevyFormatted}/mo Building`,
      description: 'Settle 1-month or 12-month security and building levies online via Paystack and download stamped digital receipts immediately.',
      highlights: ['Instant cryptographic receipt', '1-month or 12-month settlement', 'Automated ledger reconciliation'],
      actionLabel: 'Pay Estate Levies',
      tab: 'estate_levy' as NavigationTab,
      icon: CreditCard,
      featured: true
    },
    {
      index: '03',
      id: 'security',
      title: 'Gatehouse & Perimeter Security',
      meta: '24-Hour Patrol · Access Control',
      description: 'View gate security guidelines, on-duty security personnel, visitor pass verification protocols, and emergency incident reporting.',
      highlights: [],
      actionLabel: 'View Security Operations',
      tab: 'security_public' as NavigationTab,
      icon: Shield,
      featured: false
    },
    {
      index: '04',
      id: 'road',
      title: 'Road Paving & Drainage Works',
      meta: 'Phase 1 Infrastructure · Live Ledger',
      description: 'Track ongoing 80mm interlocking stone road construction, reinforced side drainage channels, and audited community contributions.',
      highlights: [],
      actionLabel: 'Inspect Project Ledger',
      tab: 'road_project' as NavigationTab,
      icon: Landmark,
      featured: false
    },
    {
      index: '05',
      id: 'announcements',
      title: 'Executive Committee Bulletins',
      meta: announcements.length > 0 ? `${announcements.length} Published Notices` : 'Secretariat Updates',
      description: 'Read official circulars, general meeting resolutions, scheduled utility maintenance advisories, and community bylaws.',
      highlights: [],
      actionLabel: 'Read Official Notices',
      tab: 'public_announcements' as NavigationTab,
      icon: Bell,
      featured: false
    }
  ];

  const roadProgressPercent = roadSummary
    ? Math.min(100, Math.round((roadSummary.total_collected / (roadSummary.target_budget || 35000000)) * 100))
    : 0;

  return (
    <div className="min-h-screen bg-[#F8F7F3] text-slate-900 font-sans flex flex-col selection:bg-emerald-900 selection:text-white">
      <SEOHead
        title="Finger of God Estate — Asaba, Delta State | Official Residential Portal"
        description="Official residential platform for Finger of God Estate, Asaba. Access 24/7 security management, road paving projects, resident portal, and monthly dues."
        keywords={['Finger of God Estate', 'Asaba Delta State', 'Estate Security', 'Resident Portal', 'Paystack Levy Payments', 'Road Paving Project']}
        canonicalPath="/"
        ogType="website"
      />

      {/* 1. Header Navigation Bar */}
      <PublicNavbar
        currentTab="home"
        estateSettings={estateSettings}
        currentResident={currentResident}
        onNavigate={onNavigate}
        onOpenResidentLogin={onOpenResidentLogin}
        unreadAnnouncementsCount={announcements.length}
      />

      {/* 2. Urgent Broadcast Banner (If active) */}
      {urgentNotice && (
        <div className="bg-emerald-950 text-white border-b border-emerald-900/80">
          <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-start sm:items-center gap-2.5 min-w-0">
              <ShieldAlert className="w-4 h-4 text-amber-300 shrink-0 mt-0.5 sm:mt-0" />
              <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:text-sm">
                <span className="font-semibold text-amber-300">Official Notice</span>
                <span aria-hidden="true" className="text-emerald-600">·</span>
                <span className="text-emerald-200 font-mono text-xs tabular-nums">{urgentNotice.publish_at?.split('T')[0] || 'Active'}</span>
                <span aria-hidden="true" className="text-emerald-600">·</span>
                <span className="font-medium text-white truncate">{urgentNotice.title}</span>
              </div>
            </div>
            <button
              onClick={() => onNavigateToAnnouncementDetail(urgentNotice.slug)}
              className="self-start sm:self-auto text-xs font-semibold text-amber-200 hover:text-white transition-colors flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
            >
              <span>Read circular</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 3. Logged-in Resident Welcome Bar */}
      {currentResident && (
        <section className="border-b border-slate-200/90 bg-white">
          <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs sm:text-sm">
              <span className="font-semibold text-emerald-950">Signed in as {currentResident.full_name}</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="text-slate-600 font-mono tabular-nums text-xs">Resident #{currentResident.resident_number}</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="text-slate-600 text-xs">{currentResident.house_number}</span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => onNavigate('resident_portal')}
                className="px-3.5 py-2 bg-emerald-900 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                Open My Portal
              </button>
              <button
                onClick={() => onNavigate('estate_levy')}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                Pay Levies
              </button>
            </div>
          </div>
        </section>
      )}

      <main className="flex-1">
        {/* 4. ARCHITECTURAL SPLIT HERO & DIRECT LEVY CHECKOUT */}
        <section className="border-b border-slate-200/90 bg-white relative overflow-hidden">
          {/* Subtle architectural grid background */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.35]"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(15, 23, 42, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(15, 23, 42, 0.04) 1px, transparent 1px)',
              backgroundSize: '48px 48px'
            }}
            aria-hidden="true"
          />

          <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12 sm:py-16 lg:py-20 relative">
            {/* Mobile Quick-Action Dock (Visible on Mobile & Tablet < lg) */}
            <div className="lg:hidden mb-8">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <button
                  type="button"
                  onClick={() => onNavigate('estate_levy')}
                  className="min-h-[48px] px-3.5 py-2.5 rounded-xl bg-emerald-900 text-white text-xs font-semibold flex items-center justify-between gap-2 transition-colors active:scale-[0.99] cursor-pointer"
                >
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    <CreditCard className="w-4 h-4 text-emerald-200 shrink-0" />
                    <span>Pay Levy</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-200 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => (currentResident ? onNavigate('resident_portal') : onOpenResidentLogin('login'))}
                  className="min-h-[48px] px-3.5 py-2.5 rounded-xl bg-[#F4F3EE] border border-slate-200/90 text-slate-900 text-xs font-semibold flex items-center justify-between gap-2 transition-colors active:scale-[0.99] cursor-pointer"
                >
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    <UserCheck className="w-4 h-4 text-emerald-800 shrink-0" />
                    <span>{currentResident ? 'My Portal' : 'Resident Login'}</span>
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('verify_receipt')}
                  className="min-h-[48px] px-3.5 py-2.5 rounded-xl bg-[#F4F3EE] border border-slate-200/90 text-slate-900 text-xs font-semibold flex items-center justify-between gap-2 transition-colors active:scale-[0.99] cursor-pointer"
                >
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    <FileCheck className="w-4 h-4 text-emerald-800 shrink-0" />
                    <span>Verify Receipt</span>
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('road_project')}
                  className="min-h-[48px] px-3.5 py-2.5 rounded-xl bg-[#F4F3EE] border border-slate-200/90 text-slate-900 text-xs font-semibold flex items-center justify-between gap-2 transition-colors active:scale-[0.99] cursor-pointer"
                >
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    <Landmark className="w-4 h-4 text-emerald-800 shrink-0" />
                    <span>Road Ledger</span>
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
              {/* Left Column: Editorial Residential Identity & Masterplan Canvas (7 Cols) */}
              <div className="lg:col-span-7 flex flex-col justify-between space-y-8">
                <div className="space-y-5 sm:space-y-6">
                  {/* Unboxed Location & Governance Metadata */}
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-medium text-slate-500">
                    <span className="text-emerald-900 font-semibold">Finger of God Residential Estate</span>
                    <span aria-hidden="true">·</span>
                    <span>Phase 1, Iyiaba, Asaba</span>
                    <span aria-hidden="true">·</span>
                    <span>Oshimili South, Delta State</span>
                  </div>

                  {/* Balanced Display Headline */}
                  <h1
                    className="text-[2rem] sm:text-4xl lg:text-[3.1rem] font-bold text-slate-950 tracking-tight font-display leading-[1.12] max-w-2xl"
                    style={{ textWrap: 'balance' }}
                  >
                    A secure, well-governed residential community designed for lasting family living.
                  </h1>

                  <p className="text-sm sm:text-base lg:text-lg text-slate-600 leading-relaxed max-w-2xl font-normal">
                    Administered by the Executive Committee of the Finger of God Estate Residents Association, our portal unifies 24-hour gatehouse access control, transparent road infrastructure accounts, and instant digital levy receipts across Plots 001 to 100.
                  </p>

                  {/* Primary Action Row */}
                  <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 pt-1">
                    {currentResident ? (
                      <button
                        onClick={() => onNavigate('resident_portal')}
                        className="min-h-[46px] px-6 py-3 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>Open Resident Dashboard</span>
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => onOpenResidentLogin('login')}
                          className="min-h-[46px] px-6 py-3 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <UserCheck className="w-4 h-4" />
                          <span>Resident Portal Sign In</span>
                        </button>
                        <button
                          onClick={() => onOpenResidentLogin('activate')}
                          className="min-h-[46px] px-5 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <span>Activate Plot ID (001–100)</span>
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => onNavigate('verify_receipt')}
                      className="min-h-[46px] px-4 py-3 rounded-xl text-slate-700 hover:text-emerald-900 font-semibold text-sm transition-colors flex items-center justify-center sm:justify-start gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <span>Verify Payment Receipt</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Bespoke Architectural Site Plan & Governance Card */}
                <div className="rounded-2xl bg-[#F4F3EE] border border-slate-200/90 p-5 sm:p-6 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-4">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Compass className="w-4 h-4 text-emerald-800 shrink-0" />
                      <span className="font-semibold text-slate-900">Phase 1 Masterplan Overview</span>
                      <span aria-hidden="true">·</span>
                      <span>1 Ogbueshi Ugboko Street Corridor</span>
                    </div>
                    <span className="text-xs font-mono tabular-nums text-emerald-900 font-semibold">
                      100 Demarcated Plots
                    </span>
                  </div>

                  {/* Architectural Vector Illustration */}
                  <div className="rounded-xl bg-emerald-950 p-4 sm:p-5 text-white overflow-hidden">
                    <svg
                      className="w-full h-24 sm:h-28"
                      viewBox="0 0 640 120"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      role="img"
                      aria-label="Finger of God Estate Phase 1 Architectural Elevation"
                    >
                      {/* Ground & Interlocking Avenue */}
                      <line x1="0" y1="100" x2="640" y2="100" stroke="#34D399" strokeOpacity="0.45" strokeWidth="1.5" />
                      <line x1="0" y1="108" x2="640" y2="108" stroke="#10B981" strokeOpacity="0.3" strokeWidth="1" strokeDasharray="8 6" />

                      {/* Main Security Gatehouse */}
                      <rect x="24" y="42" width="78" height="58" stroke="#6EE7B7" strokeOpacity="0.55" strokeWidth="1.5" fill="#064E3B" fillOpacity="0.35" />
                      <polygon points="16,42 63,16 110,42" stroke="#6EE7B7" strokeOpacity="0.65" strokeWidth="1.5" fill="#065F46" fillOpacity="0.3" />
                      <rect x="48" y="62" width="30" height="38" stroke="#A7F3D0" strokeOpacity="0.5" strokeWidth="1.2" />
                      {/* Access Barrier */}
                      <line x1="102" y1="76" x2="188" y2="76" stroke="#FCD34D" strokeWidth="2.2" />
                      <rect x="100" y="68" width="6" height="32" fill="#34D399" fillOpacity="0.6" />

                      {/* Boulevard Trees */}
                      <circle cx="218" cy="64" r="14" stroke="#34D399" strokeOpacity="0.4" strokeWidth="1.2" />
                      <line x1="218" y1="78" x2="218" y2="100" stroke="#34D399" strokeOpacity="0.4" strokeWidth="1.5" />

                      {/* Duplex Block A */}
                      <rect x="252" y="34" width="96" height="66" stroke="#6EE7B7" strokeOpacity="0.5" strokeWidth="1.5" fill="#064E3B" fillOpacity="0.25" />
                      <line x1="252" y1="66" x2="348" y2="66" stroke="#6EE7B7" strokeOpacity="0.35" strokeWidth="1" />
                      <rect x="268" y="44" width="22" height="14" stroke="#A7F3D0" strokeOpacity="0.45" strokeWidth="1" />
                      <rect x="310" y="44" width="22" height="14" stroke="#A7F3D0" strokeOpacity="0.45" strokeWidth="1" />

                      {/* Boulevard Trees */}
                      <circle cx="378" cy="64" r="14" stroke="#34D399" strokeOpacity="0.4" strokeWidth="1.2" />
                      <line x1="378" y1="78" x2="378" y2="100" stroke="#34D399" strokeOpacity="0.4" strokeWidth="1.5" />

                      {/* Duplex Block B */}
                      <rect x="408" y="38" width="92" height="62" stroke="#6EE7B7" strokeOpacity="0.5" strokeWidth="1.5" fill="#064E3B" fillOpacity="0.25" />
                      <polygon points="402,38 454,18 506,38" stroke="#6EE7B7" strokeOpacity="0.5" strokeWidth="1.5" />
                      <rect x="424" y="48" width="20" height="14" stroke="#A7F3D0" strokeOpacity="0.45" strokeWidth="1" />
                      <rect x="462" y="48" width="20" height="14" stroke="#A7F3D0" strokeOpacity="0.45" strokeWidth="1" />

                      {/* Community Hall / Secretariat */}
                      <rect x="528" y="46" width="88" height="54" stroke="#6EE7B7" strokeOpacity="0.5" strokeWidth="1.5" fill="#064E3B" fillOpacity="0.25" />
                      <line x1="528" y1="46" x2="616" y2="46" stroke="#FCD34D" strokeOpacity="0.7" strokeWidth="2" />
                      <rect x="546" y="64" width="52" height="36" stroke="#A7F3D0" strokeOpacity="0.4" strokeWidth="1" />
                    </svg>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-emerald-800/60 text-xs">
                      <div>
                        <p className="text-emerald-300/80">Access Control</p>
                        <p className="font-semibold text-white mt-0.5">24/7 Manned Gate & Patrol</p>
                      </div>
                      <div>
                        <p className="text-emerald-300/80">Road Standard</p>
                        <p className="font-semibold text-white mt-0.5">80mm Interlocking Stone</p>
                      </div>
                      <div>
                        <p className="text-emerald-300/80">Treasury Audit</p>
                        <p className="font-semibold text-white mt-0.5">Cryptographic Receipts</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Instant Levy Checkout & Plot Verification Card (5 Cols) */}
              <div className="lg:col-span-5 flex flex-col">
                <div className="h-full rounded-2xl bg-[#F4F3EE] border border-slate-200/90 p-5 sm:p-7 lg:p-8 flex flex-col justify-between space-y-6">
                  <div className="space-y-5">
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-4 border-b border-slate-200/90 pb-4">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-emerald-900 font-semibold">
                          <Lock className="w-3.5 h-3.5 shrink-0" />
                          <span>Direct Levy Payment Desk</span>
                        </div>
                        <h2 className="text-xl font-bold text-slate-950 tracking-tight mt-1">
                          Instant Security Levy Checkout
                        </h2>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[11px] text-slate-500">Monthly Rate</p>
                        <p className="text-base font-bold font-mono tabular-nums text-emerald-900">
                          {levyAmountFormatted}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      Enter your assigned Resident Number (<span className="font-mono font-semibold text-slate-800">001</span> to <span className="font-mono font-semibold text-slate-800">100</span>) to verify your plot and pay your 1-month or 12-month security levy online via Paystack.
                    </p>

                    {/* Quick Lookup Form */}
                    <form onSubmit={handleVerifyForQuickPay} className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label htmlFor="quick-pay-resident-id" className="text-xs font-semibold text-slate-800">
                            Resident Identification Number
                          </label>
                          <span className="text-[11px] text-slate-500 font-mono">Format: 001 – 100</span>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2.5">
                          <div className="relative flex-1">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              id="quick-pay-resident-id"
                              type="text"
                              inputMode="numeric"
                              value={quickPayResidentNumber}
                              onChange={(e) => {
                                setQuickPayResidentNumber(e.target.value);
                                setQuickPayError('');
                              }}
                              placeholder="Enter Plot ID (e.g. 001)"
                              className="w-full min-h-[46px] pl-10 pr-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-sm font-mono font-semibold text-slate-900 placeholder:font-sans placeholder:font-normal placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800 outline-none"
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={quickPayVerifying}
                            className="min-h-[46px] px-5 py-2.5 bg-emerald-900 hover:bg-emerald-800 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                          >
                            {quickPayVerifying ? (
                              <span>Verifying...</span>
                            ) : (
                              <>
                                <span>Proceed to Pay</span>
                                <ArrowRight className="w-4 h-4" />
                              </>
                            )}
                          </button>
                        </div>

                        {/* Quick-Select Sample Plot IDs for Fast Mobile Tap */}
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] text-slate-500 mr-1">Quick select plot:</span>
                          {['001', '002', '005', '010'].map((slot) => (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => {
                                setQuickPayResidentNumber(slot);
                                setQuickPayError('');
                              }}
                              className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors cursor-pointer ${
                                quickPayResidentNumber === slot
                                  ? 'bg-emerald-900 text-white font-semibold'
                                  : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-400'
                              }`}
                            >
                              #{slot}
                            </button>
                          ))}
                        </div>
                      </div>

                      {quickPayError && (
                        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-900">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <span>{quickPayError}</span>
                        </div>
                      )}
                    </form>

                    {/* Structured Tariff Summary Table */}
                    <div className="rounded-xl bg-white border border-slate-200/90 divide-y divide-slate-100 text-xs">
                      <div className="px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">1-Month Security Levy</p>
                          <p className="text-slate-500">Standard monthly household assessment</p>
                        </div>
                        <span className="font-mono tabular-nums font-bold text-slate-900 text-sm">
                          {levyAmountFormatted}
                        </span>
                      </div>
                      <div className="px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">12-Month Annual Security Levy</p>
                          <p className="text-slate-500">Full-year clearance in a single receipt</p>
                        </div>
                        <span className="font-mono tabular-nums font-bold text-emerald-900 text-sm">
                          {annualLevyFormatted}
                        </span>
                      </div>
                      <div className="px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">Statutory Building / Flat Levy</p>
                          <p className="text-slate-500">Assessed per occupied residential unit</p>
                        </div>
                        <span className="font-mono tabular-nums font-semibold text-slate-800 text-sm">
                          {estateLevyFormatted}/mo
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="pt-4 border-t border-slate-200/90 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                    <span>Secured by Paystack · Instant PDF Receipt</span>
                    <button
                      type="button"
                      onClick={() => onNavigate('estate_levy')}
                      className="text-emerald-900 font-semibold hover:underline flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    >
                      <span>Open full levy portal</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. FULL-WIDTH 4-COLUMN QUANTITATIVE STANDARDS STRIP */}
        <section className="border-b border-slate-200/90 bg-[#F4F3EE]">
          <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/90">
              <div className="py-5 sm:py-6 pr-4 sm:px-6 first:pl-0">
                <p className="text-xs text-slate-500 font-medium">Registered Households</p>
                <p className="text-xl sm:text-2xl font-bold text-slate-950 font-mono tabular-nums mt-1">Plots 001–100</p>
                <p className="text-xs text-slate-500 mt-1">Demarcated Phase 1 registry</p>
              </div>
              <div className="py-5 sm:py-6 pl-4 sm:px-6">
                <p className="text-xs text-slate-500 font-medium">Monthly Security Levy</p>
                <p className="text-xl sm:text-2xl font-bold text-slate-950 font-mono tabular-nums mt-1">{levyAmountFormatted}</p>
                <p className="text-xs text-slate-500 mt-1">1-month or 12-month billing</p>
              </div>
              <div className="py-5 sm:py-6 pr-4 sm:px-6">
                <p className="text-xs text-slate-500 font-medium">Statutory Building Levy</p>
                <p className="text-xl sm:text-2xl font-bold text-slate-950 font-mono tabular-nums mt-1">{estateLevyFormatted}</p>
                <p className="text-xs text-slate-500 mt-1">Per residential unit / flat</p>
              </div>
              <div className="py-5 sm:py-6 pl-4 sm:px-6 last:pr-0">
                <p className="text-xs text-slate-500 font-medium">Emergency Security Desk</p>
                <p className="text-xl sm:text-2xl font-bold text-emerald-900 font-mono tabular-nums mt-1">07057543935</p>
                <p className="text-xs text-slate-500 mt-1">24-hour gatehouse & patrol</p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. STATUTORY GENERAL MEETING & SECRETARIAT CIRCULARS SPOTLIGHT */}
        <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 lg:pt-20 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-5">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-emerald-800">Executive Committee (EXCO) Secretariat</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-950 font-display tracking-tight">
                Official Community Notices & Circulars
              </h2>
            </div>
            <button
              onClick={() => onNavigate('public_announcements')}
              className="text-xs sm:text-sm font-semibold text-emerald-900 hover:underline flex items-center gap-1 cursor-pointer self-start sm:self-auto whitespace-nowrap"
            >
              <span>View all published notices</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {loadingAnnouncements ? (
            <div className="py-12 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
              Loading official estate circulars...
            </div>
          ) : announcements.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
              No public circulars published at this time.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              {/* Featured Top Notice (General Meeting / Primary Urgent Circular) — 7 Cols */}
              {announcements[0] && (
                <article
                  onClick={() => onNavigateToAnnouncementDetail(announcements[0].slug)}
                  className="lg:col-span-7 bg-emerald-950 text-white rounded-2xl p-6 sm:p-8 flex flex-col justify-between cursor-pointer group transition-colors hover:bg-emerald-900/95 space-y-6"
                >
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-emerald-300">
                      <span className="font-semibold text-amber-300">Featured Circular</span>
                      <span aria-hidden="true">·</span>
                      <span>{announcements[0].category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{announcements[0].publish_at?.split('T')[0] || 'Current'}</span>
                    </div>

                    <h3
                      className="text-xl sm:text-2xl lg:text-[1.65rem] font-bold text-white leading-snug tracking-tight"
                      style={{ textWrap: 'balance' }}
                    >
                      {announcements[0].title}
                    </h3>

                    <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed whitespace-pre-line line-clamp-5">
                      {announcements[0].body || announcements[0].content}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-emerald-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-emerald-200">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                        <span>Saturday, 24th October 2026</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                        <span>07:00 AM Prompt · Potter&apos;s Church</span>
                      </span>
                    </div>

                    <span className="font-semibold text-amber-300 group-hover:text-white flex items-center gap-1 whitespace-nowrap">
                      <span>Read full notice</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </article>
              )}

              {/* Secondary Notices Stack — 5 Cols */}
              <div className="lg:col-span-5 flex flex-col justify-between gap-5">
                {announcements.slice(1, 3).map((notice) => (
                  <article
                    key={notice.id}
                    onClick={() => onNavigateToAnnouncementDetail(notice.slug)}
                    className="flex-1 bg-white rounded-2xl border border-slate-200/90 hover:border-slate-400 transition-colors p-6 flex flex-col justify-between cursor-pointer group space-y-4"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="font-semibold text-emerald-800">{notice.category}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{notice.publish_at?.split('T')[0] || 'Recent'}</span>
                        {notice.author_name && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="truncate">{notice.author_name}</span>
                          </>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-900 transition-colors line-clamp-2 leading-snug">
                        {notice.title}
                      </h3>

                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-2">
                        {notice.body || notice.content}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-800 group-hover:text-emerald-900">
                      <span>Read circular</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 7. ASYMMETRIC EDITORIAL DIRECTORY OF ESTATE SERVICES */}
        <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-5">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-emerald-800">Digital Estate Modules</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-950 font-display tracking-tight">
                Resident Administration & Community Portals
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md">
              Select a department below to manage household records, settle monthly dues, or inspect estate projects.
            </p>
          </div>

          {/* Asymmetric Bento Grid: 2 Featured Top Cards (3 cols each) + 3 Secondary Cards (2 cols each) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-5">
            {estateServices.map((service) => {
              const Icon = service.icon;
              return (
                <div
                  key={service.id}
                  onClick={() => {
                    onNavigate(service.tab);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`${
                    service.featured ? 'md:col-span-1 lg:col-span-3' : 'md:col-span-1 lg:col-span-2'
                  } bg-white rounded-2xl border border-slate-200/90 hover:border-slate-400 transition-colors p-6 sm:p-7 flex flex-col justify-between cursor-pointer group space-y-6`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-mono font-semibold text-emerald-900">{service.index}.</span>
                      <span>{service.meta}</span>
                    </div>

                    <div className="space-y-2.5">
                      <h3 className="text-lg sm:text-xl font-bold text-slate-950 group-hover:text-emerald-900 transition-colors flex items-center gap-2.5">
                        <Icon className="w-5 h-5 text-emerald-800 shrink-0" />
                        <span>{service.title}</span>
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                        {service.description}
                      </p>
                    </div>

                    {service.highlights.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600">
                        {service.highlights.map((item) => (
                          <div key={item} className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            <span className="truncate">{item}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs sm:text-sm font-semibold text-emerald-900">
                    <span>{service.actionLabel}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 8. INFRASTRUCTURE & ROAD MODERNIZATION LEDGER */}
        <section className="border-y border-slate-200/90 bg-white">
          <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
              {/* Left Narrative & Civil Engineering Cross-Section (6 Cols) */}
              <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <span className="text-emerald-800 font-semibold">Civil Works & Infrastructure</span>
                    <span aria-hidden="true">·</span>
                    <span>Phase 1 Avenues</span>
                  </div>

                  <h2
                    className="text-2xl sm:text-3xl font-bold text-slate-950 font-display tracking-tight leading-snug"
                    style={{ textWrap: 'balance' }}
                  >
                    Phase 1 Road Grading, Concrete Storm Drainage & 80mm Interlocking Paving
                  </h2>

                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                    Our flagship capital project delivers heavy-duty 80mm interlocking concrete stone roads with dual-sided reinforced storm drainage across Finger of God Estate. Every household contribution and contractor disbursement is published openly in the community ledger.
                  </p>
                </div>

                {/* Civil Engineering Cross-Section Diagram */}
                <div className="rounded-xl bg-[#F4F3EE] border border-slate-200/90 p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-900">Engineering Pavement Profile</span>
                    <span className="font-mono text-slate-500">80mm Heavy-Duty Standard</span>
                  </div>
                  <svg
                    className="w-full h-16"
                    viewBox="0 0 500 64"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    {/* Left Concrete Drain */}
                    <path d="M10 12 V54 H58 V12" stroke="#065F46" strokeWidth="3" fill="#E2E8F0" />
                    {/* 80mm Paver Blocks Top Layer */}
                    <rect x="64" y="12" width="372" height="12" fill="#064E3B" rx="2" />
                    {/* Paver joints */}
                    <line x1="120" y1="12" x2="120" y2="24" stroke="#F8F7F3" strokeWidth="1.5" />
                    <line x1="180" y1="12" x2="180" y2="24" stroke="#F8F7F3" strokeWidth="1.5" />
                    <line x1="250" y1="12" x2="250" y2="24" stroke="#F8F7F3" strokeWidth="1.5" />
                    <line x1="320" y1="12" x2="320" y2="24" stroke="#F8F7F3" strokeWidth="1.5" />
                    <line x1="380" y1="12" x2="380" y2="24" stroke="#F8F7F3" strokeWidth="1.5" />
                    {/* Sharp Sand Bedding */}
                    <rect x="64" y="26" width="372" height="10" fill="#D6D3D1" />
                    {/* Compacted Stone Base */}
                    <rect x="64" y="38" width="372" height="16" fill="#94A3B8" />
                    {/* Right Concrete Drain */}
                    <path d="M442 12 V54 H490 V12" stroke="#065F46" strokeWidth="3" fill="#E2E8F0" />
                  </svg>
                  <div className="grid grid-cols-2 gap-4 text-xs pt-1">
                    <div>
                      <p className="text-slate-500">Surface Layer</p>
                      <p className="font-semibold text-slate-900">80mm Vibrated Interlocking Stones</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Storm Water Control</p>
                      <p className="font-semibold text-slate-900">Dual Reinforced Concrete Channels</p>
                    </div>
                  </div>
                </div>

                <div>
                  <button
                    onClick={() => onNavigate('road_project')}
                    className="min-h-[46px] px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm rounded-xl transition-colors inline-flex items-center gap-2 cursor-pointer whitespace-nowrap"
                  >
                    <span>Inspect Full Road Project Ledger</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Right Financial Statement Card (6 Cols) */}
              <div className="lg:col-span-6 flex flex-col">
                <div className="h-full rounded-2xl bg-[#F8F7F3] border border-slate-200/90 p-6 sm:p-8 flex flex-col justify-between space-y-6">
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
                      <div>
                        <p className="text-xs font-semibold text-emerald-800">Audited Project Account</p>
                        <h3 className="text-lg sm:text-xl font-bold text-slate-950 mt-0.5">
                          Road Modernization Financial Statement
                        </h3>
                      </div>
                      <span className="text-xs font-mono tabular-nums text-slate-600 font-semibold">
                        Budget: ₦35,000,000
                      </span>
                    </div>

                    {/* Tabular Financial Rows */}
                    <div className="divide-y divide-slate-200/80 text-xs sm:text-sm">
                      <div className="py-3.5 flex items-center justify-between gap-4">
                        <span className="text-slate-600">Verified Resident Contributions (Credit)</span>
                        <span className="font-mono tabular-nums font-bold text-slate-950 text-base">
                          ₦{roadSummary ? roadSummary.total_collected.toLocaleString() : '0'}
                        </span>
                      </div>
                      <div className="py-3.5 flex items-center justify-between gap-4">
                        <span className="text-slate-600">Contractor & Material Disbursements (Debit)</span>
                        <span className="font-mono tabular-nums font-semibold text-slate-700 text-base">
                          ₦{roadSummary ? roadSummary.total_spent.toLocaleString() : '0'}
                        </span>
                      </div>
                      <div className="py-4 flex items-center justify-between gap-4">
                        <span className="font-semibold text-slate-950">Available Project Treasury Balance</span>
                        <span className="font-mono tabular-nums font-bold text-xl text-emerald-900">
                          ₦{roadSummary ? roadSummary.current_balance.toLocaleString() : '0'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Progress Indicator */}
                  <div className="space-y-2.5 pt-4 border-t border-slate-200/80">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>Capital Mobilization Progress</span>
                      <span className="font-mono tabular-nums font-semibold text-slate-900">
                        {roadSummary?.credits_count || 0} Verified Contributions · {roadProgressPercent}% of budget
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-800 rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(4, roadProgressPercent)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 9. ESTATE SECRETARIAT & RESIDENT HELPDESK */}
        <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
              {/* Left Column: Estate Secretariat Details (6 Cols) */}
              <div className="lg:col-span-6 p-6 sm:p-10 flex flex-col justify-between space-y-6">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-emerald-800">Estate Secretariat</p>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-950 font-display tracking-tight">
                      Administration & Gate Security Contacts
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      Finger of God Estate is a planned residential neighbourhood in Asaba, Delta State. For plot documentation, gate pass assistance, or security dispatch, reach the secretariat directly below.
                    </p>
                  </div>

                  <div className="divide-y divide-slate-200 text-xs sm:text-sm">
                    <div className="py-4 flex items-start gap-3.5">
                      <MapPin className="w-4 h-4 text-emerald-800 shrink-0 mt-1" />
                      <div>
                        <p className="font-semibold text-slate-950">Estate Location</p>
                        <p className="text-slate-600 mt-0.5">
                          1 Ogbueshi Ugboko Street, Finger of God Estate, Iyiaba, Asaba, Delta State.
                        </p>
                      </div>
                    </div>

                    <div className="py-4 flex items-start justify-between gap-3.5">
                      <div className="flex items-start gap-3.5">
                        <Phone className="w-4 h-4 text-emerald-800 shrink-0 mt-1" />
                        <div>
                          <p className="font-semibold text-slate-950">Gate Security &amp; Incident Control Desk</p>
                          <p className="text-slate-600 font-mono tabular-nums mt-0.5">07057543935 (24/7 Direct Line)</p>
                        </div>
                      </div>
                      <a
                        href="tel:07057543935"
                        className="px-3 py-1.5 rounded-lg bg-[#F4F3EE] hover:bg-slate-200 text-slate-900 font-semibold text-xs transition-colors shrink-0"
                      >
                        Call Desk
                      </a>
                    </div>

                    <div className="py-4 flex items-start justify-between gap-3.5">
                      <div className="flex items-start gap-3.5">
                        <Mail className="w-4 h-4 text-emerald-800 shrink-0 mt-1" />
                        <div>
                          <p className="font-semibold text-slate-950">Official Secretariat Email</p>
                          <p className="text-slate-600 mt-0.5">support@fingerofgodestate.com</p>
                        </div>
                      </div>
                      <a
                        href="mailto:support@fingerofgodestate.com"
                        className="px-3 py-1.5 rounded-lg bg-[#F4F3EE] hover:bg-slate-200 text-slate-900 font-semibold text-xs transition-colors shrink-0"
                      >
                        Email
                      </a>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>Secretariat Hours: Mon – Sat, 8:00 AM – 6:00 PM</span>
                  <span>Gatehouse Patrol: 24 Hours Daily</span>
                </div>
              </div>

              {/* Right Column: Resident Inquiry Form (6 Cols) */}
              <div className="lg:col-span-6 p-6 sm:p-10 space-y-5 bg-[#FAF9F6]/60">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-emerald-800">Resident Helpdesk</p>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-950">
                    Write to the Executive Committee
                  </h3>
                  <p className="text-xs text-slate-500">
                    Submit a question regarding levy billing, plot records, or community services.
                  </p>
                </div>

                {contactSubmitted ? (
                  <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
                    <CheckCircle2 className="w-7 h-7 text-emerald-700 mx-auto" />
                    <h4 className="text-sm font-bold text-emerald-950">Message Received</h4>
                    <p className="text-xs text-emerald-800">
                      Thank you. The estate secretariat has logged your message and will respond shortly.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          placeholder="e.g. Chinedu Okafor"
                          required
                          className="w-full min-h-[44px] px-3.5 py-2.5 text-xs sm:text-sm bg-white rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Telephone Number *
                        </label>
                        <input
                          type="tel"
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          placeholder="080XXXXXXXX"
                          required
                          className="w-full min-h-[44px] px-3.5 py-2.5 text-xs sm:text-sm bg-white rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Email Address (Optional)
                      </label>
                      <input
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full min-h-[44px] px-3.5 py-2.5 text-xs sm:text-sm bg-white rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Message or Inquiry *
                      </label>
                      <textarea
                        value={contactMessage}
                        onChange={(e) => setContactMessage(e.target.value)}
                        rows={3}
                        placeholder="State your plot number and how the secretariat can assist..."
                        required
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800 outline-none resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full min-h-[46px] py-2.5 px-4 bg-emerald-900 hover:bg-emerald-800 text-white font-semibold text-xs sm:text-sm rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Message to Secretariat</span>
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 10. Universal Footer */}
      <PublicFooter
        estateSettings={estateSettings}
        onNavigate={onNavigate}
        onOpenResidentLogin={() => onOpenResidentLogin('login')}
      />

      {/* Paystack Payment Modal for Quick Pay */}
      {isPayModalOpen && quickPayResident && (
        <PaystackPaymentModal
          isOpen={isPayModalOpen}
          onClose={() => {
            setIsPayModalOpen(false);
            setQuickPayResident(null);
            setQuickPayResidentNumber('');
          }}
          estateSettings={estateSettings}
          preselectedResident={quickPayResident}
          onPaymentSuccess={() => {
            setIsPayModalOpen(false);
            setQuickPayResident(null);
            setQuickPayResidentNumber('');
            onNavigate('estate_levy');
          }}
        />
      )}
    </div>
  );
};
