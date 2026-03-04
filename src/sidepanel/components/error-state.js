/**
 * Error state component - shows error message with retry button.
 */
export function renderErrorState(message, onRetry) {
  const el = document.createElement('div');
  el.className = 'error-state';
  el.innerHTML = `
    <div class="error-icon">!</div>
    <p class="error-message">${escapeHtml(message)}</p>
    ${onRetry ? '<button class="btn btn-secondary error-retry-btn">Retry</button>' : ''}
  `;

  if (onRetry) {
    el.querySelector('.error-retry-btn').addEventListener('click', onRetry);
  }

  return el;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
