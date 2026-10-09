import { describe, expect, it } from 'vitest';
import {
    CONFIG_AUTH_METHOD as METHOD_KEY,
    CONFIG_GOOGLE_CLIENT_ID as ID_KEY,
    CONFIG_GOOGLE_CLIENT_SECRET as SECRET_KEY,
    CONFIG_OVERRIDABLE as OVERRIDABLE_KEY,
    CONFIG_SERVER_URL as URL_KEY,
    GOOGLE_PROVIDER_ID,
    PROVENA_SERVER_PROVIDER_ID,
} from '../constants';
import { CLASSROOM_SETTING_KEYS, isComplete, resolveClassroomConfig } from './classroomConfig';

const BAKED_URL = 'https://baked.example.edu';
const LOCAL_URL = 'https://local.example.edu';

const bakedGoogle = {
    [URL_KEY]: BAKED_URL,
    [METHOD_KEY]: GOOGLE_PROVIDER_ID,
    [ID_KEY]: 'baked-id',
    [SECRET_KEY]: 'baked-secret',
};

describe('setting keys', () => {
    // Instructors put these names in settings.json and the baked config, so
    // renaming one is a breaking change. Pinned literally on purpose.
    it('match the documented setting names', () => {
        expect(CLASSROOM_SETTING_KEYS).toEqual([
            'provena.server.url',
            'provena.auth.method',
            'provena.auth.google.clientId',
            'provena.auth.google.clientSecret',
        ]);
        expect(OVERRIDABLE_KEY).toBe('provena.overridable');
    });
});

describe('resolveClassroomConfig', () => {
    it('uses baked values when there are no local settings', () => {
        const config = resolveClassroomConfig(bakedGoogle, {});
        expect(config.server).toEqual({ url: BAKED_URL });
        expect(config.auth).toEqual({
            method: GOOGLE_PROVIDER_ID,
            google: { clientId: bakedGoogle[ID_KEY], clientSecret: bakedGoogle[SECRET_KEY] },
        });
        expect(config.problems).toEqual([]);
        expect(isComplete(config)).toBe(true);
    });

    it('works with only local settings (no baked defaults)', () => {
        const config = resolveClassroomConfig({}, { [URL_KEY]: LOCAL_URL, [METHOD_KEY]: PROVENA_SERVER_PROVIDER_ID });
        expect(config.server).toEqual({ url: LOCAL_URL });
        expect(config.auth).toEqual({ method: PROVENA_SERVER_PROVIDER_ID });
        expect(config.problems).toEqual([]);
    });

    it('overrides individual keys and keeps other baked values', () => {
        const config = resolveClassroomConfig(bakedGoogle, { [URL_KEY]: LOCAL_URL });
        expect(config.server?.url).toBe(LOCAL_URL);
        expect(config.auth?.method).toBe(GOOGLE_PROVIDER_ID);
        expect(config.problems).toEqual([]);
    });

    it('ignores unused fields for the chosen auth method', () => {
        const config = resolveClassroomConfig(bakedGoogle, { [METHOD_KEY]: PROVENA_SERVER_PROVIDER_ID });
        expect(config.auth).toEqual({ method: PROVENA_SERVER_PROVIDER_ID });
        expect(config.problems).toEqual([]);
    });

    it('treats null and empty strings as unset', () => {
        const config = resolveClassroomConfig(bakedGoogle, { [URL_KEY]: '', [ID_KEY]: null });
        expect(config.server?.url).toBe(BAKED_URL);
        expect(config.auth).toMatchObject({ google: { clientId: bakedGoogle[ID_KEY] } });
        expect(config.problems).toEqual([]);
    });

    it('falls back to the baked section when a local override is invalid, and reports it', () => {
        const config = resolveClassroomConfig(bakedGoogle, {
            [URL_KEY]: 'not a url',
            [METHOD_KEY]: 'carrier-pigeon',
        });
        expect(config.server?.url).toBe(BAKED_URL);
        expect(config.auth?.method).toBe(GOOGLE_PROVIDER_ID);
        expect(isComplete(config)).toBe(true);
        expect(config.problems).toEqual([
            { setting: URL_KEY, reason: 'invalid' },
            { setting: METHOD_KEY, reason: 'invalid' },
        ]);
    });

    it('falls back per section, keeping a valid override in another section', () => {
        const baked = { [URL_KEY]: BAKED_URL, [METHOD_KEY]: PROVENA_SERVER_PROVIDER_ID };
        const config = resolveClassroomConfig(baked, {
            [URL_KEY]: LOCAL_URL,
            [METHOD_KEY]: GOOGLE_PROVIDER_ID, // no client ID/secret anywhere
        });
        expect(config.server?.url).toBe(LOCAL_URL);
        expect(config.auth).toEqual({ method: PROVENA_SERVER_PROVIDER_ID });
        expect(config.problems).toEqual([
            { setting: ID_KEY, reason: 'missing' },
            { setting: SECRET_KEY, reason: 'missing' },
        ]);
    });

    it('reports missing settings when nothing is configured', () => {
        const config = resolveClassroomConfig({}, {});
        expect(config.server).toBeUndefined();
        expect(config.auth).toBeUndefined();
        expect(isComplete(config)).toBe(false);
        expect(config.problems).toEqual([
            { setting: URL_KEY, reason: 'missing' },
            { setting: METHOD_KEY, reason: 'missing' },
        ]);
    });

    it('leaves a section unresolved when an invalid local value has no baked fallback', () => {
        const config = resolveClassroomConfig({ [METHOD_KEY]: PROVENA_SERVER_PROVIDER_ID }, { [URL_KEY]: 'nope' });
        expect(config.server).toBeUndefined();
        expect(config.auth).toEqual({ method: PROVENA_SERVER_PROVIDER_ID });
        expect(config.problems).toEqual([{ setting: URL_KEY, reason: 'invalid' }]);
    });

    it('ignores local settings when the baked config is not overridable', () => {
        const config = resolveClassroomConfig(
            { ...bakedGoogle, [OVERRIDABLE_KEY]: false },
            { [URL_KEY]: LOCAL_URL },
        );
        expect(config.server?.url).toBe(BAKED_URL);
        expect(config.ignoredOverrides).toEqual([URL_KEY]);
        expect(config.problems).toEqual([]);
    });
});
