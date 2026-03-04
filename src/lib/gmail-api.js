/**
 * Gmail API – fetch sender (From) email for the current thread via Google's API.
 * Requires manifest oauth2 with gmail.readonly scope and a Google Cloud OAuth client ID.
 */

const GMAIL_API_BASE = 'https://www.googleapis.com/gmail/v1';
const EMAIL_IN_FROM_REGEX = /<([^>]+@[^>]+)>/; // "Name <email@x.com>" -> email@x.com
const PLAIN_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Get a Google OAuth token (with Gmail scope from manifest). Returns null if user hasn't granted or extension has no oauth2.
 */
export function getGoogleToken(interactive = false) {
  return new Promise((resolve) => {
    try {
      chrome.identity.getAuthToken({ interactive }, (token) => {
        if (chrome.runtime.lastError) {
          resolve(null);
          return;
        }
        resolve(token);
      });
    } catch (_) {
      resolve(null);
    }
  });
}

/**
 * Parse thread ID from Gmail tab URL. E.g. https://mail.google.com/mail/u/0/#inbox/THREAD_ID -> THREAD_ID
 */
export function getThreadIdFromGmailUrl(url) {
  if (!url || !url.includes('mail.google.com')) return null;
  try {
    const hash = new URL(url).hash || '';
    const parts = hash.replace(/^#/, '').split('/').filter(Boolean);
    return parts.length >= 2 ? parts[parts.length - 1] : null;
  } catch (_) {
    return null;
  }
}

/**
 * Extract email address from a From header value. E.g. "Cursor Team <team@mail.cursor.com>" -> team@mail.cursor.com
 */
function parseEmailFromHeader(value) {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  const angle = trimmed.match(EMAIL_IN_FROM_REGEX);
  if (angle) return angle[1].trim().toLowerCase();
  if (PLAIN_EMAIL_REGEX.test(trimmed)) return trimmed.toLowerCase();
  return null;
}

/**
 * Fetch thread from Gmail API (metadata only), then return the From email of the last message in the thread.
 * Returns null if no token, no thread ID, or API error.
 */
export async function getSenderEmailForThread(threadId, accessToken) {
  if (!threadId || !accessToken) return null;
  const url = `${GMAIL_API_BASE}/users/me/threads/${encodeURIComponent(threadId)}?format=metadata`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const thread = await res.json();
  const messages = thread.messages;
  if (!messages || messages.length === 0) return null;
  // Use last message in thread (most recent = usually the one being viewed)
  const lastMsg = messages[messages.length - 1];
  const headers = lastMsg.payload?.headers;
  if (!Array.isArray(headers)) return null;
  const fromHeader = headers.find((h) => (h.name || '').toLowerCase() === 'from');
  if (!fromHeader?.value) return null;
  return parseEmailFromHeader(fromHeader.value);
}

/**
 * Get the sender email for the currently active Gmail tab using the Gmail API.
 * Tries non-interactive token first; if missing (first run), tries interactive once to prompt for Gmail access.
 */
export async function getSenderForActiveGmailTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url || !/^https:\/\/mail\.google\.com\//.test(tab.url)) {
    return { email: null, source: null };
  }
  const threadId = getThreadIdFromGmailUrl(tab.url);
  if (!threadId) return { email: null, source: null };

  let token = await getGoogleToken(false);
  if (!token) token = await getGoogleToken(true); // Prompt user to grant Gmail access once
  if (!token) return { email: null, source: null };

  const email = await getSenderEmailForThread(threadId, token);
  return { email, source: email ? 'gmail_api' : null };
}
