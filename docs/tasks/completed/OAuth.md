# Implementation brief (goal)

Provide an async function `getVerifiedGoogleEmail()` that:

* Returns `{ email: string, verified: boolean }` or throws a well-typed error.
* If the user hasn’t logged in, prompts them and does a browser-based OAuth loopback/login.
* Persists identity + tokens into VS Code SecretStorage so state is not easy to overwrite by accident.
* Tries to refresh tokens when needed; if refresh fails (including offline), uses the last known email but marks it `verified = false`.
* Exposes a `logout()` command that deletes stored credentials and identity.
* Uses a small provider abstraction so future auth methods (type-in name, GitHub, etc.) can be added.

# High-level architecture & file layout

Suggested minimal files:

* `src/auth/index.ts` — public auth facade exported to rest of extension (`getVerifiedGoogleEmail`, `logout`, `onAuthChange` event).
* `src/auth/types.ts` — shared types / interfaces.
* `src/auth/providers/GoogleProvider.ts` — Google-specific logic (login, refresh, revoke).
* `src/auth/providers/LocalProvider.ts` — simple "type your name" provider (for future).
* `src/utils/oauth.ts` — reusable small helpers (build auth URL, exchange code/token requests).
* `src/ui.ts` — UX wrappers (prompts, error dialogs).
* `src/constants.ts` — keys and configuration names.
* `package.json` — add commands for login/logout.
* Tests: `test/auth.*` (unit tests for token handling / refresh logic).

# Types / abstraction (high priority)

Define a minimal interface so other providers can slot in:

```ts
// types.ts (conceptual)
export type AuthIdentity = {
  providerId: string;      // e.g., "google"
  email: string;
  verified: boolean;       // true => last verification was fresh
  lastVerifiedAt: number;  // epoch ms
};

export interface IdentityProvider {
  id: string; // "google", "manual", etc.
  loginInteractive(): Promise<AuthIdentity>; // prompts user and returns identity (throws on cancel/error)
  refreshIfNeeded(stored: StoredAuthData): Promise<AuthIdentity | null>; // tries to refresh; returns new identity or null if can't
  logout(stored: StoredAuthData): Promise<void>;
}
```

`StoredAuthData` is provider-specific storage payload (below).

# Storage schema (SecretStorage usage)

Use `vscode.ExtensionContext.secrets` exclusively for all secret material. Don’t place refresh tokens in workspace settings or globalState.

Key naming scheme (prefix + provider):

* `auth.google:payload` — JSON string, structure below.

**Google stored object (in SecretStorage):**

```json
{
  "providerId": "google",
  "clientId": "...",
  "clientSecret": "... (optional, allow blank)",
  "refresh_token": "...",
  "access_token": "... (optional cache)",
  "access_token_expires_at": 169..., // epoch ms
  "id_token": "... (optional)",
  "email": "user@example.com",
  "verified": true,
  "lastVerifiedAt": 169...
}
```

Notes:

* Store the whole blob as a JSON string under one secret entry. This reduces accidental partial-edit risks.
* Put non-secret configuration (clientId if you prefer) in `constants.ts` or extension configuration; only the tokens and maybe clientSecret go into SecretStorage.

# Configuration & client secrets

Best practice options:

* **Preferred:** Use PKCE (no client secret) — simplest and safer. Client ID may be hardcoded or in `package.json` config.
* **Acceptable for your threat model:** Put `client_secret` in a local developer-only config (e.g., user’s `~/.config/your-extension.json`) and **do not** commit it to repo. But also support an empty secret and PKCE fallback.
* **Implementation detail for agent:** read clientId from a constant or extension config; read clientSecret optionally from an environment variable or extension workspace setting (document that it must not be checked in).

# GoogleProvider: flow and rules (detailed)

1. **When `getVerifiedGoogleEmail()` is called:**

   * Load stored blob from SecretStorage.
   * If none exist => call `provider.loginInteractive()` (interactive login).
   * If exist and `verified === true` and `access_token_expires_at` is in the future => return stored `{ email, verified: true }`.
   * Else attempt `provider.refreshIfNeeded(stored)`:

     * If refresh succeeds => update stored blob with new tokens, set `verified=true`, update `lastVerifiedAt` and return the email.
     * If refresh fails:

       * If offline (network error) => set `verified=false` (persist), return stored email (with verified=false).
       * If refresh fails for reasons that imply user revocation/invalid_grant => attempt interactive login:

         * If login succeeds => update stored blob, verified=true, return email.
         * If login is cancelled or fails => mark stored as `verified=false`, return stored email (with verified=false) or throw if no stored email exists.

