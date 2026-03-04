# Gmail API setup (optional but recommended)

The extension uses the **Gmail API** to read the **From** address of the open email. That avoids relying on Gmail’s DOM and is more reliable.

If you don’t set this up, the extension falls back to reading the Gmail page (DOM). To use the API:

## 1. Google Cloud project

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project or pick an existing one.
3. **Enable the Gmail API**: APIs & Services → Library → search “Gmail API” → Enable.

## 2. OAuth consent and client ID

1. **APIs & Services → OAuth consent screen**: choose “External” (or “Internal” for Workspace), set app name and support email, save.
2. **APIs & Services → Credentials → Create credentials → OAuth client ID**.
3. Application type: **Chrome app**.
4. Name: e.g. “Xero for Gmail”.
5. **Application ID**: use your extension ID from `chrome://extensions` (enable Developer mode, copy the ID of the unpacked “Xero for Gmail” extension).
6. Create. Copy the **Client ID** (e.g. `123...apps.googleusercontent.com`).

## 3. Use the Client ID in the extension

1. Copy `.env.example` to `.env` if you haven’t already.
2. In `.env`, set **GOOGLE_OAUTH_CLIENT_ID** to your OAuth client ID (e.g. `123...apps.googleusercontent.com`).
3. Run `npm run build`. The build injects this value into the extension’s manifest.
4. Reload the extension in `chrome://extensions`.

## 4. First use

The first time the extension needs to know the sender of the open email, Chrome may ask you to allow the extension to “View your email messages and settings” (Gmail read-only). Approve so the extension can use the Gmail API.

After that, the extension will use the API to get the **From** address and only fall back to the page (DOM) if the API is not configured or fails.
