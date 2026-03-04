/**
 * Organisation selector dropdown for when multiple Xero orgs are connected.
 */
export function renderOrgSelector(tenants, selectedTenantId, onSelect) {
  const el = document.createElement('div');
  el.className = 'org-selector';

  const options = tenants
    .map((t) => {
      const selected = t.tenantId === selectedTenantId ? 'selected' : '';
      return `<option value="${t.tenantId}" ${selected}>${escapeHtml(t.tenantName)}</option>`;
    })
    .join('');

  el.innerHTML = `
    <label class="org-label">Organisation</label>
    <select class="org-select">${options}</select>
  `;

  el.querySelector('.org-select').addEventListener('change', (e) => {
    onSelect(e.target.value);
  });

  return el;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
