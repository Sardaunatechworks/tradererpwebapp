'use client';

import React, { useState, startTransition } from 'react';
import PlatformSidebar from './PlatformSidebar';
import {
  setBusinessStatus,
  deleteBusiness,
  setUserStatus,
  resetUserAccess,
  toggleGlobalPermission,
  updateTicketStatus,
  createSupportTicket,
  createAnnouncement,
  sendPlatformEmail,
  createFAQ,
  deleteFAQ,
  updatePlatformSettings,
  toggleFeatureFlag,
  createAuditLog
} from '@/app/actions/platform';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
  UserCheck,
  RefreshCw,
  Search,
  Plus,
  Send,
  Cpu,
  Database,
  Check,
  Building2,
  Users,
  AlertCircle,
  Server,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface Props {
  initialBusinesses: any[];
  stats: {
    totalBusinesses: number;
    activeBusinesses: number;
    suspendedBusinesses: number;
    totalUsers: number;
    activeUsers: number;
    suspendedUsers: number;
  };
  initialUsers: any[];
  initialPermissions: any[];
  initialTickets: any[];
  initialAnnouncements: any[];
  initialEmailLogs: any[];
  initialFaqs: any[];
  initialFlags: any[];
  initialSettings: any[];
  initialAuditLogs: any[];
}

