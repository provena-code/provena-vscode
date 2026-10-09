Ok, let's work on configuration. Here's how I'd like that to work:
* For clarity, there are user settings, like whether Provena's active, whether to ignore file warnings, which students should be able to update (or the UI updates for them).
* There are classroom settings, like how to authenticate, where the provena server lives, client/secrets if using local authentication, etc. These can come from two different sources:
  * 1) Defaults baked into the source code itself. These should be used in the absence of a local config. This lets me make a school-specific version of the extension that students don't need to configure. These should probably come from an .env file that can be .gitignored (that's the current practice), unless you've got a better idea (e.g., json/yaml might be easier to work with if it's easy enough to import, but that also might be overkill)
  * 2) Workspace configs that can override it. For example, I might release a no-defaults extension to the marketplace that an instructor can configure by giving students a workspace template that includes preconfigured settings (in .vscode/settings.json)
* Both instructor override settings and student settings might live in settings.json, but the latter don't need to have default values from .env.
* Since the different auth methods require different info, we need a way to structure the settings/.env file and validate it having the required info.

This task concerns only the instructor-specified config values, but I've explained the student-configured values so there's no confusion. Currently, these include the following (most but not all currently read from .env):
* The server endpoint for logging
* The auth configuration, which could include:
  * ServerAuth (no additional details)
  * GoogleAuth (which needs a client ID and secret)
* Config Overridable (precomiled only): whether local settings can override the precompiled config values (I imagine this would be rare, but we should define the behavior. Probably the default here is yes -- could be helpful if the server goes down and we need to change the endpoint)

Note that auth configuration is currently a setting already, but we can't set a default in the config. So this should become uniform

Can you read relevant code, update this file with additional details and ask any question you have?

---

## State before this task (as of `dev` @ 18314b8)

Classroom config is currently split across three unrelated mechanisms:

| Value | Where it comes from | Read by |
|---|---|---|
| Server endpoint | `API_ROOT` in `.env.<mode>`, inlined by `DefinePlugin` in [webpack.config.js](../../webpack.config.js); falls back to `https://127.0.0.1:8000` in [src/config.ts](../../src/config.ts) | [extension.ts](../../src/extension.ts) calls `EventLogger.configure(envConfig.apiRoot)` **once at activation**, which sets the global `OpenAPI.BASE`. [ProvenaServerProvider](../../src/auth/providers/ProvenaServerProvider.ts) also reads `OpenAPI.BASE` to build the login URL. |
| Google client ID / secret | `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_SECRET` in `.env.<mode>` | [GoogleProvider](../../src/auth/providers/GoogleProvider.ts) `getClientId()` / `getClientSecret()` |
| Auth method | VS Code setting `provena.auth.method` (`"google"` \| `"server"`), default `"google"` hardcoded in [package.json](../../package.json) `contributes.configuration` | [AuthManager.getActiveProviderId()](../../src/auth/AuthManager.ts), which also listens to `onDidChangeConfiguration` and logs out of the other provider on change |

Other notes from reading the code:

