import React from 'react';
import {
  getPlatformBusinesses,
  getPlatformStats,
  getPlatformUsers,
  getGlobalPermissions,
  getSupportTickets,
  getAnnouncements,
  getEmailLogs,
  getFAQs,
  getFeatureFlags,
  getPlatformSettings,
  getAuditLogs
} from '@/app/actions/platform';
import PlatformConsole from '@/components/platform/PlatformConsole';

export const metadata = {
  title: 'TraderERP SaaS Control Plane – Sardauna Tech Lab',
  description: 'SaaS tenant administration control plane.',
};

export default async function PlatformPage() {
  const [
    businesses,
    stats,
    users,
    permissions,
    tickets,
    announcements,
    emailLogs,
    faqs,
    flags,
    settings,
    auditLogs
  ] = await Promise.all([
    getPlatformBusinesses(),
    getPlatformStats(),
    getPlatformUsers(),
    getGlobalPermissions(),
    getSupportTickets(),
    getAnnouncements(),
    getEmailLogs(),
    getFAQs(),
    getFeatureFlags(),
    getPlatformSettings(),
    getAuditLogs()
  ]);

  return (
    <div className="space-y-6">
      
      {/* Platform Header Metadata */}
      <div>
        <h2 className="text-xl font-black text-white tracking-tight leading-none">SaaS Platform Console</h2>
        <p className="text-xs text-slate-500 mt-2">
          Monitor system operations, manage database tenants, audit platform actions, and adjust server-side settings.
        </p>
      </div>

      <PlatformConsole
        initialBusinesses={businesses}
        stats={stats}
        initialUsers={users}
        initialPermissions={permissions}
        initialTickets={tickets}
        initialAnnouncements={announcements}
        initialEmailLogs={emailLogs}
        initialFaqs={faqs}
        initialFlags={flags}
        initialSettings={settings}
        initialAuditLogs={auditLogs}
      />

    </div>
  );
}
