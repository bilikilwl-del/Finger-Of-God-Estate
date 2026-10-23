import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Coins,
  CreditCard,
  Bell,
  FileText,
  Phone,
  Home,
  Menu,
  X,
  UserCheck,
  MapPin,
  CheckCircle2,
  Users,
  Vote,
  Compass,
  ArrowRight,
  ChevronDown,
  LogOut,
  User
} from 'lucide-react';
import { NavigationTab, EstateSettings, Resident } from '../../types/database';
import { EstateLogo } from '../common/EstateLogo';
import { residentSessionService } from '../../lib/supabase';

export interface PublicNavbarProps {
  currentTab: NavigationTab;
  estateSettings: EstateSettings;
  currentResident?: Resident | null;
  adminUser?: any | null;
  onNavigate: (tab: NavigationTab) => void;
  onOpenResidentLogin: (initialTab?: 'login' | 'activate') => void;
  onLogoutResident?: () => void;
  unreadAnnouncementsCount?: number;
}

export const PublicNavbar: React.FC<PublicNavbarProps> = ({
  currentTab,
  estateSettings,
  currentResident,
  onNavigate,
  onOpenResidentLogin,
  onLogoutResident,
  unreadAnnouncementsCount = 0
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Monitor scroll position for dynamic transparency over the homepage hero section
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close user dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isHeroTransparent = currentTab === 'home' && !isScrolled;

  const handleLogout = () => {
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
    if (onLogoutResident) {
      onLogoutResident();
    } else {
      residentSessionService.logoutResident();
      window.location.reload();
    }
  };

  // Curated Navigation Items aligning with official estate sections
  const publicNavItems = [
    {
      tab: 'home' as NavigationTab,
      label: 'Home',
      icon: Home
    },
    {
      tab: 'about' as const,
      label: 'About the Estate',
      icon: Compass
    },
    {
      tab: 'public_announcements' as NavigationTab,
      label: 'Estate Updates',
      icon: Bell,
      count: unreadAnnouncementsCount > 0 ? unreadAnnouncementsCount : undefined
    },
    {
      tab: 'estate_levy' as NavigationTab,
      label: 'Contributions',
      icon: CreditCard
    },
    {
      tab: 'road_project' as NavigationTab,
      label: 'Road Modernization',
      icon: Coins
    },
    {
      tab: 'security_public' as NavigationTab,
      label: 'Security',
      icon: Shield
    },
    {
      tab: 'election' as NavigationTab,
      label: 'Election',
      icon: Vote
    },
    {
      tab: 'contact' as NavigationTab,
      label: 'Contact',
      icon: Phone
    }
  ];

  const handleItemClick = (tab: NavigationTab | 'about') => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);

    if (tab === 'about') {
      if (currentTab === 'home') {
        const welcomeEl = document.getElementById('welcome');
        if (welcomeEl) {
          welcomeEl.scrollIntoView({ behavior: 'smooth' });
          return;
        }
      }
      onNavigate('home');
      setTimeout(() => {
        const welcomeEl = document.getElementById('welcome');
        if (welcomeEl) {
          welcomeEl.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
      return;
    }

    if (tab === 'resident_portal' && !currentResident) {
      onOpenResidentLogin('login');
      return;
    }

    onNavigate(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="w-full sticky top-0 z-40 transition-colors duration-300">
      {/* 1. Pre-Header Top Bar */}
      <div
        className={`hidden lg:block text-[11px] font-medium py-1.5 px-3 sm:px-6 w-full transition-colors duration-300 ${
          isHeroTransparent
            ? 'bg-black/45 text-slate-200 border-b border-white/10 backdrop-blur-xs'
            : 'bg-slate-900 text-slate-300 border-b border-slate-800'
        }`}
      >
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-3">
          {/* Left: Location & Security Badge */}
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex items-center gap-1.5 min-w-0">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate max-w-[280px] xl:max-w-[400px]">
                1 Ogbueshi Ugboko Street, Finger of God Estate, Iyiaba, Asaba, Delta State.
              </span>
            </span>
            <span
              className={`hidden xl:inline-block w-1 h-1 rounded-full ${
                isHeroTransparent ? 'bg-white/30' : 'bg-slate-700'
              } shrink-0`}
            />
            <span className="hidden xl:flex items-center gap-1.5 text-emerald-300 font-semibold shrink-0">
              <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>24/7 Gated Security Patrol &amp; Access Control</span>
            </span>
          </div>

          {/* Right: Hotline & Quick Access */}
          <div className="flex items-center gap-3 shrink-0 text-[11px]">
            <span className="flex items-center gap-1.5">
              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
              <span>
                Gate Hotline: <strong className="font-mono text-white">07057543935</strong>
              </span>
            </span>
            <span
              className={`w-1 h-1 rounded-full ${isHeroTransparent ? 'bg-white/30' : 'bg-slate-700'}`}
            />
            <button
              onClick={() => handleItemClick('verify_receipt')}
              className="flex items-center gap-1 hover:text-emerald-300 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>Verify Receipt</span>
            </button>
            <span
              className={`w-1 h-1 rounded-full ${isHeroTransparent ? 'bg-white/30' : 'bg-slate-700'}`}
            />
            <button
              onClick={() => onOpenResidentLogin('activate')}
              className="text-emerald-300 hover:text-white font-semibold transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>Activate Plot ID</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Header Navigation Bar (Transparent over Hero -> Solid on Scroll) */}
      <header
        className={`w-full transition-all duration-300 ${
          isHeroTransparent
            ? 'bg-slate-950/35 backdrop-blur-md border-b border-white/15 text-white'
            : 'bg-white/95 backdrop-blur-md border-b border-slate-200/90 text-slate-900 shadow-xs'
        }`}
      >
        <div className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-16 sm:h-18 gap-2">
            {/* Logo */}
            <div
              className="flex items-center cursor-pointer select-none shrink-0 group transition-transform duration-150 py-1"
              onClick={() => handleItemClick('home')}
              title="Finger of God Estate - Home"
            >
              <EstateLogo
                size="sm"
                variant="horizontal"
                theme={isHeroTransparent ? 'dark' : 'light'}
                estateName={estateSettings.estate_name || 'Finger of God Estate'}
                subtitle="ESTATE MANAGEMENT • ASABA"
                hideSubtitleOnMobile={true}
              />
            </div>

            {/* Desktop Navigation Menu */}
            <nav className="hidden xl:flex items-center gap-0.5 2xl:gap-1">
              {publicNavItems.map((item) => {
                const isActive =
                  currentTab === item.tab ||
                  (item.tab === 'public_announcements' && currentTab === 'announcement_detail');
                return (
                  <button
                    key={item.tab}
                    onClick={() => handleItemClick(item.tab)}
                    className={`px-2.5 2xl:px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                      isActive
                        ? isHeroTransparent
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'bg-emerald-900 text-white'
                        : isHeroTransparent
                        ? 'text-white/85 hover:text-white hover:bg-white/10'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.count !== undefined && item.count > 0 && (
                      <span
                        className={`font-mono text-[10px] font-bold ${
                          isActive
                            ? 'text-emerald-200'
                            : isHeroTransparent
                            ? 'text-emerald-300'
                            : 'text-emerald-800'
                        }`}
                      >
                        ({item.count})
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Desktop Action CTAs */}
            <div className="hidden xl:flex items-center gap-2.5 shrink-0">
              {currentResident ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0 border ${
                      isHeroTransparent
                        ? 'bg-emerald-900/80 border-emerald-500/60 text-white hover:bg-emerald-800'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-950 hover:bg-emerald-100'
                    }`}
                    title={`Signed in as ${currentResident.full_name}`}
                  >
                    <UserCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="truncate max-w-[100px]">{currentResident.full_name.split(' ')[0]}</span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-emerald-200/50 rounded text-emerald-900">
                      #{currentResident.resident_number}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                  </button>

                  {/* Account Dropdown Menu */}
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 text-slate-900 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/70">
                        <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                          Signed In Resident
                        </p>
                        <p className="text-xs font-bold text-slate-900 truncate">{currentResident.full_name}</p>
                        <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                          Resident #{currentResident.resident_number} • {currentResident.house_number || `Plot #${currentResident.resident_number}`}
                        </p>
                      </div>

                      <div className="py-1">
                        <button
                          onClick={() => handleItemClick('resident_portal')}
                          className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 flex items-center gap-2.5 cursor-pointer"
                        >
                          <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Resident Dashboard</span>
                        </button>

                        <button
                          onClick={() => handleItemClick('estate_levy')}
                          className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 flex items-center gap-2.5 cursor-pointer"
                        >
                          <CreditCard className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Pay Security Levies</span>
                        </button>
                      </div>

                      <div className="border-t border-slate-100 my-1" />

                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
                        <span>Sign Out of Account</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => onOpenResidentLogin('login')}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    isHeroTransparent
                      ? 'bg-white/15 hover:bg-white/25 text-white border border-white/30 backdrop-blur-sm shadow-xs'
                      : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-300'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Resident Login</span>
                </button>
              )}

              <button
                onClick={() => handleItemClick('estate_levy')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-white font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-xs ${
                  isHeroTransparent
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-emerald-900 hover:bg-emerald-800'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Pay Levy</span>
              </button>
            </div>

            {/* Mobile Header Action & Toggle (Below xl) */}
            <div className="flex xl:hidden items-center gap-1.5">
              <button
                onClick={() => handleItemClick('estate_levy')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 whitespace-nowrap ${
                  isHeroTransparent
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-900 text-white'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Pay</span>
              </button>

              {currentResident ? (
                <button
                  onClick={() => handleItemClick('resident_portal')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                    isHeroTransparent
                      ? 'bg-emerald-900/90 text-white border border-emerald-500/50'
                      : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>My Account</span>
                </button>
              ) : (
                <button
                  onClick={() => onOpenResidentLogin('login')}
                  className={`px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                    isHeroTransparent
                      ? 'bg-white/15 text-white border border-white/25'
                      : 'bg-slate-100 text-slate-800 border border-slate-200'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Login</span>
                </button>
              )}

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`p-2 rounded-xl transition-colors cursor-pointer border ${
                  isHeroTransparent
                    ? 'text-white hover:bg-white/10 border-white/25'
                    : 'text-slate-700 hover:bg-slate-100 border-slate-200'
                }`}
                aria-label="Toggle Navigation Menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="xl:hidden border-t border-slate-200 bg-white text-slate-900 shadow-2xl animate-in slide-in-from-top-2 duration-200 w-full">
            <div className="max-w-full px-4 py-4 space-y-3 max-h-[85vh] overflow-y-auto">
              {currentResident ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                        Signed In Resident
                      </p>
                      <p className="text-xs font-bold text-emerald-950">{currentResident.full_name}</p>
                      <p className="text-[11px] text-emerald-800 font-mono">
                        Resident #{currentResident.resident_number} • {currentResident.house_number || `Plot #${currentResident.resident_number}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t border-emerald-200/60">
                    <button
                      onClick={() => handleItemClick('resident_portal')}
                      className="flex-1 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-lg cursor-pointer text-center flex items-center justify-center gap-1.5"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Resident Dashboard</span>
                    </button>
                    <button
                      onClick={handleLogout}
                      className="px-3 py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1"
                    >
                      <LogOut className="w-3 h-3 text-rose-600" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-amber-950">Registered Resident (001 - 100)?</p>
                    <p className="text-[11px] text-amber-800">Activate your resident ID for online access</p>
                  </div>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenResidentLogin('activate');
                    }}
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs cursor-pointer whitespace-nowrap"
                  >
                    Activate
                  </button>
                </div>
              )}

              {/* Navigation Items */}
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 pb-1">
                  Estate Navigation
                </p>
                {publicNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    currentTab === item.tab ||
                    (item.tab === 'public_announcements' && currentTab === 'announcement_detail');
                  return (
                    <button
                      key={item.tab}
                      onClick={() => handleItemClick(item.tab)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-emerald-900 text-white font-bold'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.count !== undefined && item.count > 0 && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                          {item.count} new
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    const welcomeEl = document.getElementById('welcome');
                    if (welcomeEl) {
                      welcomeEl.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer border border-slate-200"
                >
                  <Compass className="w-4 h-4 text-[#0F382A]" />
                  <span>Explore the Estate</span>
                </button>

                {!currentResident ? (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenResidentLogin('login');
                    }}
                    className="w-full py-2.5 rounded-xl bg-[#0F382A] hover:bg-[#134E39] text-white font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <UserCheck className="w-4 h-4 text-emerald-300" />
                    <span>Enter Resident Portal</span>
                  </button>
                ) : (
                  <button
                    onClick={handleLogout}
                    className="w-full py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-rose-600" />
                    <span>Sign Out of Resident Account</span>
                  </button>
                )}

                <button
                  onClick={() => handleItemClick('verify_receipt')}
                  className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Verify Payment Receipt</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </header>
    </div>
  );
};

export default PublicNavbar;
