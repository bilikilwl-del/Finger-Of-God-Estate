import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  CreditCard,
  UserCheck,
  ChevronRight,
  Sparkles,
  Zap,
  Coins,
  Bell,
  Phone,
  Mail,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
  Users,
  FileText,
  Lock,
  Layers,
  Search,
  ArrowRight,
  ShieldAlert,
  AlertCircle
} from 'lucide-react';
import {
  EstateSettings,
  Announcement,
  Resident,
  RoadProjectSummary,
  RoadProjectTransaction,
  NavigationTab,
  MonthlyPayment
} from '../../types/database';
import { dbService } from '../../lib/supabase';
import { EstateLogo } from '../common/EstateLogo';
import { PublicNavbar } from '../layout/PublicNavbar';
import { PublicFooter } from '../layout/PublicFooter';
import { PaystackPaymentModal } from '../payments/PaystackPaymentModal';

interface PublicHomeViewProps {
  estateSettings: EstateSettings;
  currentResident?: Resident | null;
  adminUser?: any;
  onNavigate: (tab: NavigationTab) => void;
  onNavigateToAnnouncementDetail: (slug: string) => void;
  onOpenResidentLogin: (initialTab?: 'login' | 'activate') => void;
  onOpenAdminLogin: () => void;
}

export const PublicHomeView: React.FC<PublicHomeViewProps> = ({
  estateSettings,
  currentResident,
  adminUser,
  onNavigate,
  onNavigateToAnnouncementDetail,
  onOpenResidentLogin,
  onOpenAdminLogin
}) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [roadSummary, setRoadSummary] = useState<RoadProjectSummary | null>(null);
  const [residentPayments, setResidentPayments] = useState<MonthlyPayment[]>([]);

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
      const cleanInput = quickPayResidentNumber.trim();
      const resident = allResidents.find(
        r => r.resident_number === cleanInput || 
             r.resident_number.padStart(3, '0') === cleanInput.padStart(3, '0')
      );

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

  const levyAmountFormatted = `₦${(estateSettings.monthly_security_levy || 5000).toLocaleString()}`;

  // Key Estate Service Cards (Clean, informative, 6 core cards)
  const estateServices = [
    {
      id: 'security',
      title: 'Security Department',
      tagline: '24/7 Gate & Patrols',
      description: 'Access gate security protocols, emergency hotline dispatch, security officers, and visitor clearance.',
      icon: Shield,
      tab: 'security_public' as NavigationTab,
      badge: '24/7 Active',
      badgeColor: 'bg-emerald-100 text-emerald-800'
    },
    {
      id: 'levy',
      title: 'Security Levy & Dues',
      tagline: 'Monthly Estate Levy',
      description: `Pay your monthly ${levyAmountFormatted} security levy securely online via Paystack and download instant verified receipts.`,
      icon: CreditCard,
      tab: 'estate_levy' as NavigationTab,
      badge: `${levyAmountFormatted}/mo`,
      badgeColor: 'bg-emerald-100 text-emerald-800'
    },
    {
      id: 'residents',
      title: 'Resident Portal',
      tagline: 'Accounts & Household',
      description: 'Manage your building account, check payment status, register vehicles, and generate visitor gate passes.',
      icon: Users,
      tab: 'public_residents' as NavigationTab,
      badge: 'Resident Hub',
      badgeColor: 'bg-blue-100 text-blue-800'
    },
    {
      id: 'road',
      title: 'Road Project',
      tagline: 'Interlocking & Drainage',
      description: 'Transparent financial ledger, ongoing interlocking construction progress, contributions, and balance.',
      icon: Coins,
      tab: 'road_project' as NavigationTab,
      badge: 'Live Ledger',
      badgeColor: 'bg-amber-100 text-amber-800'
    },
    {
      id: 'light',
      title: 'Light & Electrification',
      tagline: 'Power & Streetlights',
      description: 'Dedicated 500kVA transformer maintenance, feeder lines, solar streetlights, and power development fund.',
      icon: Zap,
      tab: 'light_project' as NavigationTab,
      badge: 'Infrastructure',
      badgeColor: 'bg-amber-100 text-amber-800'
    },
    {
      id: 'announcements',
      title: 'Announcements',
      tagline: 'Official Estate Notices',
      description: 'Stay informed with executive committee broadcasts, meeting notices, maintenance alerts, and resolutions.',
      icon: Bell,
      tab: 'public_announcements' as NavigationTab,
      badge: announcements.length > 0 ? `${announcements.length} Notices` : 'Updates',
      badgeColor: 'bg-purple-100 text-purple-800'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* 1. Header Navigation Bar */}
      <PublicNavbar
        currentTab="home"
        estateSettings={estateSettings}
        currentResident={currentResident}
        onNavigate={onNavigate}
        onOpenResidentLogin={onOpenResidentLogin}
        onOpenAdminLogin={onOpenAdminLogin}
        unreadAnnouncementsCount={announcements.length}
      />

      <main className="flex-1 space-y-12 sm:space-y-16 pb-16">
        
        {/* 2. Urgent Broadcast Banner (If active) */}
        {urgentNotice && (
          <div className="bg-rose-900 text-white border-b border-rose-800 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="p-1.5 bg-rose-800 rounded-lg shrink-0 animate-pulse">
                  <ShieldAlert className="w-4 h-4 text-rose-200" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-rose-700 text-white text-[10px] font-bold rounded uppercase tracking-wider">
                      Important Estate Notice
                    </span>
                    <span className="text-xs text-rose-200">{urgentNotice.publish_at?.split('T')[0] || 'Today'}</span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-white mt-0.5 truncate">{urgentNotice.title}</p>
                </div>
              </div>
              <button
                onClick={() => onNavigateToAnnouncementDetail(urgentNotice.slug)}
                className="self-start sm:self-auto px-3.5 py-1.5 bg-white text-rose-900 hover:bg-rose-100 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <span>Read Full Notice</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* 3. Logged-in Resident Personalized Welcome Bar */}
        {currentResident && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
            <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-emerald-950 text-white p-5 sm:p-6 rounded-3xl border border-emerald-700/50 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                      Resident Signed In
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">
                    Welcome back, {currentResident.full_name}
                  </h2>
                  <p className="text-xs text-emerald-200 font-mono">
                    Resident ID: #{currentResident.resident_number} • Building: {currentResident.house_number}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={() => onNavigate('resident_portal')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>My Account</span>
                  </button>
                  <button
                    onClick={() => onNavigate('estate_levy')}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer border border-white/15"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Pay Security Levy</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 4. MAIN HERO SECTION */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white p-6 sm:p-10 lg:p-14 border border-slate-800 shadow-xl">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>

            <div className="relative z-10 max-w-3xl space-y-6">
              {/* Location & Status Badge */}
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Official Estate Portal
                </span>
                <span className="text-xs text-slate-300 font-medium">
                  Phase 1, Iyiaba, Asaba, Delta State
                </span>
              </div>

              {/* Title & Introduction */}
              <div className="space-y-3">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight font-display leading-tight">
                  FINGER OF GOD ESTATE
                </h1>
                <p className="text-base sm:text-lg text-emerald-100 font-medium leading-relaxed">
                  A serene, secure, and modern residential community built on transparent management, dependable security, and infrastructure excellence.
                </p>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
                  Welcome to the official platform for Finger of God Estate. Securely pay monthly security levies, activate your resident account, monitor transparent infrastructure projects, and access 24/7 security dispatch.
                </p>
              </div>

              {/* Essential Primary Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {currentResident ? (
                  <button
                    onClick={() => onNavigate('resident_portal')}
                    className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm transition-all shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>My Dashboard</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => onOpenResidentLogin('login')}
                      className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm transition-all shadow-md flex items-center gap-2 cursor-pointer"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Resident Login</span>
                    </button>
                    <button
                      onClick={() => onOpenResidentLogin('activate')}
                      className="px-5 py-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-emerald-300" />
                      <span>Activate Account</span>
                    </button>
                  </>
                )}

                <button
                  onClick={() => onNavigate('estate_levy')}
                  className="px-5 py-3 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs sm:text-sm transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <CreditCard className="w-4 h-4 text-emerald-700" />
                  <span>Security Payment</span>
                </button>

                <button
                  onClick={onOpenAdminLogin}
                  className="px-4 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs sm:text-sm transition-colors flex items-center gap-2 cursor-pointer border border-slate-700"
                >
                  <Lock className="w-4 h-4 text-slate-400" />
                  <span>Admin Login</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 5. QUICK SECURITY PAYMENT WIDGET & RESIDENT LOOKUP */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
              <div className="lg:col-span-1 space-y-2">
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-wider">
                  <CreditCard className="w-4 h-4" />
                  <span>Direct Dues Payment</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Pay Security Levy
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Enter your assigned resident number (001 – 300) to pay your monthly security levy or check payment status instantly.
                </p>
                <div className="pt-2">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-900 text-xs font-bold font-mono">
                    Levy: {levyAmountFormatted} / month
                  </span>
                </div>
              </div>

              <div className="lg:col-span-2">
                <form onSubmit={handleVerifyForQuickPay} className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        value={quickPayResidentNumber}
                        onChange={(e) => {
                          setQuickPayResidentNumber(e.target.value);
                          setQuickPayError('');
                        }}
                        placeholder="Enter Resident Number (e.g. 024, 001)"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={quickPayVerifying}
                      className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer shrink-0"
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

                  {quickPayError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-800">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>{quickPayError}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-1">
                    <span>Secured via Paystack • Instant Automated Receipt</span>
                    <button
                      type="button"
                      onClick={() => onNavigate('verify_receipt')}
                      className="text-emerald-700 font-bold hover:underline cursor-pointer"
                    >
                      Verify existing receipt →
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* 6. ESTATE QUICK ACCESS (Clear, focused cards) */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-slate-200 pb-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Estate Services</span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-display">
                Quick Access & Services
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Direct access to all major estate departments and functions
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {estateServices.map((service) => {
              const Icon = service.icon;
              return (
                <div
                  key={service.id}
                  onClick={() => {
                    onNavigate(service.tab);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all p-6 flex flex-col justify-between cursor-pointer group space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="p-3 rounded-xl bg-slate-100 text-slate-800 group-hover:bg-emerald-100 group-hover:text-emerald-800 transition-colors">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${service.badgeColor}`}>
                        {service.badge}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">
                        {service.title}
                      </h3>
                      <p className="text-xs font-semibold text-slate-400 mt-0.5">
                        {service.tagline}
                      </p>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {service.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700 group-hover:text-emerald-800">
                    <span>Open {service.title}</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 7. ESTATE PROJECTS HIGHLIGHT (Road & Light Projects) */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-slate-200 pb-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Infrastructure</span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-display">
                ESTATE PROJECTS
              </h2>
            </div>
            <button
              onClick={() => onNavigate('projects_overview')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer self-start sm:self-auto"
            >
              <span>View All Projects</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Road Project Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-amber-100 text-amber-800 shrink-0">
                      <Coins className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Civil Infrastructure</span>
                      <h3 className="text-lg font-bold text-slate-900">Road Paving & Interlocking</h3>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                    Phase 1
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Comprehensive road grading, dual-sided reinforced drainage channels, and 80mm interlocking stone paving across residential avenues.
                </p>

                {/* Ledger Financial Preview */}
                <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/70 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <p className="text-[10px] text-amber-800 uppercase font-semibold">Total Credit</p>
                    <p className="font-bold text-amber-950 font-mono text-xs sm:text-sm">
                      ₦{roadSummary ? roadSummary.total_collected.toLocaleString() : '22,400,000'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-rose-800 uppercase font-semibold">Total Debit</p>
                    <p className="font-bold text-rose-950 font-mono text-xs sm:text-sm">
                      ₦{roadSummary ? roadSummary.total_spent.toLocaleString() : '14,850,000'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-emerald-800 uppercase font-semibold">Balance</p>
                    <p className="font-bold text-emerald-950 font-mono text-xs sm:text-sm">
                      ₦{roadSummary ? roadSummary.current_balance.toLocaleString() : '7,550,000'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => onNavigate('road_project')}
                  className="w-full py-2.5 bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>View Full Road Project Report</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Light Project Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-emerald-100 text-emerald-800 shrink-0">
                      <Zap className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Power & Reliability</span>
                      <h3 className="text-lg font-bold text-slate-900">Light & Electrification</h3>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                    67% Complete
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Dedicated 500kVA transformer substation overhaul, phase balancing, and deployment of 85 integrated all-in-one solar LED streetlights.
                </p>

                {/* Ledger Financial Preview */}
                <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/70 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <p className="text-[10px] text-emerald-800 uppercase font-semibold">Total Credit</p>
                    <p className="font-bold text-emerald-950 font-mono text-xs sm:text-sm">
                      ₦12,450,000
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-rose-800 uppercase font-semibold">Total Debit</p>
                    <p className="font-bold text-rose-950 font-mono text-xs sm:text-sm">
                      ₦7,600,000
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-emerald-800 uppercase font-semibold">Reserve Fund</p>
                    <p className="font-bold text-emerald-950 font-mono text-xs sm:text-sm">
                      ₦4,850,000
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => onNavigate('light_project')}
                  className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>View Light Project & Ledger</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 8. LATEST OFFICIAL ANNOUNCEMENTS */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-slate-200 pb-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">Official Notices</span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-display">
                Latest Announcements
              </h2>
            </div>
            <button
              onClick={() => onNavigate('public_announcements')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer self-start sm:self-auto"
            >
              <span>View All Announcements</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {loadingAnnouncements ? (
              <div className="col-span-3 py-10 text-center text-xs text-slate-400">
                Loading official announcements...
              </div>
            ) : announcements.length === 0 ? (
              <div className="col-span-3 py-8 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
                No active announcements published at this time.
              </div>
            ) : (
              announcements.slice(0, 3).map((notice) => (
                <div
                  key={notice.id}
                  onClick={() => onNavigateToAnnouncementDetail(notice.slug)}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-purple-300 transition-all p-5 flex flex-col justify-between cursor-pointer group space-y-3"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 uppercase">
                        {notice.category}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {notice.publish_at?.split('T')[0] || 'Recent'}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-800 transition-colors line-clamp-2">
                      {notice.title}
                    </h3>

                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                      {notice.content}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-purple-700">
                    <span>Read Details</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* 9. ESTATE INFORMATION & CONTACT SUPPORT */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
              
              {/* Left Column: Estate Info & Support Hotlines */}
              <div className="p-6 sm:p-8 space-y-6">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Community Information</span>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-display mt-1">
                    About Finger of God Estate
                  </h2>
                  <p className="text-xs text-slate-600 leading-relaxed mt-2">
                    Finger of God Estate is a planned residential neighborhood located in Asaba, Delta State. The estate is organized to provide 24/7 security protection, uninterrupted electrical power infrastructure, quality interlocking roads, and a peaceful environment for all resident families.
                  </p>
                </div>

                <div className="space-y-3.5 text-xs text-slate-700">
                  <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <MapPin className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-slate-900">Estate Location & Secretariat</p>
                      <p className="text-slate-600 text-[11px]">{estateSettings.estate_address}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <Phone className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-slate-900">24/7 Emergency Security Hotline</p>
                      <p className="text-slate-600 text-[11px]">{estateSettings.contact_phone} • Main Gate Guard Post</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <Mail className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-slate-900">Official Secretariat Email</p>
                      <p className="text-slate-600 text-[11px]">{estateSettings.contact_email}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Resident Support / Inquiry Form */}
              <div className="p-6 sm:p-8 space-y-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Resident Helpdesk</span>
                  <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                    Contact Estate Administration
                  </h3>
                  <p className="text-xs text-slate-500">
                    Send a direct inquiry to the executive committee or security desk.
                  </p>
                </div>

                {contactSubmitted ? (
                  <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                    <h4 className="text-sm font-bold text-emerald-950">Inquiry Sent Successfully</h4>
                    <p className="text-xs text-emerald-800">
                      Thank you. The estate secretariat will review and respond promptly.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          placeholder="Your Name"
                          required
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          placeholder="080XXXXXXXX"
                          required
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Email Address (Optional)
                      </label>
                      <input
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="resident@fingerofgodestate.ng"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Message / Request *
                      </label>
                      <textarea
                        value={contactMessage}
                        onChange={(e) => setContactMessage(e.target.value)}
                        rows={3}
                        placeholder="Write your message or inquiry..."
                        required
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Inquiry</span>
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
        onOpenAdminLogin={onOpenAdminLogin}
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
