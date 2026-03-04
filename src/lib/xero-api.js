/**
 * Xero API client for fetching contacts and financial data.
 * All calls go through the rate limiter and require a valid access token.
 */

import { XERO_API_BASE } from '../utils/constants.js';
import { xeroRateLimiter } from './rate-limiter.js';

/**
 * Make an authenticated Xero API GET request.
 */
async function xeroFetch(path, accessToken, tenantId) {
  return xeroRateLimiter.execute(async () => {
    const url = path.startsWith('http') ? path : `${XERO_API_BASE}${path}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Xero-Tenant-Id': tenantId,
        Accept: 'application/json',
      },
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After') || '5';
      const waitMs = parseInt(retryAfter, 10) * 1000;
      await new Promise((r) => setTimeout(r, waitMs));
      // Retry once
      const retry = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Xero-Tenant-Id': tenantId,
          Accept: 'application/json',
        },
      });
      if (!retry.ok) {
        throw new Error(`Xero API error (retry): ${retry.status}`);
      }
      return retry.json();
    }

    if (!response.ok) {
      throw new Error(`Xero API error: ${response.status}`);
    }

    return response.json();
  });
}

/**
 * Make an authenticated Xero API POST request with JSON body.
 */
async function xeroPost(path, body, accessToken, tenantId) {
  return xeroRateLimiter.execute(async () => {
    const url = path.startsWith('http') ? path : `${XERO_API_BASE}${path}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Xero-Tenant-Id': tenantId,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After') || '5';
      const waitMs = parseInt(retryAfter, 10) * 1000;
      await new Promise((r) => setTimeout(r, waitMs));
      const retry = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Xero-Tenant-Id': tenantId,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!retry.ok) {
        const errText = await retry.text();
        const message = parseXeroErrorResponse(errText) || errText || `Xero API error (retry): ${retry.status}`;
        throw new Error(message);
      }
      return retry.json();
    }

    if (!response.ok) {
      const errText = await response.text();
      const message = parseXeroErrorResponse(errText) || errText || `Xero API error: ${response.status}`;
      throw new Error(message);
    }

    return response.json();
  });
}

/** Extract a readable message from Xero API error response body (JSON). */
function parseXeroErrorResponse(body) {
  try {
    const data = JSON.parse(body);
    const msg = data.Message || data.Elements?.[0]?.ValidationErrors?.[0]?.Message;
    if (msg) return msg;
  } catch (_) {}
  return null;
}

/** Returns true if contact has matching email (primary, AR, AP, or any ContactPerson). */
function contactMatchesEmail(contact, lower) {
  if (!contact) return false;
  const primary = (contact.EmailAddress || '').trim().toLowerCase();
  const arEmail = (contact.AccountsReceivable?.EmailAddress || '').toLowerCase();
  const apEmail = (contact.AccountsPayable?.EmailAddress || '').toLowerCase();
  if (primary === lower || arEmail === lower || apEmail === lower) return true;
  const persons = contact.ContactPersons || [];
  return persons.some((p) => (p.EmailAddress || '').toLowerCase() === lower);
}

/**
 * Search for a Xero contact by email address.
 * Matches: primary EmailAddress, AccountsReceivable/AccountsPayable emails, or any ContactPerson (additional people) email.
 * Paginates through all contacts when needed (e.g. email only as additional person on page 3).
 */
export async function searchContactByEmail(email, accessToken, tenantId) {
  const safeEmail = email.replace(/[^a-zA-Z0-9@._+\-]/g, '');
  const lower = safeEmail.toLowerCase();

  // 1) Try primary email match via where clause
  const data = await xeroFetch(
    `/Contacts?where=EmailAddress=="${safeEmail}"`,
    accessToken,
    tenantId
  );

  if (data.Contacts && data.Contacts.length > 0) {
    return data.Contacts[0];
  }

  // 2) Paginate through contacts. Each paged response includes full contact details (including ContactPersons when present).
  // Parse the page only; do NOT request individual contact by ID. Use response Pagination.pageCount to bound requests.
  const PAGE_SIZE = 100;
  let page = 1;
  let pageCount = null;

  while (true) {
    const res = await xeroFetch(
      `/Contacts?page=${page}&pageSize=${PAGE_SIZE}&includeArchived=false&summaryOnly=false`,
      accessToken,
      tenantId
    );
    const list = res.Contacts || [];

    if (pageCount == null && res.Pagination != null) {
      pageCount = res.Pagination.PageCount ?? res.Pagination.pageCount;
    }

    if (list.length === 0) break;


    const match = list.find((c) => contactMatchesEmail(c, lower));
    if (match) return match;

    if (pageCount != null && page >= pageCount) break;
    if (list.length < PAGE_SIZE) break;
    page += 1;
  }

  return null;
}

