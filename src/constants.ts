
// src/constants.ts
import { name, publisher } from '../package.json';

export const AUTH_PROVIDER_KEY = 'auth.provider';

// Google-specific constants
export const GOOGLE_PROVIDER_ID = 'google';
export const GOOGLE_SECRET_STORAGE_KEY = `auth.${GOOGLE_PROVIDER_ID}:payload`;

// Provena-server-auth constants
export const PROVENA_SERVER_PROVIDER_ID = 'server';
export const PROVENA_SERVER_SECRET_STORAGE_KEY = `auth.${PROVENA_SERVER_PROVIDER_ID}:payload`;

// Which IdentityProvider is active; value is one of the provider ids above.
export const CONFIG_AUTH_METHOD = `${name}.auth.method`;

export const COMMAND_SETUP_CATEGORY = `${publisher}.${name}#setup`;

// Commands
export const COMMAND_SETUP = `${name}.setup`;
export const COMMAND_LOGIN = `${name}.login`;
export const COMMAND_LOGOUT = `${name}.logout`;
export const COMMAND_SET_ACTIVE = `${name}.setActive`;
export const COMMAND_SET_INACTIVE = `${name}.setInactive`;
export const COMMAND_SHOW_SYNC_STATUS = `${name}.showSyncStatus`;
export const COMMAND_SYNC = `${name}.sync`;
export const COMMAND_CLEAR_CACHE = `${name}.clearCache`;

export const CONTEXT_IS_LOGGED_IN = `${name}.loggedIn`;

export const CONFIG_PROVENA_ACTIVE = `${name}.active`;
export const CONFIG_IGNORE_FILE_WARNINGS = `${name}.ignoreFileWarnings`;
