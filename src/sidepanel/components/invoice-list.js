/**
 * Invoice list component - renders rows of sales invoices (ACCREC).
 */
import { formatCurrency, formatDate, formatStatus } from '../../utils/formatters.js';
import { getInvoiceUrl } from '../../utils/xero-urls.js';
import { renderEmptyState } from './empty-state.js';

export function renderInvoiceList(invoices) {
  if (!invoices || invoices.length === 0) {
    return renderEmptyState('No outstanding invoices');
  }

  const el = document.createElement('div');
  el.className = 'list-container';

  invoices.forEach((inv) => {
    const status = formatStatus(inv.Status);
    const invoiceUrl = getInvoiceUrl(inv.InvoiceID);
    const numberContent = invoiceUrl
      ? `<a class="row-number row-number-link" data-link-type="invoice" href="${escapeAttr(invoiceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(inv.InvoiceNumber || '-')}</a>`
      : `<span class="row-number">${escapeHtml(inv.InvoiceNumber || '-')}</span>`;
    const row = document.createElement('div');
    row.className = 'list-row';
    row.innerHTML = `
      <div class="row-header">
        ${numberContent}
        <span class="status-badge ${status.className}">${status.label}</span>
      </div>
      <div class="row-details">
        <span class="row-date">${formatDate(inv.DateString || inv.Date)}</span>
        <span class="row-due">Due: ${formatDate(inv.DueDateString || inv.DueDate)}</span>
      </div>
      <div class="row-amounts">
        <span class="row-total">Total: ${formatCurrency(inv.Total, inv.CurrencyCode)}</span>
        <span class="row-due-amount">Due: ${formatCurrency(inv.AmountDue, inv.CurrencyCode)}</span>
      </div>
    `;
    el.appendChild(row);
  });

  return el;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML.replace(/"/g, '&quot;');
}
