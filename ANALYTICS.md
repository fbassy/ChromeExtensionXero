# Google Analytics 4 setup

The extension sends events via the [GA4 Measurement Protocol](https://developers.google.com/analytics/devguides/collection/protocol/ga4) (no gtag script). To enable analytics:

1. **Create a GA4 property** (if you don’t have one): [analytics.google.com](https://analytics.google.com) → Admin → Create Property.

2. **Get your Measurement ID**  
   Admin → Data Streams → Add stream → Web (or use an existing Web stream).  
   Copy the **Measurement ID** (e.g. `G-XXXXXXXXXX`).

3. **Create an API secret**  
   In the same stream: **Measurement Protocol API secrets** → Create.  
   Copy the **API secret** value.

4. **Configure the extension**  
   Copy `.env.example` to `.env` and set:
   - `GA4_MEASUREMENT_ID` = your Measurement ID (e.g. `G-XXXXXXXXXX`)
   - `GA4_API_SECRET` = your API secret string

   Leave either value empty in `.env` to disable analytics. Do not commit `.env`.

## Events sent

| Event                 | When | Parameters |
|-----------------------|------|------------|
| `contact_matched`      | A Xero contact was found for the current email | `invoices`, `bills`, `purchase_orders`, `quotes` (counts) |
| `contact_not_found`   | No contact was found for the current email | — |
| `contact_created`     | User created a new contact from the side panel | — |
| `email_added_to_contact` | User added the detected email to an existing contact | — |
| `link_opened`         | User clicked an invoice/bill/PO/quote number to open it in Xero | `link_type`: `invoice`, `bill`, `po`, `quote` |

A persistent **client_id** (UUID) is stored in `chrome.storage.local` per install so GA4 can report **unique users**. No email or PII is sent.

## Privacy

- Declare analytics in your Chrome Web Store listing and in your privacy policy.
- For EU users, consider asking for consent before sending events (e.g. don’t call `trackEvent` until the user accepts).
