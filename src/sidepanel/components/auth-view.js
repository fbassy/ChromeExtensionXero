/**
 * Auth view component - shows "Connect to Xero" or "Reconnect to Xero" when not authenticated.
 * @param {() => void} onConnect - Called when user clicks the connect button
 * @param {{ reconnectRequired?: boolean }} [options] - When true, show "Reconnect to Xero" and session-expired message
 */
export function renderAuthView(onConnect, options = {}) {
  const reconnectRequired = options.reconnectRequired === true;
  const el = document.createElement('div');
  el.className = 'auth-view';
  el.innerHTML = `
    <div class="auth-logo">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect width="48" height="48" rx="12" fill="#13B5EA"/>
        <text x="24" y="30" text-anchor="middle" fill="white" font-size="20" font-weight="bold">X</text>
      </svg>
    </div>
    <h2 class="auth-title">Xero for Gmail</h2>
    <p class="auth-description">
      ${reconnectRequired
        ? 'Your Xero session expired or was revoked. Connect again to continue.'
        : 'Connect your Xero account to see invoices, bills, purchase orders, and quotes for your email contacts.'}
    </p>
    <button class="btn btn-primary auth-connect-btn">${reconnectRequired ? 'Reconnect to Xero' : 'Connect to Xero'}</button>
  `;

  el.querySelector('.auth-connect-btn').addEventListener('click', onConnect);
  return el;
}

/**
 * Connected status bar shown at the top when authenticated.
 */
export function renderConnectionStatus(tenantName, onDisconnect) {
  const el = document.createElement('div');
  el.className = 'connection-status';
  el.innerHTML = `
    <div class="connection-info">
      <span class="connection-dot"></span>
      <span class="connection-org">${escapeHtml(tenantName)}</span>
    </div>
    <button class="btn-icon disconnect-btn" title="Disconnect">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm3.5 9.5L10 12 8 10l-2 2-1.5-1.5L6.5 8.5l-2-2L6 5l2 2 2-2 1.5 1.5-2 2 2 2z"/>
      </svg>
    </button>
  `;

  el.querySelector('.disconnect-btn').addEventListener('click', onDisconnect);
  return el;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