export default function PlatformConsole({
  initialBusinesses,
  stats,
  initialUsers,
  initialPermissions,
  initialTickets,
  initialAnnouncements,
  initialEmailLogs,
  initialFaqs,
  initialFlags,
  initialSettings,
  initialAuditLogs
}: Props) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [businesses, setBusinesses] = useState(initialBusinesses);
  const [users, setUsers] = useState(initialUsers);
  const [permissions, setPermissions] = useState(initialPermissions);
  const [tickets, setTickets] = useState(initialTickets);
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [emailLogs, setEmailLogs] = useState(initialEmailLogs);
  const [faqs, setFaqs] = useState(initialFaqs);
  const [flags, setFlags] = useState(initialFlags);
  const [settings, setSettings] = useState(initialSettings);
  const [auditLogs, setAuditLogs] = useState(initialAuditLogs);

  // Platform admin reply box states
  const [adminResponses, setAdminResponses] = useState<Record<string, string>>({});
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedTicketId(expandedTicketId === id ? null : id);
  };

  // Loading and Error States
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Business Detail / Confirmation States
  const [selectedBiz, setSelectedBiz] = useState<any | null>(null);
  const [bizToDelete, setBizToDelete] = useState<any | null>(null);
  const [bizDeleteConfirmName, setBizDeleteConfirmName] = useState('');

  // Form input states
  const [searchQuery, setSearchQuery] = useState('');
  const [ticketForm, setTicketForm] = useState({ title: '', desc: '', category: 'support', email: '' });
  const [announcementForm, setAnnouncementForm] = useState({ title: '', content: '', type: 'announcement' });
  const [emailForm, setEmailForm] = useState({ to: '', subject: '', template: 'verification' });
  const [faqForm, setFaqForm] = useState({ question: '', answer: '' });
  const [newPermission, setNewPermission] = useState({ role: 'STAFF', permission: '' });

  // Settings states
  const smtpValue = settings.find(s => s.key === 'smtp')?.value || { host: '', port: 587, sender: '' };
  const brandingValue = settings.find(s => s.key === 'branding')?.value || { appName: 'TraderERP', primaryColor: '#2563eb', maintenanceMode: false };
  const [smtpForm, setSmtpForm] = useState(smtpValue);
  const [brandingForm, setBrandingForm] = useState(brandingValue);

  // Filter lists based on search query
  const filteredBusinesses = businesses.filter(b =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.business?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  /* ──────────────────────────────────────────────────────────────────────────
     ACTION HANDLERS
     ────────────────────────────────────────────────────────────────────────── */
  const handleToggleBusiness = async (bizId: string, currentStatus: string) => {
    setLoadingId(bizId);
    clearMessages();
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const res = await setBusinessStatus(bizId, nextStatus);

    if (res?.error) {
      setError(res.error);
    } else {
      setBusinesses(businesses.map(b => b.id === bizId ? { ...b, status: nextStatus } : b));
      // Log event
      await createAuditLog(`Changed status of business ${bizId} to ${nextStatus}`, 'business_activity');
      setSuccess(`Business status updated to ${nextStatus} successfully.`);
    }
    setLoadingId(null);
  };

  const handleDeleteBusinessConfirm = async () => {
    if (!bizToDelete) return;
    if (bizDeleteConfirmName !== bizToDelete.name) {
      setError('Business name confirmation does not match.');
      return;
    }

    setLoadingId(bizToDelete.id);
    clearMessages();
    const res = await deleteBusiness(bizToDelete.id);

    if (res?.error) {
      setError(res.error);
    } else {
      setBusinesses(businesses.filter(b => b.id !== bizToDelete.id));
      await createAuditLog(`Permanently deleted business ${bizToDelete.name}`, 'business_activity');
      setSuccess(`Business ${bizToDelete.name} has been permanently deleted.`);
      setBizToDelete(null);
      setBizDeleteConfirmName('');
    }
    setLoadingId(null);
  };

  const handleToggleUser = async (userId: string, currentStatus: string) => {
    setLoadingId(userId);
    clearMessages();
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const res = await setUserStatus(userId, nextStatus);

    if (res?.error) {
      setError(res.error);
    } else {
      setUsers(users.map(u => u.id === userId ? { ...u, status: nextStatus } : u));
      await createAuditLog(`Updated user ${userId} status to ${nextStatus}`, 'user_activity');
      setSuccess(`User status updated to ${nextStatus} successfully.`);
    }
    setLoadingId(null);
  };

  const handleResetUserAccess = async (userId: string) => {
    setLoadingId(userId);
    clearMessages();
    const res = await resetUserAccess(userId);

    if (res?.error) {
      setError(res.error);
    } else {
      await createAuditLog(`Forced password change on user ${userId}`, 'security_event');
      setSuccess('Forced password reset credential flag set successfully.');
    }
    setLoadingId(null);
  };

  const handleToggleFlag = async (key: string, currentVal: boolean) => {
    setLoadingId(key);
    clearMessages();
    const res = await toggleFeatureFlag(key, !currentVal);

    if (res?.error) {
      setError(res.error);
    } else {
      setFlags(flags.map(f => f.key === key ? { ...f, is_enabled: !currentVal } : f));
      await createAuditLog(`Toggled feature flag ${key} to ${!currentVal}`, 'system_event');
    }
    setLoadingId(null);
  };

  const handleAddPermission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPermission.permission) return;
    setLoadingId('permission');
    clearMessages();

    const res = await toggleGlobalPermission(newPermission.role as any, newPermission.permission, true);
    if (res?.error) {
      setError(res.error);
    } else {
      setPermissions([...permissions, { role: newPermission.role, permission: newPermission.permission }]);
      setNewPermission({ ...newPermission, permission: '' });
      setSuccess('Global permission mapped successfully.');
    }
    setLoadingId(null);
  };

  const handleRemovePermission = async (role: any, perm: string) => {
    setLoadingId(`${role}-${perm}`);
    clearMessages();
    const res = await toggleGlobalPermission(role, perm, false);
    if (res?.error) {
      setError(res.error);
    } else {
      setPermissions(permissions.filter(p => !(p.role === role && p.permission === perm)));
      setSuccess('Global permission revoked successfully.');
    }
    setLoadingId(null);
  };

  const handleResolveTicket = async (ticketId: string, status: any) => {
    setLoadingId(ticketId);
    clearMessages();
    const responseText = adminResponses[ticketId] || '';
    const res = await updateTicketStatus(ticketId, status, responseText);
    if (res?.error) {
      setError(res.error);
    } else {
      setTickets(tickets.map(t => t.id === ticketId ? { ...t, status, admin_response: responseText } : t));
      setSuccess(`Ticket resolved as ${status}.`);
    }
    setLoadingId(null);
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingId('ticket');
    clearMessages();
    const res = await createSupportTicket(ticketForm.title, ticketForm.desc, ticketForm.category as any, ticketForm.email);
    if (res?.error) {
      setError(res.error);
    } else {
      // Re-fetch or add directly for local state
      setTickets([{
        id: Math.random().toString(),
        title: ticketForm.title,
        description: ticketForm.desc,
        category: ticketForm.category,
        contact_email: ticketForm.email,
        status: 'open',
        created_at: new Date().toISOString()
      }, ...tickets]);
      setTicketForm({ title: '', desc: '', category: 'support', email: '' });
      setSuccess('Support ticket created successfully.');
    }
    setLoadingId(null);
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingId('announcement');
    clearMessages();
    const res = await createAnnouncement(announcementForm.title, announcementForm.content, announcementForm.type as any);
    if (res?.error) {
      setError(res.error);
    } else {
      setAnnouncements([{
        id: Math.random().toString(),
        title: announcementForm.title,
        content: announcementForm.content,
        type: announcementForm.type,
        created_at: new Date().toISOString()
      }, ...announcements]);
      setAnnouncementForm({ title: '', content: '', type: 'announcement' });
      setSuccess('Global announcement published successfully.');
    }
    setLoadingId(null);
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingId('email');
    clearMessages();
    const res = await sendPlatformEmail(emailForm.to, emailForm.subject, emailForm.template);
    if (res?.error) {
      setError(res.error);
    } else {
      setEmailLogs([{
        id: Math.random().toString(),
        to_email: emailForm.to,
        subject: emailForm.subject,
        template_name: emailForm.template,
        status: 'sent',
        created_at: new Date().toISOString()
      }, ...emailLogs]);
      setEmailForm({ to: '', subject: '', template: 'verification' });
      setSuccess('Test platform email dispatched.');
    }
    setLoadingId(null);
  };

  const handleCreateFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingId('faq');
    clearMessages();
    const res = await createFAQ(faqForm.question, faqForm.answer);
    if (res?.error) {
      setError(res.error);
    } else {
      setFaqs([{
        id: Math.random().toString(),
        question: faqForm.question,
        answer: faqForm.answer,
        created_at: new Date().toISOString()
      }, ...faqs]);
      setFaqForm({ question: '', answer: '' });
      setSuccess('FAQ added.');
    }
    setLoadingId(null);
  };

  const handleDeleteFaq = async (id: string) => {
    setLoadingId(id);
    clearMessages();
    const res = await deleteFAQ(id);
    if (res?.error) {
      setError(res.error);
    } else {
      setFaqs(faqs.filter(f => f.id !== id));
      setSuccess('FAQ deleted.');
    }
    setLoadingId(null);
  };

  const handleUpdateSMTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingId('smtp');
    clearMessages();
    const res = await updatePlatformSettings('smtp', smtpForm);
    if (res?.error) {
      setError(res.error);
    } else {
      setSuccess('SMTP & Resend settings updated.');
    }
    setLoadingId(null);
  };

  const handleUpdateBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingId('branding');
    clearMessages();
    const res = await updatePlatformSettings('branding', brandingForm);
    if (res?.error) {
      setError(res.error);
    } else {
      setSuccess('Branding & System Configuration settings updated.');
    }
    setLoadingId(null);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* Sidebar Sub-Navigation */}
      <PlatformSidebar activeTab={activeTab} setActiveTab={(t) => { setActiveTab(t); setSearchQuery(''); clearMessages(); }} />

      {/* Main Panel Content */}
      <div className="flex-1 w-full space-y-6">
        
        {/* Messages */}
        {error && (
          <div className="bg-red-950/40 border border-red-800 rounded-xl p-4 text-xs text-red-400 font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-950/40 border border-emerald-800 rounded-xl p-4 text-xs text-emerald-400 font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            {success}
          </div>
        )}

        {/* ─── TAB: DASHBOARD OVERVIEW ─── */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Businesses</span>
                  <span className="text-2xl font-black text-white block mt-1">{stats.totalBusinesses}</span>
                </div>
                <div className="w-10 h-10 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                  <Building2 className="w-5 h-5" />
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Active Accounts</span>
                  <span className="text-2xl font-black text-emerald-500 block mt-1">{stats.activeBusinesses}</span>
                </div>
                <div className="w-10 h-10 rounded-lg bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Users</span>
                  <span className="text-2xl font-black text-indigo-500 block mt-1">{stats.totalUsers}</span>
                </div>
                <div className="w-10 h-10 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
                  <Users className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Health & Operations Summary */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white leading-none">System Status Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-slate-800 bg-slate-950/40 p-4 rounded-xl flex items-center gap-4">
                  <Server className="w-5 h-5 text-emerald-500" />
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Platform Health</span>
                    <span className="text-xs font-black text-emerald-400 block mt-0.5">All Systems Operational</span>
                  </div>
                </div>
                <div className="border border-slate-800 bg-slate-950/40 p-4 rounded-xl flex items-center gap-4">
                  <Database className="w-5 h-5 text-blue-500" />
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Supabase Gateway</span>
                    <span className="text-xs font-black text-blue-400 block mt-0.5">Database Connected</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Signups */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white leading-none">Recent Tenant Registrations</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="py-4 px-6">UUID</th>
                      <th className="py-4 px-6">Company Name</th>
                      <th className="py-4 px-6">Created At</th>
                      <th className="py-4 px-6">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-950">
                    {businesses.slice(0, 5).map(biz => (
                      <tr key={biz.id} className="text-slate-300 hover:bg-slate-950/20">
                        <td className="py-4 px-6 font-mono text-[10px] text-blue-500">{biz.id}</td>
                        <td className="py-4 px-6 font-bold text-white">{biz.name}</td>
                        <td className="py-4 px-6 text-slate-500">{new Date(biz.created_at).toLocaleString()}</td>
                        <td className="py-4 px-6">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
                            biz.status === 'active' ? 'bg-emerald-950/40 border-emerald-900 text-emerald-400' : 'bg-red-950/40 border-red-900 text-red-400'
                          }`}>{biz.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: BUSINESSES MANAGEMENT ─── */}
        {activeTab === 'businesses' && (
          <div className="space-y-6">
            {/* Search */}
            <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2">
              <Search className="w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search businesses by name or UUID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-xs text-white placeholder-slate-600 w-full font-medium"
              />
            </div>

            {/* Businesses List */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="py-4 px-6">UUID</th>
                      <th className="py-4 px-6">Company Name</th>
                      <th className="py-4 px-6">Created At</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-950">
                    {filteredBusinesses.map(biz => (
                      <tr key={biz.id} className="text-slate-300 hover:bg-slate-950/20">
                        <td className="py-4 px-6 font-mono text-[10px] text-blue-500">#{biz.id}</td>
                        <td className="py-4 px-6 font-bold text-white">{biz.name}</td>
                        <td className="py-4 px-6 text-slate-500">{new Date(biz.created_at).toLocaleDateString()}</td>
                        <td className="py-4 px-6">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
                            biz.status === 'active' ? 'bg-emerald-950/40 border-emerald-900 text-emerald-400' : 'bg-red-950/40 border-red-900 text-red-400'
                          }`}>{biz.status}</span>
                        </td>
                        <td className="py-4 px-6 text-right space-x-2">
                          <button
                            onClick={() => handleToggleBusiness(biz.id, biz.status)}
                            disabled={loadingId === biz.id}
                            className={`px-3 py-1 rounded text-[10px] font-bold uppercase border transition-all cursor-pointer ${
                              biz.status === 'active' ? 'border-red-900 text-red-400 hover:bg-red-950/25' : 'border-emerald-900 text-emerald-400 hover:bg-emerald-950/25'
                            }`}
                          >
                            {loadingId === biz.id ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : biz.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                          <button
                            onClick={() => setBizToDelete(biz)}
                            className="px-3 py-1 rounded text-[10px] font-bold uppercase border border-slate-800 text-slate-400 hover:border-red-900 hover:text-red-400 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 inline mr-1" /> Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Deletion Dialog */}
            {bizToDelete && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-6">
                  <div className="text-center space-y-2">
                    <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
                    <h3 className="text-base font-black text-white">Critical: Delete Business Workspace?</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      This will permanently wipe the business profile <span className="text-white font-bold">&quot;{bizToDelete.name}&quot;</span>. 
                      All sales history, users, branch data, and credentials will be permanently destroyed. This cannot be undone.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <label className="block text-[10px] font-bold uppercase text-slate-400">
                      Type company name <span className="text-red-400 font-black">&quot;{bizToDelete.name}&quot;</span> to confirm:
                    </label>
                    <input
                      type="text"
                      value={bizDeleteConfirmName}
                      onChange={(e) => setBizDeleteConfirmName(e.target.value)}
                      placeholder="Type business name exactly"
                      className="block w-full border border-slate-800 bg-slate-950 text-white text-xs px-4 py-2.5 rounded-lg outline-none focus:border-red-500"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => { setBizToDelete(null); setBizDeleteConfirmName(''); }}
                      className="flex-1 bg-slate-850 hover:bg-slate-800 text-slate-400 font-bold text-xs uppercase py-3 rounded-lg border border-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteBusinessConfirm}
                      disabled={loadingId === bizToDelete.id}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase py-3 rounded-lg shadow-lg flex items-center justify-center gap-2"
                    >
                      {loadingId === bizToDelete.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Yes, Delete Permanent'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB: USER MANAGEMENT ─── */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2">
              <Search className="w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search users by name, email, or business..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-xs text-white placeholder-slate-600 w-full font-medium"
              />
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="py-4 px-6">User Name</th>
                      <th className="py-4 px-6">Email Address</th>
                      <th className="py-4 px-6">Business Tenant</th>
                      <th className="py-4 px-6">System Role</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-950">
                    {filteredUsers.map(user => (
                      <tr key={user.id} className="text-slate-300 hover:bg-slate-950/20">
                        <td className="py-4 px-6 font-bold text-white">{user.name}</td>
                        <td className="py-4 px-6 text-slate-400 font-mono text-[11px]">{user.email}</td>
                        <td className="py-4 px-6 text-slate-500 font-semibold">{user.business?.name || 'Unassigned / Global'}</td>
                        <td className="py-4 px-6">
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-950/50 border border-slate-800 text-slate-400">{user.role}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
                            user.status === 'active' ? 'bg-emerald-950/40 border-emerald-900 text-emerald-400' : 'bg-red-950/40 border-red-900 text-red-400'
                          }`}>{user.status}</span>
                        </td>
                        <td className="py-4 px-6 text-right space-x-2">
                          <button
                            onClick={() => handleToggleUser(user.id, user.status)}
                            disabled={loadingId === user.id}
                            className={`px-3 py-1 rounded text-[10px] font-bold uppercase border transition-all cursor-pointer ${
                              user.status === 'active' ? 'border-red-900 text-red-400 hover:bg-red-950/25' : 'border-emerald-900 text-emerald-400 hover:bg-emerald-950/25'
                            }`}
                          >
                            {loadingId === user.id ? <Loader2 className="w-3 h-3 animate-spin" /> : user.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleResetUserAccess(user.id)}
                            disabled={loadingId === user.id}
                            className="px-3 py-1 rounded text-[10px] font-bold uppercase border border-slate-800 text-slate-400 hover:border-blue-900 hover:text-blue-400 transition-all cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3 inline mr-1" /> Reset Access
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: ROLES & PERMISSIONS ─── */}
        {activeTab === 'permissions' && (
          <div className="space-y-6">
            {/* Add Rule Form */}
            <form onSubmit={handleAddPermission} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white leading-none">Map Global Role Rules</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Select Role</label>
                  <select
                    value={newPermission.role}
                    onChange={(e) => setNewPermission({ ...newPermission, role: e.target.value })}
                    className="block w-full border border-slate-850 bg-slate-950 text-white rounded-lg px-4 py-2.5 text-xs outline-none"
                  >
                    <option value="OWNER">OWNER</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="MANAGER">MANAGER</option>
                    <option value="STAFF">STAFF</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Permission Name</label>
                  <input
                    type="text"
                    value={newPermission.permission}
                    onChange={(e) => setNewPermission({ ...newPermission, permission: e.target.value })}
                    placeholder="e.g. refund_sales, manage_discounts"
                    className="block w-full border border-slate-850 bg-slate-950 text-white rounded-lg px-4 py-2.5 text-xs outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loadingId === 'permission'}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Mapping
                </button>
              </div>
            </form>

            {/* Rules Listing */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white leading-none">Active Rules List</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['OWNER', 'ADMIN', 'MANAGER', 'STAFF'].map(r => {
                  const rolePerms = permissions.filter(p => p.role === r);
                  return (
                    <div key={r} className="border border-slate-850 bg-slate-950/40 p-4 rounded-xl space-y-3">
                      <span className="text-[10px] font-black text-white uppercase tracking-wider block border-b border-slate-850 pb-2">{r} Permissions</span>
                      {rolePerms.length === 0 ? (
                        <p className="text-[10px] text-slate-600 font-medium">No permissions granted.</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {rolePerms.map(p => (
                            <span
                              key={p.permission}
                              className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-300 rounded"
                            >
                              {p.permission}
                              <button
                                onClick={() => handleRemovePermission(p.role, p.permission)}
                                className="text-red-400 hover:text-red-300 ml-1 text-xs outline-none font-bold"
                              >
                                &times;
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: SUPPORT CENTER ─── */}
        {activeTab === 'support' && (
          <div className="space-y-6">
            {/* Create Ticket Form */}
            <form onSubmit={handleCreateTicket} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white leading-none">Submit Support Ticket (For Verification)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Contact Email</label>
                  <input
                    type="email"
                    value={ticketForm.email}
                    onChange={(e) => setTicketForm({ ...ticketForm, email: e.target.value })}
                    required
                    placeholder="contact@store.com"
                    className="block w-full border border-slate-850 bg-slate-950 text-white rounded-lg px-4 py-2.5 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Category</label>
                  <select
                    value={ticketForm.category}
                    onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                    className="block w-full border border-slate-850 bg-slate-950 text-white rounded-lg px-4 py-2.5 text-xs outline-none"
                  >
                    <option value="support">Support</option>
                    <option value="complaint">Complaint</option>
                    <option value="feedback">Feedback</option>
                    <option value="contact_request">Contact Request</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Title</label>
                <input
                  type="text"
                  value={ticketForm.title}
                  onChange={(e) => setTicketForm({ ...ticketForm, title: e.target.value })}
                  required
                  placeholder="Ticket Subject"
                  className="block w-full border border-slate-850 bg-slate-950 text-white rounded-lg px-4 py-2.5 text-xs outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Description</label>
                <textarea
                  value={ticketForm.desc}
                  onChange={(e) => setTicketForm({ ...ticketForm, desc: e.target.value })}
                  rows={3}
                  required
                  placeholder="Provide details about support issue..."
                  className="block w-full border border-slate-850 bg-slate-950 text-white rounded-lg px-4 py-2.5 text-xs outline-none resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={loadingId === 'ticket'}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider px-6 py-2.5 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {loadingId === 'ticket' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Ticket'}
              </button>
            </form>

            {/* Tickets Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white leading-none">Support Queue</h3>
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mt-1">Tenant cases and feedback requests</span>
              </div>

              <div className="divide-y divide-slate-950">
                {tickets.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 font-medium text-xs">
                    No tickets in queue.
                  </div>
                ) : (
                  tickets.map(t => {
                    const isExpanded = expandedTicketId === t.id;
                    return (
                      <div key={t.id} className="hover:bg-slate-950/10 transition-all duration-150">
                        {/* Summary Header */}
                        <div
                          onClick={() => toggleExpand(t.id)}
                          className="px-6 py-4 flex items-center justify-between gap-4 cursor-pointer select-none"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">{t.title}</span>
                              <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400">
                                {t.category}
                              </span>
                              {t.business?.name && (
                                <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-blue-950/40 border border-blue-900/30 text-blue-400">
                                  {t.business.name}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 font-medium block">
                              From: {t.contact_email} | Submitted {new Date(t.created_at).toLocaleDateString()}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className={`text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded border ${
                              t.status === 'open' 
                                ? 'bg-amber-950/40 border-amber-900 text-amber-400' 
                                : 'bg-emerald-950/40 border-emerald-900 text-emerald-400'
                            }`}>
                              {t.status}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-slate-500" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-500" />
                            )}
                          </div>
                        </div>

                        {/* Expandable Response Box */}
                        {isExpanded && (
                          <div className="px-6 pb-6 pt-2 space-y-4 border-t border-slate-950 bg-slate-950/20 animate-in slide-in-from-top duration-200">
                            <div className="space-y-1.5">
                              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Description</span>
                              <p className="text-xs text-slate-350 leading-relaxed whitespace-pre-wrap font-medium">{t.description}</p>
                            </div>

                            {t.status === 'open' ? (
                              <div className="space-y-3 pt-2">
                                <label className="block text-[10px] font-bold uppercase text-slate-400">
                                  Type Admin Response
                                </label>
                                <textarea
                                  value={adminResponses[t.id] || ''}
                                  onChange={(e) => setAdminResponses({ ...adminResponses, [t.id]: e.target.value })}
                                  placeholder="Type response to the customer..."
                                  rows={3}
                                  className="block w-full border border-slate-800 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-lg outline-none focus:border-blue-500 resize-none"
                                />
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => handleResolveTicket(t.id, 'resolved')}
                                    disabled={loadingId === t.id}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase tracking-wider px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                                  >
                                    {loadingId === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5" /> Respond & Resolve</>}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="border border-slate-800 bg-slate-900/60 p-4 rounded-xl space-y-1.5">
                                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider block">Admin Response Sent</span>
                                <p className="text-xs text-white leading-relaxed whitespace-pre-wrap font-medium">{t.admin_response}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: ANNOUNCEMENTS ─── */}
        {activeTab === 'announcements' && (
          <div className="space-y-6">
            <form onSubmit={handleCreateAnnouncement} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white leading-none">Publish Announcement</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Announcement Title</label>
                  <input
                    type="text"
                    value={announcementForm.title}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                    required
                    placeholder="e.g. Version Upgrade Schedule"
                    className="block w-full border border-slate-850 bg-slate-950 text-white rounded-lg px-4 py-2.5 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Notification Channel</label>
                  <select
                    value={announcementForm.type}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, type: e.target.value })}
                    className="block w-full border border-slate-850 bg-slate-950 text-white rounded-lg px-4 py-2.5 text-xs outline-none"
                  >
                    <option value="announcement">Announcements Dashboard Banner</option>
                    <option value="broadcast">SMTP System Broadcast</option>
                    <option value="notification">Notification Feed Alert</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Message Content</label>
                <textarea
                  value={announcementForm.content}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
                  rows={3}
                  required
                  placeholder="Detail the update or broadcast details for system tenants..."
                  className="block w-full border border-slate-850 bg-slate-950 text-white rounded-lg px-4 py-2.5 text-xs outline-none resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={loadingId === 'announcement'}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider px-6 py-2.5 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {loadingId === 'announcement' ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-3.5 h-3.5" /> Publish Broadcast</>}
              </button>
            </form>

            {/* Broadcast list */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-6 space-y-4">
              <h3 className="text-sm font-bold text-white leading-none">Broadcast Archive</h3>
              <div className="space-y-3">
                {announcements.map(a => (
                  <div key={a.id} className="border border-slate-850 bg-slate-950/40 p-4 rounded-xl space-y-2">
                    <div className="flex justify-between items-start">
                      <h4 className="text-xs font-bold text-white">{a.title}</h4>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-500 uppercase">{a.type}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-medium">{a.content}</p>
                    <span className="text-[9px] text-slate-600 font-bold block mt-1">{new Date(a.created_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: AUDIT LOGS ─── */}
        {activeTab === 'audit' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white leading-none">SaaS Audit Logs</h3>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-1 block">Chronological security and tenant modifications</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-4 px-6">Timestamp</th>
                    <th className="py-4 px-6">Operator</th>
                    <th className="py-4 px-6">Action / Event</th>
                    <th className="py-4 px-6">Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-950">
                  {auditLogs.map(log => (
                    <tr key={log.id} className="text-slate-300 hover:bg-slate-950/20">
                      <td className="py-4 px-6 text-slate-500 font-mono text-[10px]">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="py-4 px-6 font-semibold text-slate-400">{log.user?.name || 'Super Administrator'}</td>
                      <td className="py-4 px-6 font-bold text-white">{log.action}</td>
                      <td className="py-4 px-6">
                        <span className="text-[9px] font-bold px-2 py-0.5 bg-slate-950 border border-slate-850 rounded text-slate-500 uppercase">{log.category}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB: EMAIL MANAGEMENT ─── */}
        {activeTab === 'email' && (
          <div className="space-y-6">
            {/* Dispatch Form */}
            <form onSubmit={handleSendTestEmail} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white leading-none">Send Platform Email Notification</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">To Email</label>
                  <input
                    type="email"
                    value={emailForm.to}
                    onChange={(e) => setEmailForm({ ...emailForm, to: e.target.value })}
                    required
                    placeholder="recipient@domain.com"
                    className="block w-full border border-slate-850 bg-slate-950 text-white rounded-lg px-4 py-2.5 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Select Template</label>
                  <select
                    value={emailForm.template}
                    onChange={(e) => setEmailForm({ ...emailForm, template: e.target.value })}
                    className="block w-full border border-slate-850 bg-slate-950 text-white rounded-lg px-4 py-2.5 text-xs outline-none"
                  >
                    <option value="verification">Email Verification Template</option>
                    <option value="reset_password">Password Reset Template</option>
                    <option value="staff_welcome">Staff Welcome Template</option>
                    <option value="warning">System Warning Alert Template</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Email Subject Line</label>
                <input
                  type="text"
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                  required
                  placeholder="e.g. Verify your TraderERP credentials"
                  className="block w-full border border-slate-850 bg-slate-950 text-white rounded-lg px-4 py-2.5 text-xs outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loadingId === 'email'}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider px-6 py-2.5 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {loadingId === 'email' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Email Notification'}
              </button>
            </form>

            {/* Email Dispatch Logs */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white leading-none">Email Delivery Logs</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="py-4 px-6">Recipient</th>
                      <th className="py-4 px-6">Subject</th>
                      <th className="py-4 px-6">Template</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-950">
                    {emailLogs.map(log => (
                      <tr key={log.id} className="text-slate-300 hover:bg-slate-950/20">
                        <td className="py-4 px-6 text-white font-bold">{log.to_email}</td>
                        <td className="py-4 px-6 text-slate-400 font-medium">{log.subject}</td>
                        <td className="py-4 px-6 font-mono text-[10px] text-blue-400">{log.template_name}</td>
                        <td className="py-4 px-6">
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-900 text-emerald-400 uppercase">
                            {log.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-slate-500 font-mono text-[10px]">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: CONTENT MANAGEMENT ─── */}
        {activeTab === 'content' && (
          <div className="space-y-6">
            {/* Create FAQ */}
            <form onSubmit={handleCreateFaq} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white leading-none">Add Frequently Asked Question (FAQ)</h3>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Question</label>
                <input
                  type="text"
                  value={faqForm.question}
                  onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                  required
                  placeholder="e.g. What payment methods does the POS console support?"
                  className="block w-full border border-slate-850 bg-slate-950 text-white rounded-lg px-4 py-2.5 text-xs outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Answer</label>
                <textarea
                  value={faqForm.answer}
                  onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                  required
                  rows={3}
                  placeholder="Provide dynamic, descriptive answer context..."
                  className="block w-full border border-slate-850 bg-slate-950 text-white rounded-lg px-4 py-2.5 text-xs outline-none resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={loadingId === 'faq'}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider px-6 py-2.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer"
              >
                {loadingId === 'faq' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create FAQ Content'}
              </button>
            </form>

            {/* List FAQs */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white leading-none">Active FAQ Registrations</h3>
              <div className="space-y-3">
                {faqs.map(f => (
                  <div key={f.id} className="border border-slate-850 bg-slate-950/40 p-4 rounded-xl flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-white">{f.question}</h4>
                      <p className="text-[11px] text-slate-400 font-medium leading-relaxed">{f.answer}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteFaq(f.id)}
                      className="text-slate-500 hover:text-red-400 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: PLATFORM SETTINGS ─── */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* SMTP */}
            <form onSubmit={handleUpdateSMTP} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white leading-none">SMTP & Email Settings (Resend Integration)</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">SMTP Host Server</label>
                  <input
                    type="text"
                    value={smtpForm.host}
                    onChange={(e) => setSmtpForm({ ...smtpForm, host: e.target.value })}
                    className="block w-full border border-slate-850 bg-slate-950 text-white rounded-lg px-4 py-2.5 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Port Number</label>
                  <input
                    type="number"
                    value={smtpForm.port}
                    onChange={(e) => setSmtpForm({ ...smtpForm, port: parseInt(e.target.value) || 587 })}
                    className="block w-full border border-slate-850 bg-slate-950 text-white rounded-lg px-4 py-2.5 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Sender Verification Email</label>
                  <input
                    type="email"
                    value={smtpForm.sender}
                    onChange={(e) => setSmtpForm({ ...smtpForm, sender: e.target.value })}
                    className="block w-full border border-slate-850 bg-slate-950 text-white rounded-lg px-4 py-2.5 text-xs outline-none"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loadingId === 'smtp'}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider w-full py-3 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {loadingId === 'smtp' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save SMTP Settings'}
              </button>
            </form>

            {/* Branding / Settings */}
            <form onSubmit={handleUpdateBranding} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white leading-none">Branding & System Configuration</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Platform Application Name</label>
                  <input
                    type="text"
                    value={brandingForm.appName}
                    onChange={(e) => setBrandingForm({ ...brandingForm, appName: e.target.value })}
                    className="block w-full border border-slate-850 bg-slate-950 text-white rounded-lg px-4 py-2.5 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Primary Tailwind Palette Theme Accent</label>
                  <input
                    type="text"
                    value={brandingForm.primaryColor}
                    onChange={(e) => setBrandingForm({ ...brandingForm, primaryColor: e.target.value })}
                    className="block w-full border border-slate-850 bg-slate-950 text-white rounded-lg px-4 py-2.5 text-xs outline-none"
                  />
                </div>
                <div className="flex items-center justify-between border border-slate-850 bg-slate-950/40 p-4 rounded-xl">
                  <div>
                    <span className="text-xs font-bold text-white block">Platform Maintenance Mode</span>
                    <span className="text-[10px] text-slate-500 block">Restrict tenants workspace access immediately</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBrandingForm({ ...brandingForm, maintenanceMode: !brandingForm.maintenanceMode })}
                    className={`font-black text-[10px] uppercase px-4 py-2 rounded-lg transition-all ${
                      brandingForm.maintenanceMode ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {brandingForm.maintenanceMode ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loadingId === 'branding'}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider w-full py-3 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {loadingId === 'branding' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save System Settings'}
              </button>
            </form>
          </div>
        )}

        {/* ─── TAB: DEVELOPER TOOLS (FEATURE FLAGS) ─── */}
        {activeTab === 'developer' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white leading-none">Developer Feature Flags</h3>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-1 block">Toggle dynamic code releases and feature gates</span>
            </div>
            <div className="divide-y divide-slate-850">
              {flags.map(flag => (
                <div key={flag.key} className="py-4 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-black text-white block">{flag.name}</span>
                    <p className="text-[10px] text-slate-500 max-w-lg font-medium">{flag.description}</p>
                    <span className="font-mono text-[9px] text-blue-500 font-bold block">{flag.key}</span>
                  </div>
                  <button
                    onClick={() => handleToggleFlag(flag.key, flag.is_enabled)}
                    disabled={loadingId === flag.key}
                    className={`font-black text-[10px] uppercase px-4 py-2 rounded-lg transition-all cursor-pointer ${
                      flag.is_enabled ? 'bg-blue-600 text-white shadow-md shadow-blue-900/10' : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {loadingId === flag.key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : flag.is_enabled ? 'Active' : 'Inactive'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB: MONITORING & REPORTS ─── */}
        {activeTab === 'reports' && (
          <div className="space-y-6 bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div>
              <h3 className="text-sm font-bold text-white leading-none">SaaS Growth & Performance</h3>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-1 block">Monthly metrics visualization</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-slate-850 bg-slate-950/40 p-4 rounded-xl space-y-3">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Registrations By Domain</span>
                <div className="h-32 flex items-end gap-3 pt-6">
                  {[4, 8, 12, 18, 22, 28].map((val, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1.5">
                      <div className="w-full bg-blue-600/40 hover:bg-blue-600 rounded" style={{ height: `${(val / 30) * 100}px` }} />
                      <span className="text-[9px] text-slate-500 font-bold">M{idx + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border border-slate-850 bg-slate-950/40 p-4 rounded-xl space-y-3">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">User Signups Frequency</span>
                <div className="h-32 flex items-end gap-3 pt-6">
                  {[12, 24, 18, 32, 45, 60].map((val, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1.5">
                      <div className="w-full bg-indigo-600/40 hover:bg-indigo-600 rounded" style={{ height: `${(val / 70) * 100}px` }} />
                      <span className="text-[9px] text-slate-500 font-bold">M{idx + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: SYSTEM MONITORING ─── */}
        {activeTab === 'monitoring' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-white leading-none">Server Statistics Monitoring</h3>
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-1 block">Live API latencies and server metrics</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="border border-slate-850 bg-slate-950/40 p-4 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Average API Latency</span>
                    <Cpu className="w-4 h-4 text-blue-500" />
                  </div>
                  <span className="text-2xl font-black text-white block mt-2">42 ms</span>
                  <div className="h-1 bg-slate-850 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 w-1/4" />
                  </div>
                </div>

                <div className="border border-slate-850 bg-slate-950/40 p-4 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Memory Consumption</span>
                    <Cpu className="w-4 h-4 text-emerald-500" />
                  </div>
                  <span className="text-2xl font-black text-white block mt-2">128 MB</span>
                  <div className="h-1 bg-slate-850 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-1/5" />
                  </div>
                </div>

                <div className="border border-slate-850 bg-slate-950/40 p-4 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Database Conn Peak</span>
                    <Database className="w-4 h-4 text-indigo-500" />
                  </div>
                  <span className="text-2xl font-black text-white block mt-2">12 Conns</span>
                  <div className="h-1 bg-slate-850 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 w-1/6" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: SUBSCRIPTIONS & BILLING (FUTURE) ─── */}
        {activeTab === 'billing' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-850 pb-4">
              <span className="text-xs font-black bg-blue-600/10 border border-blue-500/20 text-blue-400 px-2 py-0.5 rounded uppercase shrink-0">FUTURE RELEASE</span>
              <div>
                <h3 className="text-sm font-bold text-white leading-none">Subscription & Revenue Billing Engine</h3>
                <span className="text-[10px] text-slate-500 mt-1 block">Configured plans and dynamic invoicing (Stripe integration scheduled)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Plan cards */}
              {[
                { name: 'Starter Plan', price: '₦15,000 / month', desc: 'Single outlet with basic reporting configurations.' },
                { name: 'Growth Plan', price: '₦30,000 / month', desc: 'Up to 3 branches, advanced reporting, and staff modules.' },
                { name: 'Enterprise Plan', price: '₦75,000 / month', desc: 'Unlimited outlets, full backups, whitelabel options.' },
              ].map(plan => (
                <div key={plan.name} className="border border-slate-850 bg-slate-950/40 p-5 rounded-2xl space-y-4">
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-white">{plan.name}</h4>
                    <span className="text-sm font-black text-blue-400 block">{plan.price}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed font-medium">{plan.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
