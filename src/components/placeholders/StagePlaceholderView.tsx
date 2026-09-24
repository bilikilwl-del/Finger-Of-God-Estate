import React from 'react';
import { 
  CreditCard, 
  AlertCircle, 
  MessageSquare, 
  FileText, 
  Bell, 
  ShieldCheck, 
  CheckCircle2, 
  Layers, 
  Clock, 
  ArrowRight,
  Database
} from 'lucide-react';
import { NavigationTab, EstateSettings } from '../../types/database';

interface StagePlaceholderViewProps {
  tab: NavigationTab;
  estateSettings: EstateSettings;
  onOpenSqlModal: () => void;
  onNavigateToResidents: () => void;
}

export const StagePlaceholderView: React.FC<StagePlaceholderViewProps> = ({
  tab,
  estateSettings,
  onOpenSqlModal,
  onNavigateToResidents
}) => {
  const getTabConfig = () => {
    switch (tab) {
      case 'payments':
        return {
          title: 'Monthly Security Levy Payments',
          subtitle: 'Scheduled for Stage 2 Implementation',
          icon: CreditCard,
          stage: 2,
          color: 'emerald',
          description: `This module will track monthly ₦${estateSettings.monthly_security_levy.toLocaleString()} security levy payments starting ${estateSettings.first_payment_month}.`,
          preparedTables: ['monthly_payments', 'payment_transactions', 'receipts'],
          features: [
            'Paystack online gateway integration for card, USSD, and bank transfer payments',
            'Manual payment recording for direct bank deposits and cash receipts with audit trail',
            'Automated payment verification and monthly billing reconciliation',
            'Instant PDF receipt generation with unique receipt numbering'
          ]
        };
      case 'outstanding':
        return {
          title: 'Outstanding Balances & Defaulters',
          subtitle: 'Scheduled for Stage 2 Implementation',
          icon: AlertCircle,
          stage: 2,
          color: 'amber',
          description: 'Calculates accumulated outstanding arrears per resident, delinquency status, and payment aging.',
          preparedTables: ['monthly_payments', 'residents'],
          features: [
            'Dynamic calculation of outstanding months from October 2026',
            'Defaulter severity flags and payment arrangement tracking',
            'Automated late penalty calculation (if configured)',
            'Batch reminder selection'
          ]
        };
      case 'sms':
        return {
          title: 'SMS Reminders & Security Broadcasts',
          subtitle: 'Scheduled for Stage 3 Implementation',
          icon: MessageSquare,
          stage: 3,
          color: 'blue',
          description: `SMS notification engine utilizing sender ID "${estateSettings.sms_sender_name}" for automated payment reminders and emergency security alerts.`,
          preparedTables: ['sms_reminders', 'activity_logs'],
          features: [
            'Automated monthly levy due date reminders (Due Day 1)',
            'Instant SMS payment receipt alerts upon confirmation',
            'Overdue notices with personalized resident balance links',
            'Emergency security gate broadcast to all active residents'
          ]
        };
      case 'reports':
        return {
          title: 'Financial & Estate Security Reports',
          subtitle: 'Scheduled for Stage 3 Implementation',
          icon: FileText,
          stage: 3,
          color: 'purple',
          description: 'Comprehensive financial reporting, collection efficiency, street-by-street compliance, and exportable ledgers.',
          preparedTables: ['monthly_payments', 'payment_transactions', 'residents'],
          features: [
            'Monthly and annual levy collection summary charts',
            'Compliance rate by street, crescent, and zone',
            'Estate security fund expenditure and cash flow reconciliations',
            'Export to Excel, CSV, and printable Executive PDF reports'
          ]
        };
      case 'announcements':
        return {
          title: 'Estate Announcements & Notices',
          subtitle: 'Scheduled for Stage 3 Implementation',
          icon: Bell,
          stage: 3,
          color: 'rose',
          description: 'Internal estate bulletin board for resident notices, security advisories, and AGM announcements.',
          preparedTables: ['announcements', 'sms_reminders'],
          features: [
            'Publish urgent security alerts with push and SMS triggers',
            'Schedule estate maintenance notices and gate operation updates',
            'Target announcements to specific zones or all residents',
            'Resident acknowledgement tracking'
          ]
        };
      case 'admins':
        return {
          title: 'Administrator Accounts & Role-Based Access',
          subtitle: 'Scheduled for Stage 3 Implementation',
          icon: ShieldCheck,
          stage: 3,
          color: 'indigo',
          description: 'Multi-admin management with granular role separation (Super Admin, Security Officer, Accountant).',
          preparedTables: ['admin_users', 'activity_logs'],
          features: [
            'Invite new estate executive committee members and security officers',
            'Assign specific permissions (e.g. Accountant can record payments, Security Officer can view resident directory only)',
            'Two-factor authentication and security login sessions',
            'Audit log tracking per administrator user ID'
          ]
        };
      default:
        return {
          title: 'Estate Module',
          subtitle: 'Next Development Stage',
          icon: Layers,
          stage: 2,
          color: 'slate',
          description: 'Module is structured and waiting for the next implementation phase.',
          preparedTables: ['estate_settings'],
          features: []
        };
    }
  };

  const config = getTabConfig();
  const Icon = config.icon;

  return (
    <div className="max-w-4xl space-y-6">
      {/* Module Overview Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-900 flex items-center justify-center shrink-0">
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-xl text-slate-900">{config.title}</h3>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Stage {config.stage}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">{config.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={onOpenSqlModal}
              className="px-3.5 py-2 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <Database className="w-3.5 h-3.5" />
              <span>View DB Schema</span>
            </button>
            <button
              onClick={onNavigateToResidents}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <span>Manage Residents</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-700 leading-relaxed">
          {config.description}
        </p>

        {/* Database Readiness Banner */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Database Schema Already Provisioned in Supabase</span>
          </div>
          <p className="text-xs text-slate-600">
            The relational tables required for this feature are already designed in the Stage 1 database architecture:
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {config.preparedTables.map((tbl) => (
              <span key={tbl} className="font-mono text-xs font-semibold bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-800">
                public.{tbl}
              </span>
            ))}
          </div>
        </div>

        {/* Planned Features List */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>Key Specifications to be Implemented</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {config.features.map((feat, idx) => (
              <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200/80 flex items-start gap-2.5 text-xs text-slate-700">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
