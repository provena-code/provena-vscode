export const envConfig = {
    apiRoot: process.env.API_ROOT || 'https://127.0.0.1:8000',
    // Credentials for VS Code client-based Google OAuth only (server-based OAuth
    // is handled separately). These get compiled into the bundle, so they aren't
    // truly secret; loading them from .env files just keeps them out of git.
    googleOAuthClientId: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
    googleOAuthSecret: process.env.GOOGLE_OAUTH_SECRET || '',
};

export enum AuthenticationMethod {
    None = 'none',
    Google = 'google',
}

// These settings can be configured if deploying a clone to
// a different course.
export const provenaConfig = {
    // Note: The API root is set vian the .env.development and .env.production files
    // which should set the environment variable API_ROOT.
    // This allows for different API roots in development and production without changing the code.
    apiRoot: envConfig.apiRoot,
    syncToServer: true,
    authMode: AuthenticationMethod.Google,
};