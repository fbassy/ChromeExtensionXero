/**
 * Formatting utilities for currency, dates, and status badges.
 */

/**
 * Format a number as currency. Uses the currency code from Xero if available.
 */
export function formatCurrency(amount, currencyCode = 'AUD') {
  if (amount == null) return '-';
  try {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${Number(amount).toFixed(2)}`;
  }
}

/**
 * Format an ISO date string to a short readable date.
 * Xero dates come as "/Date(1234567890000+0000)/" or ISO strings.
 */
export function formatDate(dateStr) {
  if (!dateStr) return '-';

  let date;
  // Handle Xero's .NET JSON date format: /Date(1234567890000+0000)/
  const msMatch = dateStr.match(/\/Date\((\d+)([+-]\d{4})?\)\//);
  if (msMatch) {
    date = new Date(parseInt(msMatch[1], 10));
  } else {
    date = new Date(dateStr);
  }

  if (isNaN(date.getTime())) return dateStr;

  return date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Get a status badge config (label + CSS class) for a given status string.
 */
export function formatStatus(status) {
  const map = {
    DRAFT: { label: 'Draft', className: 'status-draft' },
    SUBMITTED: { label: 'Submitted', className: 'status-submitted' },
    AUTHORISED: { label: 'Authorised', className: 'status-authorised' },
    PAID: { label: 'Paid', className: 'status-paid' },
    VOIDED: { label: 'Voided', className: 'status-voided' },
    DELETED: { label: 'Deleted', className: 'status-deleted' },
    SENT: { label: 'Sent', className: 'status-sent' },
    ACCEPTED: { label: 'Accepted', className: 'status-accepted' },
    DECLINED: { label: 'Declined', className: 'status-declined' },
    INVOICED: { label: 'Invoiced', className: 'status-invoiced' },
    BILLED: { label: 'Billed', className: 'status-billed' },
  };

  return map[status] || { label: status || 'Unknown', className: 'status-unknown' };
}
