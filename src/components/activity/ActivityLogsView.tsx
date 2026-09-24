import React, { useState } from 'react';
import { History, Search, ShieldCheck, User, Settings, Lock, Filter } from 'lucide-react';
import { ActivityLog } from '../../types/database';

interface ActivityLogsViewProps {
  logs: ActivityLog[];
}

export const ActivityLogsView: React.FC<ActivityLogsViewProps> = ({ logs }) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  const filteredLogs = logs.filter((log) => {
    if (filterType !== 'ALL' && log.entity_type !== filterType) {
      return false;
    }
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      log.description.toLowerCase().includes(q) ||
      log.admin_email.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q)
    );
  });

  const getActionIcon = (action: string) => {
    if (action.includes('RESIDENT')) return <User className="w-4 h-4 text-blue-600" />;
    if (action.includes('SETTINGS')) return <Settings className="w-4 h-4 text-emerald-600" />;
    if (action.includes('LOGIN') || action.includes('LOGOUT') || action.includes('AUTH')) {
      return <Lock className="w-4 h-4 text-purple-600" />;
    }
    return <ShieldCheck className="w-4 h-4 text-slate-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-slate-900">System Activity Audit Trail</h3>
              <p className="text-xs text-slate-500">Immutable administrative actions, resident updates, and security logs</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-100">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search audit trail by admin, action, or description..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl shrink-0">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${filterType === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
            >
              All Events
            </button>
            <button
              onClick={() => setFilterType('resident')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${filterType === 'resident' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
            >
              Residents
            </button>
            <button
              onClick={() => setFilterType('estate_settings')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${filterType === 'estate_settings' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
            >
              Settings
            </button>
            <button
              onClick={() => setFilterType('auth')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${filterType === 'auth' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
            >
              Auth
            </button>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No activity logs matched your criteria.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredLogs.map((log) => (
              <div key={log.id} className="p-4 sm:p-5 flex items-start gap-4 hover:bg-slate-50 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                  {getActionIcon(log.action)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                    <span className="font-semibold text-xs text-slate-900">
                      {log.description}
                    </span>
                    <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span>Admin: <strong className="text-slate-700">{log.admin_email}</strong></span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono uppercase text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                      {log.action}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
