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
  Layers,
  Compass,
  Building,
  KeyRound
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

// Curated high-resolution photography assets using authentic estate road photograph & verified residential imagery
const PHOTO_ASSETS = {
  // Supplied real estate road photograph (PNG original + WebP optimized for fast loading)
  estateRoadPng: '/assets/aistudio/Patterned_Paver_Driveway_with_Landscaped_Curb_6b5e79c2.png',
  estateRoadWebp: '/assets/aistudio/Patterned_Paver_Driveway_with_Landscaped_Curb_6b5e79c2.webp',
  welcomeVilla: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
  roadPavingMain: '/assets/aistudio/Patterned_Paver_Driveway_with_Landscaped_Curb_6b5e79c2.webp',
  roadDrainageDetail: 'https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8?auto=format&fit=crop&w=800&q=80',
  gallery: [
    {
      url: '/assets/aistudio/Patterned_Paver_Driveway_with_Landscaped_Curb_6b5e79c2.webp',
      title: 'Interlocking Road & Drainage Corridor',
      category: 'Estate Infrastructure',
      caption: 'Patterned interlocking road pavers, drainage channels, black-and-white kerbs, and manicured green hedges.'
    },
    {
      url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
      title: 'Modern Residential Architecture',
      category: 'Private Residence',
      caption: 'Contemporary architectural design and landscaped boundaries within our residential precinct.'
    },
    {
      url: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1000&q=80',
      title: 'Neighbourhood Streetscape',
      category: 'Street View',
      caption: 'Paved access corridors and demarcated residential plots along the Iyiaba community axis.'
    },
    {
      url: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1000&q=80',
      title: 'Family & Neighbourhood Living',
      category: 'Community Life',
      caption: 'A serene and secure environment where families, children, and neighbours thrive with peace of mind.'
    },
    {
      url: 'https://images.unsplash.com/photo-1592595896551-12b371d546d5?auto=format&fit=crop&w=1000&q=80',
      title: 'Greenery & Walkways',
      category: 'Environment',
      caption: 'Tree-lined verges and well-maintained residential surroundings contributing to clean estate living.'
    },
    {
      url: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=1000&q=80',
      title: 'Resident Assembly & Governance',
      category: 'Civic Engagement',
      caption: 'Regular community deliberations where residents exercise democratic oversight and collective planning.'
    }
  ]
};

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

  // Quick Security Pay Modal State (activation check preserved)
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

  // Verification for Quick Security Payment (CRITICAL: activates gate check)
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
      } else if (!resident.account_activated || resident.account_status === 'NOT ACTIVATED') {
        setQuickPayError(`Resident #${cleanInput} (${resident.full_name}) has not been activated yet. Only activated residents can make security levy payments. Please activate your account first.`);
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
  const estateLevyFormatted = `₦${monthlyEstateLevy.toLocaleString()}`;

  const roadTarget = roadSummary?.target_budget || 35000000;
  const roadCollected = roadSummary?.total_collected || 0;
  const roadProgressPercent = Math.min(100, Math.round((roadCollected / roadTarget) * 100));

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-slate-900 font-sans flex flex-col selection:bg-emerald-950 selection:text-white antialiased">
      <SEOHead
        title="Finger of God Estate — Asaba, Delta State | Official Residential Portal"
        description="Official residential platform for Finger of God Estate, Iyiaba, Asaba. 24/7 security management, road modernisation, resident accounts, and transparent community administration."
        keywords={['Finger of God Estate', 'Asaba Delta State', 'Iyiaba Estate', 'Estate Security', 'Resident Portal', 'Estate Levies', 'Road Paving Project']}
        canonicalPath="/"
        ogType="website"
      />

      {/* Section A: Header and Navigation (Transparent over Hero -> Solid on Scroll) */}
      <PublicNavbar
        currentTab="home"
        estateSettings={estateSettings}
        currentResident={currentResident}
        onNavigate={onNavigate}
        onOpenResidentLogin={onOpenResidentLogin}
        unreadAnnouncementsCount={announcements.length}
      />

      {/* Urgent Broadcast Notice (When Active) */}
      {urgentNotice && (
        <aside aria-label="Official Estate Notice" className="bg-[#0F382A] text-white border-b border-emerald-900">
          <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-start sm:items-center gap-2.5 min-w-0">
              <ShieldAlert className="w-4 h-4 text-amber-300 shrink-0 mt-0.5 sm:mt-0" />
              <div className="min-w-0 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs sm:text-sm">
                <span className="font-semibold text-amber-300">Official Notice</span>
                <span aria-hidden="true" className="text-emerald-700">·</span>
                <span className="text-emerald-200 font-mono text-xs tabular-nums">{urgentNotice.publish_at?.split('T')[0] || 'Active'}</span>
                <span aria-hidden="true" className="text-emerald-700">·</span>
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
        </aside>
      )}

      {/* Active Resident Welcome Bar (If Logged In) */}
      {currentResident && (
        <section className="border-b border-slate-200 bg-white">
          <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs sm:text-sm">
              <span className="font-semibold text-[#0F382A]">Signed in as {currentResident.full_name}</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="text-slate-600 font-mono tabular-nums text-xs">Resident #{currentResident.resident_number}</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="text-slate-600 text-xs">{currentResident.house_number}</span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => onNavigate('resident_portal')}
                className="px-4 py-2 bg-[#0F382A] hover:bg-[#134E39] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                Open My Portal
              </button>
              <button
                onClick={() => onNavigate('estate_levy')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                Pay Levies
              </button>
            </div>
          </div>
        </section>
      )}

      <main className="flex-1">
        {/* Section B: Hero Section with Real Supplied Estate Road Photograph */}
        <section className="relative min-h-[85vh] sm:min-h-[88vh] lg:min-h-[92vh] flex items-center bg-[#0F172A] text-white overflow-hidden">
          {/* Full-bleed real photograph background with smooth, slow zoom animation & picture optimization */}
          <div className="absolute inset-0 z-0 overflow-hidden bg-slate-900 select-none pointer-events-none">
            <picture className="w-full h-full block">
              <source type="image/webp" srcSet={PHOTO_ASSETS.estateRoadWebp} />
              <img
                src={PHOTO_ASSETS.estateRoadPng}
                alt="Finger of God Estate interlocking paved road, drainage channels, black-and-white kerbs, and green hedges"
                className="w-full h-full object-cover object-[72%_35%] sm:object-[65%_42%] lg:object-[68%_50%] animate-hero-zoom transition-transform"
                loading="eager"
                fetchPriority="high"
              />
            </picture>

            {/* Directional subtle dark gradient overlays preserving road, kerbs, grates, and hedges visibility */}
            {/* Desktop: gradient on the left side ensures text contrast while leaving right side open and clear */}
            <div
              className="hidden lg:block absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/50 via-55% to-transparent"
              aria-hidden="true"
            />
            {/* Mobile/Tablet: vertical gradient for readability */}
            <div
              className="lg:hidden absolute inset-0 bg-gradient-to-t from-slate-950/92 via-slate-950/70 to-slate-950/40"
              aria-hidden="true"
            />
            {/* Gentle top and bottom darkening for clean edge blending */}
            <div
              className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none"
              aria-hidden="true"
            />
          </div>

          <div className="relative z-10 max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 lg:py-24 w-full">
            <div className="max-w-2xl lg:max-w-3xl">
              {/* 1. Estate Name & 2. Location Subtitle */}
              <div className="inline-flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 text-xs sm:text-sm font-semibold mb-5 tracking-wide text-emerald-300">
                <span className="tracking-widest uppercase text-white font-bold text-xs sm:text-sm">
                  FINGER OF GOD ESTATE
                </span>
                <span aria-hidden="true" className="hidden sm:inline-block text-emerald-400/60">·</span>
                <div className="flex items-center gap-1.5 text-slate-200 font-medium text-xs sm:text-sm">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Iyiaba, Asaba, Delta State, Nigeria</span>
                </div>
              </div>

              {/* 3. Welcoming Headline */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-bold text-white tracking-tight leading-[1.12] mb-6 [text-wrap:balance]">
                A Better Community. A Shared Vision.
              </h1>

              {/* 4. Short Description */}
              <p className="text-base sm:text-lg md:text-xl text-slate-200/95 font-normal leading-relaxed mb-8 max-w-2xl">
                Welcome to Finger of God Estate — an organised, peaceful residential community
                committed to transparent administration, secure family living, and continuous road
                and civil infrastructure development.
              </p>

              {/* 6. Prominent Buttons: Resident Login & Explore the Estate */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 mb-10">
                <button
                  type="button"
                  onClick={() => (currentResident ? onNavigate('resident_portal') : onOpenResidentLogin('login'))}
                  className="px-6 py-3.5 bg-[#0F382A] hover:bg-[#134E39] text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap active:scale-[0.99]"
                >
                  <UserCheck className="w-4 h-4 text-emerald-300" />
                  <span>{currentResident ? 'Open Resident Portal' : 'Resident Login'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => scrollToSection('welcome')}
                  className="px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white border border-white/30 hover:border-white/50 text-sm font-semibold rounded-lg backdrop-blur-sm transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap active:scale-[0.99]"
                >
                  <Compass className="w-4 h-4 text-emerald-300" />
                  <span>Explore the Estate</span>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </button>
              </div>

              {/* Real Road & Estate Highlights Strip */}
              <div className="pt-6 border-t border-white/20 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 text-left">
                <div>
                  <div className="text-lg sm:text-xl font-bold text-white font-mono tabular-nums">2021</div>
                  <div className="text-xs text-slate-300 mt-0.5">Established Year</div>
                </div>
                <div>
                  <div className="text-lg sm:text-xl font-bold text-white font-mono tabular-nums">Paved Roads</div>
                  <div className="text-xs text-slate-300 mt-0.5">Interlocking Pavers &amp; Drains</div>
                </div>
                <div>
                  <div className="text-lg sm:text-xl font-bold text-white font-mono tabular-nums">Plots 001–100</div>
                  <div className="text-xs text-slate-300 mt-0.5">Demarcated Registry</div>
                </div>
                <div>
                  <div className="text-lg sm:text-xl font-bold text-white font-mono tabular-nums">24 / 7</div>
                  <div className="text-xs text-slate-300 mt-0.5">Gated Security Patrol</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section C: Welcome to Our Estate (Editorial Photographic Split) */}
        <section id="welcome" className="py-16 sm:py-24 bg-white border-b border-slate-200">
          <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
              {/* Left Column: Authentic Photographic Presentation */}
              <div className="lg:col-span-6 order-2 lg:order-1">
                <div className="relative rounded-2xl overflow-hidden shadow-md border border-slate-200 bg-slate-100">
                  <img
                    src={PHOTO_ASSETS.welcomeVilla}
                    alt="Well-maintained residential villa with landscaped lawn and paved perimeter"
                    className="w-full h-[360px] sm:h-[440px] object-cover object-center"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                  {/* Subtle contextual caption banner */}
                  <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                    <span className="font-medium text-slate-800">Residential Environment &amp; Greenery</span>
                    <span>1 Ogbueshi Ugboko St Corridor</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Editorial Copy */}
              <div className="lg:col-span-6 order-1 lg:order-2">
                <div className="text-xs font-semibold text-[#0F382A] tracking-wider uppercase mb-2">
                  Welcome to Finger of God Estate
                </div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight leading-snug mb-5 [text-wrap:balance]">
                  A Community We Are Proud to Call Home.
                </h2>
                <div className="space-y-4 text-slate-600 leading-relaxed text-sm sm:text-base">
                  <p>
                    Finger of God Estate is an organised residential neighbourhood situated in Iyiaba, Asaba,
                    Delta State. Founded in 2021, our community is built upon mutual trust, structured administration,
                    and a shared commitment to building a clean, tranquil, and dependable living environment for
                    every resident and family.
                  </p>
                  <p>
                    Guided by an elected Executive Committee and supported by the collective participation of
                    plot owners and residents, our community prioritises constant security vigil, infrastructure
                    modernisation, and transparent administration of all community funds.
                  </p>
                  <p>
                    Whether you are developing your demarcated plot, settling in with your family, or visiting our
                    peaceful streets, Finger of God Estate remains dedicated to peaceful coexistence and progressive
                    neighbourhood stewardship.
                  </p>
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={() => onNavigate('security_public')}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-[#0F382A] hover:text-[#134E39] transition-colors cursor-pointer"
                  >
                    <span>Read security &amp; gate guidelines</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <button
                    type="button"
                    onClick={() => onNavigate('documents')}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    <span>View community bylaws &amp; constitution</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section D: Our Community at a Glance */}
        <section className="py-16 sm:py-20 bg-[#FBF9F5] border-b border-slate-200">
          <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mb-12">
              <div className="text-xs font-semibold text-[#0F382A] tracking-wider uppercase mb-2">
                Estate Fundamentals
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-3">
                Our Community at a Glance
              </h2>
              <p className="text-slate-600 text-sm sm:text-base">
                Factual benchmarks that define the governance, layout, and collective contributions of Finger of God Estate.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Card 1 */}
              <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-[#0F382A] flex items-center justify-center mb-4">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-1">Established 2021</h3>
                  <div className="text-xs text-slate-500 mb-3">Iyiaba · Asaba, Delta State</div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Formed through grassroots neighbourly consensus to foster disciplined estate growth,
                    organised access corridors, and continuous development in the Asaba capital territory.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Location</span>
                  <span className="font-medium text-slate-800">Off Jesus Saves Road</span>
                </div>
              </div>

              {/* Card 2 */}
              <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-[#0F382A] flex items-center justify-center mb-4">
                    <Layers className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-1">100 Demarcated Plots</h3>
                  <div className="text-xs text-slate-500 mb-3">Plots 001 to 100 Registry</div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    A well-surveyed residential layout where every plot ID is catalogued in our digital registry
                    for transparent dues reconciliation, owner profiles, and voter eligibility.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Registry Status</span>
                  <span className="font-medium text-slate-800">Verified Cadastral System</span>
                </div>
              </div>

              {/* Card 3 */}
              <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-[#0F382A] flex items-center justify-center mb-4">
                    <Users className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-1">Elected Executive Council</h3>
                  <div className="text-xs text-slate-500 mb-3">Democratic Governance</div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Managed by resident-elected officers operating under official constitution guidelines,
                    convening regular general meetings and quarterly financial reports.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Leadership</span>
                  <span className="font-medium text-slate-800">Chairman &amp; Executive</span>
                </div>
              </div>

              {/* Card 4 */}
              <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-[#0F382A] flex items-center justify-center mb-4">
                    <Shield className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-1">Monthly Security Levy</h3>
                  <div className="text-xs text-slate-500 mb-3 font-mono tabular-nums">{levyAmountFormatted} per Month</div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Funded directly by active households to support round-the-clock trained security guards,
                    gatehouse communication equipment, and nocturnal estate patrols.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Payment Gateway</span>
                  <span className="font-medium text-slate-800">Paystack Verified</span>
                </div>
              </div>

              {/* Card 5 */}
              <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-[#0F382A] flex items-center justify-center mb-4">
                    <Building className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-1">Estate Building Levy</h3>
                  <div className="text-xs text-slate-500 mb-3 font-mono tabular-nums">{estateLevyFormatted} per Month</div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Statutory contribution dedicated towards common area upkeep, drain desilting, perimeter
                    clearing, street illumination, and environmental sanitation.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Audit Frequency</span>
                  <span className="font-medium text-slate-800">Monthly Reconciliation</span>
                </div>
              </div>

              {/* Card 6 */}
              <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-[#0F382A] flex items-center justify-center mb-4">
                    <Landmark className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-1">Road Modernisation Project</h3>
                  <div className="text-xs text-slate-500 mb-3 font-mono tabular-nums">₦35,000,000 Phase 1 Budget</div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Strategic capital improvement initiative to construct heavy-duty 80mm interlocking stone
                    surfacing with dual reinforced concrete stormwater drainage channels.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Public Ledger</span>
                  <button
                    onClick={() => onNavigate('road_project')}
                    className="font-semibold text-[#0F382A] hover:underline cursor-pointer"
                  >
                    View Ledger &rarr;
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section E: Community Development (Road Modernisation & Drainage) */}
        <section className="py-16 sm:py-24 bg-white border-b border-slate-200">
          <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
              {/* Left Side: Editorial & Real Accounting Information */}
              <div className="lg:col-span-6">
                <div className="text-xs font-semibold text-[#0F382A] tracking-wider uppercase mb-2">
                  Infrastructure Stewardship
                </div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight leading-snug mb-5 [text-wrap:balance]">
                  Community Development &amp; Road Modernisation
                </h2>
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-6">
                  Well-paved streets, structured stormwater drainage, and reliable environmental maintenance are
                  the backbone of our residential quality of life. The Phase 1 Road Modernisation Project is an
                  audited capital initiative funded through the collaborative voluntary contributions of plot
                  owners and residents.
                </p>

                {/* Road Project Engineering Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                  <div className="p-4 rounded-xl bg-[#FBF9F5] border border-slate-200">
                    <div className="font-semibold text-xs text-slate-900 mb-1">80mm Interlocking Pavement</div>
                    <div className="text-xs text-slate-600">Heavy-load stone paving designed to withstand tropical rainy seasons.</div>
                  </div>
                  <div className="p-4 rounded-xl bg-[#FBF9F5] border border-slate-200">
                    <div className="font-semibold text-xs text-slate-900 mb-1">Dual Reinforced Concrete Drains</div>
                    <div className="text-xs text-slate-600">Engineered stormwater runoff channels to prevent erosion and flooding.</div>
                  </div>
                </div>

                {/* Live Database Ledger Card */}
                <div className="p-5 rounded-xl bg-slate-900 text-white mb-6">
                  <div className="flex items-center justify-between text-xs text-slate-300 mb-3">
                    <span className="font-medium">Phase 1 Capital Target</span>
                    <span className="font-mono tabular-nums text-emerald-400 font-semibold">{roadProgressPercent}% Funded</span>
                  </div>

                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden mb-4">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${roadProgressPercent}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <div className="text-slate-400 text-[11px]">Total Contributions Logged</div>
                      <div className="text-sm sm:text-base font-bold text-white font-mono tabular-nums">
                        ₦{roadCollected.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-[11px]">Target Engineering Budget</div>
                      <div className="text-sm sm:text-base font-bold text-slate-200 font-mono tabular-nums">
                        ₦{roadTarget.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onNavigate('road_project')}
                    className="px-5 py-2.5 bg-[#0F382A] hover:bg-[#134E39] text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <span>Inspect Road Project Ledger</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('road_project')}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    <span>Support the Project</span>
                  </button>
                </div>
              </div>

              {/* Right Side: High-Resolution Real Civil Paving Photographs */}
              <div className="lg:col-span-6 space-y-4">
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
                  <picture className="w-full h-[280px] sm:h-[320px] block">
                    <source type="image/webp" srcSet={PHOTO_ASSETS.estateRoadWebp} />
                    <img
                      src={PHOTO_ASSETS.estateRoadPng}
                      alt="Finger of God Estate interlocking paved road with clean curbing and curbside drainage"
                      className="w-full h-[280px] sm:h-[320px] object-cover object-center"
                      loading="lazy"
                    />
                  </picture>
                  <div className="p-3.5 bg-white border-t border-slate-100 text-xs text-slate-600 flex items-center justify-between">
                    <span className="font-medium text-slate-800">Interlocking Paved Avenue Standard</span>
                    <span>Durable All-Weather Surface</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-xs bg-slate-100">
                    <img
                      src={PHOTO_ASSETS.roadDrainageDetail}
                      alt="Stone pavement interlocking installation and base stabilization"
                      className="w-full h-[150px] object-cover object-center"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                    <div className="p-2.5 bg-white border-t border-slate-100 text-[11px] text-slate-600">
                      Precision Edge Compaction
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#FBF9F5] border border-slate-200 flex flex-col justify-between">
                    <div className="text-xs text-slate-700 leading-relaxed">
                      "Collective contributions ensure our streets remain navigable, protect our vehicles, and appreciate our property values."
                    </div>
                    <div className="text-[11px] font-medium text-slate-500 pt-3 border-t border-slate-200/60 mt-3">
                      Works &amp; Infrastructure Committee
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section F: Transparency, Accountability & Instant Levy Settlement */}
        <section className="py-16 sm:py-24 bg-[#FBF9F5] border-b border-slate-200">
          <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mb-12">
              <div className="text-xs font-semibold text-[#0F382A] tracking-wider uppercase mb-2">
                Public Accountability
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-3">
                Transparency in Every Contribution
              </h2>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                Finger of God Estate operates under a zero-opacity financial policy. Every levy settled,
                donation made, and receipt issued is cryptographically stamped and reconciled directly with
                our community ledger.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Direct Links to Financial Portals */}
              <div className="lg:col-span-7 space-y-4">
                {/* Transparency Feature 1 */}
                <div
                  onClick={() => onNavigate('estate_levy')}
                  className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer flex items-start justify-between gap-4 group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 text-[#0F382A] flex items-center justify-center shrink-0 mt-0.5">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-900 group-hover:text-[#0F382A] transition-colors mb-1">
                        Public Estate Contribution Records
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-2">
                        Inspect active monthly security dues ({levyAmountFormatted}/month) and building levies
                        ({estateLevyFormatted}/month). Residents can settle 1-month or 12-month advance dues online.
                      </p>
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                        <span>Instant Paystack Gateway</span>
                        <span aria-hidden="true">·</span>
                        <span>Automated Bank Settlement</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-700 transition-colors shrink-0 mt-1" />
                </div>

                {/* Transparency Feature 2 */}
                <div
                  onClick={() => onNavigate('road_project')}
                  className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer flex items-start justify-between gap-4 group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 text-[#0F382A] flex items-center justify-center shrink-0 mt-0.5">
                      <Landmark className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-900 group-hover:text-[#0F382A] transition-colors mb-1">
                        Road Modernisation Contribution Ledger
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-2">
                        Inspect all recorded donations and special infrastructure assessments towards the ₦35M
                        civil construction project, published without altered balances.
                      </p>
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                        <span>Real-Time Collection Ledger</span>
                        <span aria-hidden="true">·</span>
                        <span>Audited by Financial Secretary</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-700 transition-colors shrink-0 mt-1" />
                </div>

                {/* Transparency Feature 3 */}
                <div
                  onClick={() => onNavigate('verify_receipt')}
                  className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer flex items-start justify-between gap-4 group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 text-[#0F382A] flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-900 group-hover:text-[#0F382A] transition-colors mb-1">
                        Cryptographic Receipt Verification Desk
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-2">
                        Verify the authenticity of any printed or PDF payment receipt issued by the estate
                        administration using the unique transaction reference.
                      </p>
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                        <span>Public Anti-Fraud Check</span>
                        <span aria-hidden="true">·</span>
                        <span>Zero Impersonation</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-700 transition-colors shrink-0 mt-1" />
                </div>
              </div>

              {/* Right Column: Instant Security Levy Checkout Desk (Direct Integration) */}
              <div className="lg:col-span-5">
                <div className="p-6 sm:p-7 bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#0F382A] uppercase tracking-wider mb-2">
                    <Shield className="w-4 h-4" />
                    <span>Quick Settlement Desk</span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight mb-2">
                    Instant Security Levy Checkout
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-5">
                    Activated residents can settle their monthly security levy ({levyAmountFormatted}) directly
                    without signing in. All payments are permanently recorded in the database.
                  </p>

                  <form onSubmit={handleVerifyForQuickPay} className="space-y-4">
                    <div>
                      <label htmlFor="quickPayPlot" className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Resident Number ID (e.g. 001, 024) *
                      </label>
                      <div className="relative">
                        <input
                          id="quickPayPlot"
                          type="text"
                          value={quickPayResidentNumber}
                          onChange={(e) => {
                            setQuickPayResidentNumber(e.target.value);
                            setQuickPayError('');
                          }}
                          placeholder="e.g. 012"
                          maxLength={4}
                          className="w-full min-h-[46px] px-3.5 py-2.5 text-sm font-mono bg-[#FBF9F5] rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800 outline-none transition-all"
                        />
                        <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Requirement: Resident profile must be activated by administration.
                      </div>
                    </div>

                    {quickPayError && (
                      <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        <div className="leading-snug">{quickPayError}</div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={quickPayVerifying}
                      className="w-full min-h-[46px] py-3 px-4 bg-[#0F382A] hover:bg-[#134E39] disabled:bg-slate-300 text-white font-semibold text-xs sm:text-sm rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                    >
                      {quickPayVerifying ? (
                        <span>Checking Registry Status...</span>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4 text-emerald-300" />
                          <span>Verify &amp; Proceed to Payment</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>Not activated yet?</span>
                    <button
                      type="button"
                      onClick={() => onOpenResidentLogin('activate')}
                      className="font-semibold text-[#0F382A] hover:underline cursor-pointer"
                    >
                      Activate Plot ID &rarr;
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section G: Community Life Photographic Gallery */}
        <section className="py-16 sm:py-24 bg-white border-b border-slate-200">
          <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
              <div className="max-w-2xl">
                <div className="text-xs font-semibold text-[#0F382A] tracking-wider uppercase mb-2">
                  Neighbourhood Perspectives
                </div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight mb-3">
                  Community Life Gallery
                </h2>
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                  Real photographic impressions showcasing our residential architecture, landscaped streets,
                  peaceful living environment, and civic gatherings.
                </p>
              </div>
              <div className="text-xs text-slate-500">
                <span>Authentic estate infrastructure &amp; residential views</span>
              </div>
            </div>

            {/* Asymmetrical Editorial Photo Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {PHOTO_ASSETS.gallery.map((item, idx) => {
                const isFeatured = idx === 0 || idx === 3;
                return (
                  <div
                    key={idx}
                    className={`group relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-xs hover:shadow-md transition-all duration-300 ${
                      isFeatured ? 'sm:row-span-1' : ''
                    }`}
                  >
                    <div className="aspect-[4/3] sm:aspect-[16/10] overflow-hidden bg-slate-200 relative">
                      <img
                        src={item.url}
                        alt={item.title}
                        className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-500 ease-out"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                      {/* Quiet Scrim & Details */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                      <div className="absolute bottom-0 inset-x-0 p-5 text-white">
                        <div className="text-[11px] font-medium text-emerald-300 uppercase tracking-wider mb-1">
                          {item.category}
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-white mb-1.5 leading-snug">
                          {item.title}
                        </h3>
                        <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed">
                          {item.caption}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Section H: Latest Community Updates (Database Backed) */}
        <section className="py-16 sm:py-20 bg-[#FBF9F5] border-b border-slate-200">
          <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
              <div>
                <div className="text-xs font-semibold text-[#0F382A] tracking-wider uppercase mb-2">
                  Official Secretariat Bulletins
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-2">
                  Latest Community Updates
                </h2>
                <p className="text-slate-600 text-sm">
                  Official resolutions, meeting minutes, and advisories issued by the Executive Committee.
                </p>
              </div>

              <button
                type="button"
                onClick={() => onNavigate('public_announcements')}
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#0F382A] hover:text-[#134E39] transition-colors cursor-pointer self-start sm:self-auto"
              >
                <span>View all announcements</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {loadingAnnouncements ? (
              <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-sm text-slate-500">
                Loading official community circulars...
              </div>
            ) : announcements.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
                <Bell className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <div className="text-sm font-semibold text-slate-800">No active circulars at this time</div>
                <p className="text-xs text-slate-500 mt-1">
                  The secretariat publishes all general meeting resolutions and maintenance alerts here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {announcements.slice(0, 3).map((item) => (
                  <article
                    key={item.id}
                    onClick={() => onNavigateToAnnouncementDetail(item.slug)}
                    className="p-6 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between group"
                  >
                    <div>
                      {/* Quiet Unboxed Metadata (Zero-pill discipline) */}
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                        <span className="font-semibold text-emerald-800">{item.priority || 'Notice'}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{item.publish_at?.split('T')[0] || 'Official'}</span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 group-hover:text-[#0F382A] transition-colors mb-2 line-clamp-2 leading-snug">
                        {item.title}
                      </h3>

                      <p className="text-xs sm:text-sm text-slate-600 line-clamp-3 leading-relaxed mb-4">
                        {(item.body || item.content || '').slice(0, 140)}...
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-[#0F382A]">
                      <span>Read full circular</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Section I: Resident Portal Call to Action */}
        <section className="py-16 sm:py-24 bg-[#0F382A] text-white">
          <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <div className="text-xs font-semibold text-emerald-300 uppercase tracking-widest mb-3">
                Resident Self-Service
              </div>

              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-6 [text-wrap:balance]">
                Your Community. Your Voice. Your Estate.
              </h2>

              <p className="text-base sm:text-lg text-emerald-100/90 font-normal leading-relaxed mb-8 max-w-2xl mx-auto">
                Stay informed, access relevant estate information, and take part in the development of
                our community through the official resident portal.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => (currentResident ? onNavigate('resident_portal') : onOpenResidentLogin('login'))}
                  className="w-full sm:w-auto px-7 py-3.5 bg-white hover:bg-emerald-50 text-[#0F382A] font-bold text-sm rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <UserCheck className="w-4 h-4 text-[#0F382A]" />
                  <span>Access Resident Portal</span>
                  <ArrowRight className="w-4 h-4 text-[#0F382A]" />
                </button>

                <button
                  type="button"
                  onClick={() => onOpenResidentLogin('activate')}
                  className="w-full sm:w-auto px-7 py-3.5 bg-emerald-900/60 hover:bg-emerald-900 text-white border border-emerald-700/60 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4 text-emerald-300" />
                  <span>Activate Plot ID</span>
                </button>
              </div>

              <div className="mt-10 pt-6 border-t border-emerald-800/60 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-emerald-200/80">
                <span>Verified plot account required</span>
                <span aria-hidden="true">·</span>
                <span>Role-based access control</span>
                <span aria-hidden="true">·</span>
                <span>Direct ledger synchronization</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section J: Estate Secretariat, Security Gate & Contact Form */}
        <section className="py-16 sm:py-24 bg-white border-b border-slate-200">
          <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
              {/* Contact Info */}
              <div className="lg:col-span-5">
                <div className="text-xs font-semibold text-[#0F382A] tracking-wider uppercase mb-2">
                  Secretariat &amp; Security Liaison
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-4">
                  Connect with the Estate Administration
                </h2>
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-8">
                  For plot verification inquiries, physical gate clearance, development permits, or administrative
                  matters, reach out directly to the Secretariat.
                </p>

                <div className="space-y-5 text-sm">
                  <div className="flex items-start gap-3.5">
                    <MapPin className="w-5 h-5 text-[#0F382A] shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-slate-900">Physical Address</div>
                      <div className="text-slate-600 mt-0.5">
                        1 Ogbueshi Ugboko Street, off Jesus Saves Road, Iyiaba, Asaba, Delta State, Nigeria.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <Phone className="w-5 h-5 text-[#0F382A] shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-slate-900">Telephone / WhatsApp</div>
                      <div className="text-slate-600 mt-0.5 font-mono tabular-nums">
                        07057543935
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <Mail className="w-5 h-5 text-[#0F382A] shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-slate-900">Official Correspondence</div>
                      <div className="text-slate-600 mt-0.5">
                        support@fingerofgodestate.com
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <Clock className="w-5 h-5 text-[#0F382A] shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-slate-900">Secretariat Working Hours</div>
                      <div className="text-slate-600 mt-0.5">
                        Monday – Friday: 9:00 AM – 5:00 PM · Security Gate: 24/7
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Inquiry Form */}
              <div className="lg:col-span-7">
                <div className="p-7 sm:p-8 rounded-2xl bg-[#FBF9F5] border border-slate-200">
                  <h3 className="text-lg font-bold text-slate-900 mb-1">
                    Send a Message to the Secretariat
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 mb-6">
                    Messages are routed directly to the Executive Committee administration desk.
                  </p>

                  {contactSubmitted ? (
                    <div className="p-6 bg-emerald-50 rounded-xl border border-emerald-200 text-center space-y-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-700 mx-auto" />
                      <div className="text-sm font-bold text-emerald-900">Inquiry Logged Successfully</div>
                      <p className="text-xs text-emerald-800">
                        Thank you. The estate secretariat has recorded your inquiry and will respond to you promptly.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleContactSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                          rows={4}
                          placeholder="State your plot number and how the secretariat can assist..."
                          required
                          className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800 outline-none resize-none"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full min-h-[46px] py-3 px-4 bg-[#0F382A] hover:bg-[#134E39] text-white font-semibold text-xs sm:text-sm rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Message to Secretariat</span>
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Section J (Part 2): Universal Footer */}
      <PublicFooter
        estateSettings={estateSettings}
        onNavigate={onNavigate}
        onOpenResidentLogin={() => onOpenResidentLogin('login')}
      />

      {/* Paystack Payment Modal for Quick Pay (Records payment into database) */}
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