2. **Interactive login (loginInteractive):**

   * Start ephemeral local HTTP server on `127.0.0.1:0` (OS selects port).
   * Build auth URL against `https://accounts.google.com/o/oauth2/v2/auth` with:

     * `client_id`
     * `redirect_uri=http://127.0.0.1:{port}/callback`
     * `response_type=code`
     * `scope=openid email profile`
     * `access_type=offline`
     * `prompt=consent`
     * `state=<random>`
     * (Optional) `code_challenge`/`code_challenge_method=S256` if using PKCE
   * Call `vscode.env.openExternal()` to open the default browser.
   * On redirect, validate `state`, read `code`. Send a minimal HTML "You can close this window".
   * Exchange code at `https://oauth2.googleapis.com/token` with:

     * `grant_type=authorization_code`
     * `code`
     * `client_id`
     * `redirect_uri`
     * `code_verifier` (if PKCE)
     * NOT required: client_secret (if using PKCE).
   * Parse token response. If no `refresh_token` present, show an informative error to user and explain they may need to re-consent with `prompt=consent`. But since you asked for offline + consent, it should be present.
   * Validate ID token (optionally) or call `https://openidconnect.googleapis.com/v1/userinfo` with the access token to fetch `email` and `email_verified` fields.
   * Persist tokens + email into SecretStorage as the stored blob.
   * Set `verified = true`.

3. **Refresh flow (refreshIfNeeded):**

   * If `refresh_token` exists and access token expired (or near expiry), POST to token endpoint with:

     * `grant_type=refresh_token`
     * `client_id`
     * `refresh_token`
   * On success: update `access_token`, expiry, maybe `id_token`.
   * On failure:

     * If error is `invalid_grant` or `invalid_client` or `invalid_request` -> treat as revocation or mismatch; trigger loginInteractive (unless offline).
     * On network failure -> mark verified=false, rely on existing email.

# UX / messaging rules (important)

* All user-visible prompts must be clear. Examples:

  * When asking to login: `"To associate logs with your account, sign in with Google — proceed?"` buttons `["Sign in", "Cancel"]`.
  * On network failure during refresh: `"Couldn't verify your login right now (offline). We'll keep your last verified identity but mark it as unverified."` button `["Retry", "Continue offline"]`.
  * On token exchange error where consent is required: `"Google returned an error: <short message>. Please try signing in again."`
  * On cancel during browser flow: `"Sign-in cancelled. No changes were made."`
* Provide actionable error messages; include an internal log (use `vscode.window.showErrorMessage()` for critical failures and use `console.error()` or extension logger for full details).

# Error handling policies (agent must implement)

* Normalize errors into typed errors:

  * `AuthCancelledError` — user cancelled interactive login
  * `NetworkError` — network unreachable
  * `TokenError` — errors from OAuth token endpoint (include `error` code)
  * `NoStoredIdentityError` — caller asked for identity but no stored identity exists and login was cancelled
* The public async function `getVerifiedGoogleEmail()` should:

  * Return `{ email, verified }` if at least a stored email exists (even if verified=false).
  * If no stored email and user cancels login, throw `NoStoredIdentityError`.
  * If fatal error (misconfiguration), throw `TokenError` with details.
* Always surface user-friendly messages to users, keep verbose error details in logs only.

# Logout behavior

* `logout()` should:

  * Delete the secret blob from SecretStorage.
  * Optionally call Google revoke endpoint `https://oauth2.googleapis.com/revoke?token=<refresh_token>` — this is good hygiene but not strictly required.
  * Emit an auth change event so UI can update.

# The public API (what the rest of your extension will call)

Exported functions from `auth/index.ts`:

```ts
// conceptual
export async function getVerifiedGoogleEmail(): Promise<{ email: string, verified: boolean }>;
export async function ensureLoggedIn(): Promise<{ email: string, verified: boolean }>; // forces login if no stored identity
export async function logout(): Promise<void>;
export const onAuthChange: vscode.Event<{ providerId: string, identity: AuthIdentity | null }>;
```

