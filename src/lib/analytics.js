/**
 * Google Analytics 4 via Measurement Protocol (no gtag.js).
 * Uses a persistent client_id in chrome.storage for unique user counts.
 *
 * Setup: Create a GA4 property, get your Measurement ID and API secret, then
 * set GA4_MEASUREMENT_ID and GA4_API_SECRET in .env (see .env.example).
 */

import { GA4_MEASUREMENT_ID, GA4_API_SECRET } from '../utils/constants.js';

const GA4_ENDPOINT = 'https://www.google-analytics.com/mp/collect';
const CLIENT_ID_KEY = 'ga4_client_id';

/**
 * Generate a UUID v4 for the GA client_id.
 */
function generateClientId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get or create a persistent client_id (one per install) for unique user counting.
 */
export async function getOrCreateClientId() {
  const stored = await chrome.storage.local.get(CLIENT_ID_KEY);
  let clientId = stored[CLIENT_ID_KEY];
  if (!clientId) {
    clientId = generateClientId();
    await chrome.storage.local.set({ [CLIENT_ID_KEY]: clientId });
  }
  return clientId;
}

/**
 * Send a single event to GA4. Fire-and-forget; errors are logged but not thrown.
 *
 * @param {string} name - Event name (e.g. 'link_opened', 'contact_matched')
 * @param {Record<string, string | number | boolean>} [params] - Optional event parameters
 */
export async function trackEvent(name, params = {}) {
  if (!GA4_MEASUREMENT_ID || !GA4_API_SECRET) {
    return;
  }
  try {
    const clientId = await getOrCreateClientId();
    const url = `${GA4_ENDPOINT}?measurement_id=${encodeURIComponent(GA4_MEASUREMENT_ID)}&api_secret=${encodeURIComponent(GA4_API_SECRET)}`;
    const body = {
      client_id: clientId,
      events: [
        {
          name,
          params: {
            ...params,
            engagement_time_msec: 100,
          },
        },
      ],
    };
    await fetch(url, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.warn('[Xero Analytics]', err?.message || err);
  }
}
