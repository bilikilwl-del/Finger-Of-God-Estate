import React, { useState, useEffect } from 'react';
import {
  Bell,
  Search,
  Calendar,
  User,
  ArrowRight,
  ShieldCheck,
  ChevronLeft,
  AlertCircle,
  FileText,
  Filter,
  CheckCircle2,
  Lock,
  ExternalLink,
  Coins
} from 'lucide-react';
import { Announcement, AnnouncementCategory, EstateSettings } from '../../types/database';
import { dbService } from '../../lib/supabase';
import { EstateLogo } from '../common/EstateLogo';

interface PublicAnnouncementsViewProps {
  estateSettings: EstateSettings;
  onSelectAnnouncement: (slug: string) => void;
  onNavigateHome: () => void;
  onNavigateToSecurity?: () => void;
  onNavigateToRoadProject?: () => void;
  onNavigateToVerifyReceipt: () => void;
  onOpenResidentLogin: () => void;
  onOpenPayLevy: () => void;
}

const CATEGORIES: { label: string; value: AnnouncementCategory | 'ALL' }[] = [
  { label: 'All Notices', value: 'ALL' },
  { label: 'Security', value: 'SECURITY' },
  { label: 'Levy & Payment', value: 'PAYMENT' },
  { label: 'Meetings & AGM', value: 'MEETING' },
  { label: 'Maintenance', value: 'MAINTENANCE' },
  { label: 'Emergency', value: 'EMERGENCY' },
  { label: 'General', value: 'GENERAL' }
];

export const PublicAnnouncementsView: React.FC<PublicAnnouncementsViewProps> = ({
  estateSettings,
  onSelectAnnouncement,
  onNavigateHome,
  onNavigateToSecurity,
  onNavigateToRoadProject,
  onNavigateToVerifyReceipt,
  onOpenResidentLogin,
  onOpenPayLevy
}) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<AnnouncementCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const data = await dbService.getPublicAnnouncements(selectedCategory, searchQuery);
        setAnnouncements(data);
      } catch (err) {
        console.error('Error fetching public notices:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <div className="flex items-center cursor-pointer" onClick={onNavigateHome}>
              <EstateLogo
                size="sm"
                variant="horizontal"
                theme="light"
                estateName={estateSettings.estate_name || 'Finger of God Estate'}
                subtitle="OFFICIAL NOTICES • ASABA"
              />
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={onNavigateHome}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Estate Home</span>
              </button>
              {onNavigateToSecurity && (
                <button
                  onClick={onNavigateToSecurity}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Security</span>
                </button>
              )}
              {onNavigateToRoadProject && (
                <button
                  onClick={onNavigateToRoadProject}
                  className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors cursor-pointer border border-amber-200"
                >
                  <Coins className="w-3.5 h-3.5 text-amber-700" />
                  <span>Road Project</span>
                </button>
              )}
              <button
                onClick={onNavigateToVerifyReceipt}
                className="hidden md:inline-flex px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Verify Receipt
              </button>
              <button
                onClick={onOpenResidentLogin}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer"
              >
                Resident Login
              </button>
              <button
                onClick={onOpenPayLevy}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Pay Levy
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-1 w-full">
        {/* Page Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 sm:p-10 text-white mb-8 shadow-md">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold">
              <Bell className="w-3.5 h-3.5" />
              <span>Official Estate Communications</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
              Estate Announcements & Notices
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Timely updates, security directives, payment advisories, and facility maintenance schedules published by the Executive Committee (EXCO) of {estateSettings.estate_name || 'Finger of God Estate'}.
            </p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 mb-8 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full md:w-96">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notices by keyword, title, topic..."
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>

            {/* Results count */}
            <div className="text-xs text-slate-500 font-medium self-start md:self-center">
              Showing <span className="font-bold text-slate-900">{announcements.length}</span> active notice{announcements.length === 1 ? '' : 's'}
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat.value
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Announcements List */}
        {loading ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <div className="text-xs font-semibold text-slate-500">Loading estate notices...</div>
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No active notices found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery || selectedCategory !== 'ALL'
                ? 'Try adjusting your search query or selecting a different category.'
                : 'There are currently no active public bulletins published by the estate administration.'}
            </p>
            {(searchQuery || selectedCategory !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('ALL');
                }}
                className="text-xs font-semibold text-blue-600 hover:underline pt-2 inline-block cursor-pointer"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {announcements.map((item) => {
              const isUrgent = item.priority === 'URGENT' || item.priority === 'Emergency';
              const isImportant = item.priority === 'IMPORTANT' || item.priority === 'High';

              return (
                <article
                  key={item.id}
                  onClick={() => onSelectAnnouncement(item.slug)}
                  className={`bg-white rounded-2xl p-6 border transition-all cursor-pointer flex flex-col justify-between group shadow-xs hover:shadow-md ${
                    isUrgent
                      ? 'border-rose-300 ring-1 ring-rose-300/40 hover:border-rose-500'
                      : isImportant
                      ? 'border-amber-300 ring-1 ring-amber-300/40 hover:border-amber-500'
                      : 'border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div>
                    {/* Header tags */}
                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          isUrgent
                            ? 'bg-rose-100 text-rose-800'
                            : isImportant
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {item.priority}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold uppercase">
                        {item.category}
                      </span>
                    </div>

                    <h2 className="text-base font-bold text-slate-900 group-hover:text-blue-700 transition-colors mb-2 line-clamp-2 leading-snug">
                      {item.title}
                    </h2>

                    <p className="text-xs text-slate-600 line-clamp-3 mb-6 leading-relaxed">
                      {item.body}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{new Date(item.publish_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>

                    <span className="font-semibold text-blue-600 group-hover:text-blue-800 flex items-center gap-1 transition-transform group-hover:translate-x-0.5">
                      <span>Read Notice</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            &copy; {new Date().getFullYear()} {estateSettings.estate_name || 'Finger of God Estate'} Security Management.
          </div>
          <div className="flex items-center gap-4">
            <button onClick={onNavigateHome} className="hover:text-slate-900 cursor-pointer">
              Home
            </button>
            {onNavigateToSecurity && (
              <button onClick={onNavigateToSecurity} className="hover:text-slate-900 cursor-pointer">
                Security
              </button>
            )}
            {onNavigateToRoadProject && (
              <button onClick={onNavigateToRoadProject} className="text-amber-800 font-semibold hover:text-amber-900 cursor-pointer">
                Road Project
              </button>
            )}
            <button onClick={onNavigateToVerifyReceipt} className="hover:text-slate-900 cursor-pointer">
              Verify Receipt
            </button>
            <button onClick={onOpenResidentLogin} className="hover:text-slate-900 cursor-pointer">
              Resident Login
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
