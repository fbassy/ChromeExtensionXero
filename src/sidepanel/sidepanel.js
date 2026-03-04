/**
 * Side panel application controller.
 * Manages state, listens for messages, and orchestrates component rendering.
 */

import { MSG } from '../utils/constants.js';
import { renderAuthView, renderConnectionStatus } from './components/auth-view.js';
import { renderOrgSelector } from './components/org-selector.js';
import { renderContactHeader } from './components/contact-header.js';
import { renderFinancialSummary } from './components/financial-summary.js';
import { renderTabBar } from './components/tab-container.js';
import { renderInvoiceList } from './components/invoice-list.js';
import { renderBillList } from './components/bill-list.js';
import { renderPOList } from './components/po-list.js';
import { renderQuoteList } from './components/quote-list.js';
import { renderLoading } from './components/loading-state.js';
import { renderErrorState } from './components/error-state.js';
import { renderNoContactActions } from './components/no-contact-actions.js';
import { renderOnboarding } from './components/onboarding.js';
import { trackEvent } from '../lib/analytics.js';

const LOG = (msg, ...args) => console.log('[Xero]', msg, ...args);

const ONBOARDING_STORAGE_KEY = 'xero_gmail_onboarding_done';

function getOnboardingDone() {
  return chrome.storage.local.get(ONBOARDING_STORAGE_KEY).then((v) => v[ONBOARDING_STORAGE_KEY] === true);
}

function setOnboardingDone() {
  return chrome.storage.local.set({ [ONBOARDING_STORAGE_KEY]: true });
}
if (typeof __BUILD_VERSION__ !== 'undefined') LOG('sidepanel build', __BUILD_VERSION__);

// Application state
let state = {
  authStatus: 'loading', // 'loading' | 'disconnected' | 'connected'
  tenants: [],
  selectedTenantId: null,
  selectedTenantName: null,
  detectedEmail: null,
  contact: null,
  invoices: [],
  bills: [],
  purchaseOrders: [],
  quotes: [],
  isLoading: false,
  error: null,
  activeTab: 'invoices',
  // No-contact flow: 'actions' | 'create' | 'add-existing'
  noContactMode: 'actions',
  contactSearchTerm: '',
  contactSearchResults: [],
  contactSearchLoading: false,
  createContactError: null,
  createContactLoading: false,
  addEmailError: null,
  addEmailLoading: false,
  showOnboarding: false,
};

function setState(partial) {
  state = { ...state, ...partial };
  render();
}

// ---- Message Handlers ----

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case MSG.EMAIL_DETECTED:
      handleEmailDetected(message.email);
      break;
    case MSG.AUTH_STATUS:
      handleAuthStatus(message);
      break;
    case MSG.CONTACT_DATA_RESULT:
      handleContactData(message);
      break;
    case MSG.ERROR:
      setState({ isLoading: false, error: message.message });
      break;
  }
});

function handleEmailDetected(email) {
  if (email === state.detectedEmail) return;

  setState({
    detectedEmail: email,
    contact: null,
    invoices: [],
    bills: [],
    purchaseOrders: [],
    quotes: [],
    error: null,
    isLoading: !!email,
  });

  if (email && state.authStatus === 'connected' && state.selectedTenantId) {
    chrome.runtime.sendMessage({
      type: MSG.FETCH_CONTACT_DATA,
      email: email,
      tenantId: state.selectedTenantId,
    });
  } else if (!email) {
    setState({ isLoading: false });
  } else {
    setState({ isLoading: false });
  }
}

function handleAuthStatus(message) {
  setState({
    authStatus: message.authenticated ? 'connected' : 'disconnected',
    tenants: message.tenants || [],
    selectedTenantId: message.selectedTenantId || (message.tenants?.[0]?.tenantId) || null,
    selectedTenantName: message.selectedTenantName || (message.tenants?.[0]?.tenantName) || null,
  });

  // If we have a detected email and just connected, fetch data
  if (message.authenticated && state.detectedEmail && state.selectedTenantId) {
    setState({ isLoading: true });
    chrome.runtime.sendMessage({
      type: MSG.FETCH_CONTACT_DATA,
      email: state.detectedEmail,
      tenantId: state.selectedTenantId,
    });
  }

  if (message.authenticated && !state.detectedEmail) {
    chrome.runtime.sendMessage({ type: MSG.REQUEST_CURRENT_EMAIL });
  }
}

function handleContactData(message) {
  setState({
    contact: message.contact || null,
    invoices: message.invoices || [],
    bills: message.bills || [],
    purchaseOrders: message.purchaseOrders || [],
    quotes: message.quotes || [],
    isLoading: false,
    error: message.error || null,
    ...(message.contact ? { noContactMode: 'actions' } : {}),
  });
}

