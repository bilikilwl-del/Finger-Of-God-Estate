import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  CreditCard,
  FileCheck2,
  Bell,
  UserCheck,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Menu,
  X,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
  Lock,
  Search,
  Users,
  Building,
  Building2,
  HelpCircle,
  FileText,
  Clock,
  Sparkles,
  Zap,
  Compass,
  CheckCircle,
  ShieldAlert,
  Car,
  AlertCircle,
  Coins
} from 'lucide-react';
import { EstateSettings, Announcement, Resident, RoadProjectSummary } from '../../types/database';
import { dbService } from '../../lib/supabase';
import { PaystackPaymentModal } from '../payments/PaystackPaymentModal';
import { EstateLogo } from '../common/EstateLogo';

interface PublicHomeViewProps {
  estateSettings: EstateSettings;
  onNavigateToSecurity: () => void;
  onNavigateToRoadProject: () => void;
  onNavigateToAnnouncements: () => void;
  onNavigateToAnnouncementDetail: (slug: string) => void;
  onNavigateToVerifyReceipt: () => void;
  onNavigateToPortal: () => void;
  onOpenResidentLogin: () => void;
  onOpenAdminLogin: () => void;
}

export const PublicHomeView: React.FC<PublicHomeViewProps> = ({
  estateSettings,
  onNavigateToSecurity,
  onNavigateToRoadProject,
  onNavigateToAnnouncements,
  onNavigateToAnnouncementDetail,
  onNavigateToVerifyReceipt,
  onNavigateToPortal,
  onOpenResidentLogin,
  onOpenAdminLogin
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [roadSummary, setRoadSummary] = useState<RoadProjectSummary | null>(null);

  // Quick Pay State
  const [isQuickPayOpen, setIsQuickPayOpen] = useState(false);
  const [quickPayResidentNumber, setQuickPayResidentNumber] = useState('');
  const [quickPayResident, setQuickPayResident] = useState<Resident | null>(null);
  const [quickPayVerifying, setQuickPayVerifying] = useState(false);
  const [quickPayError, setQuickPayError] = useState('');
  const [isPaystackModalOpen, setIsPaystackModalOpen] = useState(false);

  // Contact Form State
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactSubject, setContactSubject] = useState('General Estate Inquiry');
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
      } catch (err) {
        console.warn('Failed to load public data:', err);
      } finally {
        setLoadingAnnouncements(false);
      }
    }
    loadData();
  }, []);

  const urgentNotice = announcements.find(
    a => (a.priority === 'URGENT' || a.priority === 'Emergency') && a.status === 'PUBLISHED'
  );

  const handleVerifyForQuickPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPayResidentNumber.trim()) {
      setQuickPayError('Please enter your Resident Number (e.g. 001)');
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
        setQuickPayError(`Resident Number "${cleanInput}" was not found in the estate directory. Please contact administration.`);
      } else if (resident.status !== 'Active') {
        setQuickPayError(`Resident record (${resident.full_name}) is currently inactive. Please contact the administrative desk.`);
      } else {
        setQuickPayResident(resident);
      }
    } catch {
      setQuickPayError('Unable to connect to registry. Please try again.');
    } finally {
      setQuickPayVerifying(false);
    }
  };

  const handleLaunchPayment = () => {
    setIsPaystackModalOpen(true);
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
    }, 4500);
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const levyAmountFormatted = `₦${(estateSettings.monthly_security_levy || 5000).toLocaleString()}`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* 1. Header / Navigation */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-18">
            {/* Logo & Brand - Takes users back to home */}
            <div 
              className="flex items-center cursor-pointer select-none" 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              title="Finger of God Estate - Home"
            >
              <EstateLogo
                size="sm"
                variant="horizontal"
                theme="light"
                estateName={estateSettings.estate_name || 'Finger of God Estate'}
                subtitle="ESTATE MANAGEMENT • ASABA"
                hideSubtitleOnMobile={true}
              />
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
              <button 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 rounded-lg transition-colors cursor-pointer border border-emerald-200/60"
              >
                Home
              </button>
              <button 
                onClick={onNavigateToSecurity}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                <span>Security</span>
              </button>
              <button 
                onClick={onNavigateToRoadProject}
                className="px-3 py-1.5 text-xs font-semibold text-amber-900 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 border border-amber-200/80 bg-amber-50/50"
              >
                <Coins className="w-3.5 h-3.5 text-amber-700" />
                <span>Road Project</span>
                <span className="px-1 py-0.2 bg-amber-600 text-white font-bold rounded text-[9px] uppercase">
                  Ledger
                </span>
              </button>
              <button 
                onClick={onNavigateToPortal}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Residents
              </button>
              <button 
                onClick={() => scrollToSection('estate-info-section')}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Estate Information
              </button>
              <button 
                onClick={() => scrollToSection('levy-section')}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Payments & Levies
              </button>
              <button 
                onClick={onNavigateToAnnouncements}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>Announcements</span>
                {announcements.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 font-bold rounded-full text-[10px]">
                    {announcements.length}
                  </span>
                )}
              </button>
              <button 
                onClick={() => scrollToSection('contact-section')}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Contact
              </button>
            </nav>

            {/* Desktop Right Action Buttons */}
            <div className="hidden lg:flex items-center gap-2.5">
              <button
                onClick={onOpenResidentLogin}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 cursor-pointer flex items-center gap-1.5"
              >
                <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                <span>Resident Login</span>
              </button>
              <button
                onClick={() => setIsQuickPayOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Pay Security Levy</span>
              </button>
              <button
                onClick={onOpenAdminLogin}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                title="Management / Admin Console"
              >
                <Lock className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Mobile / Tablet Action & Hamburger Button */}
            <div className="flex lg:hidden items-center gap-2">
              <button
                onClick={() => setIsQuickPayOpen(true)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Pay Levy</span>
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
              onClick={() => { setMobileMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-bold text-emerald-800 bg-emerald-50 cursor-pointer"
            >
              Home (Main Estate Page)
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); onNavigateToSecurity(); }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-800 hover:bg-slate-100 cursor-pointer flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>Security Department</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                24/7 Gate & Patrol
              </span>
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); onNavigateToRoadProject(); }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-bold text-amber-900 bg-amber-50 cursor-pointer flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-700" />
                <span>Road Project (Transparent Ledger)</span>
              </span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-600 text-white">
                LIVE
              </span>
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); onNavigateToPortal(); }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-800 hover:bg-slate-100 cursor-pointer"
            >
              Resident Portal & Directory
            </button>
            <button
              onClick={() => scrollToSection('estate-info-section')}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-800 hover:bg-slate-100 cursor-pointer"
            >
              Estate Information & Leadership
            </button>
            <button
              onClick={() => scrollToSection('levy-section')}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-800 hover:bg-slate-100 cursor-pointer"
            >
              Payments & Monthly Levies
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); onNavigateToAnnouncements(); }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-800 hover:bg-slate-100 flex items-center justify-between cursor-pointer"
            >
              <span>Announcements & Notices</span>
              {announcements.length > 0 && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
                  {announcements.length}
                </span>
              )}
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); onNavigateToVerifyReceipt(); }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-800 hover:bg-slate-100 cursor-pointer"
            >
              Verify Digital Receipt
            </button>
            <button
              onClick={() => scrollToSection('contact-section')}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-800 hover:bg-slate-100 cursor-pointer"
            >
              Contact Estate Management
            </button>

            <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
              <button
                onClick={() => { setMobileMenuOpen(false); onOpenResidentLogin(); }}
                className="w-full py-2.5 text-center text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Resident Login
              </button>
              <button
                onClick={() => { setMobileMenuOpen(false); setIsQuickPayOpen(true); }}
                className="w-full py-2.5 text-center text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer"
              >
                Pay Levy
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Urgent Notice Banner if active */}
      {urgentNotice && (
        <div className="bg-rose-50 border-b border-rose-200 py-2.5 px-4 text-rose-950">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="px-2 py-0.5 bg-rose-600 text-white font-bold text-[10px] rounded uppercase tracking-wider shrink-0">
                URGENT NOTICE
              </span>
              <span className="font-semibold text-slate-900 truncate">
                {urgentNotice.title}
              </span>
            </div>
            <button
              onClick={() => onNavigateToAnnouncementDetail(urgentNotice.slug)}
              className="shrink-0 font-bold text-rose-700 hover:text-rose-900 hover:underline flex items-center gap-1 cursor-pointer self-start sm:self-auto"
            >
              <span>Read Notice</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Hero Section - Finger of God Estate Master Landing */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white py-14 sm:py-18 lg:py-24">
        {/* Geometric subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#33415518_1px,transparent_1px),linear-gradient(to_bottom,#33415518_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Column (65% width on desktop) */}
            <div className="lg:col-span-7 flex flex-col justify-center text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold w-fit mb-3.5">
                <Compass className="w-3.5 h-3.5" />
                <span>Premier Residential Community • Asaba, Delta State</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight">
                Finger of God Estate
              </h1>

              <div className="text-emerald-400 text-lg sm:text-xl md:text-2xl font-bold mt-1.5">
                A Serene, Secure & Harmonious Community
              </div>

              <p className="text-xs sm:text-sm md:text-base text-slate-300 leading-relaxed max-w-[620px] mt-4">
                Welcome to Finger of God Estate, a masterplanned residential haven located in Iyiaba, Asaba. Our estate provides residents and families with peaceful living, continuous infrastructure maintenance, automated gate security, transparent dues administration, and dedicated community leadership.
              </p>

              {/* Call to Actions */}
              <div className="mt-7 flex flex-wrap items-center gap-3 sm:gap-4">
                <button
                  onClick={() => scrollToSection('services-section')}
                  className="px-5 sm:px-6 py-2.5 sm:py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>Explore Estate Services</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={onNavigateToSecurity}
                  className="px-5 sm:px-6 py-2.5 sm:py-3 bg-slate-800/90 hover:bg-slate-700 text-slate-100 font-semibold rounded-xl text-xs sm:text-sm border border-slate-700 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>Security Department</span>
                </button>

                <button
                  onClick={onOpenResidentLogin}
                  className="px-4 py-2.5 sm:py-3 text-slate-300 hover:text-white font-semibold text-xs sm:text-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <UserCheck className="w-4 h-4 text-slate-400" />
                  <span>Resident Portal</span>
                </button>
              </div>

              {/* Quick Highlight Chips */}
              <div className="mt-8 pt-6 border-t border-slate-800/90 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <div className="text-emerald-400 font-bold font-mono text-base">2 Phases</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">Masterplanned Layout</div>
                </div>
                <div>
                  <div className="text-emerald-400 font-bold font-mono text-base">24/7 Gate</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">Manned & Monitored</div>
                </div>
                <div>
                  <div className="text-emerald-400 font-bold font-mono text-base">{levyAmountFormatted}</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">Monthly Security Levy</div>
                </div>
                <div>
                  <div className="text-emerald-400 font-bold font-mono text-base">Active RWA</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">Resident Association</div>
                </div>
              </div>
            </div>

            {/* Right Column (35% width on desktop) - Central Community Identity Card */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <div className="p-6 sm:p-7 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-xs flex flex-col items-center text-center max-w-sm w-full">
                <EstateLogo
                  variant="stacked"
                  size="lg"
                  theme="dark"
                  estateName="Finger of God Estate"
                  subtitle="ESTATE MANAGEMENT PLATFORM • ASABA"
                />

                <div className="mt-4 text-xs text-slate-300 leading-relaxed">
                  Finger of God Estate, Iyiaba, Asaba, Delta State.<br />
                  Governed with integrity, safety, and community unity.
                </div>

                <div className="mt-6 w-full space-y-2.5">
                  <button
                    onClick={() => setIsQuickPayOpen(true)}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Pay Security Levy ({levyAmountFormatted})</span>
                  </button>

                  <button
                    onClick={onNavigateToSecurity}
                    className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 border border-slate-700/80 cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    <span>View Security Department & Hotlines</span>
                  </button>
                </div>

                <div className="mt-5 pt-3.5 border-t border-slate-800 w-full flex items-center justify-around text-xs text-slate-400">
                  <div className="text-center">
                    <span className="block font-mono font-bold text-slate-200 text-xs sm:text-sm">Delta State</span>
                    <span className="text-[10px] text-slate-400 uppercase">Oshimili South</span>
                  </div>
                  <div className="h-5 w-px bg-slate-800" />
                  <div className="text-center">
                    <span className="block font-mono font-bold text-amber-300 text-xs sm:text-sm">Oct 2026</span>
                    <span className="text-[10px] text-slate-400 uppercase">Levy Commences</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2.5. Dedicated Road Project Transparency Spotlight */}
      <section className="py-12 bg-gradient-to-r from-amber-900 via-slate-900 to-emerald-950 text-white border-y border-amber-500/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:20px_20px] opacity-10 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold uppercase tracking-wider">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>Featured Community Project • Transparent Financial Ledger</span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white font-display">
                Finger of God Estate Road Modernization Project
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                Rebuilding Main Gate Boulevard & Phase 1/2 crescents with dual 600mm reinforced concrete drainage channels and heavy-duty 40MPa interlocked paving. Follow all community financial movement live with 100% financial transparency.
              </p>
              
              {/* Financial Metrics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10">
                  <span className="text-[10px] text-slate-300 uppercase block font-semibold">Budget Target</span>
                  <span className="text-sm sm:text-base font-black text-white font-display font-mono">
                    ₦{(roadSummary?.target_budget || 35000000).toLocaleString()}
                  </span>
                </div>
                <div className="bg-emerald-500/15 backdrop-blur-xs p-3 rounded-xl border border-emerald-400/30">
                  <span className="text-[10px] text-emerald-300 uppercase block font-semibold">Total Inflow (Credits)</span>
                  <span className="text-sm sm:text-base font-black text-emerald-300 font-display font-mono">
                    +₦{(roadSummary?.total_collected || 0).toLocaleString()}
                  </span>
                </div>
                <div className="bg-rose-500/15 backdrop-blur-xs p-3 rounded-xl border border-rose-400/30">
                  <span className="text-[10px] text-rose-300 uppercase block font-semibold">Disbursed (Debits)</span>
                  <span className="text-sm sm:text-base font-black text-rose-300 font-display font-mono">
                    -₦{(roadSummary?.total_spent || 0).toLocaleString()}
                  </span>
                </div>
                <div className="bg-amber-500/20 backdrop-blur-xs p-3 rounded-xl border border-amber-400/40">
                  <span className="text-[10px] text-amber-200 uppercase block font-semibold">Net Available Balance</span>
                  <span className="text-sm sm:text-base font-black text-amber-300 font-display font-mono">
                    ₦{(roadSummary?.current_balance || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="shrink-0 flex flex-col sm:flex-row lg:flex-col gap-3 w-full sm:w-auto">
              <button
                onClick={onNavigateToRoadProject}
                className="px-6 py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Coins className="w-4 h-4 text-slate-950" />
                <span>Open Public Financial Ledger &rarr;</span>
              </button>
              <button
                onClick={onNavigateToRoadProject}
                className="px-6 py-3 bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider rounded-xl border border-white/20 transition-all cursor-pointer text-center"
              >
                Contribute / Report Transfer
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Quick Access Hub / Major Estate Services */}
      <section id="services-section" className="py-14 sm:py-16 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-2">
              <Building2 className="w-3.5 h-3.5" />
              <span>Estate Services & Portals</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Finger of God Estate Operations
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-2">
              Access the main operational departments, resident services, and digital management tools of Finger of God Estate.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Service 1: Security Department */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200/90 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-4">
                  <Shield className="w-5 h-5" />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-slate-900">Estate Security Department</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                    24/7 Operations
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Dedicated 24/7 manned gatehouses, automated RFID barrier clearance, motorized perimeter patrols, and immediate incident emergency response.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Manned Gate & Patrol</span>
                <button
                  onClick={onNavigateToSecurity}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                >
                  <span>Open Security Page</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Service 2: Resident Portal */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200/90 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center mb-4">
                  <Users className="w-5 h-5" />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-slate-900">Resident Directory & Portal</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 uppercase">
                    Online
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Secure resident console to manage household profiles, pre-register expected visitors, verify gate clearance, and access personal payment archives.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Household Console</span>
                <button
                  onClick={onNavigateToPortal}
                  className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                >
                  <span>Resident Portal</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Service 3: Monthly Levies */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200/90 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mb-4">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-slate-900">Monthly Estate Levies</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 uppercase">
                    {levyAmountFormatted} / mo
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Fulfill mandatory monthly security and community upkeep dues via card or transfer with automated Paystack verification and instant PDF receipts.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Starts Oct 2026</span>
                <button
                  onClick={() => setIsQuickPayOpen(true)}
                  className="text-xs font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1 cursor-pointer"
                >
                  <span>Pay Monthly Dues</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Service 4: Official Announcements */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200/90 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-11 h-11 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center mb-4">
                  <Bell className="w-5 h-5" />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-slate-900">Estate Announcements</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 uppercase">
                    Public Feed
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Official community notices from the Estate Executive Committee, AGM meeting schedules, utility maintenance advisories, and security alerts.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">{announcements.length} Published</span>
                <button
                  onClick={onNavigateToAnnouncements}
                  className="text-xs font-bold text-purple-700 hover:text-purple-800 flex items-center gap-1 cursor-pointer"
                >
                  <span>View Bulletins</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Service 5: Digital Receipt Verification */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200/90 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-11 h-11 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center mb-4">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-slate-900">Receipt Verification</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800 uppercase">
                    Tamper-Evident
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Public validation tool to verify the authenticity of official Finger of God Estate levy receipts using receipt reference codes or scanning QR stamps.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Audited Registry</span>
                <button
                  onClick={onNavigateToVerifyReceipt}
                  className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1 cursor-pointer"
                >
                  <span>Verify Receipt</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Service 6: Facilities & Community Care */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200/90 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center mb-4">
                  <Zap className="w-5 h-5" />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-slate-900">Estate Infrastructure</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 uppercase">
                    Maintained
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Continuous oversight of estate electrical transformers, solar street illumination, storm drainage, interlocked roads, and environmental sanitation.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Facility Works</span>
                <button
                  onClick={() => scrollToSection('estate-info-section')}
                  className="text-xs font-bold text-rose-700 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                >
                  <span>Learn Details</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Estate Information & About Section */}
      <section id="estate-info-section" className="py-14 sm:py-18 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            <div className="lg:col-span-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-2">
                <Compass className="w-3.5 h-3.5" />
                <span>About Finger of God Estate</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                A Well-Planned Residential Haven in Asaba
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-3 leading-relaxed">
                Finger of God Estate is strategically positioned in Iyiaba, Asaba, Oshimili South Local Government Area of Delta State. Built on principles of security, order, peaceful coexistence, and sustainable community living, our estate offers residents an environment where families thrive.
              </p>

              <div className="mt-6 space-y-4 text-xs text-slate-700">
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white border border-slate-200/80">
                  <MapPin className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Strategic Location</h4>
                    <p className="text-slate-600 mt-0.5 leading-normal">
                      Accessible via Main Gate Boulevard, Phase 1, Finger of God Estate, Iyiaba, Asaba. Close proximity to major transit routes while insulated from city noise.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white border border-slate-200/80">
                  <Building className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Phased Layout & Zonal Planning</h4>
                    <p className="text-slate-600 mt-0.5 leading-normal">
                      Divided into organized residential zones across Phase 1 and Phase 2, with clearly numbered plots, well-defined crescents, and designated recreational spaces.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white border border-slate-200/80">
                  <Users className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Democratic Governance & Welfare</h4>
                    <p className="text-slate-600 mt-0.5 leading-normal">
                      Administered by the Resident Welfare Association (RWA) Executive Committee, representing all landlords, tenants, and families with transparent financial accountability.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-1">
                  Estate Amenities & Infrastructure
                </h3>
                <p className="text-xs text-slate-500 mb-6">
                  Key facilities maintained for all households within Finger of God Estate
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <span>Dedicated Power</span>
                    </div>
                    <p className="text-slate-600 mt-1.5 leading-relaxed">
                      High-capacity 33kV estate transformers with regular maintenance and load-balancing protection.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-500" />
                      <span>Solar Street Lighting</span>
                    </div>
                    <p className="text-slate-600 mt-1.5 leading-relaxed">
                      Continuous all-night illumination across all main roads, crescents, and boundary perimeter walls.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-blue-500" />
                      <span>Electronic Access Gate</span>
                    </div>
                    <p className="text-slate-600 mt-1.5 leading-relaxed">
                      Dual-barrier entry and exit gatehouses equipped with visitor clearance technology and guard cabins.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <Car className="w-4 h-4 text-purple-500" />
                      <span>Paved Roads & Drainage</span>
                    </div>
                    <p className="text-slate-600 mt-1.5 leading-relaxed">
                      Interlocked main boulevards and engineered concrete storm drainage channels to prevent waterlogging.
                    </p>
                  </div>
                </div>

                <div className="mt-6 p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold text-emerald-900">Want to join or register?</div>
                    <div className="text-[11px] text-emerald-700 mt-0.5">New homeowners and tenants must register at the secretariat.</div>
                  </div>
                  <button
                    onClick={onOpenResidentLogin}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shrink-0 transition-colors cursor-pointer"
                  >
                    Register / Login
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 5. Security Department Spotlight Section */}
      <section className="py-14 sm:py-18 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-10 lg:p-12 border border-slate-800 shadow-xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              <div className="lg:col-span-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-3">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Estate Department of Security</span>
                </div>

                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-tight">
                  Protecting Finger of God Estate 24/7
                </h2>

                <p className="text-xs sm:text-sm text-slate-300 mt-3 leading-relaxed max-w-2xl">
                  Security is organized as an active department of Finger of God Estate. With around-the-clock gate supervision, motorized patrol sweeps, verified visitor clearance, and a dedicated Chief Security Officer (CSO), we maintain a secure sanctuary for every resident.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                  <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
                    <div className="text-xs font-bold text-slate-400 uppercase">Emergency Hotline</div>
                    <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">{estateSettings.contact_phone || '08023456789'}</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
                    <div className="text-xs font-bold text-slate-400 uppercase">Speed Limit</div>
                    <div className="text-sm font-bold text-amber-300 font-mono mt-0.5">20 km/h Strict</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
                    <div className="text-xs font-bold text-slate-400 uppercase">Night Verification</div>
                    <div className="text-sm font-bold text-slate-200 mt-0.5">22:00 – 05:00 Daily</div>
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <button
                    onClick={onNavigateToSecurity}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <span>View Dedicated Security Page</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={onNavigateToSecurity}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    <span>Report Security Incident</span>
                  </button>
                </div>
              </div>

              <div className="lg:col-span-4 flex justify-center lg:justify-end">
                <div className="p-6 rounded-2xl bg-slate-800/90 border border-slate-700/90 w-full max-w-sm text-center">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-white">Chief Security Officer</h3>
                  <p className="text-xs text-slate-400 mt-1">Command Post & Gatehouse Desk</p>
                  <p className="text-xs text-slate-300 mt-3 leading-normal">
                    Direct communication with Delta State Police Division, Fire Department, and rapid emergency backup units.
                  </p>
                  <a
                    href={`tel:${estateSettings.contact_phone || '08023456789'}`}
                    className="mt-4 w-full py-2 px-3 bg-emerald-600/90 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold block transition-colors cursor-pointer"
                  >
                    Call Security Desk
                  </a>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* 6. Monthly Levy & Payment Section */}
      <section id="levy-section" className="py-14 sm:py-18 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            <div className="lg:col-span-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-2">
                <CreditCard className="w-3.5 h-3.5" />
                <span>Transparent Dues Administration</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Monthly Security & Community Upkeep Levy
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-3 leading-relaxed">
                To maintain 24/7 security guard deployments, automated gate technology, solar street lighting, and clean drainage channels, every household in Finger of God Estate contributes the established monthly estate levy.
              </p>

              <div className="mt-6 p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
                <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Approved Monthly Levy</span>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-0.5">{levyAmountFormatted}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Due Day</span>
                    <div className="text-base font-bold text-emerald-700 mt-0.5">1st of Every Month</div>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Commencement date: <strong>October 2026</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Automated online payment verification powered by Paystack</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Immediate digital PDF receipt with cryptographic verification stamp</span>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setIsQuickPayOpen(true)}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Pay Security Levy Online</span>
                  </button>

                  <button
                    onClick={onNavigateToVerifyReceipt}
                    className="px-4 py-2.5 text-slate-700 hover:bg-slate-100 font-semibold rounded-xl text-xs border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileCheck2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Verify a Receipt</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Pay Lookup Card */}
            <div className="lg:col-span-6">
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900">
                  Quick Resident Levy Checkout
                </h3>
                <p className="text-xs text-slate-500 mt-1 mb-5">
                  Enter your assigned Resident Number to confirm your household record and proceed directly to Paystack checkout.
                </p>

                <form onSubmit={handleVerifyForQuickPay} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Your Estate Resident Number
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={quickPayResidentNumber}
                        onChange={e => {
                          setQuickPayResidentNumber(e.target.value);
                          setQuickPayError('');
                          setQuickPayResident(null);
                        }}
                        placeholder="e.g. 001, 002, 010"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase"
                      />
                      <button
                        type="submit"
                        disabled={quickPayVerifying}
                        className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {quickPayVerifying ? (
                          <span>Verifying...</span>
                        ) : (
                          <>
                            <Search className="w-3 h-3" />
                            <span>Verify</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {quickPayError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{quickPayError}</span>
                    </div>
                  )}

                  {quickPayResident && (
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/90 text-xs text-emerald-950 space-y-2 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-emerald-900">{quickPayResident.full_name}</span>
                        <span className="font-mono font-bold px-2 py-0.5 rounded bg-emerald-200 text-emerald-900">
                          #{quickPayResident.resident_number}
                        </span>
                      </div>
                      <div className="text-emerald-800">
                        {quickPayResident.house_number}, {quickPayResident.address}
                      </div>

                      <div className="pt-2 border-t border-emerald-200 flex items-center justify-between">
                        <span className="font-semibold text-emerald-900">Amount Due: {levyAmountFormatted}</span>
                        <button
                          type="button"
                          onClick={handleLaunchPayment}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Pay Now via Paystack</span>
                        </button>
                      </div>
                    </div>
                  )}
                </form>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 7. Announcements Feed Widget */}
      <section className="py-14 sm:py-16 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold uppercase tracking-wider mb-2">
                <Bell className="w-3.5 h-3.5" />
                <span>Official Estate Notices</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Announcements & Community Updates
              </h2>
            </div>

            <button
              onClick={onNavigateToAnnouncements}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer self-start sm:self-auto"
            >
              <span>View All Announcements ({announcements.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {announcements.slice(0, 3).map(notice => (
              <div 
                key={notice.id} 
                className="bg-slate-50 rounded-2xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-800">
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

                <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-medium">By {notice.published_by || notice.author_name || 'Management'}</span>
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

      {/* 8. Contact & Management Support Section */}
      <section id="contact-section" className="py-14 sm:py-18 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            
            <div className="lg:col-span-5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-2">
                <Phone className="w-3.5 h-3.5" />
                <span>Get In Touch</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Contact Estate Management
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                Have an inquiry, feedback for the executive committee, or require assistance with resident verification? Contact the secretariat office.
              </p>

              <div className="mt-6 space-y-4 text-xs text-slate-700">
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white border border-slate-200/80">
                  <MapPin className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Estate Secretariat & Gatehouse</h4>
                    <p className="text-slate-600 mt-0.5 leading-normal">
                      Main Gate Boulevard, Phase 1, Finger of God Estate, Iyiaba, Asaba, Delta State, Nigeria.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white border border-slate-200/80">
                  <Phone className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Telephone Contacts</h4>
                    <p className="text-slate-600 mt-0.5 leading-normal">
                      Office / CSO Desk: <strong className="text-slate-900">{estateSettings.contact_phone || '08023456789'}</strong><br />
                      Main Gate Access: <strong className="text-slate-900">08034567890</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white border border-slate-200/80">
                  <Mail className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Official Email</h4>
                    <p className="text-slate-600 mt-0.5 leading-normal">
                      {estateSettings.contact_email || 'admin@fingerofgodestate.ng'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Inquiry Form */}
            <div className="lg:col-span-7">
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-1">
                  Send Message to Administration
                </h3>
                <p className="text-xs text-slate-500 mb-6">
                  Fill in your details and message. Our secretariat will respond promptly.
                </p>

                {contactSubmitted ? (
                  <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-center space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                    <div className="text-base font-bold">Thank You! Message Dispatched.</div>
                    <p className="text-xs text-emerald-800 max-w-sm mx-auto">
                      Your message has been delivered to the Finger of God Estate administrative team. We will review and reply shortly.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Your Full Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={contactName}
                          onChange={e => setContactName(e.target.value)}
                          placeholder="e.g. Chief Emeka Okonkwo"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Phone Number <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="tel"
                          required
                          value={contactPhone}
                          onChange={e => setContactPhone(e.target.value)}
                          placeholder="e.g. 0803 456 7890"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={contactEmail}
                          onChange={e => setContactEmail(e.target.value)}
                          placeholder="e.g. emeka.okonkwo@gmail.com"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Subject Category
                        </label>
                        <select
                          value={contactSubject}
                          onChange={e => setContactSubject(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                        >
                          <option value="General Estate Inquiry">General Estate Inquiry</option>
                          <option value="Resident Registration">Resident Registration</option>
                          <option value="Security Question">Security & Gate Clearance</option>
                          <option value="Levy / Payment Support">Levy / Payment Support</option>
                          <option value="Infrastructure Maintenance">Infrastructure Maintenance</option>
                          <option value="Executive Committee Feedback">Executive Committee Feedback</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Your Message <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={contactMessage}
                        onChange={e => setContactMessage(e.target.value)}
                        placeholder="Please describe your inquiry or feedback in detail..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      Send Message to Secretariat
                    </button>
                  </form>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 9. Master Estate Footer */}
      <footer className="bg-slate-950 text-slate-400 py-12 text-xs border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-800/80">
            <div className="md:col-span-2">
              <EstateLogo
                size="sm"
                variant="horizontal"
                theme="dark"
                estateName={estateSettings.estate_name || 'Finger of God Estate'}
                subtitle="COMMUNITY & RESIDENTIAL ESTATE • ASABA"
              />
              <p className="mt-3 text-slate-400 text-xs leading-relaxed max-w-sm">
                Finger of God Estate, Iyiaba, Asaba, Delta State, Nigeria. Committed to peaceful community living, robust electronic gate security, clean infrastructure, and transparent resident governance.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Estate Navigation</h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-white transition-colors cursor-pointer">
                    Home
                  </button>
                </li>
                <li>
                  <button onClick={onNavigateToSecurity} className="hover:text-white transition-colors cursor-pointer">
                    Security Department
                  </button>
                </li>
                <li>
                  <button onClick={onNavigateToPortal} className="hover:text-white transition-colors cursor-pointer">
                    Residents Portal
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('estate-info-section')} className="hover:text-white transition-colors cursor-pointer">
                    Estate Information
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('levy-section')} className="hover:text-white transition-colors cursor-pointer">
                    Payments & Monthly Levies
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
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Security & Contacts</h4>
              <p className="text-xs leading-relaxed text-slate-400 mb-2">
                Main Gate Security Desk: <strong className="text-white">08034567890</strong><br />
                Chief Security Officer: <strong className="text-white">{estateSettings.contact_phone || '08023456789'}</strong><br />
                Police Emergency: <strong className="text-white">112</strong>
              </p>
              <button
                onClick={onOpenAdminLogin}
                className="mt-3 text-[11px] text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Lock className="w-3 h-3" />
                <span>Management / Admin Console</span>
              </button>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] text-slate-500">
            <div>
              © {new Date().getFullYear()} Finger of God Estate Management Platform. All rights reserved.
            </div>
            <div>
              Iyiaba, Asaba, Delta State, Nigeria
            </div>
          </div>
        </div>
      </footer>

      {/* Paystack Payment Modal (Direct Checkout) */}
      {isPaystackModalOpen && quickPayResident && (
        <PaystackPaymentModal
          isOpen={isPaystackModalOpen}
          onClose={() => setIsPaystackModalOpen(false)}
          preselectedResident={quickPayResident}
          estateSettings={estateSettings}
          onPaymentSuccess={() => {
            setIsPaystackModalOpen(false);
            setIsQuickPayOpen(false);
          }}
        />
      )}
    </div>
  );
};
