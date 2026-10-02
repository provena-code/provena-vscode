# Provena-server-based auth (alongside client-only Google auth)

## Goal

Today `src/auth` supports exactly one identity provider (`GoogleProvider`),
hardcoded as "the" active provider throughout `AuthManager`. Google OAuth is
done entirely client-side: the extension talks to Google directly and never
sends anything to the Provena server on logging calls — the server just
trusts whatever `SubjectID`/email is attached to each event.

We want to add a second mode where the **Provena server** handles login
(`AuthService.authLogin` / `authLogout` in
[AuthService.ts](../../src/api/services/AuthService.ts)) and hands back an
opaque bearer token the extension must then attach to every subsequent
logging request. The extension shouldn't need to know which backend the
server used (Google, something else) — it just gets `token` + `email` back.

Both modes must keep working; the user (or their institution) picks one via
configuration. `AuthManager` needs to stop assuming Google is the only
provider.

## Task 1 — Provena-server identity provider

### New provider: `ProvenaServerProvider`

Add `src/auth/providers/ProvenaServerProvider.ts` implementing
`IdentityProvider`, modeled on `GoogleProvider`'s loopback-server login flow
but simpler (no PKCE/token exchange step — the server does all of that).

* `id = 'server'` (new `PROVENA_SERVER_PROVIDER_ID` constant in
  `constants.ts`, alongside `GOOGLE_PROVIDER_ID`).

* **`loginInteractive()`**
  * Start an ephemeral loopback HTTP server on `127.0.0.1:0`, same as
    `GoogleProvider` (reuse the pattern; consider factoring the "spin up a
    loopback server and wait for one callback request" bit out of
    `GoogleProvider` into a shared helper in `utils/oauth.ts` or a new
    `utils/loopback.ts`, since both providers now need it).
  * Build the redirect URI: `http://127.0.0.1:{port}/callback`.
  * Call `AuthService.authLogin(redirectUri, 'cli')` — **not** via the
    generated `__request` client. Per its docstring this is a
    browser-navigation endpoint (it redirects the browser through whatever
    backend is active and finally back to `client_redirect_uri`), so open it
    with `vscode.env.openExternal()` the same way `buildAuthUrl(...)` is
    opened for Google today.
  * On the callback request, read `token` and `email` query params. Respond
    with a "you can close this window" HTML page like Google's flow.
  * Persist `{ providerId: 'server', token, email, verified: true,
    lastVerifiedAt: Date.now() }` to SecretStorage under
    `auth.server:payload` (`getSecretKey()` pattern already used by
    `GoogleProvider`).
  * Return the `AuthIdentity`.

* **`refreshIfNeeded()`**
  * Provena tokens (per this task) aren't refreshed client-side — there's no
    refresh endpoint. Just return the stored identity unchanged (like
    `LocalProvider.refreshIfNeeded`). Actual expiry is only discovered when a
    logging call gets a 401 (see Task 2), which is handled separately from
    this per-call "am I still verified" heuristic.

* **`logout()`**
  * Best-effort call `AuthService.authLogout(`Bearer ${token}`)` to revoke
    server-side (ignore errors, same as `GoogleProvider.logout` ignoring
    revoke failures).
  * Delete the secret.

### Types (`src/auth/types.ts`)

```ts
export interface ServerStoredData extends StoredAuthData {
    providerId: 'server';
    token: string;
}
```

### `AuthManager` generalization

`AuthManager` currently hardcodes `GOOGLE_PROVIDER_ID` in
`getCachedIdentity`, `getVerifiedGoogleEmail`, `ensureLoggedIn`, and
`logout`. Needs to:

* Register both providers (`GoogleProvider` and `ProvenaServerProvider`).
* Add a way to know which provider is currently active — a new
  `provena.auth.method` VS Code setting (`"google" | "server"`, default
  `"google"` so nothing changes for existing users), read the same way
  `CONFIG_PROVENA_ACTIVE` is read in `SetupManager.ts`. The unused
  `AUTH_PROVIDER_KEY` constant in `constants.ts` looks like it was already
  meant for this — happy to reuse it as the setting name unless there was a
  different plan for it.
* Replace the hardcoded `GOOGLE_PROVIDER_ID` references with
  `this.getActiveProviderId()`.
* Rename `getVerifiedGoogleEmail` → `getVerifiedEmail` (it isn't called
  anywhere outside `AuthManager` today, so this is a plain rename, not a
  compat-breaking one).
* Add `invalidateSession()`: clears the *active* provider's stored secret and
  fires `onAuthChange` with `identity: null`, without calling the remote
  revoke endpoint (used for the 401 case in Task 2 — the token is already
  dead server-side, we're just clearing our local copy and forcing
  re-login).

### `state` / CSRF protection — resolved, needs backend support

Assumption confirmed: `/auth/login` does **not** currently round-trip extra
query params on `client_redirect_uri`, so we can't attach a `state` the way
`GoogleProvider` does today.

