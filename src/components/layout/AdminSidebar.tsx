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
  LogOut,
  CheckCircle2,
  X,
  DoorOpen,
  Coins,
  ArrowLeft
} from 'lucide-react';
import { NavigationTab, EstateSettings } from '../../types/database';
import { EstateLogo } from '../common/EstateLogo';

interface AdminSidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  estateSettings: EstateSettings;
  adminUser: { email: string; full_name?: string; role?: string } | null;
  onOpenAuth: () => void;
  onLogout: () => void;
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
  residentCount,
  mobileOpen,
  onCloseMobile
}) => {
  const mainNavItems: { id: NavigationTab; label: string; icon: React.FC<{ className?: string }>; badge?: string | number; tag?: string }[] = [
    { id: 'dashboard', label: 'Admin Dashboard', icon: LayoutDashboard },
    { id: 'gate_security', label: 'Gate Security & Access', icon: DoorOpen },
    { id: 'security_ops', label: 'Security Operations', icon: ShieldCheck },
    { id: 'residents', label: 'Resident Directory', icon: Users, badge: residentCount },
    { id: 'paid_residents', label: 'Paid Residents', icon: CheckCircle2 },
    { id: 'unpaid_residents', label: 'Unpaid Residents', icon: AlertCircle },
    { id: 'outstanding', label: 'Outstanding Levies', icon: AlertCircle },
    { id: 'payments', label: 'Payment Ledger', icon: CreditCard },
    { id: 'road_project_admin', label: 'Road Project Ledger', icon: Coins },
    { id: 'reports', label: 'Financial Reports', icon: FileText },
    { id: 'sms', label: 'SMS Broadcasts', icon: MessageSquare },
    { id: 'announcements', label: 'Announcements', icon: Bell }
  ];

  const systemNavItems: { id: NavigationTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'settings', label: 'Estate Settings', icon: Settings },
    { id: 'logs', label: 'Audit Activity Logs', icon: History }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`
          fixed top-0 bottom-0 left-0 z-50 w-72 bg-slate-900 text-slate-200 border-r border-slate-800
          flex flex-col transition-transform duration-200 ease-in-out
          lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Header Branding */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <EstateLogo
            size="sm"
            variant="horizontal"
            theme="dark"
            estateName={estateSettings.estate_name || 'Finger of God Estate'}
            subtitle="ADMINISTRATION CONSOLE"
          />
          <button
            onClick={onCloseMobile}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin scrollbar-thumb-slate-700">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
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
                  w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer
                  ${isActive 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'}
                `}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-4 px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            System & Governance
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
                  w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer
                  ${isActive 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'}
                `}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* User Profile & Sign Out */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60">
          {adminUser ? (
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-white truncate">
                    {adminUser.full_name || 'Administrator'}
                  </p>
                  <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {adminUser.role || 'SUPER_ADMIN'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">
                  {adminUser.email}
                </p>
              </div>
              <button
                onClick={onLogout}
                title="Sign out of Admin Console"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors shrink-0 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Admin Sign In</span>
            </button>
          )}

          <div className="mt-2 text-center">
            <button
              onClick={() => {
                onSelectTab('home');
                onCloseMobile();
              }}
              className="text-[11px] text-slate-400 hover:text-emerald-400 transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Exit to Public Website</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
