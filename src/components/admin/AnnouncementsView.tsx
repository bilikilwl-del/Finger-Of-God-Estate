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
  ShieldAlert
} from 'lucide-react';
import {
  Announcement,
  AnnouncementCategory,
  AnnouncementPriority,
  AnnouncementStatus,
  AdminUser,
  EstateSettings
} from '../../types/database';
import { dbService } from '../../lib/supabase';

interface AnnouncementsViewProps {
  adminUser?: AdminUser | null;
  estateSettings?: EstateSettings;
  onPreviewPublic?: (slug: string) => void;
}

const CATEGORIES: AnnouncementCategory[] = [
  'GENERAL',
  'SECURITY',
  'PAYMENT',
  'MAINTENANCE',
  'MEETING',
  'EMERGENCY',
  'OTHER'
];

const PRIORITIES: AnnouncementPriority[] = ['NORMAL', 'IMPORTANT', 'URGENT'];
const STATUSES: AnnouncementStatus[] = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];

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

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingItem, setEditingItem] = useState<Announcement | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'form' | 'preview'>('form');

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<AnnouncementCategory>('GENERAL');
  const [formPriority, setFormPriority] = useState<AnnouncementPriority>('NORMAL');
  const [formStatus, setFormStatus] = useState<AnnouncementStatus>('PUBLISHED');
  const [formPublishAt, setFormPublishAt] = useState('');
  const [formExpiresAt, setFormExpiresAt] = useState('');
  const [formAuthorName, setFormAuthorName] = useState('');
  const [formAttachmentUrl, setFormAttachmentUrl] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete State
  const [itemToDelete, setItemToDelete] = useState<Announcement | null>(null);

  // RBAC checks
  const userRole = adminUser?.role || 'Admin';
  const canManage = userRole === 'Super Admin' || userRole === 'Admin' || userRole === 'SUPER_ADMIN' || userRole === 'ADMIN';

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const data = await dbService.getAdminAnnouncements({
        status: statusFilter,
        category: categoryFilter,
        priority: priorityFilter,
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
  }, [statusFilter, categoryFilter, priorityFilter, searchQuery]);

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setEditingItem(null);
    setFormTitle('');
    setFormCategory('GENERAL');
    setFormPriority('NORMAL');
    setFormStatus('PUBLISHED');
    setFormPublishAt(new Date().toISOString().slice(0, 16));
    setFormExpiresAt('');
    setFormAuthorName(adminUser?.full_name || 'Estate Administrator');
    setFormAttachmentUrl('');
    setFormImageUrl('');
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
    setFormPublishAt(item.publish_at ? new Date(item.publish_at).toISOString().slice(0, 16) : '');
    setFormExpiresAt(item.expires_at ? new Date(item.expires_at).toISOString().slice(0, 16) : '');
    setFormAuthorName(item.author_name || adminUser?.full_name || 'Estate Administrator');
    setFormAttachmentUrl(item.attachment_url || '');
    setFormImageUrl(item.image_url || '');
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
      setFormError('Announcement body content is required');
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
        publish_at: formPublishAt ? new Date(formPublishAt).toISOString() : new Date().toISOString(),
        expires_at: formExpiresAt ? new Date(formExpiresAt).toISOString() : null,
        author_name: formAuthorName.trim() || 'Estate Administrator',
        attachment_url: formAttachmentUrl.trim() || null,
        image_url: formImageUrl.trim() || null,
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
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Announcements & Estate Notices</h1>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
              Stage 8
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Broadcast official notices, security alerts, and payment advisories to all estate residents.
          </p>
        </div>

        {canManage && (
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>New Announcement</span>
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notices..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="PUBLISHED">Published Only</option>
              <option value="DRAFT">Drafts</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="ALL">All Priorities</option>
              {PRIORITIES.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Announcements Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <div className="text-xs font-semibold text-slate-500">Loading notices...</div>
          </div>
        ) : announcements.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
              <Bell className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No announcements match filters</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Adjust filters above or create a new announcement notice.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Title & Details</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Publish Date</th>
                  <th className="py-3 px-4">Author</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {announcements.map((item) => {
                  const isUrgent = item.priority === 'URGENT' || item.priority === 'Emergency';
                  const isImportant = item.priority === 'IMPORTANT' || item.priority === 'High';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-bold text-slate-900 truncate" title={item.title}>
                          {item.title}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {item.body}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
                          {item.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            isUrgent
                              ? 'bg-rose-100 text-rose-800'
                              : isImportant
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {item.priority}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            item.status === 'PUBLISHED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'DRAFT'
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(item.publish_at).toLocaleDateString('en-GB')}</span>
                        </div>
                        {item.expires_at && (
                          <div className="text-[10px] text-slate-400">
                            Exp: {new Date(item.expires_at).toLocaleDateString('en-GB')}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {item.author_name || 'Admin'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          {/* Preview Public Link */}
                          {onPreviewPublic && item.status === 'PUBLISHED' && (
                            <button
                              onClick={() => onPreviewPublic(item.slug)}
                              title="View Public Page"
                              className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100"
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
                                className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              {/* Publish / Unpublish Toggle */}
                              {item.status === 'PUBLISHED' ? (
                                <button
                                  onClick={() => handleToggleStatus(item, 'DRAFT')}
                                  title="Unpublish (Save as Draft)"
                                  className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-slate-100"
                                >
                                  <FileText className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleToggleStatus(item, 'PUBLISHED')}
                                  title="Publish Live"
                                  className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-100"
                                >
                                  <Send className="w-4 h-4" />
                                </button>
                              )}

                              {/* Archive Button */}
                              {item.status !== 'ARCHIVED' && (
                                <button
                                  onClick={() => handleToggleStatus(item, 'ARCHIVED')}
                                  title="Archive Notice"
                                  className="p-1.5 text-slate-400 hover:text-purple-600 rounded-lg hover:bg-slate-100"
                                >
                                  <Archive className="w-4 h-4" />
                                </button>
                              )}

                              {/* Delete Button */}
                              <button
                                onClick={() => setItemToDelete(item)}
                                title="Delete Notice"
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100"
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
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {modalMode === 'create' ? 'Create Estate Announcement' : 'Edit Announcement'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Configure official bulletin metadata, schedule, and publication status.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Tabs: Form vs Preview */}
            <div className="px-6 border-b border-slate-100 flex items-center gap-4 bg-white text-xs">
              <button
                onClick={() => setActiveModalTab('form')}
                className={`py-3 font-semibold border-b-2 cursor-pointer transition-colors ${
                  activeModalTab === 'form'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Edit Content
              </button>
              <button
                onClick={() => setActiveModalTab('preview')}
                className={`py-3 font-semibold border-b-2 cursor-pointer transition-colors ${
                  activeModalTab === 'preview'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Live Preview
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {formError && (
                <div className="p-3 mb-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {activeModalTab === 'form' ? (
                <form id="announcement-form" onSubmit={handleSaveAnnouncement} className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Announcement Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="e.g. Commencement of Online Security Levy Payments (October 2026)"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Category, Priority, Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                      <select
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value as AnnouncementCategory)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        {CATEGORIES.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                      <select
                        value={formPriority}
                        onChange={(e) => setFormPriority(e.target.value as AnnouncementPriority)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        {PRIORITIES.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as AnnouncementStatus)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        {STATUSES.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Publication Date & Expiry Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Publish At (Schedule)
                      </label>
                      <input
                        type="datetime-local"
                        value={formPublishAt}
                        onChange={(e) => setFormPublishAt(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-500">Notices scheduled in the future won't appear publicly until this time.</span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Expires At (Optional)
                      </label>
                      <input
                        type="datetime-local"
                        value={formExpiresAt}
                        onChange={(e) => setFormExpiresAt(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-500">Automatically archived when expired.</span>
                    </div>
                  </div>

                  {/* Author Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Author / Committee Name
                    </label>
                    <input
                      type="text"
                      value={formAuthorName}
                      onChange={(e) => setFormAuthorName(e.target.value)}
                      placeholder="e.g. Estate Security EXCO, Finance Committee"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Body Content */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Announcement Content <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={6}
                      value={formBody}
                      onChange={(e) => setFormBody(e.target.value)}
                      placeholder="Write the full announcement text here..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none leading-relaxed"
                    />
                  </div>

                  {/* Optional Attachment URL */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Attachment Document URL (Optional)
                    </label>
                    <input
                      type="url"
                      value={formAttachmentUrl}
                      onChange={(e) => setFormAttachmentUrl(e.target.value)}
                      placeholder="https://... (PDF, Document link)"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </form>
              ) : (
                /* LIVE PREVIEW */
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        formPriority === 'URGENT'
                          ? 'bg-rose-100 text-rose-800'
                          : formPriority === 'IMPORTANT'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-200 text-slate-800'
                      }`}
                    >
                      {formPriority} PRIORITY
                    </span>
                    <span className="px-2.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold uppercase">
                      {formCategory}
                    </span>
                    <span className="px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
                      {formStatus}
                    </span>
                  </div>

                  <h2 className="text-lg font-bold text-slate-900 leading-snug">
                    {formTitle || 'Untitled Announcement'}
                  </h2>

                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>By {formAuthorName || 'Estate Administration'}</span>
                    <span>•</span>
                    <span>{formPublishAt ? new Date(formPublishAt).toLocaleDateString() : 'Now'}</span>
                  </div>

                  <div className="text-xs text-slate-700 whitespace-pre-line leading-relaxed border-t border-slate-200 pt-3">
                    {formBody || 'No content provided yet.'}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="announcement-form"
                disabled={formSubmitting}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {formSubmitting ? 'Saving...' : modalMode === 'create' ? 'Create Announcement' : 'Save Changes'}
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
              <h3 className="text-sm font-bold text-slate-900">Delete Announcement?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to permanently remove "{itemToDelete.title}"? This action is recorded in the audit log.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setItemToDelete(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl"
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
