/**
 * Background service worker.
 */

import { MSG } from '../utils/constants.js';
import { login, logout, getValidToken, isAuthenticated, refreshToken } from '../lib/xero-auth.js';
import {
  searchContactByEmail,
  getInvoices,
  getBills,
  getPurchaseOrders,
  getQuotes,
  createContact,
  searchContacts,
  addEmailToContact,
} from '../lib/xero-api.js';
import { getTenants, getSelectedTenant, setSelectedTenant } from '../lib/token-store.js';
import { getSenderForActiveGmailTab } from '../lib/gmail-api.js';
import { trackEvent } from '../lib/analytics.js';

const LOG = (msg, ...args) => console.log('[Xero]', msg, ...args);
if (typeof __BUILD_VERSION__ !== 'undefined') LOG('background build', __BUILD_VERSION__);

// ---- Side Panel Lifecycle ----

// Clicking the extension icon opens the side panel (no "Open side panel" needed)
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((err) => {
  LOG('setPanelBehavior failed', err?.message);
});

function isGmailUrl(url) {
  return typeof url === 'string' && /^https:\/\/mail\.google\.com\//.test(url);
}

function setSidePanelEnabledForTab(tabId, url) {
  const enabled = isGmailUrl(url);
  chrome.sidePanel.setOptions({
    tabId,
    path: 'sidepanel.html',
    enabled,
  });
}

// Enable side panel only when the tab is Gmail (on load/update)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    setSidePanelEnabledForTab(tabId, tab.url);
  }
});

// When user switches to another tab, enable panel only if that tab is Gmail
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    setSidePanelEnabledForTab(activeInfo.tabId, tab.url);
  } catch {
    // Tab may have been closed or not yet ready
  }
});

// Log redirect URI on install; set side panel for current tab(s)
chrome.runtime.onInstalled.addListener(async () => {
  const redirectUrl = chrome.identity.getRedirectURL();
  console.log('=== Xero OAuth Redirect URI ===');
  console.log(redirectUrl);
  console.log('Register this URL in your Xero app settings');
  // Apply side-panel rule to current active tab (e.g. user had Gmail open when installing)
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab?.id) setSidePanelEnabledForTab(activeTab.id, activeTab.url);
  } catch {}
});

// ---- Token Refresh Alarm ----

chrome.alarms.create('refreshToken', { periodInMinutes: 25 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'refreshToken') {
    try {
      const authed = await isAuthenticated();
      if (authed) {
        await refreshToken();
      }
    } catch (err) {
      console.warn('Token refresh failed:', err.message);
    }
  }
});

// ---- Message Routing ----

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Fire-and-forget: don't keep channel open; content script may be gone before we finish
  if (message.type === 'GMAIL_VIEW_CHANGED') {
    sendResponse(undefined);
    handleGmailViewChanged().catch((err) => console.warn('[Xero] GMAIL_VIEW_CHANGED failed', err?.message));
    return false;
  }
  handleMessage(message, sender).then(sendResponse).catch((err) => {
    console.error('Message handler error:', err);
    sendResponse({ error: err.message });
  });
  return true;
});

async function handleMessage(message, sender) {
  switch (message.type) {
    case MSG.EMAIL_DETECTED:
      broadcastToExtension(message);
      return;

    case 'GET_AUTH_STATUS':
      return await getAuthStatus();

    case MSG.XERO_LOGIN:
      return await handleLogin();

    case MSG.XERO_LOGOUT:
      return await handleLogout();

    case MSG.FETCH_CONTACT_DATA:
      return await handleFetchContactData(message.email, message.tenantId);

    case MSG.TENANT_SELECTED:
      await setSelectedTenant(message.tenantId);
      return;

    case MSG.REQUEST_CURRENT_EMAIL:
      return await requestCurrentEmailFromActiveTab();

    case MSG.CREATE_CONTACT:
      return await handleCreateContact(message.payload);

    case MSG.SEARCH_CONTACTS:
      return await handleSearchContacts(message.searchTerm, message.page);

    case MSG.ADD_EMAIL_TO_CONTACT:
      return await handleAddEmailToContact(message.contactId, message.email);
  }
}

