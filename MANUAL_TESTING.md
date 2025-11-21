# Manual Testing Checklist for Authentication

This checklist is for manually testing the Google OAuth authentication flow.

## Prerequisites

*   The extension is installed and running in a development environment.
*   You have configured the Google OAuth client ID in the extension settings as described in [AUTH_SETUP.md](AUTH_SETUP.md).

## Test Cases

### 1. First-time Login
1.  Start with no existing authentication secrets. (You can clear them by running the "Sign out" command).
2.  Trigger a feature that requires authentication (or run the "Sign in with Google" command).
3.  A prompt should appear asking you to sign in.
4.  Click "Sign in".
5.  Your browser should open a Google consent screen.
6.  Log in with your Google account and grant the requested permissions.
7.  You should be redirected to a page saying you can close the window.
8.  A notification should appear in VS Code confirming you are logged in.
9.  Check the developer console for the logged identity.

### 2. Cancel Login
1.  Start with no existing authentication secrets.
2.  Trigger a feature that requires authentication.
3.  A prompt should appear asking you to sign in.
4.  Click "Cancel".
5.  No login should happen. The feature should handle the lack of authentication gracefully.
6.  Check the developer console for the "User is not logged in and cancelled login prompt." message.

### 3. Logout
1.  Log in following the "First-time Login" steps.
2.  Run the "Sign out" command from the command palette.
3.  A notification should confirm that you have been signed out.
4.  The secrets should be cleared. You can verify this by trying to use an authenticated feature again, which should trigger a new login prompt.

### 4. Existing Login (Token Refresh)
1.  Log in.
2.  Restart the extension/VS Code.
3.  Trigger an authenticated feature.
4.  It should work without prompting you to log in again. The token should be refreshed in the background.

### 5. Offline Behavior
1.  Log in.
2.  Disconnect your computer from the internet.
3.  Restart the extension/VS Code.
4.  Trigger an authenticated feature.
5.  The extension should use the last known identity, but mark it as unverified. A warning notification should appear.
6.  Check the developer console for the identity being logged with `verified: false`.

### 6. Invalid Client ID
1.  Set a wrong Client ID in the extension settings.
2.  Try to log in.
3.  An error message should be displayed.