* `provenaConfig` and the `AuthenticationMethod` enum in [src/config.ts](../../src/config.ts) are **dead code** — nothing imports them. `syncToServer: true` is also unused. [DEV-README.md](../../DEV-README.md) still points people to `provenaConfig` for "course-level settings". These should be removed/replaced as part of this task.
* [LocalProvider](../../src/auth/providers/LocalProvider.ts) is an unregistered stub.
* `package.json` defaults are static, so they can't come from `.env`. Also, `getConfiguration().get(key, fallback)` returns the package.json default when nothing is set, so today there's no way to tell "instructor chose google" from "nobody set anything". The fix is to use `getConfiguration().inspect(key)` and only treat `workspaceFolderValue` / `workspaceValue` / `globalValue` as explicit overrides.
* The `.env` files are flat strings, and `DefinePlugin` inlines each key as `process.env.KEY`. `tsconfig.extension.json` already has `resolveJsonModule: true` (we import `package.json`), so importing a JSON config file at build time is essentially free. `zod` is already a dependency (unused in `src/` so far) and would work well for validation.
* User-facing text assumes Google (the walkthrough's "Sign in through your Google account", the `provena.login` command title "Sign into Provena with Google"). That text should depend on the resolved auth method.

## Decisions

* Use **one zod-validated JSON format** for baked defaults, with the same keys as settings.json. This replaces `.env`.
* **Workspace settings** are the intended way to override the baked defaults. User settings also count, since they come through the same VS Code settings API and there's no need to exclude them.
* **Bad local config falls back to the baked default** for each section; it doesn't shut down syncing. If any required setting is missing (neither baked nor set locally) or a local value is invalid, show **one warning** that lists the settings and asks the student to tell their instructor. The fix belongs to the instructor, not the student.
* **Unused fields are fine.** For example, a Google client ID can be left in place while using server auth, and no warning is shown.
* The config warning is only shown when `provena.active` is `true`. If Provena isn't active, the student hasn't said this is a school workspace, so the config isn't their concern. This matches how the existing "finish setting up" warning works.
* **Out of scope:** a local-only / no-server mode, which will be its own feature and add its own config later. `LocalProvider` isn't needed, since local logging doesn't need auth.
* Defaults I picked for the questions that weren't answered:
  * `overridable` is one boolean for everything, set only in the baked config, and defaults to `true`.
  * Overrides are merged key by key, then each section is validated. A workspace can override just `provena.server.url` and keep the baked auth.
  * The Google `clientSecret` is required, because Google Desktop clients still require it even with PKCE.
  * Changing `provena.server.url` while VS Code is running updates the API base right away. If the active method is `server`, it also drops the session, since that token came from the old server.
  * The settings are `"scope": "window"`, because there's only one `OpenAPI.BASE`.
  * No `"restricted"` handling. The extension doesn't declare `capabilities.untrustedWorkspaces`, so VS Code doesn't activate it at all in untrusted workspaces. If that changes, these settings should be listed in `restrictedConfigurations`.

## Design (implemented)

### Sources and keys

| Setting | Baked | Local | Notes |
|---|---|---|---|
| `provena.server.url` | ✓ | ✓ | Must be a valid URL. |
| `provena.auth.method` | ✓ | ✓ | `"google"` \| `"server"`. Its `package.json` default was removed. |
| `provena.auth.google.clientId` | ✓ | ✓ | Required when the method is `google`. |
| `provena.auth.google.clientSecret` | ✓ | ✓ | Required when the method is `google`. |
| `provena.overridable` | ✓ | ✗ | Defaults to `true`. If `false`, local values are ignored and a message is logged to the console. |

* **Baked:** `provena.config.<mode>.json` (gitignored; copy it from `provena.config.sample.json`). [webpack.config.js](../../webpack.config.js) reads it and inlines it as `__PROVENA_BAKED_CONFIG__` via `DefinePlugin`. A missing file means no defaults. A file that isn't valid JSON fails the build.
* **Local:** workspace or user `settings.json`. None of these settings have defaults in `package.json`, so `get()` is `undefined` unless someone actually set them. `null` and `""` (for example, a field cleared in the Settings UI) count as unset.

### Code

* [src/config/classroomConfig.ts](../../src/config/classroomConfig.ts) is the pure module (no `vscode` import). It holds the zod schemas and `resolveClassroomConfig(baked, local)`, which returns `{ server?, auth?, problems, ignoredOverrides }`. Tests are in [classroomConfig.test.ts](../../src/config/classroomConfig.test.ts).
  * Each **section** (`server` and `auth`) is resolved separately. Baked and local values are merged key by key. If the merged values don't validate and there was a local override, the baked-only values are tried instead. If those fail too, the section is `undefined`.
  * `problems` is always computed from the merged values. Each entry names the setting and says whether it is `missing` or `invalid`.
* [src/config/ConfigService.ts](../../src/config/ConfigService.ts) reads settings, re-resolves when a classroom setting changes (firing `onDidChange` with `{ previous, current }`), and owns the student-facing warning. That warning is shown once for each distinct set of problems; the "Sign into Provena" command can force it again.
* Consumers:
  * `extension.ts` calls `EventLogger.configure(server.url)` at startup and again on change.
  * `AuthManager.getActiveProviderId()` returns `auth.method`, or `null` if auth isn't configured. Logging in then throws `MissingConfigError`, and the login command shows the config warning instead. If auth becomes unconfigured, nobody is logged out, since that's likely a temporary misconfiguration.
  * `GoogleProvider` gets its client ID and secret from `auth.google`.
  * `SetupManager` shows the config warning when Provena is active: on startup, when `provena.active` changes, and when classroom settings change.
* If there's no valid server URL, `OpenAPI.BASE` is `''`, so syncing fails the same way it does when the server is unreachable. Local logging keeps working.
* Removed: `envConfig`, `provenaConfig`, `AuthenticationMethod`, the dotenv plumbing, and `.env.sample`. `.env*` is still gitignored, so old local files stay out of git.
* The text shown to students no longer assumes Google: the walkthrough, the login command title, and the login and token-error messages.

## Follow-ups / not done

* `dotenv` is still listed in `devDependencies`, but nothing uses it now. It can be removed with `npm uninstall dotenv`.
* `vitest.config.mts` references `src/test/unit/setup.ts`, which doesn't exist, so `npm test` fails before running anything. This was already broken before this task. The new tests pass with a config that has no setup file.
* `webpack --watch` reads the baked JSON only at startup. Restart the watch after editing it, which is the same as it was with `.env`.
