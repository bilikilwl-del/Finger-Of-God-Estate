import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
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
  FileText,
  Search,
  ArrowRight,
  ShieldAlert,
  AlertCircle,
  Building2,
  Landmark
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
    a => (a.priority === 'URGENT' || a.priority === 'Emergency' || a.priority === 'Important') && a.status === 'PUBLISHED'
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

  const levyAmountFormatted = `₦${(estateSettings.monthly_security_levy || 1500).toLocaleString()}`;
  const estateLevyFormatted = `₦${(estateSettings.monthly_estate_levy || 1000).toLocaleString()}`;

  // Editorial Estate Directory (Clean human numbering, zero pill clutter)
  const estateServices = [
    {
      index: '01',
      id: 'residents',
      title: 'Resident Portal & Household Registry',
      meta: 'Plots 001 – 100 · Verified Access',
      description: 'Access your personal plot ledger, manage household vehicles, pre-register guests for gate clearance, and review official payment records.',
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
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 font-sans flex flex-col selection:bg-emerald-900 selection:text-white">
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
        <div className="bg-rose-950 text-white border-b border-rose-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <ShieldAlert className="w-4 h-4 text-rose-300 shrink-0" />
              <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:text-sm">
                <span className="font-semibold text-rose-200">Notice</span>
                <span aria-hidden="true" className="text-rose-400">·</span>
                <span className="text-rose-300 font-mono text-xs">{urgentNotice.publish_at?.split('T')[0] || 'Today'}</span>
                <span aria-hidden="true" className="text-rose-400">·</span>
                <span className="font-medium text-white truncate">{urgentNotice.title}</span>
              </div>
            </div>
            <button
              onClick={() => onNavigateToAnnouncementDetail(urgentNotice.slug)}
              className="self-start sm:self-auto text-xs font-semibold text-rose-100 hover:text-white underline underline-offset-4 transition-colors flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
            >
              <span>Read circular</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 3. Logged-in Resident Welcome Bar */}
      {currentResident && (
        <section className="border-b border-slate-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm">
              <span className="font-semibold text-emerald-900">Signed in as {currentResident.full_name}</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="text-slate-600 font-mono text-xs">Resident #{currentResident.resident_number}</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="text-slate-600 text-xs">{currentResident.house_number}</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => onNavigate('resident_portal')}
                className="px-3.5 py-1.5 bg-emerald-900 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                Open My Portal
              </button>
              <button
                onClick={() => onNavigate('estate_levy')}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                Pay Levies
              </button>
            </div>
          </div>
        </section>
      )}

      <main className="flex-1">
        {/* 4. ARCHITECTURAL SPLIT HERO & QUICK PAYMENT DESK */}
        <section className="border-b border-slate-200/90 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
              
              {/* Left Column: Editorial Residential Identity (7 Cols) */}
              <div className="lg:col-span-7 flex flex-col justify-between space-y-8">
                <div className="space-y-6">
                  {/* Unboxed Location & Governance Metadata */}
                  <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                    <span className="text-emerald-800 font-semibold">Finger of God Residential Estate</span>
                    <span aria-hidden="true">·</span>
                    <span>Phase 1, Iyiaba, Asaba</span>
                    <span aria-hidden="true">·</span>
                    <span>Oshimili South, Delta State</span>
                  </div>

                  {/* Balanced Human Display Headline */}
                  <h1
                    className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-slate-900 tracking-tight font-display leading-[1.15] max-w-2xl"
                    style={{ textWrap: 'balance' }}
                  >
                    A quiet, well-governed residential neighbourhood built for lasting family living.
                  </h1>

                  <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl font-normal">
                    Managed by the Finger of God Estate Residents Association, our community combines 24-hour manned gate security, structured plot administration, and transparent civil infrastructure across Phase 1.
                  </p>

                  {/* Primary Action Row */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    {currentResident ? (
                      <button
                        onClick={() => onNavigate('resident_portal')}
                        className="px-5 py-3 rounded-lg bg-emerald-900 hover:bg-emerald-800 text-white font-semibold text-sm transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>Go to Resident Dashboard</span>
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => onOpenResidentLogin('login')}
                          className="px-5 py-3 rounded-lg bg-emerald-900 hover:bg-emerald-800 text-white font-semibold text-sm transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <UserCheck className="w-4 h-4" />
                          <span>Resident Sign In</span>
                        </button>
                        <button
                          onClick={() => onOpenResidentLogin('activate')}
                          className="px-5 py-3 rounded-lg bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 font-semibold text-sm transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <span>Activate Account</span>
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => onNavigate('estate_levy')}
                      className="px-4 py-3 rounded-lg text-slate-700 hover:text-emerald-900 font-semibold text-sm transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <span>Estate Levy Schedule</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Architectural Site Overview Graphic (Resilient SVG Masterplan Preview) */}
                <div className="pt-6 border-t border-slate-200/80">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
                    <div>
                      <p className="text-slate-400 font-medium">Gatehouse & Patrol</p>
                      <p className="text-slate-900 font-semibold mt-0.5">24-hour controlled entry & night watch</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-medium">Civil Infrastructure</p>
                      <p className="text-slate-900 font-semibold mt-0.5">80mm interlocking road & dual drainage</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-medium">Financial Governance</p>
                      <p className="text-slate-900 font-semibold mt-0.5">Digital receipts & open project ledger</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Integrated Quick Dues Desk & Architectural Elevation (5 Cols) */}
              <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl bg-[#F4F3EE] border border-slate-200/90 p-6 sm:p-8 space-y-6">
                {/* Architectural Masterplan / Gatehouse Header Graphic */}
                <div className="rounded-xl bg-emerald-950 text-white p-5 relative overflow-hidden">
                  <svg
                    className="w-full h-24 text-emerald-800/40"
                    viewBox="0 0 400 100"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    {/* Subtle architectural line drawing of residential avenue & gatehouse */}
                    <line x1="0" y1="88" x2="400" y2="88" stroke="currentColor" strokeWidth="1.5" />
                    <line x1="0" y1="94" x2="400" y2="94" stroke="currentColor" strokeWidth="1" strokeDasharray="6 6" />
                    {/* Gatehouse structure */}
                    <rect x="28" y="36" width="64" height="52" stroke="currentColor" strokeWidth="1.5" />
                    <polygon points="22,36 60,14 98,36" stroke="currentColor" strokeWidth="1.5" />
                    <rect x="48" y="54" width="24" height="34" stroke="currentColor" strokeWidth="1.2" />
                    {/* Boom barrier */}
                    <line x1="92" y1="68" x2="165" y2="68" stroke="#34D399" strokeWidth="2" />
                    <rect x="90" y="62" width="6" height="26" fill="currentColor" />
                    {/* Residential duplex silhouettes */}
                    <rect x="195" y="28" width="76" height="60" stroke="currentColor" strokeWidth="1.5" />
                    <line x1="195" y1="56" x2="271" y2="56" stroke="currentColor" strokeWidth="1" />
                    <rect x="210" y="36" width="16" height="12" stroke="currentColor" strokeWidth="1" />
                    <rect x="240" y="36" width="16" height="12" stroke="currentColor" strokeWidth="1" />
                    <rect x="295" y="34" width="72" height="54" stroke="currentColor" strokeWidth="1.5" />
                    <polygon points="290,34 331,16 372,34" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                  <div className="mt-2 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-[11px] text-emerald-300/90 font-medium">Direct Payment Desk</p>
                      <h2 className="text-lg font-bold text-white tracking-tight">
                        Security & Estate Levy Checkout
                      </h2>
                    </div>
                    <span className="text-xs font-mono tabular-nums text-emerald-200 shrink-0">
                      {levyAmountFormatted} / mo
                    </span>
                  </div>
                </div>

                {/* Quick Payment Lookup Form */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900">
                      Quick Resident Lookup
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Enter your assigned Resident ID (<span className="font-mono">001</span> – <span className="font-mono">100</span>) to pay your 1-month or 12-month security levy and download an official receipt.
                    </p>
                  </div>

                  <form onSubmit={handleVerifyForQuickPay} className="space-y-3">
                    <div>
                      <label htmlFor="quick-pay-resident-id" className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Resident Identification Number
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2.5">
                        <div className="relative flex-1">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                          <input
                            id="quick-pay-resident-id"
                            type="text"
                            value={quickPayResidentNumber}
                            onChange={(e) => {
                              setQuickPayResidentNumber(e.target.value);
                              setQuickPayError('');
                            }}
                            placeholder="e.g. 001 or 024"
                            className="w-full pl-9 pr-3.5 py-2.5 rounded-lg bg-white border border-slate-300 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800 outline-none"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={quickPayVerifying}
                          className="px-5 py-2.5 bg-emerald-900 hover:bg-emerald-800 disabled:opacity-50 text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          {quickPayVerifying ? (
                            <span>Checking...</span>
                          ) : (
                            <>
                              <span>Continue</span>
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {quickPayError && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-xs text-rose-800">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <span>{quickPayError}</span>
                      </div>
                    )}
                  </form>
                </div>

                {/* Footer Links inside Quick Pay Desk */}
                <div className="pt-4 border-t border-slate-200/90 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                  <span>1 Month ({levyAmountFormatted}) · 12 Months (₦{((estateSettings.monthly_security_levy || 1500) * 12).toLocaleString()})</span>
                  <button
                    type="button"
                    onClick={() => onNavigate('verify_receipt')}
                    className="text-emerald-800 font-semibold hover:underline cursor-pointer whitespace-nowrap"
                  >
                    Verify a receipt →
                  </button>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* 5. FULL-WIDTH 4-COLUMN COMMUNITY STANDARDS STRIP */}
        <section className="border-b border-slate-200/90 bg-[#F4F3EE]/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/90">
              <div className="py-6 sm:px-6 first:pl-0">
                <p className="text-xs text-slate-500 font-medium">Registered Residences</p>
                <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">Plots 001–100</p>
                <p className="text-xs text-slate-500 mt-1">Phase 1 residential layout</p>
              </div>
              <div className="py-6 px-4 sm:px-6">
                <p className="text-xs text-slate-500 font-medium">Monthly Security Levy</p>
                <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">{levyAmountFormatted}</p>
                <p className="text-xs text-slate-500 mt-1">1 month or 12 months option</p>
              </div>
              <div className="py-6 px-4 sm:px-6">
                <p className="text-xs text-slate-500 font-medium">Statutory Estate Levy</p>
                <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">{estateLevyFormatted}</p>
                <p className="text-xs text-slate-500 mt-1">Assessed per building unit</p>
              </div>
              <div className="py-6 px-4 sm:px-6 last:pr-0">
                <p className="text-xs text-slate-500 font-medium">Security Control Desk</p>
                <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">24 Hours</p>
                <p className="text-xs text-slate-500 mt-1">Main gate & perimeter patrol</p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. ASYMMETRIC EDITORIAL DIRECTORY OF ESTATE SERVICES */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-5">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-emerald-800">Estate Departments & Services</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display tracking-tight">
                Resident Administration & Community Portals
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md">
              Direct access to household account management, levy payments, security clearance, and community records.
            </p>
          </div>

          {/* Asymmetric Bento Grid: 2 Featured Top Cards + 3 Secondary Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-6 gap-5">
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
                    service.featured ? 'lg:col-span-3' : 'lg:col-span-2'
                  } bg-white rounded-xl border border-slate-200/90 hover:border-slate-400 transition-colors p-6 sm:p-7 flex flex-col justify-between cursor-pointer group space-y-6`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-mono font-semibold text-slate-500">{service.index}.</span>
                      <span>{service.meta}</span>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-900 transition-colors flex items-center gap-2.5">
                        <Icon className="w-4 h-4 text-emerald-800 shrink-0" />
                        <span>{service.title}</span>
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {service.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-900">
                    <span>{service.actionLabel}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 7. INFRASTRUCTURE & ROAD PROJECT LEDGER */}
        <section className="border-y border-slate-200/90 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
              
              {/* Left Narrative (6 Cols) */}
              <div className="lg:col-span-6 space-y-5">
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                  <span className="text-emerald-800 font-semibold">Civil Works & Infrastructure</span>
                  <span aria-hidden="true">·</span>
                  <span>Phase 1 Avenues</span>
                </div>

                <h2
                  className="text-2xl sm:text-3xl font-bold text-slate-900 font-display tracking-tight leading-snug"
                  style={{ textWrap: 'balance' }}
                >
                  Phase 1 Road Grading, Concrete Drainage & 80mm Interlocking Stone Paving
                </h2>

                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  Our flagship capital project delivers durable 80mm interlocking concrete stone roads with dual-sided reinforced storm drainage across Finger of God Estate. Every resident contribution and contractor disbursement is recorded openly for community inspection.
                </p>

                <div className="grid grid-cols-2 gap-4 pt-2 text-xs border-t border-slate-200">
                  <div className="pt-3">
                    <p className="text-slate-400 font-medium">Specification</p>
                    <p className="text-slate-900 font-semibold mt-0.5">80mm Heavy-Duty Interlocking Stones</p>
                  </div>
                  <div className="pt-3">
                    <p className="text-slate-400 font-medium">Drainage Standard</p>
                    <p className="text-slate-900 font-semibold mt-0.5">Dual-Sided Reinforced Concrete Channels</p>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => onNavigate('road_project')}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm rounded-lg transition-colors inline-flex items-center gap-2 cursor-pointer whitespace-nowrap"
                  >
                    <span>Inspect Full Road Project Ledger</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Right Financial Statement Card (6 Cols) */}
              <div className="lg:col-span-6">
                <div className="rounded-2xl bg-[#FAF9F6] border border-slate-200 p-6 sm:p-8 space-y-6">
                  <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-500">Financial Transparency Summary</p>
                      <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                        Road Project Account Statement
                      </h3>
                    </div>
                    <span className="text-xs font-mono tabular-nums text-slate-500">
                      Target: ₦35,000,000
                    </span>
                  </div>

                  {/* Tabular Financial Rows */}
                  <div className="divide-y divide-slate-200/80 text-sm">
                    <div className="py-3 flex items-center justify-between">
                      <span className="text-slate-600">Total Contributions Received (Credit)</span>
                      <span className="font-mono tabular-nums font-bold text-slate-900">
                        ₦{roadSummary ? roadSummary.total_collected.toLocaleString() : '0'}
                      </span>
                    </div>
                    <div className="py-3 flex items-center justify-between">
                      <span className="text-slate-600">Verified Contractor Disbursements (Debit)</span>
                      <span className="font-mono tabular-nums font-semibold text-slate-700">
                        ₦{roadSummary ? roadSummary.total_spent.toLocaleString() : '0'}
                      </span>
                    </div>
                    <div className="py-3.5 flex items-center justify-between">
                      <span className="font-semibold text-slate-900">Available Project Balance</span>
                      <span className="font-mono tabular-nums font-bold text-lg text-emerald-800">
                        ₦{roadSummary ? roadSummary.current_balance.toLocaleString() : '0'}
                      </span>
                    </div>
                  </div>

                  {/* Progress Indicator */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Capital Mobilization Progress</span>
                      <span className="font-mono tabular-nums font-semibold text-slate-800">{roadProgressPercent}% of budget</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
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

        {/* 8. OFFICIAL SECRETARIAT CIRCULARS & ANNOUNCEMENTS */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-5">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-emerald-800">Secretariat Circulars</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display tracking-tight">
                Official Community Notices
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {loadingAnnouncements ? (
              <div className="col-span-3 py-12 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
                Loading official estate circulars...
              </div>
            ) : announcements.length === 0 ? (
              <div className="col-span-3 py-10 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
                No public circulars published at this time.
              </div>
            ) : (
              announcements.slice(0, 3).map((notice) => (
                <article
                  key={notice.id}
                  onClick={() => onNavigateToAnnouncementDetail(notice.slug)}
                  className="bg-white rounded-xl border border-slate-200/90 hover:border-slate-400 transition-colors p-6 flex flex-col justify-between cursor-pointer group space-y-4"
                >
                  <div className="space-y-3">
                    {/* Clean unboxed metadata */}
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-emerald-800">{notice.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{notice.publish_at?.split('T')[0] || 'Recent'}</span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-900 transition-colors line-clamp-2 leading-snug">
                      {notice.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-3">
                      {notice.content}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-800 group-hover:text-emerald-900">
                    <span>Read full circular</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        {/* 9. ESTATE SECRETARIAT & RESIDENT HELPDESK */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24">
          <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
              
              {/* Left Column: Estate Secretariat Details (6 Cols) */}
              <div className="lg:col-span-6 p-6 sm:p-10 space-y-6">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-emerald-800">Estate Secretariat</p>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-display tracking-tight">
                    Administration & Security Contacts
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Finger of God Estate is a planned residential neighbourhood in Asaba, Delta State. For plot documentation, gate pass assistance, or security dispatch, reach the secretariat directly below.
                  </p>
                </div>

                <div className="divide-y divide-slate-200 text-xs sm:text-sm">
                  <div className="py-3.5 flex items-start gap-3.5">
                    <MapPin className="w-4 h-4 text-emerald-800 shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold text-slate-900">Physical Address</p>
                      <p className="text-slate-600 mt-0.5">1 Ogbueshi Ugboko Street, Finger of God Estate, Iyiaba, Asaba, Delta State.</p>
                    </div>
                  </div>

                  <div className="py-3.5 flex items-start gap-3.5">
                    <Phone className="w-4 h-4 text-emerald-800 shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold text-slate-900">Gate Security &amp; Incident Control Desk</p>
                      <p className="text-slate-600 font-mono mt-0.5">07057543935 (Gate &amp; Security Desk)</p>
                    </div>
                  </div>

                  <div className="py-3.5 flex items-start gap-3.5">
                    <Mail className="w-4 h-4 text-emerald-800 shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold text-slate-900">Official Email</p>
                      <p className="text-slate-600 mt-0.5">support@fingerofgodestate.com</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Resident Inquiry Form (6 Cols) */}
              <div className="lg:col-span-6 p-6 sm:p-10 space-y-5 bg-[#FAF9F6]/50">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-emerald-800">Resident Helpdesk</p>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">
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
                          className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800 outline-none"
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
                          className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800 outline-none"
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
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800 outline-none"
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
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800 outline-none resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 bg-emerald-900 hover:bg-emerald-800 text-white font-semibold text-xs sm:text-sm rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
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
