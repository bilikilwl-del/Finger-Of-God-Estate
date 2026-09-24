import React from 'react';
import { ShieldCheck, Settings, Users, Building2, CreditCard, Lock, Bell, Wrench, FileText, Activity } from 'lucide-react';

export const SystemAdministrationView: React.FC = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    suspendedUsers: 0,
    pendingAccounts: 0,
    admins: 0,
    security: 0,
    finance: 0,
    maintenance: 0
  });

  // Fetch stats from dbService (simulated for now, would use real db calls)
  useEffect(() => {
    // dbService.getSystemStats().then(setStats);
  }, []);

  const adminSections = [
    { id: 'overview', label: 'Admin Dashboard', icon: ShieldCheck, description: 'Overview of system status and recent admin activity.' },
    { id: 'users', label: 'User & Role Administration', icon: Users, description: 'Manage system users, roles, and permissions.' },
    { id: 'estate', label: 'Estate Configuration', icon: Building2, description: 'Manage estate zones, phases, and general settings.' },
    { id: 'finance', label: 'Financial Configuration', icon: CreditCard, description: 'Manage levy rules, payment settings, and categories.' },
    { id: 'security', label: 'Security Configuration', icon: Lock, description: 'Configure incident types, alert rules, and access control.' },
    { id: 'notifications', label: 'Notification Settings', icon: Bell, description: 'Configure notification channels and templates.' },
    { id: 'maintenance', label: 'Maintenance Rules', icon: Wrench, description: 'Manage maintenance categories and workflows.' },
    { id: 'documents', label: 'Document Settings', icon: FileText, description: 'Manage document types and archive settings.' },
    { id: 'integrations', label: 'Integration Management', icon: Activity, description: 'Configure and monitor external service integrations.' },
  ];

  return (
    <div className="space-y-6">
      <header className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <h1 className="text-2xl font-bold font-display text-slate-900">System Administration & Configuration</h1>
        <p className="text-sm text-slate-500 mt-1">Centralized control center for estate platform settings and operations.</p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[{ label: 'Total Users', value: stats.totalUsers, color: 'text-slate-900' },
          { label: 'Active Users', value: stats.activeUsers, color: 'text-emerald-600' },
          { label: 'Suspended Users', value: stats.suspendedUsers, color: 'text-rose-600' },
          { label: 'Pending Accounts', value: stats.pendingAccounts, color: 'text-amber-600' }
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color} mt-1`}>{stat.value}</p>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminSections.map((section) => {
          const Icon = section.icon;
          return (
            <div key={section.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-sm transition-shadow flex flex-col">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-4 text-emerald-700">
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">{section.label}</h3>
              <p className="text-sm text-slate-500 mt-1 flex-grow">{section.description}</p>
              <button className="mt-6 w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-xl text-sm font-semibold transition-colors border border-slate-200">
                Manage
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
