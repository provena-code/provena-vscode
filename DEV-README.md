# provena-vscode

Provena is system designed to allow students to show their work on programming problems, and to enable instructors to verify student effort. This VS Code extension servers as a logging client. It is intended to be used by students.

## Setup

### Prerequisites
The extension requires you to have set up [provena-server](https://github.com/provena-code/provena-client) to receive logging data.

You will also need:
- [Node.js](https://nodejs.org/) (20.x or later) and npm
- [VS Code](https://code.visualstudio.com/) 1.104 or later
- Git

### Cloning

Provena's shared logic (edit tracking, ProgSnap2 event types, etc.) lives in the [provena-core](https://github.com/thomaswp/provena-core) repository, which is included as a git submodule in `core/`. The extension depends on it as a local npm package (`"provena": "file:core"` in `package.json`), so the submodule **must** be checked out before you run `npm install`.

Clone with submodules:

```sh
git clone --recurse-submodules https://github.com/thomaswp/Provena-vscode.git
```

Or, if you already cloned without them:

```sh
git submodule update --init --recursive
```

Then install dependencies:

```sh
npm install
```

When you pull changes that update the submodule, run `git submodule update` again to keep `core/` in sync.

### Classroom configuration

The server URL and auth settings ("classroom config") can come from two places, which use the same keys:

1. **Baked-in defaults**, from `provena.config.<mode>.json` in the repo root. `webpack.config.js` reads `provena.config.development.json` or `provena.config.production.json` (depending on the webpack `--mode`) and compiles it into the bundle. This is how you build a school-specific extension that students don't need to configure. These files are gitignored, so create them from the sample:

   ```sh
   cp provena.config.sample.json provena.config.development.json
   cp provena.config.sample.json provena.config.production.json
   ```

   The file is optional. Without it, the build has no defaults, which is what you want for a generic marketplace build.

2. **Workspace (or user) settings**, in `.vscode/settings.json`. These override the baked defaults. An instructor can configure a no-defaults build this way by handing out a workspace template.

The keys are:

- `provena.server.url`: the base URL of your provena-server instance, e.g. `http://127.0.0.1:8001` for local development.
- `provena.auth.method`: `"google"` (the extension does Google OAuth itself) or `"server"` (the Provena server handles sign-in).
- `provena.auth.google.clientId` and `provena.auth.google.clientSecret`: required only when the method is `google` (see [AUTH_SETUP.md](AUTH_SETUP.md)). Because they're compiled into the bundle, they aren't truly secret: anyone with the `.vsix` can extract them. Keeping them out of git just keeps them off GitHub.
- `provena.overridable` (baked file only): set it to `false` to ignore workspace and user overrides. Defaults to `true`.

Values are validated with zod ([src/config/classroomConfig.ts](src/config/classroomConfig.ts)). Unused keys are fine, such as Google credentials when using server auth. If a workspace override is invalid, Provena falls back to the baked default for that section. If a required value is missing or invalid, students with Provena active see one warning that names the settings and asks them to tell their instructor. The resolved config and any problems are logged to the Debug Console on activation (`Provena classroom config: ...`).

Note which scripts use which mode:
- `npm run watch` (used by F5 / the default build task): **development**
- `npm run package` / `npm run deploy`: **production**
- `npm run compile`: no `--mode` is passed, so it defaults to **production**

`webpack --watch` only reads the config file when it starts, so restart it after editing the file.

### Running and debugging

If you're new to VS Code extension development, start with the official [Your First Extension](https://code.visualstudio.com/api/get-started/your-first-extension) guide and the [Extension Anatomy](https://code.visualstudio.com/api/get-started/extension-anatomy) overview.

1. Open this folder in VS Code and install these extensions (`amodio.tsl-problem-matcher`, `dbaeumer.vscode-eslint`, `ms-vscode.extension-test-runner`).
2. Press `F5` (or run the **Run Extension** launch configuration). This starts `npm run watch` in the background and opens a new **Extension Development Host** window with Provena loaded.
3. After changing code, webpack rebuilds automatically; reload the Extension Development Host window (`Ctrl+R` / `Cmd+R`, or **Developer: Reload Window**) to pick up the changes.

Other useful scripts:
- `npm test`: run unit tests with vitest
- `npm run deploy`: build a `.vsix` package for distribution
- `npm run gen`: regenerate the API client in `src/api` from a running server's OpenAPI spec (expects the server at `http://127.0.0.1:8001`)


## Citing Provena

To cite Provena, please cite:

Price, T.W., Titus, K., Jiao, S. & and Tran, K. (2026, November). "Beyond Copy-Paste: Detecting and Understanding Students’ Use of Unauthorized Aid when Monitored." In Proceedings of the 26th Koli Calling International Conference on Computing Education Research (pp. 1-12).


```
@inproceedings{price2026beyond,
  title={Beyond Copy-Paste: Detecting and Understanding Students’ Use of Unauthorized Aid when Monitored},
  author={Price, Thomas W. and Titus, Kim and Jiao, Shuyin and Tran, Keith},
  booktitle={Proceedings of the 26th Koli Calling International Conference on Computing Education Research},
  pages={1--12},
  year={2026}
}
```