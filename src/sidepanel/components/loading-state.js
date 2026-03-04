/**
 * Loading state component - shows skeleton/spinner during API calls.
 */
export function renderLoading(message = 'Loading...') {
  const el = document.createElement('div');
  el.className = 'loading-state';
  el.innerHTML = `
    <div class="spinner"></div>
    <p class="loading-text">${message}</p>
  `;
  return el;
}
