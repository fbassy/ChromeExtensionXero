/**
 * Xero web app deep links. Opens in go.xero.com (user must be logged in).
 * Paths based on Xero's deep linking (e.g. AccountsReceivable/View.aspx?InvoiceID=).
 */
const XERO_APP_BASE = 'https://go.xero.com';

export function getInvoiceUrl(invoiceId) {
  if (!invoiceId) return null;
  return `${XERO_APP_BASE}/AccountsReceivable/View.aspx?InvoiceID=${encodeURIComponent(invoiceId)}`;
}

export function getBillUrl(invoiceId) {
  if (!invoiceId) return null;
  return `${XERO_APP_BASE}/AccountsPayable/View.aspx?InvoiceID=${encodeURIComponent(invoiceId)}`;
}

export function getQuoteUrl(quoteId) {
  if (!quoteId) return null;
  return `${XERO_APP_BASE}/app/quotes/view/${encodeURIComponent(quoteId)}`;
}

export function getPurchaseOrderUrl(purchaseOrderId) {
  if (!purchaseOrderId) return null;
  return `${XERO_APP_BASE}/app/purchase-orders/view/${encodeURIComponent(purchaseOrderId)}`;
}
