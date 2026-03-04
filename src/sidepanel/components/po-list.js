/**
 * Purchase order list component.
 */
import { formatCurrency, formatDate, formatStatus } from '../../utils/formatters.js';
import { getPurchaseOrderUrl } from '../../utils/xero-urls.js';
import { renderEmptyState } from './empty-state.js';

export function renderPOList(purchaseOrders) {
  if (!purchaseOrders || purchaseOrders.length === 0) {
    return renderEmptyState('No purchase orders');
  }

  const el = document.createElement('div');
  el.className = 'list-container';

  purchaseOrders.forEach((po) => {
    const status = formatStatus(po.Status);
    const poUrl = getPurchaseOrderUrl(po.PurchaseOrderID);
    const numberContent = poUrl
      ? `<a class="row-number row-number-link" data-link-type="po" href="${escapeAttr(poUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(po.PurchaseOrderNumber || '-')}</a>`
      : `<span class="row-number">${escapeHtml(po.PurchaseOrderNumber || '-')}</span>`;
    const row = document.createElement('div');
    row.className = 'list-row';
    row.innerHTML = `
      <div class="row-header">
        ${numberContent}
        <span class="status-badge ${status.className}">${status.label}</span>
      </div>
      <div class="row-details">
        <span class="row-date">${formatDate(po.DateString || po.Date)}</span>
        <span class="row-due">Delivery: ${formatDate(po.DeliveryDateString || po.DeliveryDate)}</span>
      </div>
      <div class="row-amounts">
        <span class="row-total">Total: ${formatCurrency(po.Total, po.CurrencyCode)}</span>
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
