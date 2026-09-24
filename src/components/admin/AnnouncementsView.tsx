import React, { useState, useEffect } from 'react';
import {
  Bell,
  Plus,
  Search,
  Filter,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Edit2,
  Trash2,
  Eye,
  Archive,
  Send,
  X,
  FileText,
  User,
  Paperclip,
  Clock,
  ChevronRight,
  ShieldAlert,
  Pin,
  PinOff,
  Flame,
  Zap,
  DollarSign,
  Wrench,
  Users,
  Radio,
  Share2,
  Check,
  AlertTriangle,
  Info,
  CheckCheck,
  Sparkles,
  BarChart2
} from 'lucide-react';
import {
  Announcement,
  AnnouncementCategory,
  AnnouncementPriority,
  AnnouncementStatus,
  TargetAudience,
  AdminUser,
  EstateSettings
} from '../../types/database';
import { dbService } from '../../lib/supabase';

interface AnnouncementsViewProps {
  adminUser?: AdminUser | null;
  estateSettings?: EstateSettings;
  onPreviewPublic?: (slug: string) => void;
}

const CATEGORIES: { label: string; value: AnnouncementCategory; icon: any; color: string }[] = [
  { label: 'General', value: 'General', icon: Bell, color: 'text-slate-700 bg-slate-100 border-slate-200' },
  { label: 'Security', value: 'Security', icon: ShieldAlert, color: 'text-blue-700 bg-blue-50 border-blue-200' },
  { label: 'Finance', value: 'Finance', icon: DollarSign, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  { label: 'Maintenance', value: 'Maintenance', icon: Wrench, color: 'text-amber-700 bg-amber-50 border-amber-200' },
  { label: 'Electricity', value: 'Electricity', icon: Zap, color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  { label: 'Meeting', value: 'Meeting', icon: Users, color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
  { label: 'Emergency', value: 'Emergency', icon: Flame, color: 'text-rose-700 bg-rose-50 border-rose-200' }
];

const TARGET_AUDIENCES: TargetAudience[] = [
  'All Residents',
  'Phase I Residents',
  'Phase II Residents',
  'Specific street/area',
  'Specific house/plate numbers',
  'Security Personnel',
  'Security Supervisors',
  'Administrators/Management',
  'Selected Residents'
];

export const AnnouncementsView: React.FC<AnnouncementsViewProps> = ({
  adminUser,
  estateSettings,
  onPreviewPublic
}) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [audienceFilter, setAudienceFilter] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingItem, setEditingItem] = useState<Announcement | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'form' | 'preview'>('form');

  // Emergency Broadcast Modal
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [emergencyTitle, setEmergencyTitle] = useState('');
  const [emergencyMessage, setEmergencyMessage] = useState('');
  const [emergencyAudience, setEmergencyAudience] = useState<TargetAudience>('All Residents');
  const [emergencyDurationHours, setEmergencyDurationHours] = useState('48');
  const [emergencySubmitting, setEmergencySubmitting] = useState(false);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<AnnouncementCategory>('General');
  const [formPriority, setFormPriority] = useState<AnnouncementPriority>('Normal');
  const [formStatus, setFormStatus] = useState<AnnouncementStatus>('Published');
  const [formAudience, setFormAudience] = useState<TargetAudience>('All Residents');
  const [formFilterValue, setFormFilterValue] = useState('');
  const [formIsPinned, setFormIsPinned] = useState(false);
  const [formIsImportant, setFormIsImportant] = useState(false);
  const [formPublishAt, setFormPublishAt] = useState('');
  const [formExpiresAt, setFormExpiresAt] = useState('');
  const [formAuthorName, setFormAuthorName] = useState('');
  const [formAttachmentName, setFormAttachmentName] = useState('');
  const [formAttachmentUrl, setFormAttachmentUrl] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Readership stats modal
  const [selectedForStats, setSelectedForStats] = useState<Announcement | null>(null);

  // Delete State
  const [itemToDelete, setItemToDelete] = useState<Announcement | null>(null);

  // RBAC checks
  const userRole = adminUser?.role || 'Admin';
  const canManage = ['Super Admin', 'Admin', 'SUPER_ADMIN', 'ADMIN', 'Chief Security Officer', 'Security Supervisor'].includes(userRole as string);

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const data = await dbService.getAdminAnnouncements({
        status: statusFilter,
        category: categoryFilter,
        priority: priorityFilter,
        audience: audienceFilter,
        query: searchQuery
      });
      setAnnouncements(data);
    } catch (err) {
      console.error('Failed to load admin announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, [statusFilter, categoryFilter, priorityFilter, audienceFilter, searchQuery]);

  // Statistics calculation
  const totalCount = announcements.length;
  const publishedCount = announcements.filter(a => (a.status === 'Published' || a.status === 'PUBLISHED') && new Date(a.publish_at) <= new Date() && (!a.expires_at || new Date(a.expires_at) > new Date())).length;
  const scheduledCount = announcements.filter(a => a.status === 'Scheduled' || a.status === 'SCHEDULED' || new Date(a.publish_at) > new Date()).length;
  const pinnedCount = announcements.filter(a => a.is_pinned).length;
  const emergencyCount = announcements.filter(a => a.category === 'Emergency' || a.priority === 'Emergency' || a.is_emergency).length;
  const totalReads = announcements.reduce((acc, curr) => acc + (curr.view_count || curr.read_by_residents?.length || 0), 0);

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setEditingItem(null);
    setFormTitle('');
    setFormCategory('General');
    setFormPriority('Normal');
    setFormStatus('Published');
    setFormAudience('All Residents');
    setFormFilterValue('');
    setFormIsPinned(false);
    setFormIsImportant(false);
    setFormPublishAt(new Date().toISOString().slice(0, 16));
    setFormExpiresAt('');
    setFormAuthorName(adminUser?.full_name || 'Estate Administrator');
    setFormAttachmentName('');
    setFormAttachmentUrl('');
    setFormBody('');
    setFormError('');
    setActiveModalTab('form');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: Announcement) => {
    setModalMode('edit');
    setEditingItem(item);
    setFormTitle(item.title);
    setFormCategory(item.category);
    setFormPriority(item.priority);
    setFormStatus(item.status);
    setFormAudience(item.target_audience || 'All Residents');
    setFormFilterValue(item.target_filter_value || '');
    setFormIsPinned(Boolean(item.is_pinned));
    setFormIsImportant(Boolean(item.is_important));
    setFormPublishAt(item.publish_at ? new Date(item.publish_at).toISOString().slice(0, 16) : '');
    setFormExpiresAt(item.expires_at ? new Date(item.expires_at).toISOString().slice(0, 16) : '');
    setFormAuthorName(item.author_name || adminUser?.full_name || 'Estate Administrator');
    setFormAttachmentName(item.attachment_name || '');
    setFormAttachmentUrl(item.attachment_url || '');
    setFormBody(item.body);
    setFormError('');
    setActiveModalTab('form');
    setIsModalOpen(true);
  };

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('Announcement title is required');
      return;
    }
    if (!formBody.trim()) {
      setFormError('Announcement message body is required');
      return;
    }

    setFormSubmitting(true);
    setFormError('');

    try {
      const payload: Partial<Announcement> = {
        title: formTitle.trim(),
        category: formCategory,
        priority: formPriority,
        status: formStatus,
        target_audience: formAudience,
        target_filter_value: formFilterValue.trim() || null,
        is_pinned: formIsPinned,
        is_important: formIsImportant,
        is_emergency: formCategory === 'Emergency' || formPriority === 'Emergency',
        publish_at: formPublishAt ? new Date(formPublishAt).toISOString() : new Date().toISOString(),
        expires_at: formExpiresAt ? new Date(formExpiresAt).toISOString() : null,
        author_name: formAuthorName.trim() || 'Estate Administrator',
        attachment_name: formAttachmentName.trim() || null,
        attachment_url: formAttachmentUrl.trim() || null,
        body: formBody.trim(),
        content: formBody.trim()
      };

      if (modalMode === 'create') {
        await dbService.createAnnouncement(payload, adminUser?.email);
      } else if (editingItem) {
        await dbService.updateAnnouncement(editingItem.id, payload, adminUser?.email);
      }

      setIsModalOpen(false);
      await loadAnnouncements();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save announcement');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleSendEmergencyBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emergencyTitle.trim() || !emergencyMessage.trim()) return;

    setEmergencySubmitting(true);
    try {
      const hours = parseInt(emergencyDurationHours, 10) || 48;
      const expiresAt = new Date(Date.now() + hours * 3600000).toISOString();

      await dbService.createEmergencyBroadcast({
        title: emergencyTitle.trim(),
        message: emergencyMessage.trim(),
        target_audience: emergencyAudience,
        expires_at: expiresAt,
        author_name: adminUser?.full_name || 'Estate Emergency Response Team',
        created_by: adminUser?.email
      }, adminUser?.email);

      setIsEmergencyModalOpen(false);
      setEmergencyTitle('');
      setEmergencyMessage('');
      await loadAnnouncements();
    } catch (err) {
      console.error('Failed to send emergency broadcast:', err);
    } finally {
      setEmergencySubmitting(false);
    }
  };

  const handleTogglePin = async (item: Announcement) => {
    if (!canManage) return;
    try {
      await dbService.togglePinAnnouncement(item.id, adminUser?.email);
      await loadAnnouncements();
    } catch (err) {
      console.error('Failed to toggle pin:', err);
    }
  };

  const handleToggleStatus = async (item: Announcement, targetStatus: AnnouncementStatus) => {
    if (!canManage) return;
    try {
      await dbService.updateAnnouncementStatus(item.id, targetStatus, adminUser?.email);
      await loadAnnouncements();
    } catch (err) {
      console.error('Failed to change status:', err);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete || !canManage) return;
    try {
      await dbService.deleteAnnouncement(itemToDelete.id, adminUser?.email);
      setItemToDelete(null);
      await loadAnnouncements();
    } catch (err) {
      console.error('Failed to delete announcement:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-emerald-400 flex items-center justify-center shadow-sm">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-display">
                  Estate Communications & Announcements
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Stage 13
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Targeted notices, broadcast advisories, maintenance schedules, and high-priority emergency broadcasts for {estateSettings?.estate_name || 'Finger of God Estate'}.
              </p>
            </div>
          </div>
        </div>

        {canManage && (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsEmergencyModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              <Flame className="w-4 h-4 text-rose-200 animate-pulse" />
              <span>Emergency Broadcast</span>
            </button>
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Create Announcement</span>
            </button>
          </div>
        )}
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Notices</div>
          <div className="text-2xl font-black text-slate-900 font-display mt-1">{totalCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Across all categories</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Published Live</div>
          <div className="text-2xl font-black text-emerald-700 font-display mt-1">{publishedCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Visible to residents</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Pinned to Top</div>
          <div className="text-2xl font-black text-blue-700 font-display mt-1">{pinnedCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Priority display</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Scheduled</div>
          <div className="text-2xl font-black text-purple-700 font-display mt-1">{scheduledCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Future publish date</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Emergency Alerts</div>
          <div className="text-2xl font-black text-rose-700 font-display mt-1">{emergencyCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">High-priority alerts</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Resident Views</div>
          <div className="text-2xl font-black text-slate-900 font-display mt-1">{totalReads}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Engagement reads</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, author, or message..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-slate-900 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="PUBLISHED">Published & Live</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="DRAFT">Drafts</option>
              <option value="EXPIRED">Expired</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-slate-900 focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-slate-900 focus:outline-none"
            >
              <option value="ALL">All Priorities</option>
              <option value="Emergency">Emergency</option>
              <option value="Urgent">Urgent / High</option>
              <option value="Important">Important</option>
              <option value="Normal">Normal</option>
            </select>
          </div>

          {/* Audience Filter */}
          <div>
            <select
              value={audienceFilter}
              onChange={(e) => setAudienceFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-slate-900 focus:outline-none"
            >
              <option value="ALL">All Target Audiences</option>
              {TARGET_AUDIENCES.map(aud => (
                <option key={aud} value={aud}>{aud}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Announcements Table & Cards */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <div className="text-xs font-bold text-slate-500">Loading estate notices...</div>
          </div>
        ) : announcements.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
              <Bell className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No announcements match selected filters</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your search criteria or create a new official communication.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4">Title & Message Preview</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Audience</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Schedule / Expiry</th>
                  <th className="py-3.5 px-4 text-center">Engagement</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {announcements.map((item) => {
                  const isEmergency = item.category === 'Emergency' || item.priority === 'Emergency' || item.is_emergency;
                  const isUrgent = item.priority === 'Urgent' || item.priority === 'URGENT' || item.priority === 'High';
                  const isImportant = item.priority === 'Important' || item.priority === 'IMPORTANT' || item.is_important;
                  const isPublished = item.status === 'Published' || item.status === 'PUBLISHED';
                  const isDraft = item.status === 'Draft' || item.status === 'DRAFT';
                  const isExpired = item.status === 'Expired' || item.status === 'EXPIRED' || (item.expires_at && new Date(item.expires_at) <= new Date());
                  const isScheduled = item.status === 'Scheduled' || item.status === 'SCHEDULED' || new Date(item.publish_at) > new Date();

                  const catMatch = CATEGORIES.find(c => c.value.toLowerCase() === item.category.toLowerCase()) || CATEGORIES[0];
                  const CatIcon = catMatch.icon;

                  return (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-slate-50/80 transition-colors ${item.is_pinned ? 'bg-amber-50/30' : ''}`}
                    >
                      <td className="py-4 px-4 max-w-sm">
                        <div className="flex items-start gap-2">
                          {item.is_pinned && (
                            <span className="p-1 rounded-md bg-amber-100 text-amber-800 shrink-0 mt-0.5" title="Pinned to Top">
                              <Pin className="w-3.5 h-3.5" />
                            </span>
                          )}
                          <div>
                            <div className="font-bold text-slate-900 leading-snug flex items-center gap-1.5">
                              <span>{item.title}</span>
                              {item.attachment_url && (
                                <span title="Has attachment">
                                  <Paperclip className="w-3 h-3 text-slate-400 shrink-0" />
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                              {item.body}
                            </div>
                            <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                              <span>By {item.author_name || 'Admin'}</span>
                              <span>•</span>
                              <span>{new Date(item.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${catMatch.color}`}>
                          <CatIcon className="w-3 h-3 shrink-0" />
                          <span>{item.category}</span>
                        </span>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-800 text-[11px]">
                          {item.target_audience || 'All Residents'}
                        </div>
                        {item.target_filter_value && (
                          <div className="text-[10px] text-slate-500 truncate max-w-[140px]">
                            {item.target_filter_value}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                            isEmergency
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : isUrgent
                              ? 'bg-orange-100 text-orange-800'
                              : isImportant
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {item.priority}
                        </span>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            isExpired
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : isScheduled
                              ? 'bg-purple-100 text-purple-800'
                              : isPublished
                              ? 'bg-emerald-100 text-emerald-800'
                              : isDraft
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isExpired ? 'Expired' : isScheduled ? 'Scheduled' : item.status}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{new Date(item.publish_at).toLocaleDateString('en-GB')}</span>
                        </div>
                        {item.expires_at && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Exp: {new Date(item.expires_at).toLocaleDateString('en-GB')}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => setSelectedForStats(item)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold transition-colors cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>{item.view_count || item.read_by_residents?.length || 0} reads</span>
                        </button>
                      </td>

                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          {/* Toggle Pin */}
                          {canManage && (
                            <button
                              onClick={() => handleTogglePin(item)}
                              title={item.is_pinned ? 'Unpin announcement' : 'Pin to top of bulletin'}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                item.is_pinned 
                                  ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' 
                                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {item.is_pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                            </button>
                          )}

                          {/* Preview Public Page */}
                          {onPreviewPublic && isPublished && (
                            <button
                              onClick={() => onPreviewPublic(item.slug)}
                              title="View Public Announcement Page"
                              className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}

                          {canManage && (
                            <>
                              {/* Edit Button */}
                              <button
                                onClick={() => handleOpenEditModal(item)}
                                title="Edit Notice"
                                className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              {/* Publish / Unpublish Toggle */}
                              {isPublished ? (
                                <button
                                  onClick={() => handleToggleStatus(item, 'Draft')}
                                  title="Unpublish (Save as Draft)"
                                  className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                                >
                                  <FileText className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleToggleStatus(item, 'Published')}
                                  title="Publish Announcement Live"
                                  className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                                >
                                  <Send className="w-4 h-4" />
                                </button>
                              )}

                              {/* Archive Button */}
                              {item.status !== 'Archived' && item.status !== 'ARCHIVED' && (
                                <button
                                  onClick={() => handleToggleStatus(item, 'Archived')}
                                  title="Archive Notice"
                                  className="p-1.5 text-slate-400 hover:text-purple-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                                >
                                  <Archive className="w-4 h-4" />
                                </button>
                              )}

                              {/* Delete Button */}
                              <button
                                onClick={() => setItemToDelete(item)}
                                title="Delete Notice"
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                  <Bell className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 font-display">
                    {modalMode === 'create' ? 'Create Estate Announcement' : 'Edit Announcement'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Configure official bulletin metadata, target audience, schedule, and publication status.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Tabs: Form vs Preview */}
            <div className="px-6 border-b border-slate-100 flex items-center gap-4 bg-white text-xs">
              <button
                onClick={() => setActiveModalTab('form')}
                className={`py-3 font-bold border-b-2 cursor-pointer transition-colors ${
                  activeModalTab === 'form'
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Announcement Form
              </button>
              <button
                onClick={() => setActiveModalTab('preview')}
                className={`py-3 font-bold border-b-2 cursor-pointer transition-colors ${
                  activeModalTab === 'preview'
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Live Resident Preview
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {activeModalTab === 'form' ? (
                <form id="announcement-form" onSubmit={handleSaveAnnouncement} className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Announcement Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="e.g. Commencement of Online Security Levy Payments (October 2026)"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>

                  {/* Category, Priority, Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                      <select
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value as AnnouncementCategory)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-slate-900 focus:outline-none"
                      >
                        {CATEGORIES.map(c => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
                      <select
                        value={formPriority}
                        onChange={(e) => setFormPriority(e.target.value as AnnouncementPriority)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-slate-900 focus:outline-none"
                      >
                        <option value="Normal">Normal</option>
                        <option value="Important">Important</option>
                        <option value="Urgent">Urgent / High</option>
                        <option value="Emergency">Emergency</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as AnnouncementStatus)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-slate-900 focus:outline-none"
                      >
                        <option value="Published">Published</option>
                        <option value="Scheduled">Scheduled</option>
                        <option value="Draft">Draft</option>
                        <option value="Archived">Archived</option>
                      </select>
                    </div>
                  </div>

                  {/* Targeted Audience & Filter */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Target Audience
                      </label>
                      <select
                        value={formAudience}
                        onChange={(e) => setFormAudience(e.target.value as TargetAudience)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-slate-900 focus:outline-none"
                      >
                        {TARGET_AUDIENCES.map(aud => (
                          <option key={aud} value={aud}>{aud}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Target Filter Value (Optional)
                      </label>
                      <input
                        type="text"
                        value={formFilterValue}
                        onChange={(e) => setFormFilterValue(e.target.value)}
                        placeholder="e.g. Palm Avenue, or 001, 002"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">
                        Specify street name, zone, or comma-separated resident numbers.
                      </span>
                    </div>
                  </div>

                  {/* Pinned & Important Flags */}
                  <div className="flex flex-wrap items-center gap-6 py-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                      <input
                        type="checkbox"
                        checked={formIsPinned}
                        onChange={(e) => setFormIsPinned(e.target.checked)}
                        className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900"
                      />
                      <span>Pin Announcement to Top</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                      <input
                        type="checkbox"
                        checked={formIsImportant}
                        onChange={(e) => setFormIsImportant(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                      />
                      <span>Highlight as Important Notice</span>
                    </label>
                  </div>

                  {/* Publication Date & Expiry Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Publish At (Schedule)
                      </label>
                      <input
                        type="datetime-local"
                        value={formPublishAt}
                        onChange={(e) => setFormPublishAt(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-500">Notices scheduled for the future will not appear to residents until this date/time.</span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Expires At (Optional)
                      </label>
                      <input
                        type="datetime-local"
                        value={formExpiresAt}
                        onChange={(e) => setFormExpiresAt(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-500">Automatically archived and hidden after expiry date/time.</span>
                    </div>
                  </div>

                  {/* Author Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Author / Issuing Body
                    </label>
                    <input
                      type="text"
                      value={formAuthorName}
                      onChange={(e) => setFormAuthorName(e.target.value)}
                      placeholder="e.g. Estate Security EXCO, Facilities & Works Committee"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>

                  {/* Body Content */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Announcement Full Message <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={6}
                      value={formBody}
                      onChange={(e) => setFormBody(e.target.value)}
                      placeholder="Write the full announcement text here with clear paragraphs..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none leading-relaxed"
                    />
                  </div>

                  {/* Optional Attachment Name & URL */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Attachment Display Title
                      </label>
                      <input
                        type="text"
                        value={formAttachmentName}
                        onChange={(e) => setFormAttachmentName(e.target.value)}
                        placeholder="e.g. Security_Guidelines_2026.pdf"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Attachment Download Link (URL)
                      </label>
                      <input
                        type="url"
                        value={formAttachmentUrl}
                        onChange={(e) => setFormAttachmentUrl(e.target.value)}
                        placeholder="https://... (PDF, Document link)"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
                      />
                    </div>
                  </div>
                </form>
              ) : (
                /* LIVE RESIDENT PREVIEW */
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-800">
                        {formCategory}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                          formPriority === 'Emergency'
                            ? 'bg-rose-100 text-rose-800'
                            : formPriority === 'Urgent'
                            ? 'bg-orange-100 text-orange-800'
                            : formPriority === 'Important'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {formPriority} Priority
                      </span>
                      {formIsPinned && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          <Pin className="w-3 h-3" /> Pinned
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500">
                      Target: <strong className="text-slate-800">{formAudience}</strong>
                    </span>
                  </div>

                  <h2 className="text-lg font-black text-slate-900 leading-snug font-display">
                    {formTitle || 'Untitled Announcement'}
                  </h2>

                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>By {formAuthorName || 'Estate Administrator'}</span>
                    <span>•</span>
                    <span>{formPublishAt ? new Date(formPublishAt).toLocaleDateString('en-GB') : 'Immediate'}</span>
                    {formExpiresAt && (
                      <>
                        <span>•</span>
                        <span className="text-rose-600">Expires {new Date(formExpiresAt).toLocaleDateString('en-GB')}</span>
                      </>
                    )}
                  </div>

                  <div className="text-xs text-slate-700 whitespace-pre-line leading-relaxed border-t border-slate-100 pt-3">
                    {formBody || 'No message text provided yet.'}
                  </div>

                  {formAttachmentUrl && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-slate-800 font-semibold">
                        <Paperclip className="w-4 h-4 text-slate-500" />
                        <span>{formAttachmentName || 'Attached Document'}</span>
                      </div>
                      <span className="text-blue-600 font-bold hover:underline">Download</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="announcement-form"
                disabled={formSubmitting}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                {formSubmitting ? 'Saving...' : modalMode === 'create' ? 'Publish Announcement' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EMERGENCY BROADCAST MODAL */}
      {isEmergencyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-rose-200 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Flame className="w-6 h-6 text-white animate-pulse" />
                </div>
                <div>
                  <h3 className="font-black text-base font-display tracking-wide">
                    Estate Emergency Broadcast
                  </h3>
                  <p className="text-[11px] text-rose-100">
                    High-priority dispatch to all resident portals and security dashboards.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEmergencyModalOpen(false)}
                className="p-1.5 text-rose-200 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendEmergencyBroadcast} className="p-6 space-y-4">
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-rose-800">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Important Protocol</span>
                </div>
                <p className="text-[11px] text-rose-700 leading-relaxed">
                  Emergency broadcasts trigger top-priority banner alerts, immediate resident notification center dispatch, and activate security alert operations.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Emergency Title <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={emergencyTitle}
                  onChange={(e) => setEmergencyTitle(e.target.value)}
                  placeholder="e.g. FLASH SECURITY ADVISORY / MAJOR DRAINAGE SURGE"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-rose-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Emergency Instructions & Message <span className="text-rose-600">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={emergencyMessage}
                  onChange={(e) => setEmergencyMessage(e.target.value)}
                  placeholder="Clearly state the incident, safety instructions, and designated estate hotlines..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-rose-600 focus:outline-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Targeted Audience
                  </label>
                  <select
                    value={emergencyAudience}
                    onChange={(e) => setEmergencyAudience(e.target.value as TargetAudience)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-rose-600 focus:outline-none"
                  >
                    <option value="All Residents">All Residents (Estate-wide)</option>
                    <option value="Phase I Residents">Phase I Residents</option>
                    <option value="Phase II Residents">Phase II Residents</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Auto-Expiry Duration
                  </label>
                  <select
                    value={emergencyDurationHours}
                    onChange={(e) => setEmergencyDurationHours(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-rose-600 focus:outline-none"
                  >
                    <option value="12">12 Hours</option>
                    <option value="24">24 Hours (1 Day)</option>
                    <option value="48">48 Hours (2 Days)</option>
                    <option value="72">72 Hours (3 Days)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEmergencyModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={emergencySubmitting}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer flex items-center gap-2"
                >
                  <Flame className="w-4 h-4" />
                  <span>{emergencySubmitting ? 'Broadcasting...' : 'Broadcast Emergency Now'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* READERSHIP & ENGAGEMENT STATS MODAL */}
      {selectedForStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <BarChart2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 font-display">
                    Readership & Engagement Stats
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate max-w-[280px]">
                    {selectedForStats.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedForStats(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Views</div>
                  <div className="text-2xl font-black text-slate-900 font-display mt-1">
                    {selectedForStats.view_count || selectedForStats.read_by_residents?.length || 0}
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Target Audience</div>
                  <div className="text-xs font-bold text-slate-800 mt-2">
                    {selectedForStats.target_audience || 'All Residents'}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                  <CheckCheck className="w-4 h-4 text-emerald-600" />
                  <span>Acknowledged / Read By Residents</span>
                </h4>

                {selectedForStats.acknowledgments && selectedForStats.acknowledgments.length > 0 ? (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {selectedForStats.acknowledgments.map((ack, idx) => (
                      <div key={idx} className="p-3 bg-white flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-slate-900">{ack.resident_name}</div>
                          <div className="text-[10px] text-slate-500">Resident #{ack.resident_number} • {ack.house_number}</div>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(ack.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : selectedForStats.read_by_residents && selectedForStats.read_by_residents.length > 0 ? (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {selectedForStats.read_by_residents.map((resNum, idx) => (
                      <div key={idx} className="p-3 bg-white flex items-center justify-between text-xs">
                        <div className="font-bold text-slate-800">Resident #{resNum}</div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Read Verified
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                    No resident acknowledgments recorded yet.
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-end bg-slate-50">
              <button
                onClick={() => setSelectedForStats(null)}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-slate-200 shadow-xl space-y-4">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-display">Delete Announcement?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to permanently remove "{itemToDelete.title}"? This action is recorded in the activity audit log.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setItemToDelete(null)}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Delete Notice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
