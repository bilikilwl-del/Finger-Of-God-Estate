import React from 'react';
import {
  Layers,
  Coins,
  Zap,
  Shield,
  Clock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Calendar,
  Sparkles,
  ChevronRight,
  Building2,
  TrendingUp
} from 'lucide-react';
import { EstateSettings, NavigationTab, Resident } from '../../types/database';
import { PublicNavbar } from '../layout/PublicNavbar';
import { PublicFooter } from '../layout/PublicFooter';

interface PublicProjectsOverviewViewProps {
  estateSettings: EstateSettings;
  currentResident?: Resident | null;
  onNavigate: (tab: NavigationTab) => void;
  onOpenResidentLogin: () => void;
  onOpenAdminLogin: () => void;
}

export const PublicProjectsOverviewView: React.FC<PublicProjectsOverviewViewProps> = ({
  estateSettings,
  currentResident,
  onNavigate,
  onOpenResidentLogin,
  onOpenAdminLogin
}) => {
  const projects = [
    {
      id: 'road',
      title: 'Road Paving & Interlocking Project',
      category: 'Civil & Infrastructure',
      targetBudget: 35000000,
      collectedAmount: 22400000,
      spentAmount: 14850000,
      currentBalance: 7550000,
      progressPercentage: 64,
      status: 'Active (Phase 1 Paving)',
      statusColor: 'bg-amber-100 text-amber-800 border-amber-200',
      description: 'Comprehensive road grading, reinforced concrete drainage channels, and heavy-duty 80mm interlocking stone paving across Phase 1 Main Boulevard and connecting residential closes.',
      highlights: [
        'Over 1.8km of heavy-duty interlocking stones',
        'Dual-sided covered concrete drainage system',
        'Transparent online financial ledger & bank sync',
        'Real-time resident contribution verification'
      ],
      icon: Coins,
      actionTab: 'road_project' as NavigationTab,
      actionLabel: 'View Road Project Ledger'
    },
    {
      id: 'light',
      title: 'Light & Electrification Project',
      category: 'Power & Energy',
      targetBudget: 18500000,
      collectedAmount: 12450000,
      spentAmount: 7600000,
      currentBalance: 4850000,
      progressPercentage: 67,
      status: 'Active (Transformer & Solar)',
      statusColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      description: 'Dedicated 500kVA step-down estate transformer substation overhaul, feeder line load-balancing, and estate-wide deployment of 85 integrated all-in-one solar LED streetlights.',
      highlights: [
        'Dedicated 500kVA transformer maintenance reserve',
        '85 High-lumen solar LED streetlights active',
        'Phase-balancing & drop-out fuse overhaul',
        'Emergency 24/7 electrical response committee'
      ],
      icon: Zap,
      actionTab: 'light_project' as NavigationTab,
      actionLabel: 'View Light Project Ledger'
    },
    {
      id: 'drainage',
      title: 'Central Stormwater Drainage Modernization',
      category: 'Flood Prevention & Civil',
      targetBudget: 12000000,
      collectedAmount: 4800000,
      spentAmount: 2100000,
      currentBalance: 2700000,
      progressPercentage: 40,
      status: 'Engineering Survey Completed',
      statusColor: 'bg-blue-100 text-blue-800 border-blue-200',
      description: 'Expansion and de-silting of the main collector canal linking Finger of God Estate to the Asaba municipal stormwater discharge corridor, preventing seasonal flash floods.',
      highlights: [
        'Hydraulic capacity expansion by 250%',
        'Reinforced precast concrete slab covers',
        'Vector & mosquito breeding reduction',
        'Pedestrian walkway integration'
      ],
      icon: Layers,
      actionTab: 'contact' as NavigationTab,
      actionLabel: 'Inquire with Project Committee'
    },
    {
      id: 'gate_barrier',
      title: 'Automated RFID Gate Barrier & Security System',
      category: 'Security & Access Tech',
      targetBudget: 8500000,
      collectedAmount: 5100000,
      spentAmount: 3200000,
      currentBalance: 1900000,
      progressPercentage: 60,
      status: 'Pilot Gate Testing',
      statusColor: 'bg-purple-100 text-purple-800 border-purple-200',
      description: 'Automated dual-lane boom barriers with resident RFID windshield tags, automatic number plate recognition (ANPR) cameras, and digital visitor QR code scanner at Main Gate.',
      highlights: [
        'Contactless RFID vehicle barrier arms',
        'ANPR security cameras with cloud logging',
        'Resident visitor QR pass instant check-in',
        'Solar battery backup for 24/7 continuous uptime'
      ],
      icon: Shield,
      actionTab: 'security_public' as NavigationTab,
      actionLabel: 'View Security Department'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <PublicNavbar
        currentTab="projects_overview"
        estateSettings={estateSettings}
        currentResident={currentResident}
        onNavigate={onNavigate}
        onOpenResidentLogin={onOpenResidentLogin}
        onOpenAdminLogin={onOpenAdminLogin}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <button
              onClick={() => onNavigate('home')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-700 transition-colors mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home Dashboard</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-100 text-blue-800 rounded-lg">
                <Layers className="w-5 h-5" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
                Finger of God Estate Projects
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl">
              Transparent oversight of all capital development projects transforming Finger of God Estate into a model residential community.
            </p>
          </div>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {projects.map((proj) => {
            const Icon = proj.icon;
            return (
              <div
                key={proj.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all p-6 flex flex-col justify-between space-y-6"
              >
                <div className="space-y-4">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-slate-100 text-slate-800 shrink-0">
                        <Icon className="w-6 h-6 text-slate-700" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {proj.category}
                        </span>
                        <h2 className="text-lg font-bold text-slate-900 leading-snug">
                          {proj.title}
                        </h2>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border shrink-0 ${proj.statusColor}`}>
                      {proj.status}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {proj.description}
                  </p>

                  {/* Financial Mini Bar */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-600">Funding Progress</span>
                      <span className="font-bold text-emerald-800">{proj.progressPercentage}% of Target</span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${proj.progressPercentage}%` }}
                      ></div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
                      <div>
                        <p className="text-slate-400 font-medium">Budget</p>
                        <p className="font-bold text-slate-800 font-mono">₦{proj.targetBudget.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-emerald-700 font-medium">Collected</p>
                        <p className="font-bold text-emerald-900 font-mono">₦{proj.collectedAmount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-slate-700 font-medium">Balance</p>
                        <p className="font-bold text-slate-900 font-mono">₦{proj.currentBalance.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  {/* Key Highlights */}
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Key Features</p>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-700">
                      {proj.highlights.map((h, idx) => (
                        <li key={idx} className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Bottom Action Button */}
                <button
                  onClick={() => {
                    onNavigate(proj.actionTab);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{proj.actionLabel}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </main>

      <PublicFooter
        estateSettings={estateSettings}
        onNavigate={onNavigate}
        onOpenAdminLogin={onOpenAdminLogin}
        onOpenResidentLogin={onOpenResidentLogin}
      />
    </div>
  );
};
