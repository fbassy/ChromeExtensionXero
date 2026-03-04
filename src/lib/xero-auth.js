/**
 * Xero OAuth 2.0 with PKCE authentication flow.
 * Uses chrome.identity.launchWebAuthFlow for the browser-based auth.
 */

import {
  XERO_AUTH_URL,
  XERO_TOKEN_URL,
  XERO_CONNECTIONS_URL,
  XERO_CLIENT_ID,
  XERO_SCOPES,
} from '../utils/constants.js';
import { generateCodeVerifier, generateCodeChallenge, generateState } from '../utils/crypto.js';
import { saveTokens, getTokens, clearTokens, saveTenants } from './token-store.js';

/**
 * Initiate the Xero OAuth 2.0 PKCE login flow.
 * Opens a browser window for the user to authorize the app.
 * Returns the list of connected tenants on success.
 */
export async function login() {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateState();
  const redirectUri = chrome.identity.getRedirectURL();

  const authUrl = new URL(XERO_AUTH_URL);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', XERO_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', XERO_SCOPES);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('state', state);

  // Launch the OAuth flow in a browser popup
  const responseUrl = await chrome.identity.launchWebAuthFlow({
    url: authUrl.toString(),
    interactive: true,
  });

  // Parse the authorization code from the redirect URL
  const url = new URL(responseUrl);
  const returnedState = url.searchParams.get('state');
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    throw new Error(`Xero auth error: ${error}`);
  }

  if (returnedState !== state) {
    throw new Error('OAuth state mismatch - possible CSRF attack');
  }

  if (!code) {
    throw new Error('No authorization code received');
  }

  // Exchange the authorization code for tokens
  const tokenResponse = await fetch(XERO_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
      client_id: XERO_CLIENT_ID,
    }),
  });

  if (!tokenResponse.ok) {
    const errBody = await tokenResponse.text();
    throw new Error(`Token exchange failed: ${tokenResponse.status} ${errBody}`);
  }

  const tokens = await tokenResponse.json();
  await saveTokens(tokens);

  // Fetch the list of connected tenants (organisations)
  const tenants = await fetchConnections(tokens.access_token);
  await saveTenants(tenants);

  return tenants;
}

/**
 * Refresh the access token using the stored refresh token.
 */
export async function refreshToken() {
  const stored = await getTokens();
  if (!stored || !stored.refresh_token) {
    throw new Error('No refresh token available');
  }

  const response = await fetch(XERO_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: stored.refresh_token,
      client_id: XERO_CLIENT_ID,
    }),
  });

  if (!response.ok) {
    // Refresh token expired or revoked - user needs to re-authenticate
    await clearTokens();
    const err = new Error('Your Xero session expired or was revoked. Please reconnect to Xero.');
    err.needsReconnect = true;
    throw err;
  }

  const tokens = await response.json();
  await saveTokens(tokens);
  return tokens;
}

/**
 * Get a valid access token, auto-refreshing if expired or about to expire.
 * Returns the access token string.
 */
export async function getValidToken() {
  const stored = await getTokens();
  if (!stored) {
    throw new Error('Not authenticated');
  }

  // Refresh if token expires within 60 seconds
  const bufferMs = 60 * 1000;
  if (Date.now() >= stored.expires_at - bufferMs) {
    const refreshed = await refreshToken();
    return refreshed.access_token;
  }

  return stored.access_token;
}

/**
 * Check if the user is currently authenticated (has stored tokens).
 */
export async function isAuthenticated() {
  const stored = await getTokens();
  return stored !== null;
}

/**
 * Log out by clearing all stored tokens and tenant info.
 */
export async function logout() {
  await clearTokens();
}

/**
 * Fetch the list of Xero tenants (organisations) the user has authorized.
 */
async function fetchConnections(accessToken) {
  const response = await fetch(XERO_CONNECTIONS_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch connections: ${response.status}`);
  }

  const connections = await response.json();
  return connections.map((c) => ({
    tenantId: c.tenantId,
    tenantName: c.tenantName,
    tenantType: c.tenantType,
  }));
}
