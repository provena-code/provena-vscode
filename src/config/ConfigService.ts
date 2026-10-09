import * as vscode from 'vscode';
import { CLASSROOM_SETTING_KEYS, ClassroomConfig, ConfigProblem, isComplete, resolveClassroomConfig } from './classroomConfig';

// Inlined by webpack's DefinePlugin from provena.config.<mode>.json (see
// webpack.config.js). Undefined outside a webpack build (e.g. unit tests).
declare const __PROVENA_BAKED_CONFIG__: Record<string, unknown> | undefined;

export function getBakedConfig(): Record<string, unknown> {
    return typeof __PROVENA_BAKED_CONFIG__ !== 'undefined' ? __PROVENA_BAKED_CONFIG__ : {};
}

export class MissingConfigError extends Error {
    constructor(message = "Provena's classroom configuration is incomplete.") {
        super(message);
        this.name = "MissingConfigError";
    }
}

export class ConfigService {
    private _current: ClassroomConfig;
    private _onDidChange = new vscode.EventEmitter<{ previous: ClassroomConfig, current: ClassroomConfig }>();
    public readonly onDidChange = this._onDidChange.event;

    private lastWarning: string | null = null;

    constructor(context: vscode.ExtensionContext) {
        this._current = this.resolve();
        context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
            if (CLASSROOM_SETTING_KEYS.some(key => e.affectsConfiguration(key))) {
                const previous = this._current;
                this._current = this.resolve();
                this._onDidChange.fire({ previous, current: this._current });
            }
        }));
    }

    public get current(): ClassroomConfig {
        return this._current;
    }

    private resolve(): ClassroomConfig {
        const settings = vscode.workspace.getConfiguration();
        // None of these settings have package.json defaults, so get() is
        // undefined unless someone explicitly set them (workspace or user).
        const local = Object.fromEntries(CLASSROOM_SETTING_KEYS.map(key => [key, settings.get(key)]));
        const config = resolveClassroomConfig(getBakedConfig(), local);
        console.log('Provena classroom config:', {
            serverUrl: config.server?.url,
            authMethod: config.auth?.method,
            problems: config.problems,
        });
        if (config.ignoredOverrides.length > 0) {
            console.warn('Ignoring Provena settings because this build does not allow overrides:', config.ignoredOverrides);
        }
        return config;
    }

    /**
     * Warns the student (once per distinct set of problems, unless `force`)
     * that the classroom config is missing or invalid. The fix is for the
     * instructor, not the student, so the message just says what's wrong and
     * who to tell.
     */
    public showWarningIfMisconfigured(force: boolean = false) {
        const { problems } = this._current;
        if (problems.length === 0) {
            this.lastWarning = null;
            return;
        }
        const message = describeProblems(this._current);
        if (!force && message === this.lastWarning) {
            return;
        }
        this.lastWarning = message;
        vscode.window.showWarningMessage(message);
    }
}

function describeProblems(config: ClassroomConfig): string {
    const list = config.problems
        .map((p: ConfigProblem) => `${p.setting} (${p.reason === 'missing' ? 'not set' : 'invalid'})`)
        .join(', ');
    if (isComplete(config)) {
        return `Some Provena settings in this workspace are invalid, so Provena is using its default settings instead: ${list}. Please let your instructor know.`;
    }
    return `Provena isn't fully configured for this class, so your work can't be synced yet. Please let your instructor know about these settings: ${list}.`;
}
