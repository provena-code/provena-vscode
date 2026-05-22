
import axios from 'axios';
import * as crypto from 'crypto';
import { URLSearchParams } from 'url';

export interface PKCE {
    code_verifier: string;
    code_challenge: string;
}

export function generatePKCE(): PKCE {
    const code_verifier = crypto.randomBytes(32).toString('base64url');
    const code_challenge = crypto
        .createHash('sha256')
        .update(code_verifier)
        .digest('base64url');
    return { code_verifier, code_challenge };
}

export function buildAuthUrl(clientId: string, redirectUri: string, state: string, pkce: PKCE): string {
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'offline',
        prompt: 'consent',
        state: state,
        // code_challenge: pkce.code_challenge,
        // code_challenge_method: 'S256',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForToken(
    clientId: string,
    clientSecret: string | undefined,
    redirectUri: string,
    code: string,
    code_verifier: string
): Promise<any> {
    console.log('Exchanging code for token with code:', code);
    const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        client_id: clientId,
        // code_verifier: code_verifier,
    });
    if (clientSecret) {
        params.append('client_secret', clientSecret);
    }
    console.log(params.toString());

    const { data } = await axios.post('https://oauth2.googleapis.com/token', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return data;
}

export async function refreshAccessToken(
    clientId: string,
    clientSecret: string | undefined,
    refreshToken: string
): Promise<any> {
    const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
    });
    if (clientSecret) {
        params.append('client_secret', clientSecret);
    }

    const { data } = await axios.post('https://oauth2.googleapis.com/token', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return data;
}

export async function getUserInfo(accessToken: string): Promise<{ email: string, email_verified: boolean }> {
    console.log('Fetching user info with access token:', accessToken);
    const { data } = await axios.get('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    return data;
}

export async function revokeToken(token: string): Promise<void> {
    await axios.get(`https://oauth2.googleapis.com/revoke?token=${token}`);
}
