import React, { useState } from 'react';
import {
  Shield,
  Coins,
  Zap,
  CreditCard,
  Users,
  Layers,
  Bell,
  FileText,
  Phone,
  Home,
  Menu,
  X,
  UserCheck,
  ChevronDown,
  Lock,
  Sparkles,
  MapPin,
  Mail,
  CheckCircle2,
  ExternalLink,
  Search
} from 'lucide-react';
import { NavigationTab, EstateSettings, Resident } from '../../types/database';
import { EstateLogo } from '../common/EstateLogo';

export interface PublicNavbarProps {
  currentTab: NavigationTab;
  estateSettings: EstateSettings;
  currentResident?: Resident | null;
  onNavigate: (tab: NavigationTab) => void;
  onOpenResidentLogin: (initialTab?: 'login' | 'activate') => void;
  onOpenAdminLogin: () => void;
  unreadAnnouncementsCount?: number;
}

export const PublicNavbar: React.FC<PublicNavbarProps> = ({
  currentTab,
  estateSettings,
  currentResident,
  onNavigate,
  onOpenResidentLogin,
  onOpenAdminLogin,
  unreadAnnouncementsCount = 0
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);

  // Primary Web & Mobile Nav Items
  const primaryNavItems = [
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
      tab: 'public_residents' as NavigationTab,
      label: 'Residents',
      icon: Users
    },
    {
      tab: 'public_announcements' as NavigationTab,
      label: 'Announcements',
      icon: Bell,
      count: unreadAnnouncementsCount > 0 ? unreadAnnouncementsCount : undefined
    }
  ];

  // Secondary items in the "More" dropdown
  const moreNavItems = [
    {
      tab: 'projects_overview' as NavigationTab,
      label: 'All Projects',
      subtitle: 'Infrastructure & developmental projects',
      icon: Layers
    },
    {
      tab: 'documents' as NavigationTab,
      label: 'Documents & Bylaws',
      subtitle: 'Official estate constitution and policies',
      icon: FileText
    },
    {
      tab: 'verify_receipt' as NavigationTab,
      label: 'Verify Stamped Receipt',
      subtitle: 'Authenticate security and levy receipts',
      icon: CheckCircle2
    },
    {
      tab: 'contact' as NavigationTab,
      label: 'Contact & Support',
      subtitle: 'Estate office, helpline & inquiries',
      icon: Phone
    }
  ];

  const handleItemClick = (tab: NavigationTab) => {
    setMobileMenuOpen(false);
    setMoreDropdownOpen(false);
    onNavigate(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isMoreActive = [
    'projects_overview',
    'documents',
    'verify_receipt',
    'contact'
  ].includes(currentTab);

  return (
    <div className="w-full relative z-40">
      {/* 1. Pre-Header Top Bar (Web / Desktop view) */}
      <div className="hidden lg:block bg-slate-900 text-slate-300 border-b border-slate-800 text-[11px] font-medium py-1.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Left: Estate Location & Access Control Badge */}
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-slate-300">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Phase 1, Iyiaba, Asaba, Delta State</span>
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-700"></span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>24/7 Security Patrol & Access Control Active</span>
            </span>
          </div>

          {/* Right: Quick Contact & Verification */}
          <div className="flex items-center gap-4 text-slate-300">
            <span className="flex items-center gap-1.5">
              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
              <span>Helpline: <strong className="text-white font-mono">{estateSettings.contact_phone || '08023456789'}</strong></span>
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-700"></span>
            <button
              onClick={() => handleItemClick('verify_receipt')}
              className="flex items-center gap-1 text-slate-300 hover:text-emerald-400 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>Verify Stamped Receipt</span>
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

      {/* 2. Main Header / Navigation Bar */}
      <header className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-18 sm:h-20 gap-3">
            
            {/* 1. Finger of God Estate Identity & Brand */}
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

            {/* 2. Desktop Navigation Menu: Clean, well-spaced, perfectly aligned */}
            <nav className="hidden xl:flex items-center gap-1 lg:gap-1.5">
              {primaryNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.tab || (item.tab === 'public_announcements' && currentTab === 'announcement_detail');
                return (
                  <button
                    key={item.tab}
                    onClick={() => handleItemClick(item.tab)}
                    className={`px-3 py-2 text-xs lg:text-[13px] font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
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

              {/* More / Documents & Support Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
                  onBlur={() => setTimeout(() => setMoreDropdownOpen(false), 250)}
                  className={`px-3 py-2 text-xs lg:text-[13px] font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                    isMoreActive
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'text-slate-700 hover:text-emerald-800 hover:bg-slate-100/90'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>More</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${moreDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {moreDropdownOpen && (
                  <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 py-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 pb-1.5 mb-1 border-b border-slate-100">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Additional Services</p>
                    </div>
                    {moreNavItems.map((mItem) => {
                      const MIcon = mItem.icon;
                      const isMActive = currentTab === mItem.tab;
                      return (
                        <button
                          key={mItem.tab}
                          onClick={() => handleItemClick(mItem.tab)}
                          className={`w-full text-left px-3.5 py-2 flex items-start gap-3 hover:bg-slate-50 transition-colors ${
                            isMActive ? 'bg-emerald-50 text-emerald-950 font-bold' : 'text-slate-700'
                          }`}
                        >
                          <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                            isMActive ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'
                          }`}>
                            <MIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">{mItem.label}</p>
                            <p className="text-[11px] text-slate-500 leading-tight">{mItem.subtitle}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </nav>

            {/* Compressed Desktop Nav for Large Screens (1024px to 1279px) */}
            <nav className="hidden lg:flex xl:hidden items-center gap-1">
              {primaryNavItems.slice(0, 4).map((item) => {
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

              <div className="relative">
                <button
                  onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
                  onBlur={() => setTimeout(() => setMoreDropdownOpen(false), 250)}
                  className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                    isMoreActive || ['estate_levy', 'public_residents', 'public_announcements'].includes(currentTab)
                      ? 'bg-emerald-100 text-emerald-900'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>Services</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {moreDropdownOpen && (
                  <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 py-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    {[...primaryNavItems.slice(4), ...moreNavItems].map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.tab}
                          onClick={() => handleItemClick(item.tab)}
                          className="w-full text-left px-3.5 py-2 flex items-center gap-2.5 hover:bg-slate-50 text-xs font-semibold text-slate-700"
                        >
                          <Icon className="w-4 h-4 text-emerald-700 shrink-0" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </nav>

            {/* 3. Action Buttons & Separation (Web / Desktop View) */}
            <div className="hidden lg:flex items-center gap-2 shrink-0">
              
              {/* Resident Sign In / Profile status */}
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
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-colors cursor-pointer border border-slate-300"
                >
                  <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Resident Login</span>
                </button>
              )}

              {/* Primary Payment Action CTA */}
              <button
                onClick={() => handleItemClick('estate_levy')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs transition-all shadow-xs hover:shadow-md cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Make Payment</span>
              </button>

              {/* Divider */}
              <div className="h-6 w-[1px] bg-slate-200 mx-0.5"></div>

              {/* Separated Administrator Console Access */}
              <button
                onClick={onOpenAdminLogin}
                className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                title="Estate Administration Console Sign In"
              >
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Admin</span>
              </button>
            </div>

            {/* 4. Mobile Menu Toggle Button */}
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

        {/* 5. Mobile Responsive Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white shadow-2xl animate-in slide-in-from-top-2 duration-200">
            <div className="max-w-7xl mx-auto px-4 py-5 space-y-4 max-h-[85vh] overflow-y-auto">
              
              {/* Signed-in Resident Banner */}
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

              {/* Core Navigation Links */}
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 pb-1">Estate Navigation</p>
                {primaryNavItems.map((item) => {
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

              {/* Additional Project & Document Links */}
              <div className="pt-2 border-t border-slate-100 space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 pb-1">Additional Services</p>
                {moreNavItems.map((mItem) => {
                  const MIcon = mItem.icon;
                  const isMActive = currentTab === mItem.tab;
                  return (
                    <button
                      key={mItem.tab}
                      onClick={() => handleItemClick(mItem.tab)}
                      className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-semibold rounded-xl transition-colors cursor-pointer ${
                        isMActive ? 'bg-emerald-100 text-emerald-900 font-bold' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <MIcon className="w-4 h-4 text-slate-400" />
                        <span>{mItem.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Authentication & Quick Action Buttons */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                {!currentResident && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenResidentLogin('login');
                      }}
                      className="py-2.5 rounded-xl bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-300"
                    >
                      <UserCheck className="w-4 h-4 text-emerald-700" />
                      <span>Resident Login</span>
                    </button>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenResidentLogin('activate');
                      }}
                      className="py-2.5 rounded-xl bg-emerald-50 text-emerald-900 font-bold text-xs flex items-center justify-center gap-1.5 border border-emerald-300"
                    >
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>Activate Account</span>
                    </button>
                  </div>
                )}

                <button
                  onClick={() => handleItemClick('estate_levy')}
                  className="w-full py-2.5 rounded-xl bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Make Security / Levy Payment</span>
                </button>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAdminLogin();
                  }}
                  className="w-full py-2 text-slate-500 hover:text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 pt-1"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Administrator Sign In</span>
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
