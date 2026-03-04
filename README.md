# Xero for Gmail

Chrome extension that shows Xero contact and financial data (invoices, bills, POs, quotes) in a Gmail side panel for the email sender.

## Setup before first build

1. **Copy env template and add your secrets** (do not commit `.env`):

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set:

   - **XERO_CLIENT_ID** – From [developer.xero.com](https://developer.xero.com) → your app → Client ID. Required for the extension to work.
   - **GOOGLE_OAUTH_CLIENT_ID** – From Google Cloud Console → Credentials → OAuth 2.0 Client ID (Chrome application). Required for Gmail API sender detection. See [GMAIL_SETUP.md](GMAIL_SETUP.md).
   - **GA4_MEASUREMENT_ID** and **GA4_API_SECRET** – Optional; leave empty to disable analytics. See [ANALYTICS.md](ANALYTICS.md).

2. **Build and load in Chrome**

   ```bash
   npm install
   npm run build
   ```

   Then open `chrome://extensions`, enable Developer mode, Load unpacked, and select the `dist` folder. Use the extension’s “Service worker” link to see the OAuth redirect URI and register it in your Xero app settings.

## Development

- `npm run build` – production build (reads `.env` for secrets).
- `npm run watch` – development build with watch.

Secrets are injected at build time from `.env`; they are not stored in the repo.