/**
 * Get outstanding sales invoices (ACCREC) for a contact.
 * These represent money owed TO the organisation.
 */
export async function getInvoices(contactId, accessToken, tenantId) {
  const data = await xeroFetch(
    `/Invoices?ContactIDs=${contactId}&where=Type=="ACCREC"&Statuses=DRAFT,SUBMITTED,AUTHORISED`,
    accessToken,
    tenantId
  );
  return data.Invoices || [];
}

/**
 * Get outstanding bills (ACCPAY) for a contact.
 * These represent money owed BY the organisation.
 */
export async function getBills(contactId, accessToken, tenantId) {
  const data = await xeroFetch(
    `/Invoices?ContactIDs=${contactId}&where=Type=="ACCPAY"&Statuses=DRAFT,SUBMITTED,AUTHORISED`,
    accessToken,
    tenantId
  );
  return data.Invoices || [];
}

/**
 * Get purchase orders for a contact.
 */
export async function getPurchaseOrders(contactId, accessToken, tenantId) {
  const data = await xeroFetch(
    `/PurchaseOrders?ContactID=${contactId}`,
    accessToken,
    tenantId
  );
  return data.PurchaseOrders || [];
}

/**
 * Get quotes for a contact.
 */
export async function getQuotes(contactId, accessToken, tenantId) {
  const data = await xeroFetch(
    `/Quotes?ContactID=${contactId}`,
    accessToken,
    tenantId
  );
  return data.Quotes || [];
}

/**
 * Create a new contact in Xero.
 * Name is required; EmailAddress is optional.
 * Note: IsCustomer/IsSupplier are set automatically when you create the first invoice/bill in Xero.
 */
export async function createContact({ Name, EmailAddress }, accessToken, tenantId) {
  const contact = { Name };
  if (EmailAddress && EmailAddress.trim()) contact.EmailAddress = EmailAddress.trim();
  const data = await xeroPost('/Contacts', { Contacts: [contact] }, accessToken, tenantId);
  if (!data.Contacts || data.Contacts.length === 0) {
    throw new Error(data.Elements?.[0]?.ValidationErrors?.[0]?.Message || 'Failed to create contact');
  }
  return data.Contacts[0];
}

/**
 * Get a single contact by ID.
 */
export async function getContact(contactId, accessToken, tenantId) {
  const data = await xeroFetch(`/Contacts/${contactId}`, accessToken, tenantId);
  if (!data.Contacts || data.Contacts.length === 0) return null;
  return data.Contacts[0];
}

/**
 * Search contacts by name/email (case-insensitive).
 * Returns a paged list; use page and pageSize for pagination.
 */
export async function searchContacts(searchTerm, accessToken, tenantId, page = 1, pageSize = 20) {
  const term = encodeURIComponent(searchTerm.trim());
  const data = await xeroFetch(
    `/Contacts?searchTerm=${term}&page=${page}&pageSize=${pageSize}`,
    accessToken,
    tenantId
  );
  return data.Contacts || [];
}

/**
 * Add an email to an existing contact.
 * If the contact has no primary email, sets this as the primary EmailAddress (Xero requires this before adding ContactPersons).
 * Otherwise adds the email as a ContactPerson (max 5 per contact).
 */
export async function addEmailToContact(contactId, email, accessToken, tenantId) {
  const contact = await getContact(contactId, accessToken, tenantId);
  if (!contact) throw new Error('Contact not found');

  const primaryEmail = (contact.EmailAddress || '').trim();

  // Xero: "Additional people cannot be added when the primary person has no email address set."
  if (!primaryEmail) {
    const updatedContact = {
      ContactID: contactId,
      Name: contact.Name,
      EmailAddress: email.trim(),
    };
    const data = await xeroPost('/Contacts', { Contacts: [updatedContact] }, accessToken, tenantId);
    if (!data.Contacts || data.Contacts.length === 0) {
      throw new Error(data.Elements?.[0]?.ValidationErrors?.[0]?.Message || 'Failed to update contact');
    }
    return data.Contacts[0];
  }

  const existing = contact.ContactPersons || [];
  if (existing.length >= 5) {
    throw new Error('This contact already has the maximum of 5 contact persons. Add the email in Xero.');
  }

  const newPerson = {
    FirstName: '',
    LastName: '',
    EmailAddress: email.trim(),
    IncludeInEmails: true,
  };

  const updatedContact = {
    ContactID: contactId,
    Name: contact.Name,
    ContactPersons: [...existing.map((p) => ({ ...p })), newPerson],
  };

  const data = await xeroPost('/Contacts', { Contacts: [updatedContact] }, accessToken, tenantId);
  if (!data.Contacts || data.Contacts.length === 0) {
    throw new Error(data.Elements?.[0]?.ValidationErrors?.[0]?.Message || 'Failed to update contact');
  }
  return data.Contacts[0];
}
