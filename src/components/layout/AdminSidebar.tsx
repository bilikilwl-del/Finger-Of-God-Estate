import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  AlertCircle, 
  MessageSquare, 
  FileText, 
  Bell, 
  ShieldCheck, 
  Settings, 
  History,
  Database,
  LogOut,
  Building2,
  CheckCircle2,
  X,
  UserCheck,
  FileCheck,
  Globe,
  DoorOpen,
  Coins
} from 'lucide-react';
import { NavigationTab, EstateSettings } from '../../types/database';
import { isSupabaseConfigured } from '../../lib/supabase';
import { EstateLogo } from '../common/EstateLogo';

interface AdminSidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  estateSettings: EstateSettings;
  adminUser: { email: string; full_name?: string; role?: string } | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenSqlModal: () => void;
  residentCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentTab,
  onSelectTab,
  estateSettings,
  adminUser,
  onOpenAuth,
  onLogout,
  onOpenSqlModal,
  residentCount,
  mobileOpen,
  onCloseMobile
}) => {
  const mainNavItems: { id: NavigationTab; label: string; icon: React.FC<{ className?: string }>; badge?: string | number; tag?: string }[] = [
    { id: 'dashboard', label: 'Admin Dashboard', icon: LayoutDashboard },
    { id: 'gate_security', label: 'Gate Security & Access', icon: DoorOpen, tag: 'Stage 11' },
    { id: 'security_ops', label: 'Security Operations', icon: ShieldCheck, tag: 'Stage 10' },
    { id: 'residents', label: 'Resident Directory', icon: Users, badge: residentCount },
    { id: 'paid_residents', label: 'Paid Residents', icon: CheckCircle2 },
    { id: 'unpaid_residents', label: 'Unpaid Residents', icon: AlertCircle },
    { id: 'outstanding', label: 'Outstanding Levies', icon: AlertCircle },
    { id: 'payments', label: 'Paystack Transactions', icon: CreditCard, tag: 'Gateway' },
    { id: 'road_project_admin', label: 'Road Project Ledger', icon: Coins, tag: 'Capital' },
    { id: 'reports', label: 'Financial Reports', icon: FileText, tag: 'Export' },
    { id: 'sms', label: 'SMS Reminders', icon: MessageSquare, tag: 'Auto SMS' },
    { id: 'announcements', label: 'Announcements & Notices', icon: Bell, tag: 'Stage 8' }
  ];

  const systemNavItems: { id: NavigationTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'system_administration', label: 'System Administration', icon: ShieldCheck },
    { id: 'settings', label: 'Estate Settings', icon: Settings },
    { id: 'logs', label: 'Activity Logs', icon: History }
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 w-72 bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800 transition-transform duration-300 ease-in-out
        lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <EstateLogo
            size="sm"
            variant="horizontal"
            theme="dark"
            estateName={estateSettings.estate_name || 'Finger of God Estate'}
            subtitle="ADMIN CONSOLE • ASABA"
            onClick={() => onSelectTab('dashboard')}
          />
          <button 
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Estate Management
          </div>

          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
                className={`
                  w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer
                  ${isActive 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'}
                `}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.tag ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {item.tag}
                  </span>
                ) : item.badge !== undefined ? (
                  <span className={`text-xs font-mono font-medium px-2 py-0.5 rounded-md ${isActive ? 'bg-emerald-700 text-white' : 'bg-slate-800 text-slate-300'}`}>
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}

          {/* Stage 6 & 8: Resident & Public Portals */}
          <div className="pt-4 px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
            <span>Resident & Public</span>
            <span className="text-[10px] text-emerald-400 font-mono px-1.5 py-0.2 rounded bg-emerald-950/60 border border-emerald-800/60">Stage 8</span>
          </div>

          <button
            onClick={() => {
              onSelectTab('home');
              onCloseMobile();
            }}
            className={`
              w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer
              ${currentTab === 'home'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'}
            `}
          >
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Estate Homepage</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Main
            </span>
          </button>

          <button
            onClick={() => {
              onSelectTab('security_public');
              onCloseMobile();
            }}
            className={`
              w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer
              ${currentTab === 'security_public'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'}
            `}
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Security Department</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Public
            </span>
          </button>

          <button
            onClick={() => {
              onSelectTab('resident_portal');
              onCloseMobile();
            }}
            className={`
              w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer
              ${currentTab === 'resident_portal'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-emerald-300 hover:bg-slate-800/80 hover:text-white'}
            `}
          >
            <div className="flex items-center gap-3">
              <UserCheck className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Resident Portal</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Live
            </span>
          </button>

          <button
            onClick={() => {
              onSelectTab('road_project');
              onCloseMobile();
            }}
            className={`
              w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer
              ${currentTab === 'road_project'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-amber-300 hover:bg-slate-800/80 hover:text-white'}
            `}
          >
            <div className="flex items-center gap-3">
              <Coins className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Road Project Ledger</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Public
            </span>
          </button>

          <button
            onClick={() => {
              onSelectTab('public_announcements');
              onCloseMobile();
            }}
            className={`
              w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer
              ${currentTab === 'public_announcements'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'}
            `}
          >
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 shrink-0 text-blue-400" />
              <span>Public Bulletins</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Notices
            </span>
          </button>

          <button
            onClick={() => {
              onSelectTab('verify_receipt');
              onCloseMobile();
            }}
            className={`
              w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer
              ${currentTab === 'verify_receipt'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'}
            `}
          >
            <div className="flex items-center gap-3">
              <FileCheck className="w-4 h-4 shrink-0 text-slate-400" />
              <span>Verify Receipt</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              Public
            </span>
          </button>

          <div className="pt-4 px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            System & Logs
          </div>

          {systemNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
                className={`
                  w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer
                  ${isActive 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'}
                `}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Supabase Status / Architecture Card */}
        <div className="p-3 mx-3 my-2 bg-slate-800/60 rounded-xl border border-slate-700/50 text-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-slate-400 flex items-center gap-1.5 font-medium">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              Database Engine
            </span>
            {isSupabaseConfigured ? (
              <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Connected
              </span>
            ) : (
              <span className="text-[10px] text-amber-300 font-medium">
                Local Sandbox
              </span>
            )}
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            {isSupabaseConfigured 
              ? 'Connected to live Supabase PostgreSQL backend.' 
              : 'Running in resilient local persistence. Connect Supabase anytime.'}
          </p>
          <button
            onClick={onOpenSqlModal}
            className="mt-2 w-full py-1.5 px-2 bg-slate-700/80 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-[11px] font-medium transition-colors flex items-center justify-center gap-1.5"
          >
            <span>View Supabase SQL Schema</span>
          </button>
        </div>

        {/* User Account / Auth Section */}
        <div className="p-3 border-t border-slate-800/80">
          {adminUser ? (
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/40">
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-semibold text-white truncate">
                    {adminUser.full_name || 'Administrator'}
                  </p>
                  <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {adminUser.role || 'SUPER_ADMIN'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  {adminUser.email}
                </p>
              </div>
              <button
                onClick={onLogout}
                title="Sign out"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Admin Sign In</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
