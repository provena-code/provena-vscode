
import { randomBytes } from 'crypto';
import * as vscode from 'vscode';
import { AuthService, OpenAPI } from '../../api';
import { PROVENA_SERVER_PROVIDER_ID } from '../../constants';
import { showCancelledError, showTokenError } from '../../ui';
import { runLoopbackLogin } from '../../utils/loopback';
import {
    AuthCancelledError,
    AuthIdentity,
    IdentityProvider,
    ServerStoredData,
    StoredAuthData,
    TokenError
} from '../types';

export class ProvenaServerProvider implements IdentityProvider {
    public id = PROVENA_SERVER_PROVIDER_ID;

    constructor(private readonly context: vscode.ExtensionContext) { }

    private getSecretKey(): string {
        return `auth.${this.id}:payload`;
    }

    public async loginInteractive(): Promise<AuthIdentity> {
        // NOTE: the server doesn't currently round-trip a `state`/nonce param
        // appended to `client_redirect_uri`, so this can't be verified against
        // the callback yet -- see docs/tasks/server-auth.md. Generating and
        // checking it here anyway so this starts working the moment the
        // backend adds passthrough support, and to document the intent.
        const state = randomBytes(16).toString('hex');

        try {
            const { data } = await runLoopbackLogin<{ token: string, email: string }>({
                buildAuthUrl: (redirectUri) => {
                    const params = new URLSearchParams({
                        client_redirect_uri: redirectUri,
                        client_type: 'cli',
                    });
                    return `${OpenAPI.BASE}/auth/login?${params.toString()}`;
                },
                parseCallback: (url) => {
                    const receivedState = url.searchParams.get('state');
                    if (receivedState !== null && receivedState !== state) {
                        throw new TokenError('State mismatch. Please try again.');
                    }
                    const token = url.searchParams.get('token');
                    const email = url.searchParams.get('email');
                    if (!token || !email) {
                        throw new TokenError('No token/email received from the Provena server.');
                    }
                    return { token, email };
                },
            });

            const storedData: ServerStoredData = {
                providerId: PROVENA_SERVER_PROVIDER_ID,
                token: data.token,
                email: data.email,
                verified: true,
                lastVerifiedAt: Date.now(),
            };

            await this.context.secrets.store(this.getSecretKey(), JSON.stringify(storedData));

            return {
                providerId: this.id,
                email: storedData.email,
                verified: storedData.verified,
                lastVerifiedAt: storedData.lastVerifiedAt,
            };
        } catch (err: any) {
            if (err instanceof AuthCancelledError) {
                showCancelledError();
                throw err;
            }
            showTokenError();
            throw err;
        }
    }

    public async refreshIfNeeded(stored: StoredAuthData): Promise<AuthIdentity | null> {
        // Server-issued tokens aren't refreshed client-side; validity is only
        // discovered when a logging request gets a 401 (handled elsewhere by
        // AuthManager.invalidateSession()). Nothing to do here.
        return null;
    }

    public async logout(stored: StoredAuthData): Promise<void> {
        const storedServerData = stored as ServerStoredData;
        try {
            await AuthService.authLogout(`Bearer ${storedServerData.token}`);
        } catch (err) {
            // Ignore errors, as the token might already be invalid
            console.error('Failed to revoke token', err);
        }
        await this.context.secrets.delete(this.getSecretKey());
    }
}
