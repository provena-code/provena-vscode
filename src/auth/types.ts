
export type AuthIdentity = {
  providerId: string;      // e.g., "google"
  email: string;
  verified: boolean;       // true => last verification was fresh
  lastVerifiedAt: number;  // epoch ms
};

export interface StoredAuthData {
    providerId: string;
    email: string;
    verified: boolean;
    lastVerifiedAt: number;
}

export interface GoogleStoredData extends StoredAuthData {
    providerId: 'google';
    clientId: string;
    clientSecret?: string;
    refresh_token: string;
    access_token?: string;
    access_token_expires_at?: number; // epoch ms
    id_token?: string;
}

export interface IdentityProvider {
  id: string; // "google", "manual", etc.
  loginInteractive(): Promise<AuthIdentity>; // prompts user and returns identity (throws on cancel/error)
  refreshIfNeeded(stored: StoredAuthData): Promise<AuthIdentity | null>; // tries to refresh; returns new identity or null if can't
  logout(stored: StoredAuthData): Promise<void>;
}

// Error types
export class AuthCancelledError extends Error {
    constructor(message = "Authentication was cancelled by the user.") {
        super(message);
        this.name = "AuthCancelledError";
    }
}

export class NetworkError extends Error {
    constructor(message = "A network error occurred.") {
        super(message);
        this.name = "NetworkError";
    }
}

export class TokenError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "TokenError";
    }
}

export class NoStoredIdentityError extends Error {
    constructor(message = "No stored identity found.") {
        super(message);
        this.name = "NoStoredIdentityError";
    }
}
