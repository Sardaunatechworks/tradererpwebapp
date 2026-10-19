'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  Megaphone,
  Plus,
  Edit2,
  Archive,
  Trash2,
  Calendar,
  Users,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Info,
  Wrench,
  Loader2,
  X,
} from 'lucide-react';
import {
  Announcement,
  AnnouncementSeverity,
  AnnouncementStatus,
  AnnouncementAudience,
  AnnouncementFormData,
} from '@/types/announcement';
import {
  getAdminAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  archiveAnnouncement,
  deleteAnnouncement,
} from '@/app/actions/announcements';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { toast } from '@/stores/toastStore';

const SEVERITY_CONFIG: Record<
  AnnouncementSeverity,
  { label: string; badge: string; icon: React.ReactNode }
> = {
  info: {
    label: 'Informational',
    badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    icon: <Info className="w-3.5 h-3.5 text-blue-400" />,
  },
  important: {
    label: 'Important',
    badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
  },
  maintenance: {
    label: 'Maintenance',
    badge: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    icon: <Wrench className="w-3.5 h-3.5 text-rose-400" />,
  },
};

const STATUS_CONFIG: Record<AnnouncementStatus, { label: string; badge: string }> = {
  draft: { label: 'Draft', badge: 'bg-slate-700/60 text-slate-300 border-slate-600' },
  scheduled: { label: 'Scheduled', badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' },
  published: { label: 'Live / Published', badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
  expired: { label: 'Expired', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  archived: { label: 'Archived', badge: 'bg-slate-800 text-slate-400 border-slate-700' },
};

export default function AdminAnnouncementsManager() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Filters
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Form modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  // Form fields
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [severity, setSeverity] = useState<AnnouncementSeverity>('info');
  const [status, setStatus] = useState<AnnouncementStatus>('published');
  const [audience, setAudience] = useState<AnnouncementAudience>('all');
  const [startsAt, setStartsAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirm dialog
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await getAdminAnnouncements();
      setAnnouncements(data);
    } catch (err: any) {
      console.warn('Failed loading announcements:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
    setSeverity('info');
    setStatus('published');
    setAudience('all');
    setStartsAt(new Date().toISOString().slice(0, 16));
    setExpiresAt('');
    setFormError(null);
    setPreviewMode(false);
    setModalOpen(true);
  };

  const openEditModal = (a: Announcement) => {
    setEditingId(a.id);
    setTitle(a.title);
    setContent(a.content);
    setSeverity(a.severity);
    setStatus(a.status);
    setAudience(a.target_audience);
    setStartsAt(a.starts_at ? new Date(a.starts_at).toISOString().slice(0, 16) : '');
    setExpiresAt(a.expires_at ? new Date(a.expires_at).toISOString().slice(0, 16) : '');
    setFormError(null);
    setPreviewMode(false);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setFormError('Please enter both title and announcement content');
      return;
    }

    setFormError(null);
    startTransition(async () => {
      const payload: AnnouncementFormData = {
        title: title.trim(),
        content: content.trim(),
        severity,
        status,
        target_audience: audience,
        starts_at: startsAt ? new Date(startsAt).toISOString() : new Date().toISOString(),
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      };

      if (editingId) {
        const res = await updateAnnouncement(editingId, payload);
        if (res.success) {
          toast.success('Announcement updated successfully');
          setModalOpen(false);
          await loadData();
        } else {
          setFormError(res.error || 'Failed to update announcement');
        }
      } else {
        const res = await createAnnouncement(payload);
        if (res.success) {
          toast.success('Announcement created successfully');
          setModalOpen(false);
          await loadData();
        } else {
          setFormError(res.error || 'Failed to create announcement');
        }
      }
    });
  };

  const handleArchive = async (id: string) => {
    startTransition(async () => {
      const res = await archiveAnnouncement(id);
      if (res.success) {
        toast.info('Announcement archived');
        await loadData();
      } else {
        toast.error(res.error || 'Failed to archive');
      }
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      const res = await deleteAnnouncement(deleteTarget.id);
      if (res.success) {
        toast.success('Announcement deleted');
        setDeleteTarget(null);
        await loadData();
      } else {
        toast.error(res.error || 'Failed to delete');
      }
    });
  };

  // Filtered list
  const filtered = announcements.filter((a) => {
    if (filterSeverity !== 'all' && a.severity !== filterSeverity) return false;
    if (filterStatus !== 'all' && a.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Platform Announcements & Alerts
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Broadcast service maintenance, feature rollouts, and operational alerts across all tenants.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Announcement</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-white/5">
          {['all', 'info', 'important', 'maintenance'].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize cursor-pointer transition-colors ${
                filterSeverity === sev
                  ? 'bg-white/10 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-white/5">
          {['all', 'published', 'draft', 'archived'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize cursor-pointer transition-colors ${
                filterStatus === st
                  ? 'bg-white/10 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Announcements List */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
          <p className="text-xs">Loading announcements...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-slate-900/30 border border-white/5">
          <Megaphone className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-slate-300">No announcements match</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Create an announcement to communicate system updates, maintenance windows, or promotions.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => {
            const sevMeta = SEVERITY_CONFIG[item.severity] || SEVERITY_CONFIG.info;
            const statMeta = STATUS_CONFIG[item.status] || STATUS_CONFIG.draft;

            return (
              <div
                key={item.id}
                className="p-5 rounded-2xl bg-slate-900/40 backdrop-blur-md border border-white/10 flex flex-col justify-between space-y-4 hover:border-white/20 transition-colors"
              >
                <div>
                  {/* Badges Row */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wide ${sevMeta.badge}`}
                      >
                        {sevMeta.icon}
                        <span>{sevMeta.label}</span>
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statMeta.badge}`}
                      >
                        {statMeta.label}
                      </span>
                    </div>

                    <span className="text-[10px] text-slate-400 font-medium capitalize flex items-center gap-1">
                      <Users className="w-3 h-3 text-slate-500" />
                      <span>Audience: {item.target_audience}</span>
                    </span>
                  </div>

                  {/* Title & Content */}
                  <h4 className="text-sm font-bold text-white tracking-tight mb-1.5">
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line line-clamp-3">
                    {item.content}
                  </p>
                </div>

                {/* Metadata & Actions */}
                <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>
                      {item.starts_at ? new Date(item.starts_at).toLocaleDateString() : 'Immediate'}
                      {item.expires_at ? ` → ${new Date(item.expires_at).toLocaleDateString()}` : ' (No expiry)'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditModal(item)}
                      title="Edit announcement"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {item.status !== 'archived' && (
                      <button
                        onClick={() => handleArchive(item.id)}
                        title="Archive announcement"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors cursor-pointer"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => setDeleteTarget(item)}
                      title="Delete permanently"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Announcement' : 'Create Platform Announcement'}
        description="Configure announcement severity, audience targeting, and publication schedule."
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Scheduled Maintenance Notice"
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Message Content *
            </label>
            <textarea
              required
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Describe the update, affected features, or key actions required..."
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Severity
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as AnnouncementSeverity)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="info">Informational</option>
                <option value="important">Important</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Audience
              </label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value as AnnouncementAudience)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">All Users</option>
                <option value="owners">Store Owners & Admins</option>
                <option value="staff">Staff Only</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AnnouncementStatus)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="published">Published / Live</option>
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Starts At
              </label>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Expires At (Optional)
              </label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
          </div>

          {/* Banner Live Preview */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setPreviewMode((v) => !v)}
              className="text-xs text-blue-600 font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{previewMode ? 'Hide live preview' : 'Preview banner as tenant user'}</span>
            </button>

            {previewMode && (
              <div className="mt-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Live Preview
                </p>
                <div
                  className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                    severity === 'maintenance'
                      ? 'border-rose-300 bg-rose-50 text-rose-950'
                      : severity === 'important'
                      ? 'border-amber-200 bg-amber-50 text-amber-950'
                      : 'border-blue-200 bg-blue-50 text-blue-950'
                  }`}
                >
                  <div className="p-1 rounded bg-white/60 shrink-0 mt-0.5">
                    {severity === 'maintenance' ? (
                      <Wrench className="w-4 h-4 text-rose-600" />
                    ) : severity === 'important' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    ) : (
                      <Info className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold">{title || 'Sample Announcement Title'}</h5>
                    <p className="text-xs mt-0.5 opacity-90 leading-relaxed whitespace-pre-line">
                      {content || 'Your announcement message will be rendered here for tenants.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isPending}
            >
              {editingId ? 'Save Changes' : 'Publish Announcement'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Announcement"
        description={`Are you sure you want to permanently delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isPending}
      />
    </div>
  );
}
