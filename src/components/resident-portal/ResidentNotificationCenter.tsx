import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCheck,
  Trash2,
  ExternalLink,
  Flame,
  ShieldAlert,
  DollarSign,
  Wrench,
  Zap,
  Users,
  Info,
  Clock,
  CheckCircle2,
  Pin,
  ChevronRight,
  Filter,
  Eye
} from 'lucide-react';
import {
  ResidentNotification,
  ResidentNotificationCategory,
  Resident,
  EstateSettings,
  NavigationTab
} from '../../types/database';
import { dbService } from '../../lib/supabase';

interface ResidentNotificationCenterProps {
  currentResident: Resident;
  onNavigateTab?: (tab: NavigationTab, target?: string) => void;
  onOpenAnnouncementModal?: (announcementIdOrSlug: string) => void;
  onOpenPayLevy?: () => void;
  onOpenSecurityOps?: () => void;
  onRefreshNotifications?: () => void;
}

const CATEGORY_TABS: { label: string; value: 'ALL' | 'UNREAD' | 'IMPORTANT' | ResidentNotificationCategory }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Unread', value: 'UNREAD' },
  { label: 'Important', value: 'IMPORTANT' },
  { label: 'Security', value: 'Security' },
  { label: 'Finance', value: 'Finance' },
  { label: 'Maintenance', value: 'Maintenance' },
  { label: 'Electricity', value: 'Electricity' },
  { label: 'Meetings', value: 'Meeting' },
  { label: 'Emergency', value: 'Emergency' }
];

export const ResidentNotificationCenter: React.FC<ResidentNotificationCenterProps> = ({
  currentResident,
  onNavigateTab,
  onOpenAnnouncementModal,
  onOpenPayLevy,
  onOpenSecurityOps,
  onRefreshNotifications
}) => {
  const [notifications, setNotifications] = useState<ResidentNotification[]>([]);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'UNREAD' | 'IMPORTANT' | ResidentNotificationCategory>('ALL');
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await dbService.getResidentNotifications(currentResident.resident_number, activeFilter);
      setNotifications(data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [currentResident.resident_number, activeFilter]);

  const handleMarkAsRead = async (notif: ResidentNotification) => {
    try {
      await dbService.markNotificationAsRead(notif.id, currentResident.resident_number);
      await loadNotifications();
      if (onRefreshNotifications) onRefreshNotifications();
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await dbService.markAllNotificationsAsRead(currentResident.resident_number);
      await loadNotifications();
      if (onRefreshNotifications) onRefreshNotifications();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleDelete = async (notifId: string) => {
    try {
      await dbService.deleteResidentNotification(notifId, currentResident.resident_number);
      await loadNotifications();
      if (onRefreshNotifications) onRefreshNotifications();
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleActionClick = (notif: ResidentNotification) => {
    if (!notif.is_read) {
      handleMarkAsRead(notif);
    }

    if (notif.announcement_slug || notif.announcement_id) {
      if (onOpenAnnouncementModal) {
        onOpenAnnouncementModal(notif.announcement_slug || notif.announcement_id || '');
      }
      return;
    }

    if (notif.category === 'Finance' && onOpenPayLevy) {
      onOpenPayLevy();
      return;
    }

    if (notif.category === 'Security' && onOpenSecurityOps) {
      onOpenSecurityOps();
      return;
    }

    if (notif.link_tab && onNavigateTab) {
      onNavigateTab(notif.link_tab, notif.link_target);
    }
  };

  const getCategoryIcon = (category: ResidentNotificationCategory, priority: string) => {
    if (priority === 'Emergency' || category === 'Emergency') {
      return <Flame className="w-4 h-4 text-rose-600" />;
    }
    switch (category) {
      case 'Security':
        return <ShieldAlert className="w-4 h-4 text-blue-600" />;
      case 'Finance':
        return <DollarSign className="w-4 h-4 text-emerald-600" />;
      case 'Maintenance':
        return <Wrench className="w-4 h-4 text-amber-600" />;
      case 'Electricity':
        return <Zap className="w-4 h-4 text-yellow-600" />;
      case 'Meeting':
        return <Users className="w-4 h-4 text-indigo-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-600" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="space-y-4">
      {/* Top Controls Header */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 font-display">
                Resident Notification Center
              </h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white">
                  {unreadCount} new
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              Instant alerts, levy reminders, estate communications, and security advisories.
            </p>
          </div>
        </div>

        {notifications.length > 0 && unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto"
          >
            <CheckCheck className="w-4 h-4 text-emerald-600" />
            <span>Mark all as read</span>
          </button>
        )}
      </div>

      {/* Category Tabs Filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveFilter(tab.value)}
            className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer ${
              activeFilter === tab.value
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center">
            <div className="w-7 h-7 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <div className="text-xs font-semibold text-slate-500">Loading notifications...</div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white p-10 rounded-3xl border border-slate-200 text-center space-y-2">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">You're all caught up!</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No new notifications in this category. Important estate announcements and payment updates will appear here.
            </p>
          </div>
        ) : (
          notifications.map((notif) => {
            const isUnread = !notif.is_read;
            const isEmergency = notif.priority === 'Emergency' || notif.category === 'Emergency';
            const isImportant = notif.priority === 'Important' || notif.priority === 'Urgent';

            return (
              <div
                key={notif.id}
                className={`p-4 rounded-2xl border transition-all duration-150 ${
                  isEmergency
                    ? 'bg-rose-50/70 border-rose-200 shadow-xs'
                    : isUnread
                    ? 'bg-white border-emerald-300 shadow-xs ring-1 ring-emerald-400/30'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Category Icon Badge */}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isEmergency
                        ? 'bg-rose-100'
                        : isUnread
                        ? 'bg-emerald-50 border border-emerald-200'
                        : 'bg-slate-100'
                    }`}
                  >
                    {getCategoryIcon(notif.category, notif.priority)}
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                            isEmergency
                              ? 'bg-rose-600 text-white'
                              : isImportant
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {notif.category}
                        </span>

                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-emerald-600" title="Unread" />
                        )}

                        {notif.is_pinned && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700">
                            <Pin className="w-3 h-3" /> Pinned
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <Clock className="w-3 h-3" />
                        <span>
                          {new Date(notif.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })} at{' '}
                          {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    <h4
                      className={`text-xs mt-1.5 font-display leading-snug ${
                        isUnread ? 'font-black text-slate-900' : 'font-bold text-slate-800'
                      }`}
                    >
                      {notif.title}
                    </h4>

                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {notif.message}
                    </p>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        {(notif.announcement_slug || notif.announcement_id || notif.link_tab) && (
                          <button
                            onClick={() => handleActionClick(notif)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold transition-colors cursor-pointer"
                          >
                            <span>View Details</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}

                        {isUnread && (
                          <button
                            onClick={() => handleMarkAsRead(notif)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-colors cursor-pointer"
                          >
                            Mark Read
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => handleDelete(notif.id)}
                        title="Dismiss notification"
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
