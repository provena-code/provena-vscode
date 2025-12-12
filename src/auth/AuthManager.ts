
import * as vscode from 'vscode';
import { COMMAND_LOGOUT, GOOGLE_PROVIDER_ID } from '../constants';
import { promptForLogin, showLoginSuccess, showLogoutSuccess, showNetworkError } from '../ui';
import { GoogleProvider } from './providers/GoogleProvider';
import { AuthIdentity, IdentityProvider, NetworkError, NoStoredIdentityError, StoredAuthData, TokenError } from './types';

export class AuthManager {
    private providers: Map<string, IdentityProvider> = new Map();
    private _onAuthChange = new vscode.EventEmitter<{ providerId: string, identity: AuthIdentity | null }>();
    public readonly onAuthChange = this._onAuthChange.event;

    private lastIdentity: AuthIdentity | null = null;
    public get isLoggedIn() { return this.lastIdentity !== null; }

    constructor(private readonly context: vscode.ExtensionContext) {
        this.registerProvider(new GoogleProvider(context));

        this.onAuthChange(async ({ identity }) => {
            this.lastIdentity = identity;
        });
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

    public getCachedIdentity(fireChange: boolean = false): Promise<AuthIdentity | null> {
        return this.getStoredData(GOOGLE_PROVIDER_ID, fireChange);
    }

    public async getVerifiedGoogleEmail(): Promise<{ email: string, verified: boolean }> {
        const providerId = GOOGLE_PROVIDER_ID;
        const provider = this.providers.get(providerId);
        if (!provider) {
            throw new Error(`Provider ${providerId} not found`);
        }

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
        const provider = this.providers.get(GOOGLE_PROVIDER_ID)!;
        const identity = await provider.loginInteractive();
        showLoginSuccess(identity.email);
        this._onAuthChange.fire({ providerId: GOOGLE_PROVIDER_ID, identity });
        return identity;
    }

    public async logout() {
        const stored = await this.getStoredData(GOOGLE_PROVIDER_ID);
        if (stored) {
            const provider = this.providers.get(GOOGLE_PROVIDER_ID)!;
            await provider.logout(stored);
            this._onAuthChange.fire({ providerId: GOOGLE_PROVIDER_ID, identity: null });
        }
        showLogoutSuccess();
    }
}
