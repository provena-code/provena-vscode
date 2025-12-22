import * as vscode from 'vscode';
import { AuthManager } from "../auth/AuthManager";
import { COMMAND_LOGIN, COMMAND_LOGOUT, COMMAND_SET_ACTIVE, COMMAND_SET_INACTIVE, COMMAND_SETUP, COMMAND_SETUP_CATEGORY, CONFIG_PROVENA_ACTIVE } from "../constants";
import { getCodeStateSecion, getStorageRootPath } from "../logging/Util";
import { Singletons } from "../Singletons";
import { loggingHash } from "../util";
import { StatusBarManager, StatusBarState } from './StatusBarManager';

/**
 * Returns true if Provena is _explicitly_ active for this workspace, false otherwise.
 */
export function isProvenaActive(): boolean {
    const provenaActive = vscode.workspace.getConfiguration().get(CONFIG_PROVENA_ACTIVE);
    return provenaActive === true;
}

/**
 * Returns true if Provena is _explicitly_ disabled for this workspace, false otherwise.
 */
export function isProvenaDisabled(): boolean {
    const provenaActive = vscode.workspace.getConfiguration().get(CONFIG_PROVENA_ACTIVE);
    return provenaActive === false;
}

export function shouldLogLocally(): boolean {
    return !isProvenaDisabled();
}

export function shouldLogRemotely(): boolean {
    return isProvenaActive();
}

export class SetupManager {
    lastWarningTime: number | null = null;
    authManager!: AuthManager;
    statusBarManager!: StatusBarManager;

    public readonly onSetupStatusChange = new vscode.EventEmitter<void>();

    constructor() {

    }

    // TODO: Set provena status when setting up UI
    // and enable logging after its set up...
    // and disable it beforehand ://
    init(singletons: Singletons) {
        this.authManager = singletons.authManager;
        this.statusBarManager = singletons.statusBarManager;

        const { context, editDisplay, authManager, logger } = singletons;

        const disposables: vscode.Disposable[] = [];

        this.onSetupStatusChange.event(() => {
            singletons.logger.setActive(!isProvenaDisabled());
            this.showWarningIfNotConfigured();
            if (!this.isProvenaConfigured()) {
                this.statusBarManager.setState(StatusBarState.NOT_SET_UP);
            } else if (isProvenaDisabled()) {
                this.statusBarManager.setState(StatusBarState.DISABLED);
            } else {
                // Since we won't have synced logs yet
                this.statusBarManager.setState(StatusBarState.SYNCING);
            }
        });

        disposables.push(vscode.commands.registerCommand(COMMAND_SETUP, () => {
            vscode.commands.executeCommand(
                'workbench.action.openWalkthrough',
                {
                    category: COMMAND_SETUP_CATEGORY,
                    step: '*',
                    openToSide: true
                }
            );
        }));

        disposables.push(vscode.commands.registerCommand(COMMAND_LOGIN, async () => {
            await authManager.ensureLoggedIn();
        }));

        disposables.push(vscode.commands.registerCommand(COMMAND_LOGOUT, async () => {
            await authManager.logout();
        }));

        disposables.push(vscode.commands.registerCommand(COMMAND_SET_ACTIVE, () => {
            vscode.window.showInformationMessage("Provena is now active for this workspace.");
            vscode.workspace.getConfiguration().update(CONFIG_PROVENA_ACTIVE, true, vscode.ConfigurationTarget.Workspace);
        }));

        disposables.push(vscode.commands.registerCommand(COMMAND_SET_INACTIVE, () => {
            vscode.window.showInformationMessage("Provena is disabled. To change this setting, click 'Provena is disabled' in your status bar.");
            vscode.workspace.getConfiguration().update(CONFIG_PROVENA_ACTIVE, false, vscode.ConfigurationTarget.Workspace);
        }));

        disposables.push(vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration(CONFIG_PROVENA_ACTIVE)) {
                this.onSetupStatusChange.fire();
            }
        }));

        disposables.push(vscode.commands.registerCommand('provena.openAuthorshipView', (documentURI: vscode.Uri) => {
            editDisplay.reveal();
            editDisplay.switchToCodestateSection(getCodeStateSecion(documentURI));
            // if (documentURI) {
            //     console.log(`Opening authorship view for document: ${documentURI.toString()}`);
            //     const document = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === documentURI.toString());
            //     console.log("found document:", document);
            //     if (document && document.) {
            //         vscode.window.showTextDocument(document);
            //     }
            // }
        }));

        disposables.push(vscode.workspace.onDidChangeWorkspaceFolders(event => {
            // Need to reconfigure and verify
            // Does this ever trigger without restarting the plugin?
        }));

        authManager.onAuthChange(e => {
            logger.updateState({ SubjectID: e.identity?.email });
            this.onSetupStatusChange.fire();
        });

        authManager.getCachedIdentity(true).then(identity => {
            console.log(identity);
            logger.logSessionStart();
            logger.logProjectOpen(loggingHash(getStorageRootPath(context) || ''));
            this.showWalkthroughIfNeeded();
        });

        context.subscriptions.push(...disposables);
    }

    isProvenaConfigured(): boolean {
        const isLoggedIn = this.authManager.isLoggedIn;
        const provenaActive = vscode.workspace.getConfiguration().get(CONFIG_PROVENA_ACTIVE);
        if (provenaActive === false) {
            // We never show the walkthrough if provena is explicitly inactive
            return true;
        }
        return provenaActive !== null && isLoggedIn;
    }

    showWarningIfNotConfigured() {
        console.log('checking 1....');
        if (this.isProvenaConfigured()) {
            return;
        }
        console.log('checking 2....');
        const now = new Date().getTime();
        if (this.lastWarningTime && now - this.lastWarningTime < 5 * 1000) {
            // Don't show the warning more than once every 5 seconds
            return;
        }
        this.lastWarningTime = now;

        vscode.window.showWarningMessage(
            "Warning: You must finish setting up Provena (or disable it) to get credit for your work.",
            "Open Walkthrough"
        ).then(selection => {
            if (selection === "Open Walkthrough") {
                this.showWalkthroughIfNeeded();
            }
        });
    }

    showWalkthroughIfNeeded() {
        if (this.isProvenaConfigured()) {
            return;
        }
        vscode.commands.executeCommand(COMMAND_SETUP);
    }
}