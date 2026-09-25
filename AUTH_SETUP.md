# Authentication Setup

This document describes how to set up Google OAuth for this extension.

## Creating Google OAuth Credentials

1.  Go to the [Google API Console](https://console.developers.google.com/).
2.  Create a new project or select an existing one.
3.  Go to the **OAuth consent screen** page.
    *   Choose **External** user type.
    *   Fill in the required information (App name, User support email, Developer contact information).
    *   On the Scopes page, add the following scopes:
        *   `.../auth/userinfo.email`
        *   `.../auth/userinfo.profile`
        *   `openid`
    *   Add your email address as a test user.
4.  Go to the **Credentials** page.
5.  Click **Create Credentials** and choose **OAuth client ID**.
6.  Choose **Desktop app** as the application type.
7.  Give it a name.
8.  After creation, you will see a **Client ID** and **Client Secret**.

## Configuring the Extension

1. Create `.env.development` and `.env.production` from `.env.sample` (see [DEV-README.md](DEV-README.md#environment-configuration)).
2. Set `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_SECRET` in both files to your client's client ID and secret.

These values are only used for VS Code client-based OAuth. They get compiled into the extension bundle, so anyone with the `.vsix` can extract them; keeping them in `.env` files just keeps them out of source control.

The redirect URI is handled automatically by the extension, so you don't need to configure it in the Google API Console. The extension will start a local server on `http://127.0.0.1` on a random port.
