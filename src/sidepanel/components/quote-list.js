/**
 * Quote list component.
 */
import { formatCurrency, formatDate, formatStatus } from '../../utils/formatters.js';
import { getQuoteUrl } from '../../utils/xero-urls.js';
import { renderEmptyState } from './empty-state.js';

export function renderQuoteList(quotes) {
  if (!quotes || quotes.length === 0) {
    return renderEmptyState('No quotes');
  }

  const el = document.createElement('div');
  el.className = 'list-container';

  quotes.forEach((quote) => {
    const status = formatStatus(quote.Status);
    const quoteUrl = getQuoteUrl(quote.QuoteID);
    const numberContent = quoteUrl
      ? `<a class="row-number row-number-link" data-link-type="quote" href="${escapeAttr(quoteUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(quote.QuoteNumber || '-')}</a>`
      : `<span class="row-number">${escapeHtml(quote.QuoteNumber || '-')}</span>`;
    const row = document.createElement('div');
    row.className = 'list-row';
    row.innerHTML = `
      <div class="row-header">
        ${numberContent}
        <span class="status-badge ${status.className}">${status.label}</span>
      </div>
      <div class="row-details">
        <span class="row-date">${formatDate(quote.DateString || quote.Date)}</span>
        <span class="row-due">Expires: ${formatDate(quote.ExpiryDateString || quote.ExpiryDate)}</span>
      </div>
      <div class="row-amounts">
        <span class="row-total">Total: ${formatCurrency(quote.Total, quote.CurrencyCode)}</span>
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
