
import * as vscode from 'vscode';
import { OpenAPI } from '../api';
import { CONFIG_AUTH_METHOD, GOOGLE_PROVIDER_ID, PROVENA_SERVER_PROVIDER_ID } from '../constants';
import { promptForLogin, showLoginSuccess, showLogoutSuccess, showNetworkError } from '../ui';
import { GoogleProvider } from './providers/GoogleProvider';
import { ProvenaServerProvider } from './providers/ProvenaServerProvider';
import { AuthIdentity, IdentityProvider, NetworkError, NoStoredIdentityError, ServerStoredData, StoredAuthData, TokenError } from './types';

export class AuthManager {
    private providers: Map<string, IdentityProvider> = new Map();
    private _onAuthChange = new vscode.EventEmitter<{ providerId: string, identity: AuthIdentity | null }>();
    public readonly onAuthChange = this._onAuthChange.event;

    private lastIdentity: AuthIdentity | null = null;
    public get isLoggedIn() { return this.lastIdentity !== null; }

    constructor(private readonly context: vscode.ExtensionContext) {
        this.registerProvider(new GoogleProvider(context));
        this.registerProvider(new ProvenaServerProvider(context));

        this.onAuthChange(async ({ providerId, identity }) => {
            this.lastIdentity = identity;
            await this.syncApiToken(providerId, identity);
        });
    }

    /** The provider id the user has configured to authenticate with. */
    public getActiveProviderId(): string {
        return vscode.workspace.getConfiguration().get(CONFIG_AUTH_METHOD, GOOGLE_PROVIDER_ID);
    }

    private getActiveProvider(): IdentityProvider {
        const providerId = this.getActiveProviderId();
        const provider = this.providers.get(providerId);
        if (!provider) {
            throw new Error(`Provider ${providerId} not found`);
        }
        return provider;
    }

    private registerProvider(provider: IdentityProvider) {
        this.providers.set(provider.id, provider);
    }

    /** Keeps OpenAPI.TOKEN in sync so logging calls carry the server's bearer token when server auth is active. */
    private async syncApiToken(providerId: string, identity: AuthIdentity | null): Promise<void> {
        if (!identity || providerId !== this.getActiveProviderId() || providerId !== PROVENA_SERVER_PROVIDER_ID) {
            OpenAPI.TOKEN = undefined;
            return;
        }
        const stored = await this.getStoredData(providerId) as ServerStoredData | null;
        OpenAPI.TOKEN = stored?.token;
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

    public getCachedIdentity(fireChange: boolean = false): Promise<AuthIdentity | null> {
        return this.getStoredData(this.getActiveProviderId(), fireChange);
    }

    public async getVerifiedEmail(): Promise<{ email: string, verified: boolean }> {
        const providerId = this.getActiveProviderId();
        const provider = this.getActiveProvider();

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
        const providerId = this.getActiveProviderId();
        const provider = this.getActiveProvider();
        const identity = await provider.loginInteractive();
        showLoginSuccess(identity.email);
        this._onAuthChange.fire({ providerId, identity });
        return identity;
    }

    public async logout() {
        const providerId = this.getActiveProviderId();
        const stored = await this.getStoredData(providerId);
        if (stored) {
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
        const key = `auth.${providerId}:payload`;
        await this.context.secrets.delete(key);
        this._onAuthChange.fire({ providerId, identity: null });
    }
}
