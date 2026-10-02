
import * as http from 'http';
import { URL } from 'url';
import * as vscode from 'vscode';
import { AuthCancelledError } from '../auth/types';

export interface LoopbackLoginResult<T> {
    data: T;
    redirectUri: string;
}

export interface LoopbackLoginOptions<T> {
    /** Builds the URL to open in the browser, given this attempt's redirect URI. */
    buildAuthUrl: (redirectUri: string) => string;
    /** Parses the callback request's URL into the desired result, or throws to reject the login. */
    parseCallback: (url: URL) => T;
    timeoutMs?: number;
}

/**
 * Starts a loopback HTTP server on 127.0.0.1, opens `buildAuthUrl(redirectUri)`
 * in the user's browser, and waits for the single callback request that
 * completes the login. Shared by every provider that does a browser-based
 * login (Google, the Provena server, ...).
 */
export function runLoopbackLogin<T>(options: LoopbackLoginOptions<T>): Promise<LoopbackLoginResult<T>> {
    const { buildAuthUrl, parseCallback, timeoutMs = 5 * 60 * 1000 } = options;
    const server = http.createServer();

    return new Promise<LoopbackLoginResult<T>>((resolve, reject) => {
        let redirectUri: string;
        let timer: NodeJS.Timeout;

        server.listen(0, '127.0.0.1', () => {
            const port = (server.address() as any).port;
            redirectUri = `http://127.0.0.1:${port}/callback`;
            try {
                const authUrl = buildAuthUrl(redirectUri);
                vscode.env.openExternal(vscode.Uri.parse(authUrl));
            } catch (e) {
                clearTimeout(timer);
                server.close();
                reject(e instanceof Error ? e : new Error(String(e)));
            }
        });

        timer = setTimeout(() => {
            server.close();
            reject(new AuthCancelledError('Login timed out.'));
        }, timeoutMs);

        server.on('request', (req, res) => {
            const url = new URL(req.url!, `http://${req.headers.host}`);
            try {
                const data = parseCallback(url);
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('Authentication successful! You can close this window.');
                clearTimeout(timer);
                server.close();
                resolve({ data, redirectUri });
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Authentication failed. Please try again.';
                res.writeHead(400, { 'Content-Type': 'text/plain' });
                res.end(message);
                clearTimeout(timer);
                server.close();
                reject(err);
            }
        });

        server.on('error', (err) => {
            clearTimeout(timer);
            reject(err);
        });
    });
}
