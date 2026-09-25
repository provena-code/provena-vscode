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

### Environment configuration

The server URL and Google OAuth credentials are injected at build time from a `.env.<mode>` file. `webpack.config.js` reads `.env.development` or `.env.production` (depending on the webpack `--mode`) and inlines each variable as `process.env.<KEY>` via `DefinePlugin`. These files are gitignored, so create both from the sample:

```sh
cp .env.sample .env.development
cp .env.sample .env.production
```

The variables are:

- `API_ROOT`: the base URL of your provena-server instance.
  - `.env.development`: point at your local server, e.g. `API_ROOT=http://127.0.0.1:8001` (the default in `.env.sample`).
  - `.env.production`: point at your deployed server.
- `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_SECRET`: credentials for **VS Code client-based** Google OAuth only. Server-based OAuth is being built separately and doesn't use these. Because they're compiled into the bundle, they aren't truly secret: anyone with the `.vsix` can extract them. Keeping them in `.env` files just keeps them off GitHub. If they're left blank, Google sign-in won't work.

If no `.env` file is found for the current mode, the extension falls back to `https://127.0.0.1:8000` (see [src/config.ts](src/config.ts)). The resolved API root is logged to the Debug Console on activation (`API Root: ...`), which is a quick way to check which config was picked up.

Note which scripts use which mode:
- `npm run watch` (used by F5 / the default build task): **development**
- `npm run package` / `npm run deploy`: **production**
- `npm run compile`: no `--mode` is passed, so it defaults to **production**

Other course-level settings (whether to sync to the server, authentication mode) live in `provenaConfig` in [src/config.ts](src/config.ts).

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