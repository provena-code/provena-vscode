// Classroom (instructor-specified) configuration: where the server lives and
// how students authenticate. Values come from two sources, both using the
// same flat setting keys (e.g. "provena.server.url"):
//   1) baked: provena.config.<mode>.json, inlined at build time (may be empty)
//   2) local: workspace/user settings.json, which override the baked values
//      unless the baked config sets "provena.overridable": false
// This module is pure (no vscode import) so it can be unit tested.
import { z } from 'zod';
import {
    CONFIG_AUTH_METHOD,
    CONFIG_GOOGLE_CLIENT_ID,
    CONFIG_GOOGLE_CLIENT_SECRET,
    CONFIG_OVERRIDABLE,
    CONFIG_SERVER_URL,
    GOOGLE_PROVIDER_ID,
    PROVENA_SERVER_PROVIDER_ID,
} from '../constants';

const ServerConfigSchema = z.object({
    url: z.url(),
});

// Unknown keys are stripped rather than rejected, so e.g. a Google client ID
// left in place while using server auth is fine.
const AuthConfigSchema = z.discriminatedUnion('method', [
    z.object({
        method: z.literal(GOOGLE_PROVIDER_ID),
        google: z.object({
            clientId: z.string().min(1),
            clientSecret: z.string().min(1),
        }),
    }),
    z.object({
        method: z.literal(PROVENA_SERVER_PROVIDER_ID),
    }),
]);

export type ServerConfig = z.infer<typeof ServerConfigSchema>;
export type AuthConfig = z.infer<typeof AuthConfigSchema>;

export type RawSettings = Readonly<Record<string, unknown>>;

/**
 * Each section is resolved (and falls back to baked values) independently,
 * so a bad auth override doesn't also discard a good server URL override.
 * `prefix` + a zod issue path gives the setting key the issue is about.
 */
const SECTIONS = {
    server: {
        prefix: 'provena.server',
        keys: [CONFIG_SERVER_URL],
        schema: ServerConfigSchema,
        build: (v: RawSettings) => ({ url: v[CONFIG_SERVER_URL] }),
    },
    auth: {
        prefix: 'provena.auth',
        keys: [CONFIG_AUTH_METHOD, CONFIG_GOOGLE_CLIENT_ID, CONFIG_GOOGLE_CLIENT_SECRET],
        schema: AuthConfigSchema,
        build: (v: RawSettings) => ({
            method: v[CONFIG_AUTH_METHOD],
            google: {
                clientId: v[CONFIG_GOOGLE_CLIENT_ID],
                clientSecret: v[CONFIG_GOOGLE_CLIENT_SECRET],
            },
        }),
    },
} as const;

type SectionName = keyof typeof SECTIONS;

export const CLASSROOM_SETTING_KEYS: readonly string[] =
    Object.values(SECTIONS).flatMap(section => section.keys);

export interface ConfigProblem {
    setting: string;
    reason: 'missing' | 'invalid';
}

export interface ClassroomConfig {
    /** Undefined if neither the local nor the baked config has a valid value. */
    server?: ServerConfig;
    /** Undefined if neither the local nor the baked config has a valid value. */
    auth?: AuthConfig;
    /**
     * Settings that are missing (from both sources) or invalid (in the merged
     * config). Non-empty doesn't mean the config is unusable: a section with
     * a bad local override still resolves if the baked value is valid.
     */
    problems: ConfigProblem[];
    /** Local settings that were ignored because the baked config isn't overridable. */
    ignoredOverrides: string[];
}

/** Returns true if every section resolved, i.e. Provena can sync and log in. */
export function isComplete(config: ClassroomConfig): boolean {
    return config.server !== undefined && config.auth !== undefined;
}

/** Treats null and "" (e.g. a cleared field in the Settings UI) as unset. */
function pickDefined(values: RawSettings, keys: readonly string[]): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const key of keys) {
        const value = values[key];
        if (value !== undefined && value !== null && value !== '') {
            result[key] = value;
        }
    }
    return result;
}

function parseSection(name: SectionName, values: RawSettings) {
    const section = SECTIONS[name];
    const result = section.schema.safeParse(section.build(values));
    if (result.success) {
        return { data: result.data, problems: [] };
    }
    const problems = result.error.issues.map((issue): ConfigProblem => {
        const setting = issue.path.length > 0
            ? [section.prefix, ...issue.path].join('.')
            : section.keys[0];
        return { setting, reason: values[setting] === undefined ? 'missing' : 'invalid' };
    });
    return { data: undefined, problems };
}

export function resolveClassroomConfig(baked: RawSettings, local: RawSettings): ClassroomConfig {
    const overridable = baked[CONFIG_OVERRIDABLE] !== false;
    const localValues = pickDefined(local, CLASSROOM_SETTING_KEYS);

    const config: ClassroomConfig = {
        problems: [],
        ignoredOverrides: overridable ? [] : Object.keys(localValues),
    };

    for (const name of Object.keys(SECTIONS) as SectionName[]) {
        const { keys } = SECTIONS[name];
        const bakedSection = pickDefined(baked, keys);
        const localSection = overridable ? pickDefined(localValues, keys) : {};

        // Problems are always reported against the merged values, since
        // that's what the instructor actually configured.
        const merged = parseSection(name, { ...bakedSection, ...localSection });
        config.problems.push(...merged.problems);

        let data = merged.data;
        if (!data && Object.keys(localSection).length > 0) {
            // A bad local override shouldn't take down a working baked default.
            data = parseSection(name, bakedSection).data;
        }
        if (name === 'server') {
            config.server = data as ServerConfig | undefined;
        } else {
            config.auth = data as AuthConfig | undefined;
        }
    }

    return config;
}
