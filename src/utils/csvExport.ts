/**
 * Utility for exporting platform data to clean, formatted CSV files.
 * Includes UTF-8 BOM (\uFEFF) for compatibility with Microsoft Excel, Google Sheets, and Numbers.
 */

import {
  AdminUserRecord,
  AdminCustomerRecord,
  AdminFeedbackRecord,
  AdminBusinessRecord,
  AdminAuditRecord,
} from '@/app/actions/admin';
import { formatDate, formatDateTime } from '@/utils/formatters';

/**
 * Escapes a cell value for standard CSV compatibility.
 */
function escapeCsvCell(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Creates and triggers a download of a CSV file in the browser.
 */
export function downloadCsvFile(filename: string, headers: string[], rows: (string | number | boolean | null | undefined)[][]) {
  if (typeof window === 'undefined') return;

  const headerLine = headers.map(escapeCsvCell).join(',');
  const rowLines = rows.map((row) => row.map(escapeCsvCell).join(','));
  const csvContent = '\uFEFF' + [headerLine, ...rowLines].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export Platform Users as CSV
 */
export function exportUsersToCsv(users: AdminUserRecord[], filenamePrefix: string = 'tradererp_platform_users') {
  const dateStr = new Date().toISOString().slice(0, 10);
  const headers = [
    'User ID',
    'Full Name',
    'Email Address',
    'Phone Number',
    'Account Status',
    'Platform Owner',
    'Businesses & Roles',
    'Date Signed Up (Formatted)',
    'Date Signed Up (ISO)',
  ];

  const rows = users.map((u) => {
    const bizSummary = (u.businesses || [])
      .map((b) => `${b.name} (${b.role})`)
      .join('; ');

    return [
      u.id,
      u.name || 'Unnamed',
      u.email,
      u.phone || 'N/A',
      u.status.toUpperCase(),
      u.isPlatformOwner ? 'YES' : 'NO',
      bizSummary || 'None',
      formatDate(u.created_at),
      u.created_at,
    ];
  });

  downloadCsvFile(`${filenamePrefix}_${dateStr}.csv`, headers, rows);
}

/**
 * Export Platform Customers as CSV
 */
export function exportCustomersToCsv(customers: AdminCustomerRecord[], filenamePrefix: string = 'tradererp_customers') {
  const dateStr = new Date().toISOString().slice(0, 10);
  const headers = [
    'Customer ID',
    'Customer Name',
    'Business / Store',
    'Email Address',
    'Phone Number',
    'Physical Address',
    'Outstanding Balance (Debt NGN)',
    'Account Status',
    'Customer Notes',
    'Date Added (Formatted)',
    'Date Added (ISO)',
    'Last Updated',
  ];

  const rows = customers.map((c) => [
    c.id,
    c.name || 'Unnamed Customer',
    c.business_name || 'N/A',
    c.email || 'N/A',
    c.phone || 'N/A',
    c.address || 'N/A',
    c.outstanding_balance ? Number(c.outstanding_balance).toFixed(2) : '0.00',
    c.status.toUpperCase(),
    c.notes || 'None',
    formatDate(c.created_at),
    c.created_at,
    formatDateTime(c.updated_at),
  ]);

  downloadCsvFile(`${filenamePrefix}_${dateStr}.csv`, headers, rows);
}

/**
 * Export Platform Feedback as CSV
 */
export function exportFeedbackToCsv(feedback: AdminFeedbackRecord[], filenamePrefix: string = 'tradererp_feedback') {
  const dateStr = new Date().toISOString().slice(0, 10);
  const headers = [
    'Feedback ID',
    'Business / Store',
    'User Name',
    'User Email',
    'Rating (Stars 1-5)',
    'Category',
    'Detailed Message',
    'Submitted Date (Formatted)',
    'Submitted Date (ISO)',
  ];

  const rows = feedback.map((f) => [
    f.id,
    f.business_name || 'N/A',
    f.user_name || 'Anonymous',
    f.user_email || 'N/A',
    f.rating !== null && f.rating !== undefined ? f.rating : 'N/A',
    f.category?.toUpperCase() || 'GENERAL',
    f.message || '',
    formatDateTime(f.created_at),
    f.created_at,
  ]);

  downloadCsvFile(`${filenamePrefix}_${dateStr}.csv`, headers, rows);
}

/**
 * Export Platform Businesses as CSV
 */
export function exportBusinessesToCsv(businesses: AdminBusinessRecord[], filenamePrefix: string = 'tradererp_businesses') {
  const dateStr = new Date().toISOString().slice(0, 10);
  const headers = [
    'Business ID',
    'Business Name',
    'Business Type',
    'Currency',
    'Owner Name',
    'Owner Email',
    'Phone Number',
    'Email Address',
    'Physical Address',
    'Members Count',
    'Account Status',
    'Registration Date (Formatted)',
    'Registration Date (ISO)',
  ];

  const rows = businesses.map((b) => [
    b.id,
    b.name,
    b.business_type || 'General',
    b.currency,
    b.owner_name || 'N/A',
    b.owner_email || 'N/A',
    b.phone || 'N/A',
    b.email || 'N/A',
    b.address || 'N/A',
    b.member_count,
    b.status.toUpperCase(),
    formatDate(b.created_at),
    b.created_at,
  ]);

  downloadCsvFile(`${filenamePrefix}_${dateStr}.csv`, headers, rows);
}

/**
 * Export Platform Audit Logs as CSV
 */
export function exportAuditLogsToCsv(logs: AdminAuditRecord[], filenamePrefix: string = 'tradererp_audit_logs') {
  const dateStr = new Date().toISOString().slice(0, 10);
  const headers = [
    'Log ID',
    'Timestamp (Formatted)',
    'Timestamp (ISO)',
    'Action Code',
    'Entity Type',
    'Entity ID',
    'Actor Name',
    'Actor Email',
    'Business Name',
    'Metadata JSON',
  ];

  const rows = logs.map((l) => [
    l.id,
    formatDateTime(l.created_at),
    l.created_at,
    l.action,
    l.entity_type,
    l.entity_id || 'N/A',
    l.user?.name || 'System',
    l.user?.email || 'System',
    l.business?.name || 'Platform Wide',
    l.metadata ? JSON.stringify(l.metadata) : '',
  ]);

  downloadCsvFile(`${filenamePrefix}_${dateStr}.csv`, headers, rows);
}