This is a real gap, not just theoretical. The loopback server binds to
`127.0.0.1` on an OS-assigned port and accepts the *first* `GET /callback`
it sees, trusting whatever `token`/`email` come with it. Without a `state`
(or equivalent nonce) that the extension generates, sends, and verifies on
the way back, this is the classic "loopback interceptor" attack described in
RFC 8252 §8.3 / the OAuth Security BCP — a malicious local process, or even
a malicious web page (a background `<img>`/`fetch` can hit arbitrary
`127.0.0.1:port` URLs; the port is only known for the few-minute window the
server is listening, but ephemeral-port scanning from a page is a known,
practical technique) can race the real browser redirect and hand the
extension an attacker-controlled `token`/`email`. Concretely, for this
extension that means a forged callback could make a student's work get
logged under someone else's identity — i.e. it's an academic-integrity
attribution issue, not just a generic auth bug, so it's worth fixing rather
than shipping without it.

**Decision:** treat `state` passthrough as a required piece, not optional
polish. Ask the backend to accept an extra query param on
`client_redirect_uri` (or a dedicated `state`/`nonce` param on
`/auth/login` itself) and echo it back verbatim on the final redirect, same
contract Google's own endpoint already gives us. `ProvenaServerProvider`
generates a random value per login attempt, appends it, and rejects the
callback if it doesn't match — mirroring `GoogleProvider.loginInteractive`
almost exactly. Implementation below assumes this backend change lands
alongside it; until then, `ProvenaServerProvider` should still be written
with the `state` check in place (just document that it's unenforceable
against the current server).

## Task 2 — Attach the server token to logging calls, handle 401

Right now `ServerLogger` (`src/logging/ServerLogger.ts`) calls
`DefaultService.getLastSyncedOrder` / `DefaultService.addEvents` with no
auth header — fine for client-only Google auth, where the server never
verifies identity, it just records whatever `SubjectID` is in the payload.
When server auth is active, every logging call must carry
`Authorization: Bearer <token>`, and a 401 means the session is dead and the
user needs to log in again.

### Attaching the token

`OpenAPI.TOKEN` (`src/api/core/OpenAPI.ts`) already exists as exactly this
hook — `request.ts` adds `Authorization: Bearer <token>` automatically when
it's set. Plan:

* In `extension.ts`, wherever `authManager.onAuthChange` currently updates
  `logger`'s `SubjectID`, also update `OpenAPI.TOKEN`: if the active provider
  is `'server'` and there's a stored token, set `OpenAPI.TOKEN` to it (or to
  a resolver that reads the current secret, so it stays fresh without
  needing to re-wire on every login); otherwise set it to `undefined`.
* This keeps `ServerLogger` itself unaware of which auth mode is active — it
  just always calls `DefaultService`, and `OpenAPI.TOKEN` is populated (or
  not) based on config.

### Handling 401

* Add `SyncResultType.Unauthorized` alongside `Success` / `Unavailable` /
  `Rejected` in `LogFileService.ts`.
* In `ServerLogger`'s `getSyncErrorResult`, detect `status === 401` and
  return `{ result: SyncResultType.Unauthorized, error: ... }`.
* In `LogFileService`, treat `Unauthorized` like `Unavailable` for the
  purposes of pausing further sync attempts (`handleUnavailableServer`-style:
  don't keep hammering a dead session), but surface a distinct status/message
  ("Your session expired — sign in again to keep syncing your work") instead
  of "server unavailable", and call `authManager.invalidateSession()` so
  `isLoggedIn` flips false, the status bar / walkthrough prompts re-login,
  and `COMMAND_LOGIN` re-triggers a sync once the user signs back in (this
  already happens today via `onSetupStatusChange` → `shouldLogRemotely()` →
  `COMMAND_SYNC` when config/login state changes).

### On 401: resolved

Drop back to "logged out" (`invalidateSession()`), show a
`vscode.window.showWarningMessage` ("Your Provena session expired — sign in
again to keep syncing your work.") and route the user into the same
walkthrough/login entry point as `showWarningIfNotConfigured()` /
`showWalkthroughIfNeeded()` in `SetupManager.ts` uses today, rather than
silently relaunching the browser. This reuses the existing "not configured"
nudge path instead of adding a new one.

### Open question

Is there anything in the token response we could use to proactively know
it's about to expire (e.g. an expiry we could surface before the next
logging call fails), or is a 401 genuinely the only signal client-side? Not
blocking — 401-driven invalidation covers correctness either way, this would
just be a nicer UX (catch it before a batch of logs fails).

## Files touched (expected)

* `src/constants.ts` — `PROVENA_SERVER_PROVIDER_ID`, `provena.auth.method`
  config key (possibly reusing `AUTH_PROVIDER_KEY`).
* `src/auth/types.ts` — `ServerStoredData`.
* `src/auth/providers/ProvenaServerProvider.ts` — new.
* `src/auth/AuthManager.ts` — provider-agnostic active-provider handling,
  `invalidateSession()`.
* `src/auth/providers/GoogleProvider.ts` — possibly factor out the shared
  loopback-server helper.
* `src/logging/LogFileService.ts` — `SyncResultType.Unauthorized`, pause +
  distinct messaging on 401.
* `src/logging/ServerLogger.ts` — detect 401 in `getSyncErrorResult`.
* `src/extension.ts` — wire `OpenAPI.TOKEN` off of auth state.
* `package.json` — new `provena.auth.method` configuration entry.
