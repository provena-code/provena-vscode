export const envConfig = {
    apiRoot: process.env.API_ROOT || 'https://127.0.0.1:8000',
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