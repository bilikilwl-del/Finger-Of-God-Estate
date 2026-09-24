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
  HelpCircle,
  FileText
} from 'lucide-react';
import { EstateSettings, Announcement, Resident } from '../../types/database';
import { dbService } from '../../lib/supabase';
import { PaystackPaymentModal } from '../payments/PaystackPaymentModal';
import { EstateLogo } from '../common/EstateLogo';

interface PublicHomeViewProps {
  estateSettings: EstateSettings;
  onNavigateToAnnouncements: () => void;
  onNavigateToAnnouncementDetail: (slug: string) => void;
  onNavigateToVerifyReceipt: () => void;
  onNavigateToPortal: () => void;
  onOpenResidentLogin: () => void;
  onOpenAdminLogin: () => void;
}

export const PublicHomeView: React.FC<PublicHomeViewProps> = ({
  estateSettings,
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
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSubmitted, setContactSubmitted] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const publicAnnouncements = await dbService.getPublicAnnouncements();
        setAnnouncements(publicAnnouncements);
      } catch (err) {
        console.warn('Failed to load public announcements:', err);
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
        setQuickPayError(`Resident record (${resident.full_name}) is currently inactive. Please contact the security desk.`);
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
      setContactSubject('');
      setContactMessage('');
      setContactSubmitted(false);
    }, 4000);
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
            {/* Logo & Brand */}
            <div 
              className="flex items-center cursor-pointer select-none" 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <EstateLogo
                size="sm"
                variant="horizontal"
                theme="light"
                estateName={estateSettings.estate_name || 'Finger of God Estate'}
                subtitle="SECURITY MANAGEMENT • ASABA"
                hideSubtitleOnMobile={true}
              />
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
              <button 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Home
              </button>
              <button 
                onClick={() => scrollToSection('about-section')}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                About
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
                onClick={onNavigateToVerifyReceipt}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Verify Receipt
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
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 cursor-pointer"
              >
                Resident Login
              </button>
              <button
                onClick={() => setIsQuickPayOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Pay Security Levy</span>
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
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-800 hover:bg-slate-100 cursor-pointer"
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection('about-section')}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-800 hover:bg-slate-100 cursor-pointer"
            >
              About Estate
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
              Contact Administration
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

      {/* 2. Hero Section - Compact, Balanced, Professional */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white py-12 sm:py-16 lg:py-20">
        {/* Subtle geometric grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            
            {/* Left Column (60% width on desktop) */}
            <div className="lg:col-span-7 flex flex-col justify-center text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold w-fit mb-3">
                <Shield className="w-3.5 h-3.5" />
                <span>Official Security & Levy Management Platform • Asaba</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight">
                FINGER OF<br className="hidden sm:inline" /> GOD ESTATE
              </h1>

              <div className="text-emerald-400 text-lg sm:text-xl md:text-2xl font-bold mt-1.5">
                SECURITY MANAGEMENT
              </div>

              <p className="text-xs sm:text-sm md:text-base text-slate-300 leading-relaxed max-w-[620px] mt-3.5">
                This platform enables residents of Finger of God Estate, Asaba to securely fulfill monthly security levy obligations with automated Paystack verification, obtain instant tamper-evident digital receipts, and stay updated with official estate security notices.
              </p>

              {/* Call to Actions */}
              <div className="mt-6 flex flex-wrap items-center gap-3 sm:gap-4">
                <button
                  onClick={() => setIsQuickPayOpen(true)}
                  className="px-5 sm:px-6 py-2.5 sm:py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Pay Security Levy</span>
                </button>

                <button
                  onClick={onOpenResidentLogin}
                  className="px-5 sm:px-6 py-2.5 sm:py-3 bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold rounded-xl text-xs sm:text-sm border border-slate-700 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <span>Resident Login</span>
                </button>

                <button
                  onClick={onNavigateToAnnouncements}
                  className="px-4 py-2.5 sm:py-3 text-slate-300 hover:text-white font-semibold text-xs sm:text-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Announcements</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Right Column (40% width on desktop) - Compact Official Support Card */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <div className="p-6 rounded-2xl bg-slate-800/90 border border-slate-700/80 shadow-xl backdrop-blur-xs flex flex-col items-center text-center max-w-xs sm:max-w-sm w-full">
                <EstateLogo
                  variant="icon-only"
                  size="lg"
                  theme="dark"
                />
                
                <div className="mt-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                    OFFICIAL ESTATE
                  </div>
                  <div className="text-sm font-bold text-white mt-0.5">
                    Finger of God Estate
                  </div>
                  <div className="text-xs font-semibold text-emerald-400 mt-0.5">
                    Security Management • Asaba
                  </div>
                </div>

                <div className="mt-5 pt-3.5 border-t border-slate-700/80 w-full flex items-center justify-around text-xs text-slate-400">
                  <div className="text-center">
                    <span className="block font-mono font-bold text-emerald-400 text-sm sm:text-base">{levyAmountFormatted}</span>
                    <span className="text-[10px] text-slate-400 uppercase">Monthly Levy</span>
                  </div>
                  <div className="h-6 w-px bg-slate-700" />
                  <div className="text-center">
                    <span className="block font-mono font-bold text-amber-300 text-sm sm:text-base">Oct 2026</span>
                    <span className="text-[10px] text-slate-400 uppercase">Start Date</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3. Security Levy Information Section */}
      <section className="py-10 sm:py-12 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200/80">
              <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-3">
                <CreditCard className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Monthly Security Levy</div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{levyAmountFormatted}</div>
              <p className="text-xs text-slate-600 mt-1.5 leading-normal">
                Mandatory monthly security fee for all active estate resident households.
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200/80">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Billing Cycle & Due Date</div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">1st of Every Month</div>
              <p className="text-xs text-slate-600 mt-1.5 leading-normal">
                Levies commence from <strong className="text-slate-800">October 2026</strong>. Payable promptly each month.
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200/80">
              <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center mb-3">
                <Lock className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gateway Verification</div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">Verified Online</div>
              <p className="text-xs text-slate-600 mt-1.5 leading-normal">
                Pay with debit card, bank transfer, or USSD via Paystack. Automated status updates.
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200/80">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
                <FileCheck2 className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Digital Receipts</div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">Instant Verification</div>
              <p className="text-xs text-slate-600 mt-1.5 leading-normal">
                Download official print-ready receipts with unique verification codes immediately.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. How It Works Section */}
      <section className="py-12 sm:py-16 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider border border-emerald-200">
              Transparent & Simple
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2.5">
              How Security Levy Payment Works
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-2">
              Follow these simple steps to fulfill your monthly estate security obligation in less than two minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl p-5 border border-slate-200/80 text-center relative shadow-2xs">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center mx-auto mb-3">
                1
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">Enter Resident Number</h3>
              <p className="text-xs text-slate-600 leading-normal">Provide your official estate ID (e.g. 001, 002) in the portal.</p>
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200/80 text-center relative shadow-2xs">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center mx-auto mb-3">
                2
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">Confirm Details</h3>
              <p className="text-xs text-slate-600 leading-normal">Review your full name, plot/house address, and amount due.</p>
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200/80 text-center relative shadow-2xs">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center mx-auto mb-3">
                3
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">Make Payment Securely</h3>
              <p className="text-xs text-slate-600 leading-normal">Process payment safely through verified Paystack channels.</p>
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200/80 text-center relative shadow-2xs">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center mx-auto mb-3">
                4
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">Receive Confirmation</h3>
              <p className="text-xs text-slate-600 leading-normal">Payment is recorded and verified automatically on the database.</p>
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200/80 text-center relative shadow-2xs">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center mx-auto mb-3">
                5
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">View Receipt & History</h3>
              <p className="text-xs text-slate-600 leading-normal">Download your digital receipt and review your full ledger.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Resident Services Grid */}
      <section className="py-12 sm:py-16 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-wider border border-blue-200">
              Resident Hub
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2.5">
              Direct Resident Services
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-2">
              Access every estate security service directly with zero friction.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {/* 1. Pay Security Levy */}
            <div 
              onClick={() => setIsQuickPayOpen(true)}
              className="bg-slate-50 hover:bg-white p-5 sm:p-6 rounded-xl border border-slate-200 hover:border-emerald-300 transition-all cursor-pointer group shadow-2xs hover:shadow-sm"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3.5 group-hover:scale-105 transition-transform">
                <CreditCard className="w-5 h-5" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-1 flex items-center justify-between">
                <span>Pay Security Levy</span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
              </h3>
              <p className="text-xs text-slate-600 leading-normal">
                Clear your monthly {levyAmountFormatted} security levy for October 2026 or outstanding billing cycles online.
              </p>
            </div>

            {/* 2. Resident Dashboard */}
            <div 
              onClick={onOpenResidentLogin}
              className="bg-slate-50 hover:bg-white p-5 sm:p-6 rounded-xl border border-slate-200 hover:border-blue-300 transition-all cursor-pointer group shadow-2xs hover:shadow-sm"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-3.5 group-hover:scale-105 transition-transform">
                <UserCheck className="w-5 h-5" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-1 flex items-center justify-between">
                <span>Resident Dashboard</span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
              </h3>
              <p className="text-xs text-slate-600 leading-normal">
                Access your personal resident ledger, verified contact profile, and current levy standing.
              </p>
            </div>

            {/* 3. Payment History */}
            <div 
              onClick={onOpenResidentLogin}
              className="bg-slate-50 hover:bg-white p-5 sm:p-6 rounded-xl border border-slate-200 hover:border-indigo-300 transition-all cursor-pointer group shadow-2xs hover:shadow-sm"
            >
              <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center mb-3.5 group-hover:scale-105 transition-transform">
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-1 flex items-center justify-between">
                <span>Payment History</span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
              </h3>
              <p className="text-xs text-slate-600 leading-normal">
                Review complete chronological records of paid and outstanding levy months.
              </p>
            </div>

            {/* 4. Verify Digital Receipt */}
            <div 
              onClick={onNavigateToVerifyReceipt}
              className="bg-slate-50 hover:bg-white p-5 sm:p-6 rounded-xl border border-slate-200 hover:border-amber-300 transition-all cursor-pointer group shadow-2xs hover:shadow-sm"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mb-3.5 group-hover:scale-105 transition-transform">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-1 flex items-center justify-between">
                <span>Verify Receipt</span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-colors" />
              </h3>
              <p className="text-xs text-slate-600 leading-normal">
                Publicly authenticate official estate payment receipts using the cryptographic receipt identifier.
              </p>
            </div>

            {/* 5. Estate Announcements */}
            <div 
              onClick={onNavigateToAnnouncements}
              className="bg-slate-50 hover:bg-white p-5 sm:p-6 rounded-xl border border-slate-200 hover:border-rose-300 transition-all cursor-pointer group shadow-2xs hover:shadow-sm"
            >
              <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center mb-3.5 group-hover:scale-105 transition-transform">
                <Bell className="w-5 h-5" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-1 flex items-center justify-between">
                <span>Estate Announcements</span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-rose-600 transition-colors" />
              </h3>
              <p className="text-xs text-slate-600 leading-normal">
                Stay updated with official security notices, townhall meetings, and infrastructure schedules.
              </p>
            </div>

            {/* 6. Contact Administration */}
            <div 
              onClick={() => scrollToSection('contact-section')}
              className="bg-slate-50 hover:bg-white p-5 sm:p-6 rounded-xl border border-slate-200 hover:border-teal-300 transition-all cursor-pointer group shadow-2xs hover:shadow-sm"
            >
              <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center mb-3.5 group-hover:scale-105 transition-transform">
                <Phone className="w-5 h-5" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-1 flex items-center justify-between">
                <span>Contact Administration</span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 transition-colors" />
              </h3>
              <p className="text-xs text-slate-600 leading-normal">
                Reach the Estate Security Desk, EXCO secretariat, or facility maintenance team.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Latest Announcements Teaser Section */}
      {announcements.length > 0 && (
        <section className="py-12 sm:py-16 bg-slate-50 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8">
              <div>
                <span className="text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1 rounded-full uppercase tracking-wider border border-rose-200">
                  Official Bulletins
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
                  Estate Notices & Bulletins
                </h2>
              </div>
              <button
                onClick={onNavigateToAnnouncements}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer self-start sm:self-auto"
              >
                <span>View All {announcements.length} Announcements</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
              {announcements.slice(0, 3).map((ann) => (
                <div
                  key={ann.id}
                  onClick={() => onNavigateToAnnouncementDetail(ann.slug)}
                  className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 hover:border-emerald-300 hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        ann.priority === 'URGENT' || ann.priority === 'Emergency'
                          ? 'bg-rose-100 text-rose-800'
                          : ann.priority === 'IMPORTANT' || ann.priority === 'High'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {ann.priority}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold uppercase">
                        {ann.category}
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-2 line-clamp-2">
                      {ann.title}
                    </h3>

                    <p className="text-xs text-slate-600 line-clamp-3 mb-4 leading-relaxed">
                      {ann.body}
                    </p>
                  </div>

                  <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>{new Date(ann.publish_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    <span className="font-semibold text-emerald-700 flex items-center gap-1">
                      <span>Read More</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 6. About the Estate Section */}
      <section id="about-section" className="py-12 sm:py-16 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-6 space-y-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Community Security Governance
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
                About {estateSettings.estate_name || 'Finger of God Estate'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Finger of God Estate is a prime residential community located in {estateSettings.estate_lga || 'Eti-Osa'}, {estateSettings.estate_state || 'Lagos'}. The estate is dedicated to providing a safe, tranquil, and technologically enhanced living environment for all residents, property owners, and registered visitors.
              </p>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                The Security Management Board oversees 24-hour armed perimeter surveillance, automated gate access controls, structured resident verification, and accountable security fund utilization.
              </p>

              <div className="grid grid-cols-2 gap-3.5 pt-2">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="text-xs font-semibold text-slate-500">Estate Location</div>
                  <div className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">{estateSettings.estate_lga || 'Eti-Osa'}, {estateSettings.estate_state || 'Lagos'}</div>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="text-xs font-semibold text-slate-500">Security Regime</div>
                  <div className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">24/7 Monitored Access</div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 bg-slate-900 text-white rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-lg border border-slate-800">
              <div className="relative z-10 space-y-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold">Why Security Levy Compliance Matters</h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Every ₦5,000 monthly levy contributed directly sustains our trained personnel, solar gate power redundancies, surveillance camera infrastructure, and swift response teams.
                </p>
                <div className="space-y-2 pt-1.5">
                  <div className="flex items-center gap-2 text-xs text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>24/7 Armed Response & Patrol Teams</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Automated Visitor & Vehicle Scanning</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Transparent Financial Stewardship & Audited Ledgers</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Contact Section */}
      <section id="contact-section" className="py-12 sm:py-16 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            <div className="lg:col-span-5 space-y-5">
              <div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider border border-emerald-200">
                  Get in Touch
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2.5">
                  Estate Administration & Security Desk
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-2">
                  For inquiries regarding resident registration, levy verification, or general community security matters.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200">
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[11px] font-bold text-slate-500 uppercase">Estate Address</div>
                    <div className="text-xs font-medium text-slate-900 mt-0.5">
                      {estateSettings.estate_address || 'Main Gate Boulevard, Phase 1, Finger of God Estate'}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {estateSettings.estate_lga || 'Eti-Osa'}, {estateSettings.estate_state || 'Lagos State'}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200">
                  <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[11px] font-bold text-slate-500 uppercase">Security Desk Phone</div>
                    <div className="text-xs font-semibold text-slate-900 mt-0.5">
                      {estateSettings.contact_phone || '08023456789'}
                    </div>
                    <div className="text-[11px] text-slate-500">Available 24 hours daily for security coordination</div>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200">
                  <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[11px] font-bold text-slate-500 uppercase">Administration Email</div>
                    <div className="text-xs font-semibold text-slate-900 mt-0.5">
                      {estateSettings.contact_email || 'admin@fingerofgodestate.ng'}
                    </div>
                    <div className="text-[11px] text-slate-500">Official inquiries and confirmation submissions</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Direct Message Form */}
            <div className="lg:col-span-7 bg-white p-5 sm:p-7 rounded-xl border border-slate-200 shadow-2xs">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1">Send a Message to EXCO / Security</h3>
              <p className="text-xs text-slate-500 mb-5">
                Submit an inquiry or report an issue directly to the estate administrative committee.
              </p>

              {contactSubmitted ? (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-5 rounded-xl text-center space-y-2">
                  <CheckCircle2 className="w-7 h-7 text-emerald-600 mx-auto" />
                  <div className="font-bold text-sm">Message Dispatched Successfully</div>
                  <p className="text-xs text-emerald-700">
                    Thank you. Your message has been logged with the Estate Secretariat.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Your Full Name</label>
                      <input
                        type="text"
                        required
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="e.g. Babatunde Adeleke"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Your Email or Phone</label>
                      <input
                        type="text"
                        required
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="e.g. resident@email.com or 080..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
                    <input
                      type="text"
                      required
                      value={contactSubject}
                      onChange={(e) => setContactSubject(e.target.value)}
                      placeholder="e.g. Payment inquiry or security gate notice"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Message</label>
                    <textarea
                      required
                      rows={3}
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      placeholder="Type your message here..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    Send Message to Administration
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-slate-950 text-slate-400 py-10 border-t border-slate-900 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-900">
            <div className="flex items-center">
              <EstateLogo
                size="sm"
                variant="horizontal"
                theme="dark"
                estateName={estateSettings.estate_name || 'Finger of God Estate'}
                subtitle="OFFICIAL SECURITY LEVY PLATFORM • ASABA"
              />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-slate-300">
              <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-white cursor-pointer">
                Home
              </button>
              <button onClick={() => scrollToSection('about-section')} className="hover:text-white cursor-pointer">
                About
              </button>
              <button onClick={onNavigateToAnnouncements} className="hover:text-white cursor-pointer">
                Announcements
              </button>
              <button onClick={onNavigateToVerifyReceipt} className="hover:text-white cursor-pointer">
                Verify Receipt
              </button>
              <button onClick={onOpenResidentLogin} className="hover:text-white cursor-pointer">
                Resident Portal
              </button>
              <button onClick={onOpenAdminLogin} className="text-slate-400 hover:text-white cursor-pointer flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span>Admin Console</span>
              </button>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-[11px]">
            <div>
              &copy; {new Date().getFullYear()} {estateSettings.estate_name || 'Finger of God Estate'}. All rights reserved.
            </div>
            <div>
              Secured with automated Paystack verification & instant digital receipts.
            </div>
          </div>
        </div>
      </footer>

      {/* QUICK PAY MODAL */}
      {isQuickPayOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Pay Security Levy</h3>
                  <p className="text-[11px] text-slate-500">{levyAmountFormatted} / month • October 2026</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsQuickPayOpen(false);
                  setQuickPayResident(null);
                  setQuickPayError('');
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {!quickPayResident ? (
                <form onSubmit={handleVerifyForQuickPay} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Enter Your Resident Number
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={quickPayResidentNumber}
                        onChange={(e) => {
                          setQuickPayResidentNumber(e.target.value);
                          setQuickPayError('');
                        }}
                        placeholder="e.g. 001, 002, 003"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                      <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Use the 3-digit number assigned to your household by estate security.
                    </span>
                  </div>

                  {quickPayError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <span>{quickPayError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={quickPayVerifying}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {quickPayVerifying ? (
                      <span>Verifying Record...</span>
                    ) : (
                      <>
                        <span>Continue to Payment</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                        Verified Resident
                      </span>
                      <span className="font-mono text-xs font-bold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded">
                        #{quickPayResident.resident_number}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-900">{quickPayResident.full_name}</div>
                    <div className="text-xs text-slate-600">{quickPayResident.house_number}, {quickPayResident.address}</div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-500 block">October 2026 Security Levy</span>
                      <span className="text-xl font-extrabold text-slate-900 block mt-0.5">
                        {levyAmountFormatted}
                      </span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      DUE
                    </span>
                  </div>

                  <div className="space-y-2 pt-2">
                    <button
                      onClick={handleLaunchPayment}
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Proceed with Paystack ({levyAmountFormatted})</span>
                    </button>

                    <button
                      onClick={() => setQuickPayResident(null)}
                      className="w-full py-2.5 text-slate-600 hover:text-slate-900 text-xs font-semibold"
                    >
                      Change Resident Number
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Paystack Payment Modal Triggered From Quick Pay */}
      {isPaystackModalOpen && quickPayResident && (
        <PaystackPaymentModal
          isOpen={isPaystackModalOpen}
          onClose={() => setIsPaystackModalOpen(false)}
          preselectedResident={quickPayResident}
          targetMonth={10}
          targetYear={2026}
          estateSettings={estateSettings}
          onPaymentSuccess={() => {
            setIsPaystackModalOpen(false);
            setIsQuickPayOpen(false);
            onNavigateToPortal();
          }}
        />
      )}
    </div>
  );
};
