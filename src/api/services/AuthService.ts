/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AuthService {
    /**
     * Login
     * Starts a login using whichever backend is configured as active for this
     * server. Neither client needs to know which backend that is.
     *
     * `client_redirect_uri` is where the browser is sent (with a token
     * attached) once login completes -- the VS Code extension's local loopback
     * server, or the web app's own callback route. It must match an entry in
     * auth_config.yaml's redirect_allowlist.
     * @param clientRedirectUri
     * @param clientType
     * @returns any Successful Response
     * @throws ApiError
     */
    public static authLogin(
        clientRedirectUri: string,
        clientType: 'cli' | 'web' = 'web',
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/auth/login',
            query: {
                'client_redirect_uri': clientRedirectUri,
                'client_type': clientType,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Logout
     * Revokes the caller's own token. Logging out elsewhere (e.g. other devices)
     * is unaffected.
     * @param authorization
     * @returns any Successful Response
     * @throws ApiError
     */
    public static authLogout(
        authorization?: (string | null),
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/auth/logout',
            headers: {
                'authorization': authorization,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