/**
 * Try Gmail API first for sender; fall back to content script (DOM) if API not available.
 */
async function getCurrentSenderEmail() {
  const result = await getSenderForActiveGmailTab();
  if (result.email) {
    return { type: MSG.EMAIL_DETECTED, email: result.email, source: result.source };
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url || !/^https:\/\/mail\.google\.com\//.test(tab.url)) {
    return { type: MSG.EMAIL_DETECTED, email: null };
  }
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_CURRENT_EMAIL' });
    const email = response?.email ?? null;
    return { type: MSG.EMAIL_DETECTED, email, source: email ? 'dom' : null };
  } catch (_) {
    return { type: MSG.EMAIL_DETECTED, email: null };
  }
}

async function handleGmailViewChanged() {
  const result = await getCurrentSenderEmail();
  if (result.email) broadcastToExtension(result);
}

async function requestCurrentEmailFromActiveTab() {
  const result = await getCurrentSenderEmail();
  if (result.email) broadcastToExtension(result);
  return result;
}

// ---- Auth Handlers ----

async function getAuthStatus() {
  const authed = await isAuthenticated();
  const tenants = authed ? await getTenants() : [];
  const selectedTenantId = authed ? await getSelectedTenant() : null;
  const selectedTenant = tenants.find((t) => t.tenantId === selectedTenantId) || tenants[0];

  const status = {
    type: MSG.AUTH_STATUS,
    authenticated: authed,
    tenants: tenants,
    selectedTenantId: selectedTenant?.tenantId || null,
    selectedTenantName: selectedTenant?.tenantName || null,
  };

  // Auto-select first tenant if none selected
  if (authed && !selectedTenantId && selectedTenant) {
    await setSelectedTenant(selectedTenant.tenantId);
  }

  return status;
}

async function handleLogin() {
  try {
    const tenants = await login();
    const selectedTenant = tenants[0];
    if (selectedTenant) {
      await setSelectedTenant(selectedTenant.tenantId);
    }

    const status = {
      type: MSG.AUTH_STATUS,
      authenticated: true,
      tenants: tenants,
      selectedTenantId: selectedTenant?.tenantId || null,
      selectedTenantName: selectedTenant?.tenantName || null,
    };

    broadcastToExtension(status);
    return status;
  } catch (err) {
    const errorMsg = {
      type: MSG.AUTH_STATUS,
      authenticated: false,
      tenants: [],
      error: err.message,
    };
    broadcastToExtension(errorMsg);
    return errorMsg;
  }
}

async function handleLogout() {
  await logout();
  const status = {
    type: MSG.AUTH_STATUS,
    authenticated: false,
    tenants: [],
    selectedTenantId: null,
    selectedTenantName: null,
  };
  broadcastToExtension(status);
  return status;
}

// ---- Data Fetching ----

