import React, { useState } from 'react';
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
  Sparkles,
  MapPin,
  CheckCircle2,
  Users,
  Vote
} from 'lucide-react';
import { NavigationTab, EstateSettings, Resident } from '../../types/database';
import { EstateLogo } from '../common/EstateLogo';

export interface PublicNavbarProps {
  currentTab: NavigationTab;
  estateSettings: EstateSettings;
  currentResident?: Resident | null;
  adminUser?: any | null;
  onNavigate: (tab: NavigationTab) => void;
  onOpenResidentLogin: (initialTab?: 'login' | 'activate') => void;
  unreadAnnouncementsCount?: number;
}

export const PublicNavbar: React.FC<PublicNavbarProps> = ({
  currentTab,
  estateSettings,
  currentResident,
  adminUser,
  onNavigate,
  onOpenResidentLogin,
  unreadAnnouncementsCount = 0
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Official Public Structure (Light project removed)
  const publicNavItems = [
    {
      tab: 'home' as NavigationTab,
      label: 'Home',
      icon: Home
    },
    {
      tab: 'security_public' as NavigationTab,
      label: 'Security',
      icon: Shield
    },
    {
      tab: 'road_project' as NavigationTab,
      label: 'Road Project',
      icon: Coins
    },
    {
      tab: 'estate_levy' as NavigationTab,
      label: 'Estate Levy',
      icon: CreditCard
    },
    {
      tab: 'election' as NavigationTab,
      label: 'Election',
      icon: Vote
    },
    {
      tab: 'resident_portal' as NavigationTab,
      label: 'Resident Portal',
      icon: Users
    },
    {
      tab: 'public_announcements' as NavigationTab,
      label: 'Announcements',
      icon: Bell,
      count: unreadAnnouncementsCount > 0 ? unreadAnnouncementsCount : undefined
    },
    {
      tab: 'documents' as NavigationTab,
      label: 'Documents',
      icon: FileText
    },
    {
      tab: 'contact' as NavigationTab,
      label: 'Contact',
      icon: Phone
    }
  ];

  const handleItemClick = (tab: NavigationTab) => {
    setMobileMenuOpen(false);
    if (tab === 'resident_portal' && !currentResident) {
      onOpenResidentLogin('login');
      return;
    }
    onNavigate(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="w-full relative z-40 bg-white shadow-xs">
      {/* 1. Pre-Header Top Bar */}
      <div className="hidden lg:block bg-slate-900 text-slate-300 border-b border-slate-800 text-[11px] font-medium py-1.5 px-3 sm:px-6 w-full">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-3">
          {/* Left: Location & Security Badge */}
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex items-center gap-1.5 text-slate-300 min-w-0">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate max-w-[220px] xl:max-w-[340px] 2xl:max-w-none">{estateSettings.estate_address || 'Phase 1, Iyiaba, Asaba, Delta State'}</span>
            </span>
            <span className="hidden xl:inline-block w-1 h-1 rounded-full bg-slate-700 shrink-0"></span>
            <span className="hidden xl:flex items-center gap-1.5 text-emerald-400 font-semibold shrink-0">
              <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>24/7 Security Patrol & Access Control Active</span>
            </span>
          </div>

          {/* Right: Hotline & Actions */}
          <div className="flex items-center gap-3 text-slate-300 shrink-0 text-[11px]">
            <span className="flex items-center gap-1.5">
              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
              <span>Hotline: <strong className="text-white font-mono">{estateSettings.contact_phone || '08023456789'}</strong></span>
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-700"></span>
            <button
              onClick={() => handleItemClick('verify_receipt')}
              className="flex items-center gap-1 text-slate-300 hover:text-emerald-400 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>Verify Receipt</span>
            </button>
            <span className="w-1 h-1 rounded-full bg-slate-700"></span>
            <button
              onClick={() => onOpenResidentLogin('activate')}
              className="text-amber-400 hover:text-amber-300 font-semibold transition-colors cursor-pointer flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
              <span>Activate Resident ID</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Header Navigation Bar (Compact & Full-Width Compatible) */}
      <header className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs w-full">
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
                theme="light"
                estateName={estateSettings.estate_name || 'Finger of God Estate'}
                subtitle="ESTATE MANAGEMENT"
                hideSubtitleOnMobile={true}
              />
            </div>

            {/* Desktop Navigation Menu (Fluid & Compact for Full Width) */}
            <nav className="hidden xl:flex items-center gap-0.5 2xl:gap-1">
              {publicNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.tab || (item.tab === 'public_announcements' && currentTab === 'announcement_detail');
                return (
                  <button
                    key={item.tab}
                    onClick={() => handleItemClick(item.tab)}
                    className={`px-2 2xl:px-2.5 py-1.5 text-[11.5px] 2xl:text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 2xl:gap-1.5 whitespace-nowrap ${
                      isActive
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'text-slate-700 hover:text-emerald-800 hover:bg-slate-100/90'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                    {item.count !== undefined && item.count > 0 && (
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        isActive ? 'bg-white text-emerald-800' : 'bg-emerald-100 text-emerald-800 animate-pulse'
                      }`}>
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Desktop Action CTAs */}
            <div className="hidden xl:flex items-center gap-2 shrink-0">
              {currentResident ? (
                <button
                  onClick={() => handleItemClick('resident_portal')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold text-xs hover:bg-emerald-100 transition-colors cursor-pointer shadow-2xs"
                  title={`Signed in as ${currentResident.full_name}`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="truncate max-w-[90px]">{currentResident.full_name.split(' ')[0]}</span>
                  <span className="text-[10px] px-1 py-0.5 bg-emerald-200 text-emerald-950 rounded font-mono font-bold">
                    #{currentResident.resident_number}
                  </span>
                </button>
              ) : (
                <button
                  onClick={() => onOpenResidentLogin('login')}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-colors cursor-pointer border border-slate-300"
                >
                  <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Login</span>
                </button>
              )}

              <button
                onClick={() => handleItemClick('estate_levy')}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-all shadow-xs hover:shadow-md cursor-pointer whitespace-nowrap"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Pay Levy</span>
              </button>
            </div>

            {/* Mobile Header Action & Toggle (Below xl) */}
            <div className="flex xl:hidden items-center gap-1.5">
              <button
                onClick={() => handleItemClick('estate_levy')}
                className="px-2.5 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs whitespace-nowrap"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Pay</span>
              </button>

              {currentResident && (
                <button
                  onClick={() => handleItemClick('resident_portal')}
                  className="px-2 py-1.5 bg-emerald-100 text-emerald-900 rounded-lg text-xs font-bold flex items-center gap-1"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  <span>#{currentResident.resident_number}</span>
                </button>
              )}

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
                aria-label="Toggle Navigation Menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="xl:hidden border-t border-slate-200 bg-white shadow-2xl animate-in slide-in-from-top-2 duration-200 w-full">
            <div className="max-w-full px-4 py-4 space-y-3 max-h-[85vh] overflow-y-auto">
              {currentResident ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Signed In Resident</p>
                    <p className="text-xs font-bold text-emerald-950">{currentResident.full_name}</p>
                    <p className="text-[11px] text-emerald-800 font-mono">Resident #{currentResident.resident_number} • {currentResident.house_number}</p>
                  </div>
                  <button
                    onClick={() => handleItemClick('resident_portal')}
                    className="px-2.5 py-1 bg-emerald-700 text-white text-xs font-bold rounded-lg"
                  >
                    Dashboard
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-amber-950">Registered Resident (001 - 300)?</p>
                    <p className="text-[11px] text-amber-800">Activate your resident ID for online access</p>
                  </div>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenResidentLogin('activate');
                    }}
                    className="px-2.5 py-1 bg-amber-600 text-white font-bold rounded-lg text-xs"
                  >
                    Activate
                  </button>
                </div>
              )}

              {/* Navigation Items */}
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 pb-1">Estate Navigation</p>
                {publicNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.tab || (item.tab === 'public_announcements' && currentTab === 'announcement_detail');
                  return (
                    <button
                      key={item.tab}
                      onClick={() => handleItemClick(item.tab)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-emerald-700 text-white font-bold'
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
                {!currentResident && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenResidentLogin('login');
                      }}
                      className="py-2 rounded-xl bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center gap-1 border border-slate-300 cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Resident Login</span>
                    </button>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenResidentLogin('activate');
                      }}
                      className="py-2 rounded-xl bg-emerald-50 text-emerald-900 font-bold text-xs flex items-center justify-center gap-1 border border-emerald-300 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Activate ID</span>
                    </button>
                  </div>
                )}

                <button
                  onClick={() => handleItemClick('verify_receipt')}
                  className="w-full py-2 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
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
