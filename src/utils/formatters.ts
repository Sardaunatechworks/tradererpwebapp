/**
 * Financial & data formatting helpers adhering to uiux.md specifications.
 */

export function formatCurrency(amount: number | string | null | undefined, currency: string = '₦'): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return `${currency}0`;
  }
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `${currency}${numericAmount.toLocaleString('en-NG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(dateString: string | Date | null | undefined): string {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatNumber(val: number | string | null | undefined): string {
  if (val === null || val === undefined || isNaN(Number(val))) return '0';
  return Number(val).toLocaleString('en-US');
}

export type AdminDateRange = 'today' | '7d' | '30d' | 'year' | 'all';

export function getDateRangeLabel(range: AdminDateRange = 'all'): string {
  switch (range) {
    case 'today':
      return 'Today';
    case '7d':
      return 'Last 7 Days';
    case '30d':
      return 'Last 30 Days';
    case 'year':
      return 'This Year';
    default:
      return 'All Time';
  }
}
