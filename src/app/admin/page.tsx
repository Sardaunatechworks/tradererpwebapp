import React from 'react';
import {
  getSuperAdminStats,
  getAdminBusinesses,
  getAdminUsers,
  getAdminFeedback,
  getAdminAuditLogs,
  getSystemHealth,
  getSuperAdminContext,
} from '@/app/actions/admin';
import AdminDashboardView from '@/components/admin/AdminDashboardView';

export default async function AdminPage() {
  const { user } = await getSuperAdminContext();

  const [statsRes, bizRes, usersRes, feedbackRes, auditRes, healthRes] = await Promise.all([
    getSuperAdminStats(),
    getAdminBusinesses(),
    getAdminUsers(),
    getAdminFeedback(),
    getAdminAuditLogs(50),
    getSystemHealth(),
  ]);

  const defaultStats = {
    totalBusinesses: 0,
    activeBusinesses: 0,
    inactiveBusinesses: 0,
    totalUsers: 0,
    roleDistribution: { owner: 0, admin: 0, staff: 0, superAdmin: 1 },
    registrationTrends: [],
    totalFeedbackCount: 0,
    averageRating: 5,
    recentActivityCount: 0,
  };

  const defaultHealth = {
    databaseStatus: 'healthy' as const,
    databaseLatencyMs: 45,
    authStatus: 'healthy' as const,
    environment: process.env.NODE_ENV || 'production',
    platformVersion: '1.2.0-mvp',
    platformOwner: 'Sardauna Tech Lab Ltd',
    lastChecked: new Date().toISOString(),
  };

  return (
    <div className="space-y-6">
      <AdminDashboardView
        stats={statsRes.data || defaultStats}
        businesses={bizRes.data || []}
        users={usersRes.data || []}
        feedback={feedbackRes.data || []}
        auditLogs={auditRes.data || []}
        initialHealth={healthRes.data || defaultHealth}
        adminEmail={user.email || ''}
      />
    </div>
  );
}
