/**
 * Empty state component - shown when no data is found.
 */
export function renderEmptyState(message = 'No data found') {
  const el = document.createElement('div');
  el.className = 'empty-state';
  el.innerHTML = `<p class="empty-text">${escapeHtml(message)}</p>`;
  return el;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
