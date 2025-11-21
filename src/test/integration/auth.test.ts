
import * as assert from 'assert';
import * as vscode from 'vscode';
import { GoogleProvider } from '../../auth/providers/GoogleProvider';
import { GoogleStoredData, TokenError, NetworkError } from '../../auth/types';
import * as sinon from 'sinon';
import axios from 'axios';
import { extensionContext } from '../../extension';

suite('GoogleProvider Integration Test Suite', () => {
    let provider: GoogleProvider;
    let sandbox: sinon.SinonSandbox;

    suiteSetup(() => {
        // The extension is activated by the test runner, so we can get the context from the extension module.
        provider = new GoogleProvider(extensionContext);
        vscode.workspace.getConfiguration().update('ta-editor.auth.clientId', 'test-client-id', vscode.ConfigurationTarget.Global);
    });

    setup(() => {
        sandbox = sinon.createSandbox();
    });

    teardown(async () => {
        sandbox.restore();
        await extensionContext.secrets.delete('auth.google:payload');
    });

    test('refreshIfNeeded should refresh token if expired', async () => {
        const storedData: GoogleStoredData = {
            providerId: 'google',
            clientId: 'test-client-id',
            refresh_token: 'test-refresh-token',
            email: 'test@example.com',
            verified: true,
            lastVerifiedAt: Date.now() - 10000,
            access_token_expires_at: Date.now() - 5000, // expired
        };
        await extensionContext.secrets.store('auth.google:payload', JSON.stringify(storedData));
        
        const refreshedTokenData = {
            access_token: 'new-access-token',
            expires_in: 3600,
        };
        const axiosStub = sandbox.stub(axios, 'post').resolves({ data: refreshedTokenData });

        const result = await provider.refreshIfNeeded(storedData);

        assert(axiosStub.calledOnce);
        assert.ok(result);
        assert.strictEqual(result.email, 'test@example.com');
        assert.strictEqual(result.verified, true);


        const updatedStoredData = JSON.parse(await extensionContext.secrets.get('auth.google:payload') ?? '{}');
        assert.strictEqual(updatedStoredData.access_token, 'new-access-token');
    });

    test('refreshIfNeeded should throw TokenError on invalid_grant', async () => {
        const storedData: GoogleStoredData = {
            providerId: 'google',
            clientId: 'test-client-id',
            refresh_token: 'test-refresh-token',
            email: 'test@example.com',
            verified: true,
            lastVerifiedAt: Date.now() - 10000,
            access_token_expires_at: Date.now() - 5000, // expired
        };
        await extensionContext.secrets.store('auth.google:payload', JSON.stringify(storedData));
        
        const error = { isAxiosError: true, response: { data: { error: 'invalid_grant' } } };
        sandbox.stub(axios, 'post').rejects(error);

        await assert.rejects(provider.refreshIfNeeded(storedData), TokenError);

        const deletedStoredData = await extensionContext.secrets.get('auth.google:payload');
        assert.strictEqual(deletedStoredData, undefined);
    });

    test('refreshIfNeeded should throw NetworkError on other axios errors', async () => {
        const storedData: GoogleStoredData = {
            providerId: 'google',
            clientId: 'test-client-id',
            refresh_token: 'test-refresh-token',
            email: 'test@example.com',
            verified: true,
            lastVerifiedAt: Date.now() - 10000,
            access_token_expires_at: Date.now() - 5000, // expired
        };
        await extensionContext.secrets.store('auth.google:payload', JSON.stringify(storedData));
        
        const error = { isAxiosError: true, response: { data: { error: 'some_other_error' } } };
        sandbox.stub(axios, 'post').rejects(error);

        await assert.rejects(provider.refreshIfNeeded(storedData), NetworkError);
    });

    test('refreshIfNeeded should not refresh token if not expired', async () => {
        const storedData: GoogleStoredData = {
            providerId: 'google',
            clientId: 'test-client-id',
            refresh_token: 'test-refresh-token',
            email: 'test@example.com',
            verified: true,
            lastVerifiedAt: Date.now() - 10000,
            access_token_expires_at: Date.now() + 60 * 60 * 1000, // not expired
        };
        await extensionContext.secrets.store('auth.google:payload', JSON.stringify(storedData));
        
        const axiosStub = sandbox.stub(axios, 'post');

        const result = await provider.refreshIfNeeded(storedData);

        assert(axiosStub.notCalled);
        assert.ok(result);
        assert.strictEqual(result.email, storedData.email);
        assert.strictEqual(result.verified, storedData.verified);
    });
});
