import React from 'react';
import { 
  Users, 
  UserCheck, 
  UserX, 
  ShieldCheck, 
  Calendar, 
  Plus, 
  Settings, 
  Database, 
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Resident, EstateSettings, ActivityLog, NavigationTab } from '../../types/database';

interface DashboardOverviewProps {
  residents: Resident[];
  estateSettings: EstateSettings;
  activityLogs: ActivityLog[];
  onNavigate: (tab: NavigationTab) => void;
  onAddResident: () => void;
  onViewResident: (resident: Resident) => void;
  onOpenSqlModal: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  residents,
  estateSettings,
  activityLogs,
  onNavigate,
  onAddResident,
  onViewResident,
  onOpenSqlModal
}) => {
  const totalResidents = residents.length;
  const activeResidents = residents.filter(r => r.status === 'Active').length;
  const inactiveResidents = residents.filter(r => r.status === 'Inactive').length;

  const monthlyLevy = estateSettings.monthly_security_levy || 5000;
  const projectedMonthlyRevenue = activeResidents * monthlyLevy;

  const recentResidents = [...residents]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const recentLogs = activityLogs.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-slate-900 rounded-3xl p-6 sm:p-8 text-white border border-slate-800 shadow-lg">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Security Operations · Stage 1 Foundation</span>
          </div>
          <h2 className="font-display font-bold text-2xl sm:text-3xl text-white tracking-tight">
            {estateSettings.estate_name}
          </h2>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">
            Centralized resident registry and security levy administration console. Billing tracking commences in <strong>{estateSettings.first_payment_month}</strong> at <strong>₦{monthlyLevy.toLocaleString()}</strong> per active household.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-6">
            <button
              onClick={onAddResident}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors inline-flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Register Resident</span>
            </button>
            <button
              onClick={() => onNavigate('residents')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors inline-flex items-center gap-2"
            >
              <span>View All Directory</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Decorative graphic */}
        <div className="absolute -right-8 -bottom-8 opacity-15 pointer-events-none hidden md:block">
          <ShieldCheck className="w-64 h-64 text-emerald-400" />
        </div>
      </div>

      {/* Key Metric Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Residents */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Residents</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-slate-900 tabular-nums">
              {totalResidents}
            </span>
            <span className="text-xs text-slate-500">units</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1.5">
            <span className="text-emerald-700 font-semibold">{activeResidents} Active</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-600 font-semibold">{inactiveResidents} Inactive</span>
          </p>
        </div>

        {/* Active Ratio */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Billed Units</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-emerald-600 tabular-nums">
              {activeResidents}
            </span>
            <span className="text-xs text-slate-500">
              ({totalResidents > 0 ? Math.round((activeResidents / totalResidents) * 100) : 0}%)
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Subject to monthly security levy
          </p>
        </div>

        {/* Monthly Levy Rate */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Levy Rate</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-xs font-semibold text-slate-500">₦</span>
            <span className="text-3xl font-bold font-mono text-slate-900 tabular-nums">
              {monthlyLevy.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">/mo</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Due on Day {estateSettings.payment_due_day} each month
          </p>
        </div>

        {/* Projected Monthly Inflow */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Projected Collection</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-xs font-semibold text-purple-600">₦</span>
            <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
              {projectedMonthlyRevenue.toLocaleString()}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Starts in {estateSettings.first_payment_month}
          </p>
        </div>
      </div>

      {/* Main Content Grid: Recent Registrations & Activity Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Registrations Table (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-base text-slate-900">Recent Resident Registrations</h3>
              <p className="text-xs text-slate-500 mt-0.5">Latest household accounts onboarded to security registry</p>
            </div>
            <button
              onClick={() => onNavigate('residents')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentResidents.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No residents registered yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentResidents.map((resident) => (
                <div 
                  key={resident.id}
                  onClick={() => onViewResident(resident)}
                  className="p-4 hover:bg-slate-50 flex items-center justify-between gap-4 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs font-bold px-2 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200/60 tabular-nums shrink-0">
                      {resident.resident_number}
                    </span>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 text-xs sm:text-sm truncate group-hover:text-emerald-600 transition-colors">
                        {resident.full_name}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {resident.house_number} · {resident.address}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      resident.status === 'Active'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {resident.status}
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* System Activity & Architecture Status (1 Col) */}
        <div className="space-y-6">
          {/* Quick Shortcuts */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="font-display font-bold text-sm text-slate-900">Administration Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={onAddResident}
                className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-left transition-all flex items-center gap-3 text-xs font-semibold text-slate-800"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <div>Register New Resident</div>
                  <div className="text-[11px] font-normal text-slate-500">Auto-assigns sequential ID</div>
                </div>
              </button>

              <button
                onClick={() => onNavigate('settings')}
                className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-left transition-all flex items-center gap-3 text-xs font-semibold text-slate-800"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <div>Configure Estate Settings</div>
                  <div className="text-[11px] font-normal text-slate-500">Levy rate & contact details</div>
                </div>
              </button>

              <button
                onClick={onOpenSqlModal}
                className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-left transition-all flex items-center gap-3 text-xs font-semibold text-slate-800"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <div>Database Relational Architecture</div>
                  <div className="text-[11px] font-normal text-slate-500">9 PostgreSQL schemas & RLS</div>
                </div>
              </button>
            </div>
          </div>

          {/* Activity Log Stream */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-500" />
                Recent Activity
              </h3>
              <button
                onClick={() => onNavigate('logs')}
                className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700"
              >
                Full Trail
              </button>
            </div>

            {recentLogs.length === 0 ? (
              <p className="text-xs text-slate-400">No activity logged yet.</p>
            ) : (
              <div className="space-y-3">
                {recentLogs.map((log) => (
                  <div key={log.id} className="text-xs flex items-start gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-slate-800 font-medium leading-snug">{log.description}</p>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(log.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
