
import * as vscode from 'vscode';
import { OpenAPI } from '../api';
import { ConfigService, MissingConfigError } from '../config/ConfigService';
import { PROVENA_SERVER_PROVIDER_ID } from '../constants';
import { promptForLogin, showLoginSuccess, showLogoutSuccess, showNetworkError } from '../ui';
import { GoogleProvider } from './providers/GoogleProvider';
import { ProvenaServerProvider } from './providers/ProvenaServerProvider';
import { AuthIdentity, IdentityProvider, NetworkError, NoStoredIdentityError, ServerStoredData, StoredAuthData, TokenError } from './types';

export class AuthManager {
    private providers: Map<string, IdentityProvider> = new Map();
    private _onAuthChange = new vscode.EventEmitter<{ providerId: string, identity: AuthIdentity | null }>();
    public readonly onAuthChange = this._onAuthChange.event;

    private lastIdentity: AuthIdentity | null = null;
    private lastIdentityProviderId: string | null = null;
    // Only "logged in" if the cached identity actually belongs to the
    // currently-configured provider -- if the user just switched
    // provena.auth.method, a stale identity from the old provider must not
    // count, even before the config-change handler below has caught up.
    public get isLoggedIn() {
        return this.lastIdentity !== null && this.lastIdentityProviderId === this.getActiveProviderId();
    }

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly configService: ConfigService,
    ) {
        this.registerProvider(new GoogleProvider(context, configService));
        this.registerProvider(new ProvenaServerProvider(context));

        this.onAuthChange(async ({ providerId, identity }) => {
            this.lastIdentity = identity;
            this.lastIdentityProviderId = providerId;
        });

        // Resolved fresh on every request (rather than mutated reactively off
        // onAuthChange events) so DefaultService calls always carry the
        // current server-auth token, with no window where a request could
        // race ahead of an auth-change event and go out unauthenticated.
        OpenAPI.TOKEN = async (): Promise<string> => {
            const providerId = this.getActiveProviderId();
            if (providerId !== PROVENA_SERVER_PROVIDER_ID) {
                return '';
            }
            const stored = await this.getStoredData(providerId) as ServerStoredData | null;
            return stored?.token ?? '';
        };

        context.subscriptions.push(configService.onDidChange(async ({ previous, current }) => {
            if (previous.auth?.method !== current.auth?.method) {
                await this.handleActiveProviderChanged();
            } else if (previous.server?.url !== current.server?.url
                && current.auth?.method === PROVENA_SERVER_PROVIDER_ID) {
                // A server-auth token was issued by the old server, so it
                // won't be valid against the new one.
                await this.invalidateSession();
            }
        }));
    }

    /**
     * Only one provider's session should ever be considered active. When the
     * user switches provena.auth.method, log out of whichever other
     * provider(s) still have a stored session, then refresh the cache for
     * the newly-active provider so the UI reflects it immediately.
     */
    private async handleActiveProviderChanged(): Promise<void> {
        const activeProviderId = this.getActiveProviderId();
        if (activeProviderId === null) {
            // Config is broken (and the student has been warned); don't revoke
            // anyone's session over what's likely a temporary misconfiguration.
            await this.getCachedIdentity(true);
            return;
        }
        for (const [providerId, provider] of this.providers) {
            if (providerId === activeProviderId) {
                continue;
            }
            const stored = await this.getStoredData(providerId);
            if (stored) {
                await provider.logout(stored);
                this._onAuthChange.fire({ providerId, identity: null });
            }
        }
        await this.getCachedIdentity(true);
    }

    /** The configured provider id, or null if the classroom config has no valid auth method. */
    public getActiveProviderId(): string | null {
        return this.configService.current.auth?.method ?? null;
    }

    private getActiveProvider(): IdentityProvider {
        const providerId = this.getActiveProviderId();
        if (providerId === null) {
            throw new MissingConfigError();
        }
        const provider = this.providers.get(providerId);
        if (!provider) {
            throw new Error(`Provider ${providerId} not found`);
        }
        return provider;
    }

    private registerProvider(provider: IdentityProvider) {
        this.providers.set(provider.id, provider);
    }

    public async getStoredData(providerId: string, fireChange: boolean = false): Promise<StoredAuthData | null> {
        const key = `auth.${providerId}:payload`;
        const data = await this.context.secrets.get(key);
        const parsedData = data ? JSON.parse(data) : null;
        if (fireChange) {
            this._onAuthChange.fire({ providerId, identity: parsedData });
        }
        return parsedData;
    }

    public async getCachedIdentity(fireChange: boolean = false): Promise<AuthIdentity | null> {
        const providerId = this.getActiveProviderId();
        if (providerId === null) {
            if (fireChange) {
                this._onAuthChange.fire({ providerId: '', identity: null });
            }
            return null;
        }
        return this.getStoredData(providerId, fireChange);
    }

    public async getVerifiedEmail(): Promise<{ email: string, verified: boolean }> {
        const provider = this.getActiveProvider();
        const providerId = provider.id;

        const stored = await this.getStoredData(providerId);

        if (!stored) {
            if (await promptForLogin()) {
                return this.ensureLoggedIn();
            }
            throw new NoStoredIdentityError();
        }

        try {
            const refreshedIdentity = await provider.refreshIfNeeded(stored);
            if (refreshedIdentity) {
                this._onAuthChange.fire({ providerId, identity: refreshedIdentity });
                return refreshedIdentity;
            }
            return stored;
        } catch (err) {
            if (err instanceof TokenError) {
                const newIdentity = await provider.loginInteractive();
                this._onAuthChange.fire({ providerId, identity: newIdentity });
                return newIdentity;
            } else if (err instanceof NetworkError) {
                showNetworkError();
                const unverifiedIdentity = { ...stored, verified: false };
                const key = `auth.${providerId}:payload`;
                await this.context.secrets.store(key, JSON.stringify(unverifiedIdentity));
                this._onAuthChange.fire({ providerId, identity: unverifiedIdentity });
                return unverifiedIdentity;
            }
            throw err;
        }
    }

    public async ensureLoggedIn(): Promise<{ email: string, verified: boolean }> {
        const provider = this.getActiveProvider();
        const providerId = provider.id;
        const identity = await provider.loginInteractive();
        showLoginSuccess(identity.email);
        this._onAuthChange.fire({ providerId, identity });
        return identity;
    }

    public async logout() {
        const providerId = this.getActiveProviderId();
        const stored = providerId !== null ? await this.getStoredData(providerId) : null;
        if (providerId !== null && stored) {
            const provider = this.getActiveProvider();
            await provider.logout(stored);
            this._onAuthChange.fire({ providerId, identity: null });
        }
        showLogoutSuccess();
    }

    /**
     * Drops the active provider's stored credentials locally without calling
     * its remote revoke/logout (the token is already dead server-side, e.g.
     * after a 401 from a logging call) and fires onAuthChange so the UI
     * treats the user as logged out again.
     */
    public async invalidateSession(): Promise<void> {
        const providerId = this.getActiveProviderId();
        if (providerId === null) {
            return;
        }
        const key = `auth.${providerId}:payload`;
        await this.context.secrets.delete(key);
        this._onAuthChange.fire({ providerId, identity: null });
    }
}
