import React from 'react';
import { Menu, Plus, Database, Shield, Calendar } from 'lucide-react';
import { NavigationTab, EstateSettings } from '../../types/database';

interface AdminHeaderProps {
  currentTab: NavigationTab;
  estateSettings: EstateSettings;
  onOpenMobileMenu: () => void;
  onAddResident: () => void;
  onOpenSqlModal: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  currentTab,
  estateSettings,
  onOpenMobileMenu,
  onAddResident,
  onOpenSqlModal
}) => {
  const getBreadcrumbTitle = (tab: NavigationTab) => {
    switch (tab) {
      case 'dashboard': return 'Dashboard Overview';
      case 'residents': return 'Resident Directory & Security Registry';
      case 'payments': return 'Levy Payments Management (Stage 2)';
      case 'outstanding': return 'Outstanding Balances (Stage 2)';
      case 'sms': return 'SMS Reminders & Broadcasts (Stage 3)';
      case 'reports': return 'Financial & Security Reports (Stage 3)';
      case 'announcements': return 'Estate Announcements (Stage 3)';
      case 'admins': return 'Admin Users & Permissions (Stage 3)';
      case 'settings': return 'Estate & Security Settings';
      case 'logs': return 'System Activity Audit Trail';
      default: return 'Estate Security Console';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3 flex items-center justify-between transition-all">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileMenu}
          className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-medium text-slate-700 truncate">{estateSettings.estate_name}</span>
            <span aria-hidden="true">/</span>
            <span className="capitalize">{currentTab}</span>
          </div>
          <h2 className="font-display font-bold text-lg text-slate-900 truncate">
            {getBreadcrumbTitle(currentTab)}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Levy Info chip */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100 text-xs text-emerald-800">
          <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="font-medium">Levy: ₦{estateSettings.monthly_security_levy.toLocaleString()} / mo</span>
          <span className="text-emerald-400">·</span>
          <span className="flex items-center gap-1 text-emerald-700">
            <Calendar className="w-3 h-3" />
            Due Day {estateSettings.payment_due_day}
          </span>
        </div>

        {/* SQL Schema Button */}
        <button
          onClick={onOpenSqlModal}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          title="Supabase Database Relational Schema"
        >
          <Database className="w-3.5 h-3.5 text-slate-500" />
          <span>Database Schema</span>
        </button>

        {/* Primary CTA */}
        <button
          onClick={onAddResident}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Add Resident</span>
        </button>
      </div>
    </header>
  );
};
