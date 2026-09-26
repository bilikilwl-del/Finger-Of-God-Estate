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
  ArrowRight
} from 'lucide-react';
import { NavigationTab, EstateSettings, Resident } from '../../types/database';
import { EstateLogo } from '../common/EstateLogo';

interface PublicNavbarProps {
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
  const [projectsDropdownOpen, setProjectsDropdownOpen] = useState(false);

  // Recommended Core Navigation Items (Simple, focused, clean)
  const mainNavItems = [
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
      tab: 'public_residents' as NavigationTab,
      label: 'Residents',
      icon: Users
    },
    {
      tab: 'public_announcements' as NavigationTab,
      label: 'Announcements',
      icon: Bell,
      count: unreadAnnouncementsCount > 0 ? unreadAnnouncementsCount : undefined
    },
    {
      tab: 'contact' as NavigationTab,
      label: 'Contact',
      icon: Phone
    }
  ];

  // Secondary Project & Document Links (Accessible via Projects dropdown & mobile drawer)
  const secondaryNavItems = [
    {
      tab: 'estate_levy' as NavigationTab,
      label: 'Estate Levy',
      subtitle: 'Monthly security dues & payments',
      icon: CreditCard
    },
    {
      tab: 'road_project' as NavigationTab,
      label: 'Road Project',
      subtitle: 'Interlocking & drainage ledger',
      icon: Coins
    },
    {
      tab: 'light_project' as NavigationTab,
      label: 'Light Project',
      subtitle: 'Substation & solar streetlights',
      icon: Zap
    },
    {
      tab: 'projects_overview' as NavigationTab,
      label: 'All Projects',
      subtitle: 'Estate infrastructure overview',
      icon: Layers
    },
    {
      tab: 'documents' as NavigationTab,
      label: 'Documents',
      subtitle: 'Bylaws, forms & guidelines',
      icon: FileText
    }
  ];

  const handleItemClick = (tab: NavigationTab) => {
    setMobileMenuOpen(false);
    setProjectsDropdownOpen(false);
    onNavigate(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isSecondaryActive = [
    'road_project',
    'light_project',
    'estate_levy',
    'projects_overview',
    'documents'
  ].includes(currentTab);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          
          {/* 1. Finger of God Estate Identity - Always links to Home */}
          <div 
            className="flex items-center cursor-pointer select-none shrink-0"
            onClick={() => handleItemClick('home')}
            title="Finger of God Estate - Home"
          >
            <EstateLogo
              size="sm"
              variant="horizontal"
              theme="light"
              estateName={estateSettings.estate_name || 'Finger of God Estate'}
              subtitle="ESTATE MANAGEMENT & RESIDENT PLATFORM"
              hideSubtitleOnMobile={true}
            />
          </div>

          {/* 2. Desktop Navigation Bar: Clean, uncluttered, properly spaced */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.tab || (item.tab === 'public_announcements' && currentTab === 'announcement_detail');
              return (
                <button
                  key={item.tab}
                  onClick={() => handleItemClick(item.tab)}
                  className={`px-3 py-2 text-xs xl:text-sm font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                    isActive
                      ? 'bg-emerald-700 text-white shadow-xs font-bold'
                      : 'text-slate-700 hover:text-emerald-800 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                  {item.count !== undefined && item.count > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-white text-emerald-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Projects & Services Dropdown for Secondary Navigation */}
            <div className="relative">
              <button
                onClick={() => setProjectsDropdownOpen(!projectsDropdownOpen)}
                onBlur={() => setTimeout(() => setProjectsDropdownOpen(false), 200)}
                className={`px-3 py-2 text-xs xl:text-sm font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  isSecondaryActive
                    ? 'bg-emerald-100 text-emerald-900 font-bold border border-emerald-300'
                    : 'text-slate-700 hover:text-emerald-800 hover:bg-slate-100'
                }`}
              >
                <Layers className="w-4 h-4 text-slate-500 shrink-0" />
                <span>Projects & Levy</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${projectsDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {projectsDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {secondaryNavItems.map((sItem) => {
                    const SIcon = sItem.icon;
                    const isSActive = currentTab === sItem.tab;
                    return (
                      <button
                        key={sItem.tab}
                        onClick={() => handleItemClick(sItem.tab)}
                        className={`w-full text-left px-4 py-2.5 flex items-start gap-3 hover:bg-slate-50 transition-colors ${
                          isSActive ? 'bg-emerald-50 text-emerald-900 font-bold' : 'text-slate-700'
                        }`}
                      >
                        <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700 shrink-0 mt-0.5">
                          <SIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{sItem.label}</p>
                          <p className="text-[11px] text-slate-500 leading-tight">{sItem.subtitle}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>

          {/* 3. Clearly Separated Authentication Buttons */}
          <div className="hidden lg:flex items-center gap-2.5 shrink-0">
            {/* Resident Sign In / Profile */}
            {currentResident ? (
              <button
                onClick={() => handleItemClick('resident_portal')}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold text-xs hover:bg-emerald-100 transition-colors cursor-pointer shadow-2xs"
                title={`Signed in as ${currentResident.full_name}`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="truncate max-w-[120px]">{currentResident.full_name.split(' ')[0]}</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-emerald-200 text-emerald-900 rounded font-mono font-bold">
                  #{currentResident.resident_number}
                </span>
              </button>
            ) : (
              <button
                onClick={() => onOpenResidentLogin('login')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-colors cursor-pointer border border-slate-300"
              >
                <UserCheck className="w-4 h-4 text-emerald-700" />
                <span>Resident Login</span>
              </button>
            )}

            {/* Security Payment Quick Action */}
            <button
              onClick={() => handleItemClick('estate_levy')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-all shadow-xs hover:shadow-sm cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              <span>Make Payment</span>
            </button>

            {/* Separated Admin Login */}
            <button
              onClick={onOpenAdminLogin}
              className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
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
          <div className="max-w-7xl mx-auto px-4 py-5 space-y-3 max-h-[85vh] overflow-y-auto">
            {/* Signed-in Resident Banner */}
            {currentResident && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-emerald-700 uppercase">Signed In Resident</p>
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
            )}

            {/* Core Navigation Links */}
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 pb-1">Main Menu</p>
              {mainNavItems.map((item) => {
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

            {/* Secondary Project & Dues Links */}
            <div className="pt-2 border-t border-slate-100 space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 pb-1">Projects & Services</p>
              {secondaryNavItems.map((sItem) => {
                const SIcon = sItem.icon;
                const isSActive = currentTab === sItem.tab;
                return (
                  <button
                    key={sItem.tab}
                    onClick={() => handleItemClick(sItem.tab)}
                    className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-semibold rounded-xl transition-colors cursor-pointer ${
                      isSActive ? 'bg-emerald-100 text-emerald-900 font-bold' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <SIcon className="w-4 h-4 text-slate-400" />
                      <span>{sItem.label}</span>
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
                <span>Make Security Payment</span>
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAdminLogin();
                }}
                className="w-full py-2 text-slate-500 hover:text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 pt-1"
              >
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Administrator Login</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
