/**
 * Gmail content script - detects the sender email of the currently open email.
 */

const LOG = (msg, ...args) => console.log('[Xero]', msg, ...args);
if (typeof __BUILD_VERSION__ !== 'undefined') LOG('gmail-detector build', __BUILD_VERSION__);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEBOUNCE_MS = 1200; // Throttle: only react after DOM quiet for 1.2s
const HASH_DEBOUNCE_MS = 400; // Short delay after hash change (open-email moment)

/**
 * Only run when user has a message/thread open (URL has #label/id), not when on inbox list (#inbox only).
 */
function isViewingOpenMessage() {
  const hash = window.location.hash || '';
  const parts = hash.replace(/^#/, '').split('/').filter(Boolean);
  return parts.length >= 2;
}

/** Thread ID from current URL hash (e.g. #inbox/THREAD_ID -> THREAD_ID). Null if list view. */
function getThreadIdFromHash() {
  const hash = window.location.hash || '';
  const parts = hash.replace(/^#/, '').split('/').filter(Boolean);
  return parts.length >= 2 ? parts[parts.length - 1] : null;
}

let lastDetectedEmail = null;
let lastNotifiedThreadId = null; // Only notify background when open thread actually changes
let debounceTimer = null;

function isValidEmail(email) {
  return email && typeof email === 'string' && EMAIL_REGEX.test(email.trim());
}

function normalizeEmail(email) {
  return email ? email.trim().toLowerCase() : '';
}

/**
 * Sender span structure (From row):
 *   <span email="..." name="Cursor Team" data-hovercard-id="..." ...><span>Cursor Team</span></span>
 * So: span[email][name][data-hovercard-id], has direct child span, and name !== "me" (To row uses name="me").
 * We don't rely on class names like .gD.
 */
function detectSenderFromStructure(main) {
  // Restrict to the first message header table (open message); Gmail uses table.cf for the header.
  const headerTable = main.querySelector('table.cf');
  const root = headerTable || main;
  const candidates = root.querySelectorAll('span[email][name][data-hovercard-id]');
  const senderSpans = Array.from(candidates).filter((el) => {
    if ((el.getAttribute('name') || '').toLowerCase() === 'me') return false;
    const first = el.firstElementChild;
    if (!(first?.tagName === 'SPAN' && isValidEmail(el.getAttribute('email')))) return false;
    // Exclude if inside a row that is the "To" row (row text starts with "to ")
    const row = el.closest('tr');
    if (row && (row.textContent || '').trim().toLowerCase().startsWith('to ')) return false;
    return true;
  });
  if (senderSpans.length === 0) return null;
  // From row always comes before To row in the header; take the first match.
  const first = senderSpans[0];
  return normalizeEmail(first.getAttribute('email'));
}

/** Rows with these labels are NOT the From row (label-based fallback). */
const NOT_FROM = /^(to|reply-to|reply to|cc|bcc|date|subject|sent)$/i;

function getRowLabel(row) {
  const firstCell = row.querySelector('td, th');
  if (firstCell) {
    const t = (firstCell.textContent || '').trim();
    if (t) return t.replace(/:$/, '').trim();
  }
  const text = (row.textContent || '').trim();
  const m = text.match(/^([^:\s]+(?:\s[^:\s]+)?)\s*:?/);
  return m ? m[1].trim() : '';
}

function detectSenderFromRowLabel(main) {
  const rows = Array.from(main.querySelectorAll('tr')).filter((tr) => tr.querySelector('[email]'));
  const fromRows = rows.filter((tr) => {
    const label = getRowLabel(tr).toLowerCase();
    return !NOT_FROM.test(label) && label === 'from';
  });
  if (fromRows.length === 0) return null;
  const row = fromRows[fromRows.length - 1];
  const email = row.querySelector('[email]')?.getAttribute?.('email');
  return isValidEmail(email) ? normalizeEmail(email) : null;
}

/**
 * Get the SENDER (From) email. Prefer structural match (span with email+name+data-hovercard-id and child span, name !== "me"), then label fallback.
 */
function detectSenderEmail() {
  if (!isViewingOpenMessage()) {
    LOG('detectSenderEmail: not viewing an open message (list view), skipping');
    return null;
  }

  const main = document.querySelector('[role="main"]');
  if (!main) return null;

  const byStructure = detectSenderFromStructure(main);
  if (byStructure) return byStructure;
  const fallback = detectSenderFromRowLabel(main);
  if (fallback) return fallback;
  return null;
}

/**
 * Run only when the open thread actually changed (open-email moment). Avoids spamming on every DOM mutation.
 */
function onOpenEmailMoment() {
  try {
    if (!chrome.runtime?.id) return;
    if (!isViewingOpenMessage()) {
      if (lastNotifiedThreadId !== null || lastDetectedEmail) {
        lastNotifiedThreadId = null;
        lastDetectedEmail = null;
        LOG('onOpenEmailMoment: left message view, clearing');
        chrome.runtime.sendMessage({ type: 'EMAIL_DETECTED', email: null }).catch(() => {});
      }
      return;
    }
    const threadId = getThreadIdFromHash();
    if (threadId === lastNotifiedThreadId) return; // Same thread, already notified
    lastNotifiedThreadId = threadId;
    chrome.runtime.sendMessage({ type: 'GMAIL_VIEW_CHANGED' }).catch((e) => {
      if (!String(e?.message || e).includes('Extension context invalidated')) LOG('sendMessage failed', e?.message);
    });
  } catch (e) {
    if (!String(e?.message || e).includes('Extension context invalidated')) throw e;
  }
}

/** Debounced wrapper: only run onOpenEmailMoment after DOM has been quiet. */
function onDomChange() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(onOpenEmailMoment, DEBOUNCE_MS);
}

function isContextValid() {
  try {
    return !!chrome.runtime?.id;
  } catch (_) {
    return false;
  }
}

/**
 * Primary trigger: hash change = user opened a thread or left it (open-email moment).
 */
let lastHash = window.location.hash;
function onHashChange() {
  const newHash = window.location.hash;
  if (newHash === lastHash) return;
  lastHash = newHash;
  lastNotifiedThreadId = null; // Force one notification for this new thread
  lastDetectedEmail = null;
  setTimeout(onOpenEmailMoment, HASH_DEBOUNCE_MS); // Let Gmail render then run once
}

/**
 * MutationObserver: only to detect thread change when URL didn't change (e.g. single-page nav).
 * Heavily debounced so we don't run on every DOM update.
 */
function initObserver() {
  const observer = new MutationObserver(() => {
    try {
      if (!isContextValid()) return;
      const threadId = getThreadIdFromHash();
      // Only re-run if thread ID changed (e.g. SPA nav) or we left message view
      if (threadId !== lastNotifiedThreadId || !isViewingOpenMessage()) onDomChange();
    } catch (e) {
      if (!String(e?.message || e).includes('Extension context invalidated')) throw e;
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['email', 'data-hovercard-id'],
  });

  return observer;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_CURRENT_EMAIL') {
    try {
      if (!isContextValid()) {
        sendResponse({ type: 'EMAIL_DETECTED', email: null });
        return true;
      }
      const email = detectSenderEmail();
      sendResponse({ type: 'EMAIL_DETECTED', email: email || null });
    } catch (e) {
      if (!String(e?.message || e).includes('Extension context invalidated')) sendResponse({ type: 'EMAIL_DETECTED', email: null });
    }
  }
  return true;
});

// Initialize
function init() {
  LOG('init: Gmail detector started');
  initObserver();
  window.addEventListener('hashchange', onHashChange);
  // One run after load in case we landed on an open thread
  setTimeout(onOpenEmailMoment, 800);
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