Implementation detail: `getVerifiedGoogleEmail()` should be safe to call anywhere in your extension — it will run the refresh/login heuristics and return quickly when already verified.

# Interaction examples (control flow)

Caller wants email:

```ts
try {
  const identity = await auth.getVerifiedGoogleEmail();
  // identity.email, identity.verified
} catch (err) {
  if (err instanceof NoStoredIdentityError) {
    // show message "Sign in is required to attach identity to logs."
  } else {
    // show generic error
  }
}
```

# Testing guidance

* Unit tests: mock token endpoint responses (success, invalid_grant, network failure). Verify stored blob updates and verified flag behavior.
* Integration test (manual): simulate first-time login, cancel flow, network-offline during refresh, token revocation case (use a throw-away Google project).
* Security test: verify secret is stored in SecretStorage and not in logs; confirm logout clears secrets.

# Logging & telemetry

* Keep an internal logger using `console` or a thin logger wrapper. Do NOT log access_token/refresh_token. Only log high-level events:

  * `auth.login.started`, `auth.login.success`, `auth.login.cancelled`
  * `auth.refresh.success`, `auth.refresh.failed`
  * `auth.logout`
* If you report telemetry, **never** include tokens; email is acceptable if privacy policy allows.

# Best-practice notes & gotchas (must-read)

* **Always use `access_type=offline` and `prompt=consent`** in the auth URL so you get a refresh token on first consent.
* If users previously granted consent, Google may not return a refresh token on subsequent logins unless `prompt=consent` is present.
* **Local redirect URIs:** use `http://127.0.0.1:{port}` (127.0.0.1 is less ambiguous than `localhost`).
* **State parameter:** always generate and verify a random `state` to protect against CSRF.
* **PKCE:** still recommended. It’s trivial to implement and avoids shipping a secret.
* **Secret exposure:** anyone can inspect `.vsix`. Treat client secret as “not secure.” If you include it for convenience, store it in a development-only location and document it must not be committed.
* **User switching:** if a user wants to switch accounts, the extension should offer an explicit `Logout / Sign in as different user` command; otherwise users may get stuck with previous account.
* **Offline-first behavior:** define clearly that `verified=false` is considered weaker identity but acceptable for logging — log that it was stale/uncertain.
* **Token revocation:** optionally call revoke during logout. If you don’t, tokens still get invalidated eventually or by user action.

# Minimal UX flow examples (what the agent should implement)

1. `getVerifiedGoogleEmail()` called.
2. If no stored identity:

   * `vscode.window.showInformationMessage("Sign in with Google to attach your identity to logs.", "Sign in", "Cancel")`
   * On user selects `Sign in` → run interactive login.
   * On cancel → throw `NoStoredIdentityError`.
3. If stored identity and verified = true (and token valid) → return immediately.
4. If stored identity but verified = false or token expired:

   * Try refresh.
   * On network problem → show `"Offline — using last verified identity (unverified)"` optionally with "Retry" button.
   * On invalid_grant → prompt interactive login.
   * On user cancel → return email with `verified=false`.

# Suggested minimal security/UX knobs to expose in settings

In `package.json contributes.configuration` add small settings:

* `yourExtension.auth.clientId` (string) — optional
* `yourExtension.auth.clientSecret` (string) — optional, warn about not committing
* `yourExtension.auth.forcePKCE` (boolean) — default true
* `yourExtension.auth.promptOnFirstUse` (boolean) — whether to prompt automatically

# Deliverables for the coding agent

Ask the agent to produce:

1. A working auth module that implements the public API described above.
2. Unit tests for refresh logic and error handling.
3. README section describing how to register Google OAuth Desktop client, which redirect URIs to configure (loopback; 127.0.0.1), scopes to request, and config instructions for clientId/secret.
4. Minimal demo command bindings: `command: extension.login`, `command: extension.logout`.
5. Manual test checklist to validate the flows.

# Example error messages (copyable)

* On network refresh failure: `"Unable to verify your sign-in right now (offline). We'll keep your last identity but mark it unverified."`
* On user cancel: `"Sign-in cancelled. No identity was added."`
* On token error: `"Sign-in failed: Google returned an error. Try signing in again or check your network."`
