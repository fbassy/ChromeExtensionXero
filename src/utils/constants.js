// Xero OAuth endpoints
export const XERO_AUTH_URL = 'https://login.xero.com/identity/connect/authorize';
export const XERO_TOKEN_URL = 'https://identity.xero.com/connect/token';
export const XERO_API_BASE = 'https://api.xero.com/api.xro/2.0';
export const XERO_CONNECTIONS_URL = 'https://api.xero.com/connections';

export const XERO_CLIENT_ID = typeof __XERO_CLIENT_ID__ !== 'undefined' ? __XERO_CLIENT_ID__ : '';
export const XERO_SCOPES = 'openid profile email offline_access accounting.contacts accounting.transactions';

// Gmail
export const GMAIL_ORIGIN = 'https://mail.google.com';

export const GA4_MEASUREMENT_ID = typeof __GA4_MEASUREMENT_ID__ !== 'undefined' ? __GA4_MEASUREMENT_ID__ : '';
export const GA4_API_SECRET = typeof __GA4_API_SECRET__ !== 'undefined' ? __GA4_API_SECRET__ : '';

// Message types
export const MSG = {
  EMAIL_DETECTED: 'EMAIL_DETECTED',
  AUTH_STATUS: 'AUTH_STATUS',
  XERO_LOGIN: 'XERO_LOGIN',
  XERO_LOGOUT: 'XERO_LOGOUT',
  FETCH_CONTACT_DATA: 'FETCH_CONTACT_DATA',
  CONTACT_DATA_RESULT: 'CONTACT_DATA_RESULT',
  TENANT_SELECTED: 'TENANT_SELECTED',
  ERROR: 'ERROR',
  REQUEST_CURRENT_EMAIL: 'REQUEST_CURRENT_EMAIL',
  CREATE_CONTACT: 'CREATE_CONTACT',
  SEARCH_CONTACTS: 'SEARCH_CONTACTS',
  ADD_EMAIL_TO_CONTACT: 'ADD_EMAIL_TO_CONTACT',
};
