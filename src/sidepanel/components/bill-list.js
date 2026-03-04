/**
 * Bill list component - renders rows of purchase invoices (ACCPAY).
 */
import { formatCurrency, formatDate, formatStatus } from '../../utils/formatters.js';
import { getBillUrl } from '../../utils/xero-urls.js';
import { renderEmptyState } from './empty-state.js';

export function renderBillList(bills) {
  if (!bills || bills.length === 0) {
    return renderEmptyState('No outstanding bills');
  }

  const el = document.createElement('div');
  el.className = 'list-container';

  bills.forEach((bill) => {
    const status = formatStatus(bill.Status);
    const billUrl = getBillUrl(bill.InvoiceID);
    const numberContent = billUrl
      ? `<a class="row-number row-number-link" data-link-type="bill" href="${escapeAttr(billUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(bill.InvoiceNumber || '-')}</a>`
      : `<span class="row-number">${escapeHtml(bill.InvoiceNumber || '-')}</span>`;
    const row = document.createElement('div');
    row.className = 'list-row';
    row.innerHTML = `
      <div class="row-header">
        ${numberContent}
        <span class="status-badge ${status.className}">${status.label}</span>
      </div>
      <div class="row-details">
        <span class="row-date">${formatDate(bill.DateString || bill.Date)}</span>
        <span class="row-due">Due: ${formatDate(bill.DueDateString || bill.DueDate)}</span>
      </div>
      <div class="row-amounts">
        <span class="row-total">Total: ${formatCurrency(bill.Total, bill.CurrencyCode)}</span>
        <span class="row-due-amount">Due: ${formatCurrency(bill.AmountDue, bill.CurrencyCode)}</span>
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
