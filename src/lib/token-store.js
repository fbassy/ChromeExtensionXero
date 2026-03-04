/**
 * Token storage wrapper around chrome.storage.local.
 * Manages Xero OAuth tokens and tenant information.
 */

const KEYS = {
  TOKENS: 'xero_tokens',
  TENANTS: 'xero_tenants',
  SELECTED_TENANT: 'xero_selected_tenant',
};

export async function saveTokens(tokens) {
  await chrome.storage.local.set({
    [KEYS.TOKENS]: {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + (tokens.expires_in * 1000),
      id_token: tokens.id_token || null,
    },
  });
}

export async function getTokens() {
  const result = await chrome.storage.local.get(KEYS.TOKENS);
  return result[KEYS.TOKENS] || null;
}

export async function clearTokens() {
  await chrome.storage.local.remove([
    KEYS.TOKENS,
    KEYS.TENANTS,
    KEYS.SELECTED_TENANT,
  ]);
}

export async function saveTenants(tenants) {
  await chrome.storage.local.set({ [KEYS.TENANTS]: tenants });
}

export async function getTenants() {
  const result = await chrome.storage.local.get(KEYS.TENANTS);
  return result[KEYS.TENANTS] || [];
}

export async function setSelectedTenant(tenantId) {
  await chrome.storage.local.set({ [KEYS.SELECTED_TENANT]: tenantId });
}

export async function getSelectedTenant() {
  const result = await chrome.storage.local.get(KEYS.SELECTED_TENANT);
  return result[KEYS.SELECTED_TENANT] || null;
}
