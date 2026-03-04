/**
 * Financial summary component - shows total receivable and total payable cards.
 */
import { formatCurrency } from '../../utils/formatters.js';

export function renderFinancialSummary(invoices, bills) {
  const el = document.createElement('div');
  el.className = 'financial-summary';

  const totalReceivable = (invoices || []).reduce(
    (sum, inv) => sum + (inv.AmountDue || 0),
    0
  );
  const totalPayable = (bills || []).reduce(
    (sum, bill) => sum + (bill.AmountDue || 0),
    0
  );

  // Determine currency from first invoice/bill if available
  const currency =
    invoices?.[0]?.CurrencyCode || bills?.[0]?.CurrencyCode || 'AUD';

  el.innerHTML = `
    <div class="summary-card summary-receivable">
      <div class="summary-label">Total Receivable</div>
      <div class="summary-amount">${formatCurrency(totalReceivable, currency)}</div>
      <div class="summary-count">${invoices?.length || 0} invoice${invoices?.length !== 1 ? 's' : ''}</div>
    </div>
    <div class="summary-card summary-payable">
      <div class="summary-label">Total Payable</div>
      <div class="summary-amount">${formatCurrency(totalPayable, currency)}</div>
      <div class="summary-count">${bills?.length || 0} bill${bills?.length !== 1 ? 's' : ''}</div>
    </div>
  `;

  return el;
}
