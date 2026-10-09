import React from 'react';
import {
  getSuperAdminStats,
  getAdminBusinesses,
  getAdminUsers,
  getAdminFeedback,
  getAdminAuditLogs,
  getSuperAdminContext,
} from '@/app/actions/admin';
import AdminDashboardView from '@/components/admin/AdminDashboardView';

export default async function AdminPage() {
  const { user } = await getSuperAdminContext();

  const [statsRes, bizRes, usersRes, feedbackRes, auditRes] = await Promise.all([
    getSuperAdminStats(),
    getAdminBusinesses(),
    getAdminUsers(),
    getAdminFeedback(),
    getAdminAuditLogs(20),
  ]);

  const stats = statsRes.data || {
    totalBusinesses: 0,
    activeBusinesses: 0,
    inactiveBusinesses: 0,
    totalUsers: 0,
    totalSalesCount: 0,
    platformGmv: 0,
    totalProductsCount: 0,
    totalFeedbackCount: 0,
    averageRating: 5,
    newFeedbackCount: 0,
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Platform Administration
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time multi-tenant health, businesses management, and customer satisfaction metrics
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Systems Online</span>
          </span>
        </div>
      </div>

      <AdminDashboardView
        stats={stats}
        businesses={bizRes.data || []}
        users={usersRes.data || []}
        feedback={feedbackRes.data || []}
        auditLogs={auditRes.data || []}
        adminEmail={user.email || ''}
      />
    </div>
  );
}