// ---- Actions ----

function onCancelConnect() {
  setState({ authStatus: 'disconnected' });
}

function onConnect() {
  setState({ authStatus: 'loading' });
  chrome.runtime.sendMessage({ type: MSG.XERO_LOGIN }, (response) => {
    if (chrome.runtime.lastError) {
      setState({ authStatus: 'disconnected' });
      return;
    }
    if (response && response.type === MSG.AUTH_STATUS) {
      handleAuthStatus(response);
    } else {
      setState({ authStatus: 'disconnected' });
    }
  });
}

function onDisconnect() {
  chrome.runtime.sendMessage({ type: MSG.XERO_LOGOUT });
  setState({
    authStatus: 'disconnected',
    tenants: [],
    selectedTenantId: null,
    selectedTenantName: null,
    contact: null,
    invoices: [],
    bills: [],
    purchaseOrders: [],
    quotes: [],
  });
}

function onTenantSelect(tenantId) {
  const tenant = state.tenants.find((t) => t.tenantId === tenantId);
  setState({
    selectedTenantId: tenantId,
    selectedTenantName: tenant?.tenantName || null,
  });
  chrome.runtime.sendMessage({
    type: MSG.TENANT_SELECTED,
    tenantId: tenantId,
  });

  // Re-fetch data for the new tenant
  if (state.detectedEmail) {
    setState({ isLoading: true, contact: null, error: null });
    chrome.runtime.sendMessage({
      type: MSG.FETCH_CONTACT_DATA,
      email: state.detectedEmail,
      tenantId: tenantId,
    });
  }
}

function onTabChange(tabId) {
  setState({ activeTab: tabId });
}

function onRetry() {
  if (state.detectedEmail && state.selectedTenantId) {
    setState({ isLoading: true, error: null });
    chrome.runtime.sendMessage({
      type: MSG.FETCH_CONTACT_DATA,
      email: state.detectedEmail,
      tenantId: state.selectedTenantId,
    });
  }
}

// ---- Rendering ----

