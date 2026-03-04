/**
 * No-contact state: create a new contact or add this email to an existing contact.
 */

function escapeHtml(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * @param {Object} opts
 * @param {string} opts.detectedEmail
 * @param {'actions'|'create'|'add-existing'} opts.mode
 * @param {string} [opts.createError]
 * @param {string} [opts.addError]
 * @param {boolean} [opts.createLoading]
 * @param {boolean} [opts.addLoading]
 * @param {Array<{ContactID: string, Name: string, EmailAddress?: string}>} [opts.searchResults]
 * @param {boolean} [opts.searchLoading]
 * @param {string} [opts.searchTerm]
 * @param {() => void} opts.onShowCreate
 * @param {() => void} opts.onShowAddExisting
 * @param {(payload: { Name: string, EmailAddress: string }) => void} opts.onCreateSubmit
 * @param {(term: string) => void} opts.onSearch
 * @param {(contact: { ContactID: string, Name: string }) => void} opts.onSelectContact
 * @param {() => void} opts.onBack
 */
export function renderNoContactActions(opts) {
  const {
    detectedEmail,
    mode,
    createError,
    addError,
    createLoading,
    addLoading,
    searchResults = [],
    searchLoading,
    searchTerm = '',
    onShowCreate,
    onShowAddExisting,
    onCreateSubmit,
    onSearch,
    onSelectContact,
    onBack,
  } = opts;

  const el = document.createElement('div');
  el.className = 'no-contact-actions';

  if (mode === 'actions') {
    el.innerHTML = `
      <p class="empty-text">No Xero contact found for ${escapeHtml(detectedEmail)}</p>
      <p class="no-contact-hint">Create a new contact or add this email to an existing one.</p>
      <div class="no-contact-buttons">
        <button type="button" class="btn btn-primary no-contact-btn create-btn">Create contact</button>
        <button type="button" class="btn btn-secondary no-contact-btn add-existing-btn">Add to existing contact</button>
      </div>
    `;
    el.querySelector('.create-btn').addEventListener('click', onShowCreate);
    el.querySelector('.add-existing-btn').addEventListener('click', onShowAddExisting);
    return el;
  }

  if (mode === 'create') {
    const localPart = detectedEmail ? detectedEmail.split('@')[0] : '';
    const name = localPart.replace(/[._+-]/g, ' ').trim() || '';
    el.innerHTML = `
      <div class="no-contact-form-header">
        <button type="button" class="btn btn-text back-btn" aria-label="Back">← Back</button>
      </div>
      <p class="no-contact-form-title">Create contact in Xero</p>
      <p class="no-contact-hint">This email will be linked to the new contact. In Xero, the contact becomes a customer or supplier when you create the first invoice or bill.</p>
      <form class="no-contact-form" id="create-contact-form">
        <label class="no-contact-label" for="create-name">Name <span class="required">*</span></label>
        <input type="text" id="create-name" class="no-contact-input" required maxlength="255" value="${escapeHtml(name)}" placeholder="Company or person name" />
        <label class="no-contact-label" for="create-email">Email</label>
        <input type="email" id="create-email" class="no-contact-input" value="${escapeHtml(detectedEmail || '')}" placeholder="email@example.com" />
        ${createError ? `<p class="no-contact-error">${escapeHtml(createError)}</p>` : ''}
        <div class="no-contact-form-actions">
          <button type="button" class="btn btn-text back-btn">Cancel</button>
          <button type="submit" class="btn btn-primary" ${createLoading ? 'disabled' : ''}>${createLoading ? 'Creating…' : 'Create contact'}</button>
        </div>
      </form>
    `;
    el.querySelectorAll('.back-btn').forEach((btn) => btn.addEventListener('click', onBack));
    el.querySelector('#create-contact-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = el.querySelector('#create-name');
      const emailInput = el.querySelector('#create-email');
      onCreateSubmit({
        Name: nameInput.value.trim(),
        EmailAddress: emailInput.value.trim() || undefined,
      });
    });
    return el;
  }

  // mode === 'add-existing'
  el.innerHTML = `
    <div class="no-contact-form-header">
      <button type="button" class="btn btn-text back-btn" aria-label="Back">← Back</button>
    </div>
    <p class="no-contact-form-title">Add this email to an existing contact</p>
    <p class="no-contact-hint">Search for a contact, then select it to add <strong>${escapeHtml(detectedEmail)}</strong> as a contact person (for invoices and bills).</p>
    <div class="no-contact-search">
      <input type="text" id="contact-search" class="no-contact-input" placeholder="Search by name or email…" value="${escapeHtml(searchTerm)}" autocomplete="off" />
    </div>
    ${addError ? `<p class="no-contact-error">${escapeHtml(addError)}</p>` : ''}
    ${addLoading ? '<p class="no-contact-loading">Adding to contact…</p>' : ''}
    <div class="no-contact-search-results" id="contact-search-results">
      ${searchLoading ? '<p class="no-contact-loading">Searching…</p>' : ''}
      ${!searchLoading && searchTerm.length > 0 && searchTerm.length < 2 ? '<p class="no-contact-hint-inline">Type at least 2 characters to search.</p>' : ''}
      ${!searchLoading && searchTerm.length >= 2 && searchResults.length === 0 ? '<p class="no-contact-empty">No contacts found. Try a different search.</p>' : ''}
      ${!searchLoading && searchResults.length > 0 ? searchResults.map((c) => `
        <button type="button" class="no-contact-result-item" data-contact-id="${escapeHtml(c.ContactID)}" data-contact-name="${escapeHtml(c.Name)}">
          <span class="no-contact-result-name">${escapeHtml(c.Name)}</span>
          ${c.EmailAddress ? `<span class="no-contact-result-email">${escapeHtml(c.EmailAddress)}</span>` : ''}
        </button>
      `).join('') : ''}
    </div>
  `;

  el.querySelector('.back-btn').addEventListener('click', onBack);

  const searchInput = el.querySelector('#contact-search');
  let searchDebounce;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchDebounce);
    const term = searchInput.value.trim();
    searchDebounce = setTimeout(() => {
      onSearch(term);
    }, 300);
  });
  searchInput.addEventListener('focus', () => {
    if (searchInput.value.trim().length >= 2) onSearch(searchInput.value.trim());
  });

  el.querySelectorAll('.no-contact-result-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      onSelectContact({
        ContactID: btn.dataset.contactId,
        Name: btn.dataset.contactName,
      });
    });
  });

  return el;
}
