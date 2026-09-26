import React, { useState } from 'react';
import {
  Shield,
  Coins,
  Zap,
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
  Users
} from 'lucide-react';
import { NavigationTab, EstateSettings, Resident } from '../../types/database';
import { EstateLogo } from '../common/EstateLogo';

export interface PublicNavbarProps {
  currentTab: NavigationTab;
  estateSettings: EstateSettings;
  currentResident?: Resident | null;
  onNavigate: (tab: NavigationTab) => void;
  onOpenResidentLogin: (initialTab?: 'login' | 'activate') => void;
  unreadAnnouncementsCount?: number;
}

export const PublicNavbar: React.FC<PublicNavbarProps> = ({
  currentTab,
  estateSettings,
  currentResident,
  onNavigate,
  onOpenResidentLogin,
  unreadAnnouncementsCount = 0
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Official Public Structure
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
      tab: 'light_project' as NavigationTab,
      label: 'Light Project',
      icon: Zap
    },
    {
      tab: 'estate_levy' as NavigationTab,
      label: 'Estate Levy',
      icon: CreditCard
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
    <div className="w-full relative z-40">
      {/* 1. Pre-Header Top Bar */}
      <div className="hidden lg:block bg-slate-900 text-slate-300 border-b border-slate-800 text-[11px] font-medium py-1.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Left: Location & Security Badge */}
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-slate-300">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{estateSettings.estate_address || 'Phase 1, Iyiaba, Asaba, Delta State'}</span>
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-700"></span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>24/7 Security Patrol & Access Control Active</span>
            </span>
          </div>

          {/* Right: Hotline & Actions */}
          <div className="flex items-center gap-4 text-slate-300">
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
              <span>Activate Resident ID (001 - 300)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Header Navigation Bar */}
      <header className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-18 sm:h-20 gap-3">
            {/* Logo */}
            <div 
              className="flex items-center cursor-pointer select-none shrink-0 group transition-transform duration-150"
              onClick={() => handleItemClick('home')}
              title="Finger of God Estate - Home"
            >
              <EstateLogo
                size="md"
                variant="horizontal"
                theme="light"
                estateName={estateSettings.estate_name || 'Finger of God Estate'}
                subtitle="ESTATE MANAGEMENT & RESIDENT PLATFORM"
                hideSubtitleOnMobile={true}
              />
            </div>

            {/* Desktop Navigation Menu */}
            <nav className="hidden xl:flex items-center gap-1">
              {publicNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.tab || (item.tab === 'public_announcements' && currentTab === 'announcement_detail');
                return (
                  <button
                    key={item.tab}
                    onClick={() => handleItemClick(item.tab)}
                    className={`px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
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

            {/* Compressed Desktop Nav for Large Screens (1024px to 1279px) */}
            <nav className="hidden lg:flex xl:hidden items-center gap-1">
              {publicNavItems.slice(0, 6).map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.tab;
                return (
                  <button
                    key={item.tab}
                    onClick={() => handleItemClick(item.tab)}
                    className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                      isActive
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'text-slate-700 hover:text-emerald-800 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Desktop Action CTAs */}
            <div className="hidden lg:flex items-center gap-2 shrink-0">
              {currentResident ? (
                <button
                  onClick={() => handleItemClick('resident_portal')}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold text-xs hover:bg-emerald-100 transition-colors cursor-pointer shadow-2xs"
                  title={`Signed in as ${currentResident.full_name}`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="truncate max-w-[100px]">{currentResident.full_name.split(' ')[0]}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-emerald-200 text-emerald-950 rounded font-mono font-bold">
                    #{currentResident.resident_number}
                  </span>
                </button>
              ) : (
                <button
                  onClick={() => onOpenResidentLogin('login')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-colors cursor-pointer border border-slate-300"
                >
                  <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Resident Login</span>
                </button>
              )}

              <button
                onClick={() => handleItemClick('estate_levy')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-all shadow-xs hover:shadow-md cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Pay Security Levy</span>
              </button>
            </div>

            {/* Mobile Menu Toggle Button */}
            <div className="flex lg:hidden items-center gap-2">
              {currentResident && (
                <button
                  onClick={() => handleItemClick('resident_portal')}
                  className="px-2.5 py-1.5 bg-emerald-100 text-emerald-900 rounded-lg text-xs font-bold flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  <span>#{currentResident.resident_number}</span>
                </button>
              )}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2.5 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
                aria-label="Toggle Navigation Menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white shadow-2xl animate-in slide-in-from-top-2 duration-200">
            <div className="max-w-7xl mx-auto px-4 py-5 space-y-4 max-h-[85vh] overflow-y-auto">
              {currentResident ? (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Signed In Resident</p>
                    <p className="text-sm font-bold text-emerald-950">{currentResident.full_name}</p>
                    <p className="text-xs text-emerald-800 font-mono">Resident #{currentResident.resident_number} • {currentResident.house_number}</p>
                  </div>
                  <button
                    onClick={() => handleItemClick('resident_portal')}
                    className="px-3 py-1.5 bg-emerald-700 text-white text-xs font-bold rounded-xl"
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
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 pb-1">Estate Navigation</p>
                {publicNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.tab || (item.tab === 'public_announcements' && currentTab === 'announcement_detail');
                  return (
                    <button
                      key={item.tab}
                      onClick={() => handleItemClick(item.tab)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-emerald-700 text-white font-bold'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
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
              <div className="pt-3 border-t border-slate-100 space-y-2">
                {!currentResident && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenResidentLogin('login');
                      }}
                      className="py-2.5 rounded-xl bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-300 cursor-pointer"
                    >
                      <UserCheck className="w-4 h-4 text-emerald-700" />
                      <span>Resident Login</span>
                    </button>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenResidentLogin('activate');
                      }}
                      className="py-2.5 rounded-xl bg-emerald-50 text-emerald-900 font-bold text-xs flex items-center justify-center gap-1.5 border border-emerald-300 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>Activate ID</span>
                    </button>
                  </div>
                )}

                <button
                  onClick={() => handleItemClick('estate_levy')}
                  className="w-full py-2.5 rounded-xl bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Make Security Payment</span>
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
