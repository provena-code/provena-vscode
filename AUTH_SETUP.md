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

Set these classroom settings to your client's ID and secret, along with `"provena.auth.method": "google"`:

```json
"provena.auth.google.clientId": "....apps.googleusercontent.com",
"provena.auth.google.clientSecret": "..."
```

They can go in either place (see [DEV-README.md](DEV-README.md#classroom-configuration)):

- **Baked into a build:** in `provena.config.development.json` / `provena.config.production.json`, created from `provena.config.sample.json`. These files are gitignored.
- **Per workspace:** in `.vscode/settings.json`, for example in an assignment template you give students.

These values are only used for VS Code client-based OAuth, and they're ignored when `provena.auth.method` is `server`. A baked secret is compiled into the extension bundle, so anyone with the `.vsix` can extract it. Google doesn't treat Desktop app client secrets as confidential.

The redirect URI is handled automatically by the extension, so you don't need to configure it in the Google API Console. The extension will start a local server on `http://127.0.0.1` on a random port.
