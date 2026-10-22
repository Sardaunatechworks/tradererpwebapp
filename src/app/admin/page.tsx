import React from 'react';
import {
  getSuperAdminStats,
  getAdminTransactionAnalytics,
  getAdminInventoryAnalytics,
  getAdminBusinesses,
  getAdminUsers,
  getAdminCustomers,
  getAdminFeedback,
  getAdminAuditLogs,
  getSystemHealth,
  getSuperAdminContext,
  SuperAdminStats,
  AdminTransactionAnalytics,
  AdminInventoryAnalytics,
} from '@/app/actions/admin';
import AdminDashboardView from '@/components/admin/AdminDashboardView';

export default async function AdminPage() {
  const { user } = await getSuperAdminContext();

  const [statsRes, transRes, invRes, bizRes, usersRes, customersRes, feedbackRes, auditRes, healthRes] =
    await Promise.all([
      getSuperAdminStats(),
      getAdminTransactionAnalytics(),
      getAdminInventoryAnalytics(),
      getAdminBusinesses(),
      getAdminUsers(),
      getAdminCustomers(),
      getAdminFeedback(),
      getAdminAuditLogs(60),
      getSystemHealth(),
    ]);

  const defaultStats: SuperAdminStats = {
    totalBusinesses: 0,
    activeBusinesses: 0,
    inactiveBusinesses: 0,
    totalUsers: 0,
    totalCustomers: 0,
    activeCustomers: 0,
    totalCustomerDebt: 0,
    roleDistribution: { owner: 0, admin: 0, staff: 0, superAdmin: 1 },
    registrationTrends: [],
    totalFeedbackCount: 0,
    averageRating: 5,
    recentActivityCount: 0,
    totalSalesCount: 0,
    grossSalesValue: 0,
    totalCollected: 0,
    totalProductsCount: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    periodLabel: 'All Time',
  };

  const defaultTransactions: AdminTransactionAnalytics = {
    totalTransactions: 0,
    completedTransactions: 0,
    cancelledTransactions: 0,
    grossSalesValue: 0,
    totalCollected: 0,
    totalOutstandingCredit: 0,
    paymentMethods: {
      cash: { count: 0, value: 0 },
      bank_transfer: { count: 0, value: 0 },
      pos: { count: 0, value: 0 },
      credit: { count: 0, value: 0 },
      other: { count: 0, value: 0 },
    },
    topBusinesses: [],
    recentTransactions: [],
  };

  const defaultInventory: AdminInventoryAnalytics = {
    totalProducts: 0,
    businessesWithProducts: 0,
    outOfStockCount: 0,
    lowStockCount: 0,
    estimatedTotalValuation: 0,
    alerts: [],
    topCatalogs: [],
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
        initialTransactions={transRes.data || defaultTransactions}
        initialInventory={invRes.data || defaultInventory}
        businesses={bizRes.data || []}
        users={usersRes.data || []}
        customers={customersRes.data || []}
        feedback={feedbackRes.data || []}
        auditLogs={auditRes.data || []}
        initialHealth={healthRes.data || defaultHealth}
        adminEmail={user.email || ''}
      />
    </div>
  );
}
