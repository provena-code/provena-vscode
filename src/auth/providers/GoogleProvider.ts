
import axios from 'axios';
import { randomBytes } from 'crypto';
import * as http from 'http';
import { URL } from 'url';
import * as vscode from 'vscode';
import {
    GOOGLE_PROVIDER_ID,
    OAUTH_REDIRECT_URI
} from '../../constants';
import { showCancelledError, showTokenError } from '../../ui';
import { buildAuthUrl, exchangeCodeForToken, generatePKCE, getUserInfo, refreshAccessToken, revokeToken } from '../../utils/oauth';
import { envConfig } from '../../config';
import {
    AuthCancelledError,
    AuthIdentity,
    GoogleStoredData,
    IdentityProvider,
    NetworkError,
    StoredAuthData,
    TokenError
} from '../types';

export class GoogleProvider implements IdentityProvider {
    public id = GOOGLE_PROVIDER_ID;

    constructor(private readonly context: vscode.ExtensionContext) { }

    private getClientId(): string {
        return envConfig.googleOAuthClientId;
    }

    private getClientSecret(): string | undefined {
        // const forcePKCE = vscode.workspace.getConfiguration().get<boolean>(CONFIG_KEY_FORCE_PKCE, false);
        // if (forcePKCE) {
        //     return undefined;
        // }
        return envConfig.googleOAuthSecret;
    }

    private getSecretKey(): string {
        return `auth.${this.id}:payload`;
    }

    public async loginInteractive(): Promise<AuthIdentity> {
        const state = randomBytes(16).toString('hex');
        const pkce = generatePKCE();

        const server = http.createServer();

        let serverPort: number = 0;
        const serverPromise = new Promise<string>((resolve, reject) => {
            server.listen(0, '127.0.0.1', () => {
                serverPort = (server.address() as any).port;
                const redirectUri = `${OAUTH_REDIRECT_URI}:${serverPort}/callback`;
                try {
                    const authUrl = buildAuthUrl(this.getClientId(), redirectUri, state, pkce);
                    vscode.env.openExternal(vscode.Uri.parse(authUrl));
                } catch (e) {
                    if (e instanceof Error) {
                        reject(e);
                    } else {
                        reject(new Error(String(e)));
                    }
                }
            });

            const timer = setTimeout(() => {
                server.close();
                reject(new AuthCancelledError('Login timed out.'));
            }, 5 * 60 * 1000); // 5 minutes timeout

            server.on('request', (req, res) => {
                const url = new URL(req.url!, `http://${req.headers.host}`);
                const code = url.searchParams.get('code');
                const receivedState = url.searchParams.get('state');

                if (receivedState !== state) {
                    res.writeHead(400, { 'Content-Type': 'text/plain' });
                    res.end('State mismatch. Please try again.');
                    reject(new TokenError('State mismatch.'));
                    return;
                }

                if (code) {
                    res.writeHead(200, { 'Content-Type': 'text/plain' });
                    res.end('Authentication successful! You can close this window.');
                    resolve(code);
                } else {
                    res.writeHead(400, { 'Content-Type': 'text/plain' });
                    res.end('Authentication failed. Please try again.');
                    reject(new TokenError('No code received from Google.'));
                }
                clearTimeout(timer);
                server.close();
            });

            server.on('error', (err) => {
                clearTimeout(timer);
                reject(err);
            });
        });

        try {
            const code = await serverPromise;
            const redirectUri = `${OAUTH_REDIRECT_URI}:${serverPort}/callback`;

            const tokenData = await exchangeCodeForToken(
                this.getClientId(),
                this.getClientSecret(),
                redirectUri,
                code,
                pkce.code_verifier
            );

            if (!tokenData.refresh_token) {
                throw new TokenError("No refresh token returned from Google. Please re-authenticate and grant offline access.");
            }

            const userInfo = await getUserInfo(tokenData.access_token);

            const storedData: GoogleStoredData = {
                providerId: GOOGLE_PROVIDER_ID,
                clientId: this.getClientId(),
                clientSecret: this.getClientSecret(),
                refresh_token: tokenData.refresh_token,
                access_token: tokenData.access_token,
                access_token_expires_at: Date.now() + (tokenData.expires_in * 1000),
                id_token: tokenData.id_token,
                email: userInfo.email,
                verified: userInfo.email_verified,
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
            if (axios.isAxiosError(err)) {
                console.error(err.response?.data);
            }
            showTokenError();
            throw err;
        }
    }

    public async refreshIfNeeded(stored: StoredAuthData): Promise<AuthIdentity | null> {
        const storedGoogleData = stored as GoogleStoredData;
        if (storedGoogleData.access_token_expires_at && storedGoogleData.access_token_expires_at > Date.now() + (5 * 60 * 1000)) { // 5 min buffer
            return {
                providerId: stored.providerId,
                email: stored.email,
                verified: stored.verified,
                lastVerifiedAt: stored.lastVerifiedAt,
            };
        }

        try {
            const tokenData = await refreshAccessToken(
                storedGoogleData.clientId,
                storedGoogleData.clientSecret,
                storedGoogleData.refresh_token
            );

            const updatedData: GoogleStoredData = {
                ...storedGoogleData,
                access_token: tokenData.access_token,
                access_token_expires_at: Date.now() + (tokenData.expires_in * 1000),
                id_token: tokenData.id_token,
                verified: true,
                lastVerifiedAt: Date.now(),
            };

            await this.context.secrets.store(this.getSecretKey(), JSON.stringify(updatedData));

            return {
                providerId: this.id,
                email: updatedData.email,
                verified: updatedData.verified,
                lastVerifiedAt: updatedData.lastVerifiedAt,
            };
        } catch (err: any) {
            if (axios.isAxiosError(err)) {
                if (err.response?.data?.error === 'invalid_grant') {
                    // Refresh token is invalid, force re-login
                    await this.context.secrets.delete(this.getSecretKey());
                    throw new TokenError('Refresh token is invalid. Please log in again.');
                }
                throw new NetworkError('Failed to refresh token.');
            }
            throw err;
        }
    }

    public async logout(stored: StoredAuthData): Promise<void> {
        const storedGoogleData = stored as GoogleStoredData;
        try {
            await revokeToken(storedGoogleData.refresh_token);
        } catch (err) {
            // Ignore errors, as the token might already be invalid
            console.error('Failed to revoke token', err);
        }
        await this.context.secrets.delete(this.getSecretKey());
    }
}