function render() {
  const app = document.getElementById('app');
  app.innerHTML = '';

  if (state.showOnboarding) {
    app.appendChild(
      renderOnboarding(() => {
        setOnboardingDone().then(() => {
          setState({ showOnboarding: false });
          chrome.runtime.sendMessage({ type: 'GET_AUTH_STATUS' }, (response) => {
            if (chrome.runtime.lastError) {
              setState({ authStatus: 'disconnected' });
              return;
            }
            if (response && response.type === MSG.AUTH_STATUS) {
              handleAuthStatus(response);
            } else {
              setState({ authStatus: 'disconnected' });
            }
          });
        });
      })
    );
    return;
  }

  // Auth loading
  if (state.authStatus === 'loading') {
    app.appendChild(renderAuthLoading(onCancelConnect));
    return;
  }

  // Not authenticated
  if (state.authStatus === 'disconnected') {
    app.appendChild(renderAuthView(onConnect));
    return;
  }

  // Connected - show status bar
  app.appendChild(renderConnectionStatus(state.selectedTenantName || 'Connected', onDisconnect));

  // Org selector (if multiple tenants)
  if (state.tenants.length > 1) {
    app.appendChild(renderOrgSelector(state.tenants, state.selectedTenantId, onTenantSelect));
  }

  // No email detected yet
  if (!state.detectedEmail) {
    app.appendChild(renderWaitingForEmail());
    return;
  }

  // Loading data
  if (state.isLoading) {
    app.appendChild(renderLoading('Searching Xero...'));
    return;
  }

  // Error
  if (state.error) {
    app.appendChild(renderErrorState(state.error, onRetry));
    return;
  }

  // No contact found – show create or add-to-existing
  if (!state.contact) {
    app.appendChild(
      renderNoContactActions({
        detectedEmail: state.detectedEmail,
        mode: state.noContactMode,
        createError: state.createContactError,
        addError: state.addEmailError,
        createLoading: state.createContactLoading,
        addLoading: state.addEmailLoading,
        searchResults: state.contactSearchResults,
        searchLoading: state.contactSearchLoading,
        searchTerm: state.contactSearchTerm,
        onShowCreate: () => setState({ noContactMode: 'create', createContactError: null }),
        onShowAddExisting: () =>
          setState({ noContactMode: 'add-existing', contactSearchTerm: '', contactSearchResults: [], addEmailError: null }),
        onCreateSubmit: async (payload) => {
          setState({ createContactError: null, createContactLoading: true });
          const res = await chrome.runtime.sendMessage({ type: MSG.CREATE_CONTACT, payload });
          setState({ createContactLoading: false });
          if (res?.success) {
            setState({ noContactMode: 'actions' });
            // handleContactData will have been triggered via broadcast
          } else {
            setState({ createContactError: res?.error || 'Failed to create contact' });
          }
        },
        onSearch: async (term) => {
          setState({ contactSearchTerm: term, contactSearchLoading: !!term });
          if (!term) {
            setState({ contactSearchResults: [] });
            return;
          }
          const res = await chrome.runtime.sendMessage({ type: MSG.SEARCH_CONTACTS, searchTerm: term, page: 1 });
          setState({
            contactSearchLoading: false,
            contactSearchResults: res?.success ? res.contacts || [] : [],
          });
        },
        onSelectContact: async (contact) => {
          if (!confirm(`Add ${state.detectedEmail} to "${contact.Name}" as a contact person?`)) return;
          setState({ addEmailError: null, addEmailLoading: true });
          const res = await chrome.runtime.sendMessage({
            type: MSG.ADD_EMAIL_TO_CONTACT,
            contactId: contact.ContactID,
            email: state.detectedEmail,
          });
          setState({ addEmailLoading: false });
          if (res?.success) {
            setState({ noContactMode: 'actions' });
            // handleContactData will have been triggered via broadcast
          } else {
            setState({ addEmailError: res?.error || 'Failed to add email' });
          }
        },
        onBack: () =>
          setState({
            noContactMode: 'actions',
            createContactError: null,
            addEmailError: null,
            contactSearchTerm: '',
            contactSearchResults: [],
          }),
      })
    );
    return;
  }

  // Contact found - render full data view
  app.appendChild(renderContactHeader(state.contact, state.detectedEmail));
  app.appendChild(renderFinancialSummary(state.invoices, state.bills));

  // Refresh button
  const refreshBtn = document.createElement('button');
  refreshBtn.className = 'btn btn-text refresh-btn';
  refreshBtn.textContent = 'Refresh';
  refreshBtn.addEventListener('click', onRetry);
  app.appendChild(refreshBtn);

  // Tabs
  app.appendChild(renderTabBar(state.activeTab, onTabChange));

  // Tab content
  const tabContent = document.createElement('div');
  tabContent.className = 'tab-content';

  switch (state.activeTab) {
    case 'invoices':
      tabContent.appendChild(renderInvoiceList(state.invoices));
      break;
    case 'bills':
      tabContent.appendChild(renderBillList(state.bills));
      break;
    case 'pos':
      tabContent.appendChild(renderPOList(state.purchaseOrders));
      break;
    case 'quotes':
      tabContent.appendChild(renderQuoteList(state.quotes));
      break;
  }

  app.appendChild(tabContent);
}

function renderAuthLoading(onCancel) {
  const el = document.createElement('div');
  el.className = 'auth-loading';
  el.appendChild(renderLoading('Connecting to Xero...'));
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'btn btn-text auth-loading-retry';
  retry.textContent = 'Connection failed or cancelled? Try again';
  retry.addEventListener('click', onCancel);
  el.appendChild(retry);
  return el;
}

function renderWaitingForEmail() {
  const el = document.createElement('div');
  el.className = 'waiting-state';
  el.innerHTML = `
    <div class="waiting-icon">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect x="6" y="12" width="36" height="24" rx="3" stroke="#dadce0" stroke-width="2" fill="none"/>
        <polyline points="6,12 24,28 42,12" stroke="#dadce0" stroke-width="2" fill="none"/>
      </svg>
    </div>
    <p class="waiting-text">Open an email to see Xero data for the sender</p>
    <button type="button" class="btn btn-text check-email-btn">Check current email</button>
  `;
  el.querySelector('.check-email-btn').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: MSG.REQUEST_CURRENT_EMAIL });
  });
  return el;
}

// ---- Initialization ----

(async function init() {
  const onboardingDone = await getOnboardingDone();
  if (!onboardingDone) {
    setState({ showOnboarding: true });
  } else {
    chrome.runtime.sendMessage({ type: 'GET_AUTH_STATUS' }, (response) => {
      if (chrome.runtime.lastError) {
        setState({ authStatus: 'disconnected' });
        return;
      }
      if (response && response.type === MSG.AUTH_STATUS) {
        handleAuthStatus(response);
      } else {
        setState({ authStatus: 'disconnected' });
      }
    });
  }
  render();
})();

// Track link opens to Xero (delegated)
document.addEventListener('click', (e) => {
  const link = e.target.closest('.row-number-link[data-link-type]');
  if (link) {
    const linkType = link.getAttribute('data-link-type');
    if (linkType) trackEvent('link_opened', { link_type: linkType });
  }
});

// Initial render
render();
