/**
 * Contact header component - displays the matched Xero contact's name and email.
 */
export function renderContactHeader(contact, email) {
  const el = document.createElement('div');
  el.className = 'contact-header';

  const name = contact.Name || 'Unknown Contact';
  const contactEmail = contact.EmailAddress || email || '';

  el.innerHTML = `
    <div class="contact-avatar">${getInitials(name)}</div>
    <div class="contact-info">
      <div class="contact-name">${escapeHtml(name)}</div>
      <div class="contact-email">${escapeHtml(contactEmail)}</div>
    </div>
  `;

  return el;
}

function getInitials(name) {
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
