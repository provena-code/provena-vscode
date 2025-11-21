
// src/auth/providers/LocalProvider.ts
import { AuthIdentity, IdentityProvider, StoredAuthData } from "../types";

export const LOCAL_PROVIDER_ID = 'local';

export class LocalProvider implements IdentityProvider {
    public id = LOCAL_PROVIDER_ID;

    public async loginInteractive(): Promise<AuthIdentity> {
        // TODO: Implement interactive login for local provider
        throw new Error("Local provider login not implemented.");
    }

    public async refreshIfNeeded(stored: StoredAuthData): Promise<AuthIdentity | null> {
        // Local provider does not support refresh
        return null;
    }

    public async logout(stored: StoredAuthData): Promise<void> {
        // TODO: Implement logout for local provider
        return;
    }
}
