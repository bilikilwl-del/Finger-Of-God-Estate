import React, { useState, useEffect } from 'react';
import {
  Bell,
  Search,
  Calendar,
  ArrowRight,
  ArrowLeft,
  FileText
} from 'lucide-react';
import { Announcement, AnnouncementCategory, EstateSettings } from '../../types/database';
import { dbService } from '../../lib/supabase';
import { PublicNavbar } from '../layout/PublicNavbar';
import { PublicFooter } from '../layout/PublicFooter';
import { SEOHead } from '../common/SEOHead';

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

  const handleNavigate = (tab: any) => {
    if (tab === 'home') onNavigateHome();
    else if (tab === 'security_public' && onNavigateToSecurity) onNavigateToSecurity();
    else if (tab === 'road_project' && onNavigateToRoadProject) onNavigateToRoadProject();
    else if (tab === 'verify_receipt') onNavigateToVerifyReceipt();
    else if (tab === 'estate_levy') onOpenPayLevy();
    else onNavigateHome();
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 font-sans flex flex-col">
      <SEOHead
        title="Official Estate Announcements & Resident Notices — Finger of God Estate"
        description="Official executive committee broadcasts, meeting notices, security alerts, and infrastructure advisories for residents of Finger of God Estate, Asaba."
        keywords={['Estate Announcements', 'Community Notices', 'Finger of God Estate', 'AGM Meetings', 'Security Advisories', 'Asaba Delta State']}
        canonicalPath="/#announcements"
        ogType="website"
      />

      {/* 1. Universal Estate Header */}
      <PublicNavbar
        currentTab="public_announcements"
        estateSettings={estateSettings}
        onNavigate={handleNavigate}
        onOpenResidentLogin={onOpenResidentLogin}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-1 w-full space-y-8">
        {/* Header Section */}
        <div className="border-b border-stone-200 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <button
              onClick={onNavigateHome}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#064E3B] transition-colors mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Estate Homepage</span>
            </button>
            <div className="text-xs font-semibold text-[#064E3B] mb-1">
              Executive Committee Secretariat · Iyiaba, Asaba
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-display">
              Estate Announcements &amp; Official Circulars
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1.5 max-w-2xl leading-relaxed">
              Verified updates, security directives, general meeting schedules, and facility maintenance notices published by the Executive Committee (EXCO) of {estateSettings.estate_name || 'Finger of God Estate'}.
            </p>
          </div>

          <div className="text-xs text-slate-500 font-medium shrink-0">
            Showing <span className="font-mono font-bold text-slate-900 tabular-nums">{announcements.length}</span> active notice{announcements.length === 1 ? '' : 's'}
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-2xs space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full md:w-96">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notices by keyword, title, or topic..."
                className="w-full pl-9 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-[#064E3B] focus:bg-white focus:outline-none transition-colors"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>

            {/* Category Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 w-full md:w-auto scrollbar-none">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    selectedCategory === cat.value
                      ? 'bg-[#064E3B] text-white shadow-2xs'
                      : 'bg-stone-100 text-slate-600 hover:bg-stone-200 hover:text-slate-900'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Announcements List */}
        {loading ? (
          <div className="text-center py-20 bg-white rounded-xl border border-stone-200">
            <div className="w-7 h-7 border-2 border-[#064E3B] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <div className="text-xs font-medium text-slate-500">Loading official estate circulars...</div>
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-stone-200 p-8 space-y-3">
            <div className="w-11 h-11 bg-stone-100 text-slate-400 rounded-lg flex items-center justify-center mx-auto">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No active notices found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              {searchQuery || selectedCategory !== 'ALL'
                ? 'Try adjusting your search query or selecting a different notice category.'
                : 'There are currently no active public bulletins published by the estate administration.'}
            </p>
            {(searchQuery || selectedCategory !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('ALL');
                }}
                className="text-xs font-semibold text-[#064E3B] hover:underline pt-2 inline-block cursor-pointer"
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
                  className={`bg-white rounded-xl p-6 border transition-all cursor-pointer flex flex-col justify-between group shadow-2xs hover:shadow-md ${
                    isUrgent
                      ? 'border-rose-300 hover:border-rose-500'
                      : isImportant
                      ? 'border-amber-300 hover:border-amber-500'
                      : 'border-stone-200 hover:border-emerald-700/40'
                  }`}
                >
                  <div>
                    {/* Clean unboxed metadata with typographic separator */}
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-2.5">
                      <span
                        className={`font-semibold ${
                          isUrgent
                            ? 'text-rose-700'
                            : isImportant
                            ? 'text-amber-800'
                            : 'text-[#064E3B]'
                        }`}
                      >
                        {item.category}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{item.priority}</span>
                    </div>

                    <h2 className="text-base font-bold text-slate-900 group-hover:text-[#064E3B] transition-colors mb-2 line-clamp-2 leading-snug">
                      {item.title}
                    </h2>

                    <p className="text-xs text-slate-600 line-clamp-3 mb-6 leading-relaxed">
                      {item.body}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{new Date(item.publish_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>

                    <span className="font-semibold text-[#064E3B] flex items-center gap-1">
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

      <PublicFooter
        estateSettings={estateSettings}
        onNavigate={handleNavigate}
        onOpenResidentLogin={onOpenResidentLogin}
      />
    </div>
  );
};
