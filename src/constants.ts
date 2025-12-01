
// src/constants.ts

export const AUTH_PROVIDER_KEY = 'auth.provider';

// Google-specific constants
export const GOOGLE_PROVIDER_ID = 'google';
export const GOOGLE_SECRET_STORAGE_KEY = `auth.${GOOGLE_PROVIDER_ID}:payload`;

// OAuth settings
export const OAUTH_REDIRECT_URI = 'http://127.0.0.1';

// Extension configuration keys
export const CONFIG_KEY_PREFIX = 'ta-editor.auth.';
export const CONFIG_KEY_CLIENT_ID = `${CONFIG_KEY_PREFIX}clientId`;
export const CONFIG_KEY_CLIENT_SECRET = `${CONFIG_KEY_PREFIX}clientSecret`;
export const CONFIG_KEY_FORCE_PKCE = `${CONFIG_KEY_PREFIX}forcePKCE`;
export const CONFIG_KEY_PROMPT_ON_FIRST_USE = `${CONFIG_KEY_PREFIX}promptOnFirstUse`;

// Commands
export const COMMAND_LOGIN = 'provena.login';
export const COMMAND_LOGOUT = 'provena.logout';

export const CONTEXT_IS_LOGGED_IN = 'provena.loggedIn';
export const CONTEXT_USERNAME = 'provena.username';
