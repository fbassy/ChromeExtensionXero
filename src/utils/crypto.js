/**
 * PKCE (Proof Key for Code Exchange) cryptographic utilities.
 * Uses the Web Crypto API available in service workers and extension pages.
 */

/**
 * Generate a cryptographically random code verifier string.
 * Must be 43-128 characters, using unreserved URI characters.
 */
export function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64urlEncode(array);
}

/**
 * Generate a code challenge from a code verifier using SHA-256.
 * Returns a base64url-encoded string.
 */
export async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64urlEncode(new Uint8Array(digest));
}

/**
 * Generate a random state parameter to prevent CSRF attacks.
 */
export function generateState() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return base64urlEncode(array);
}

/**
 * Base64url encode a Uint8Array (no padding, URL-safe characters).
 */
function base64urlEncode(buffer) {
  let binary = '';
  for (const byte of buffer) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
