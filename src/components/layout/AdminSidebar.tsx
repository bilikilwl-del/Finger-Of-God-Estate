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
  X
} from 'lucide-react';
import { NavigationTab, EstateSettings } from '../../types/database';
import { isSupabaseConfigured } from '../../lib/supabase';

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
  const navItems: { id: NavigationTab; label: string; icon: React.FC<{ className?: string }>; badge?: string | number; stage?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'residents', label: 'Residents', icon: Users, badge: residentCount },
    { id: 'payments', label: 'Payments', icon: CreditCard, stage: 2 },
    { id: 'outstanding', label: 'Outstanding Payments', icon: AlertCircle, stage: 2 },
    { id: 'sms', label: 'SMS Reminders', icon: MessageSquare, stage: 3 },
    { id: 'reports', label: 'Reports', icon: FileText, stage: 3 },
    { id: 'announcements', label: 'Announcements', icon: Bell, stage: 3 },
    { id: 'admins', label: 'Admin Users', icon: ShieldCheck, stage: 3 },
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
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-950/40 shrink-0">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display font-bold text-sm leading-tight text-white truncate tracking-tight">
                {estateSettings.estate_name || 'Finger of God Estate'}
              </h1>
              <p className="text-[11px] text-slate-400 truncate mt-0.5 flex items-center gap-1.5">
                <span>Security Levy</span>
                <span className="text-slate-600">·</span>
                <span className="text-emerald-400 font-medium">Stage 5 Active</span>
              </p>
            </div>
          </div>
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
            Core Modules
          </div>

          {navItems.slice(0, 5).map((item) => {
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
                {item.id === 'payments' ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Paystack
                  </span>
                ) : item.id === 'sms' ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    Auto SMS
                  </span>
                ) : item.badge !== undefined ? (
                  <span className={`text-xs font-mono font-medium px-2 py-0.5 rounded-md ${isActive ? 'bg-emerald-700 text-white' : 'bg-slate-800 text-slate-300'}`}>
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}

          <div className="pt-4 px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Upcoming Stages</span>
            <span className="text-[10px] text-slate-400 font-normal">Future</span>
          </div>

          {navItems.slice(5, 8).map((item) => {
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
                  w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer
                  ${isActive 
                    ? 'bg-slate-800 text-white border border-slate-700' 
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'}
                `}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0 text-slate-400" />
                  <span>{item.label}</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 font-mono border border-slate-700/50">
                  Stage {item.stage || 5}
                </span>
              </button>
            );
          })}

          <div className="pt-4 px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            System & Logs
          </div>

          {navItems.slice(8).map((item) => {
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
                  w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
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
                <p className="text-xs font-semibold text-white truncate">
                  {adminUser.full_name || 'Administrator'}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  {adminUser.email}
                </p>
              </div>
              <button
                onClick={onLogout}
                title="Sign out"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <span>Admin Sign In</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
