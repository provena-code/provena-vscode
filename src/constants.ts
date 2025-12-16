
// src/constants.ts

export const AUTH_PROVIDER_KEY = 'auth.provider';

// Google-specific constants
export const GOOGLE_PROVIDER_ID = 'google';
export const GOOGLE_SECRET_STORAGE_KEY = `auth.${GOOGLE_PROVIDER_ID}:payload`;

// OAuth settings
export const OAUTH_REDIRECT_URI = 'http://127.0.0.1';

// Commands
export const COMMAND_SETUP = 'provena.setup';
export const COMMAND_LOGIN = 'provena.login';
export const COMMAND_LOGOUT = 'provena.logout';
export const COMMAND_SET_ACTIVE = 'provena.setActive';
export const COMMAND_SET_INACTIVE = 'provena.setInactive';
export const COMMAND_SHOW_SYNC_STATUS = 'provena.showSyncStatus';
export const COMMAND_SYNC = 'provena.sync';

export const CONTEXT_IS_LOGGED_IN = 'provena.loggedIn';

export const CONFIG_PROVENA_ACTIVE = 'provena.active';
