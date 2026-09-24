import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  Calendar,
  User,
  ShieldCheck,
  Share2,
  Printer,
  FileText,
  AlertCircle,
  CreditCard,
  CheckCircle2,
  ExternalLink,
  Paperclip
} from 'lucide-react';
import { Announcement, EstateSettings } from '../../types/database';
import { dbService } from '../../lib/supabase';

interface AnnouncementDetailViewProps {
  slug: string;
  estateSettings: EstateSettings;
  onBackToAnnouncements: () => void;
  onNavigateHome: () => void;
  onOpenPayLevy: () => void;
  onOpenResidentLogin: () => void;
}

export const AnnouncementDetailView: React.FC<AnnouncementDetailViewProps> = ({
  slug,
  estateSettings,
  onBackToAnnouncements,
  onNavigateHome,
  onOpenPayLevy,
  onOpenResidentLogin
}) => {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadItem() {
      setLoading(true);
      try {
        const item = await dbService.getPublicAnnouncementBySlug(slug);
        setAnnouncement(item);
      } catch (err) {
        console.error('Failed to load notice:', err);
      } finally {
        setLoading(false);
      }
    }
    loadItem();
  }, [slug]);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-xs font-semibold text-slate-500">Loading announcement...</div>
        </div>
      </div>
    );
  }

  if (!announcement) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Announcement Not Found</h2>
          <p className="text-xs text-slate-500">
            This notice may have expired, been archived by estate administrators, or the link may be incorrect.
          </p>
          <button
            onClick={onBackToAnnouncements}
            className="w-full py-2.5 bg-slate-900 text-white font-semibold rounded-xl text-xs hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Return to Announcements
          </button>
        </div>
      </div>
    );
  }

  const isUrgent = announcement.priority === 'URGENT' || announcement.priority === 'Emergency';
  const isImportant = announcement.priority === 'IMPORTANT' || announcement.priority === 'High';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs print:hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <button
              onClick={onBackToAnnouncements}
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 px-3 py-2 rounded-xl transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>All Announcements</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 cursor-pointer"
                title="Copy share link"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{copied ? 'Link Copied!' : 'Share'}</span>
              </button>
              <button
                onClick={handlePrint}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 cursor-pointer"
                title="Print document"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
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

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-1 w-full">
        <article className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-6">
          {/* Header Metadata */}
          <div className="space-y-3 pb-6 border-b border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                  isUrgent
                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                    : isImportant
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {announcement.priority} PRIORITY
              </span>
              <span className="px-2.5 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-bold uppercase border border-blue-100">
                CATEGORY: {announcement.category}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              {announcement.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>Published on {new Date(announcement.publish_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <User className="w-4 h-4 text-slate-400" />
                <span>Author: <strong className="text-slate-700">{announcement.author_name || 'Estate Administration'}</strong></span>
              </div>
              {announcement.expires_at && (
                <div className="text-slate-400">
                  (Valid through {new Date(announcement.expires_at).toLocaleDateString('en-GB')})
                </div>
              )}
            </div>
          </div>

          {/* Body Content */}
          <div className="prose prose-slate max-w-none text-sm sm:text-base leading-relaxed text-slate-700 space-y-4 whitespace-pre-line">
            {announcement.body}
          </div>

          {/* Attachment if present */}
          {announcement.attachment_url && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Paperclip className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Attached Notice Document</div>
                  <div className="text-[11px] text-slate-500">Official attachment from Estate EXCO</div>
                </div>
              </div>
              <a
                href={announcement.attachment_url}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1"
              >
                <span>Download</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* Optional Action Callout for Payment Category */}
          {announcement.category === 'PAYMENT' && (
            <div className="mt-8 bg-gradient-to-r from-emerald-900 to-slate-900 text-white rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Estate Security Levy Payment
                </div>
                <div className="text-base font-bold">
                  Clear your ₦{(estateSettings.monthly_security_levy || 5000).toLocaleString()} security levy online
                </div>
                <div className="text-xs text-slate-300">
                  Pay securely with automated receipting via Paystack.
                </div>
              </div>
              <button
                onClick={onOpenPayLevy}
                className="shrink-0 px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <CreditCard className="w-4 h-4" />
                <span>Pay Security Levy</span>
              </button>
            </div>
          )}

          {/* Footer of the article */}
          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div>
              Published by the Secretariat of {estateSettings.estate_name || 'Finger of God Estate'}
            </div>
            <button
              onClick={onBackToAnnouncements}
              className="text-blue-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Return to Notice Board</span>
            </button>
          </div>
        </article>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500 print:hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            &copy; {new Date().getFullYear()} {estateSettings.estate_name || 'Finger of God Estate'} Security Management.
          </div>
          <div className="flex items-center gap-4">
            <button onClick={onNavigateHome} className="hover:text-slate-900 cursor-pointer">
              Home
            </button>
            <button onClick={onBackToAnnouncements} className="hover:text-slate-900 cursor-pointer">
              Announcements
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
