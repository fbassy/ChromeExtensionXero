/**
 * Typed message helpers wrapping chrome.runtime messaging.
 */

import { MSG } from '../utils/constants.js';

/**
 * Send a message to the background service worker (or any listener).
 */
export function sendMessage(type, data = {}) {
  return chrome.runtime.sendMessage({ type, ...data }).catch(() => {
    // Receiver may not exist yet (e.g., side panel not open)
  });
}

/**
 * Listen for a specific message type.
 * Returns a cleanup function to remove the listener.
 */
export function onMessage(type, handler) {
  const listener = (message, sender, sendResponse) => {
    if (message.type === type) {
      const result = handler(message, sender);
      // Support async handlers
      if (result instanceof Promise) {
        result.then(sendResponse).catch((err) => {
          sendResponse({ error: err.message });
        });
        return true; // Keep channel open for async response
      }
      if (result !== undefined) {
        sendResponse(result);
      }
    }
  };
  chrome.runtime.onMessage.addListener(listener);
  return () => chrome.runtime.onMessage.removeListener(listener);
}

/**
 * Send a message and wait for a response.
 */
export function sendMessageAsync(type, data = {}) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type, ...data }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (response && response.error) {
        reject(new Error(response.error));
      } else {
        resolve(response);
      }
    });
  });
}