async function handleFetchContactData(email, tenantId) {
  try {
    const accessToken = await getValidToken();
    const contact = await searchContactByEmail(email, accessToken, tenantId);

    if (!contact) {
      trackEvent('contact_not_found');
      const result = {
        type: MSG.CONTACT_DATA_RESULT,
        contact: null,
        invoices: [],
        bills: [],
        purchaseOrders: [],
        quotes: [],
      };
      broadcastToExtension(result);
      return result;
    }

    const [invoices, bills, purchaseOrders, quotes] = await Promise.allSettled([
      getInvoices(contact.ContactID, accessToken, tenantId),
      getBills(contact.ContactID, accessToken, tenantId),
      getPurchaseOrders(contact.ContactID, accessToken, tenantId),
      getQuotes(contact.ContactID, accessToken, tenantId),
    ]);

    const result = {
      type: MSG.CONTACT_DATA_RESULT,
      contact: contact,
      invoices: invoices.status === 'fulfilled' ? invoices.value : [],
      bills: bills.status === 'fulfilled' ? bills.value : [],
      purchaseOrders: purchaseOrders.status === 'fulfilled' ? purchaseOrders.value : [],
      quotes: quotes.status === 'fulfilled' ? quotes.value : [],
    };

    trackEvent('contact_matched', {
      invoices: result.invoices?.length ?? 0,
      bills: result.bills?.length ?? 0,
      purchase_orders: result.purchaseOrders?.length ?? 0,
      quotes: result.quotes?.length ?? 0,
    });
    broadcastToExtension(result);
    return result;
  } catch (err) {
    const errorResult = {
      type: MSG.CONTACT_DATA_RESULT,
      error: err.message,
      contact: null,
      invoices: [],
      bills: [],
      purchaseOrders: [],
      quotes: [],
    };
    broadcastToExtension(errorResult);
    return errorResult;
  }
}

// ---- Create / Search / Add email ----

async function handleCreateContact(payload) {
  try {
    const accessToken = await getValidToken();
    const tenantId = await getSelectedTenant();
    if (!tenantId) throw new Error('No organisation selected');
    const contact = await createContact(
      { Name: payload.Name, EmailAddress: payload.EmailAddress },
      accessToken,
      tenantId
    );
    const [invoices, bills, purchaseOrders, quotes] = await Promise.allSettled([
      getInvoices(contact.ContactID, accessToken, tenantId),
      getBills(contact.ContactID, accessToken, tenantId),
      getPurchaseOrders(contact.ContactID, accessToken, tenantId),
      getQuotes(contact.ContactID, accessToken, tenantId),
    ]);
    const result = {
      type: MSG.CONTACT_DATA_RESULT,
      contact,
      invoices: invoices.status === 'fulfilled' ? invoices.value : [],
      bills: bills.status === 'fulfilled' ? bills.value : [],
      purchaseOrders: purchaseOrders.status === 'fulfilled' ? purchaseOrders.value : [],
      quotes: quotes.status === 'fulfilled' ? quotes.value : [],
    };
    trackEvent('contact_created');
    broadcastToExtension(result);
    return { success: true, contact };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function handleSearchContacts(searchTerm, page = 1) {
  try {
    const accessToken = await getValidToken();
    const tenantId = await getSelectedTenant();
    if (!tenantId) throw new Error('No organisation selected');
    const contacts = await searchContacts(searchTerm, accessToken, tenantId, page, 20);
    return { success: true, contacts };
  } catch (err) {
    return { success: false, error: err.message, contacts: [] };
  }
}

async function handleAddEmailToContact(contactId, email) {
  try {
    const accessToken = await getValidToken();
    const tenantId = await getSelectedTenant();
    if (!tenantId) throw new Error('No organisation selected');
    const contact = await addEmailToContact(contactId, email, accessToken, tenantId);
    const [invoices, bills, purchaseOrders, quotes] = await Promise.allSettled([
      getInvoices(contact.ContactID, accessToken, tenantId),
      getBills(contact.ContactID, accessToken, tenantId),
      getPurchaseOrders(contact.ContactID, accessToken, tenantId),
      getQuotes(contact.ContactID, accessToken, tenantId),
    ]);
    const result = {
      type: MSG.CONTACT_DATA_RESULT,
      contact,
      invoices: invoices.status === 'fulfilled' ? invoices.value : [],
      bills: bills.status === 'fulfilled' ? bills.value : [],
      purchaseOrders: purchaseOrders.status === 'fulfilled' ? purchaseOrders.value : [],
      quotes: quotes.status === 'fulfilled' ? quotes.value : [],
    };
    trackEvent('email_added_to_contact');
    broadcastToExtension(result);
    return { success: true, contact };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ---- Helpers ----

function broadcastToExtension(message) {
  chrome.runtime.sendMessage(message).catch(() => {
    // Side panel may not be open
  });
}
