
// src/constants.ts
import { name, publisher } from '../package.json';

export const AUTH_PROVIDER_KEY = 'auth.provider';

// Google-specific constants
export const GOOGLE_PROVIDER_ID = 'google';
export const GOOGLE_SECRET_STORAGE_KEY = `auth.${GOOGLE_PROVIDER_ID}:payload`;

// OAuth settings
export const OAUTH_REDIRECT_URI = 'http://127.0.0.1';

export const COMMAND_SETUP_CATEGORY = `${publisher}.${name}#setup`;

// Commands
export const COMMAND_SETUP = `${name}.setup`;
export const COMMAND_LOGIN = `${name}.login`;
export const COMMAND_LOGOUT = `${name}.logout`;
export const COMMAND_SET_ACTIVE = `${name}.setActive`;
export const COMMAND_SET_INACTIVE = `${name}.setInactive`;
export const COMMAND_SHOW_SYNC_STATUS = `${name}.showSyncStatus`;
export const COMMAND_SYNC = `${name}.sync`;

export const CONTEXT_IS_LOGGED_IN = `${name}.loggedIn`;

export const CONFIG_PROVENA_ACTIVE = `${name}.active`;
