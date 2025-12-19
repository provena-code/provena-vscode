import * as vscode from 'vscode';
import { AuthManager } from "../auth/AuthManager";
import { COMMAND_LOGIN, COMMAND_LOGOUT, COMMAND_SET_ACTIVE, COMMAND_SET_INACTIVE, COMMAND_SETUP, CONFIG_PROVENA_ACTIVE } from "../constants";
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

export class SetupManager {
    lastWarningTime: number | null = null;
    authManager!: AuthManager;
    statusBarManager!: StatusBarManager;

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

        disposables.push(vscode.commands.registerCommand(COMMAND_SETUP, () => {
            vscode.commands.executeCommand(
                'workbench.action.openWalkthrough',
                {
                    category: 'hintslab.provena#setup',
                    step: '*',
                    openToSide: true
                }
            );
        }));

        disposables.push(vscode.commands.registerCommand(COMMAND_LOGIN, async () => {
            await authManager.ensureLoggedIn();
            this.showWarningIfNotConfigured();
        }));

        disposables.push(vscode.commands.registerCommand(COMMAND_LOGOUT, async () => {
            await authManager.logout();
            this.showWarningIfNotConfigured();
        }));

        disposables.push(vscode.commands.registerCommand(COMMAND_SET_ACTIVE, () => {
            vscode.window.showInformationMessage("Provena is now active for this workspace.");
            vscode.workspace.getConfiguration().update(CONFIG_PROVENA_ACTIVE, true, vscode.ConfigurationTarget.Workspace);
        }));

        disposables.push(vscode.commands.registerCommand(COMMAND_SET_INACTIVE, () => {
            vscode.window.showInformationMessage("Provena is disabled. To change this setting, ask your instructor.");
            vscode.workspace.getConfiguration().update(CONFIG_PROVENA_ACTIVE, false, vscode.ConfigurationTarget.Workspace);
        }));

        disposables.push(vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration(CONFIG_PROVENA_ACTIVE)) {
                // Still log locally unless explicitly disabled
                singletons.logger.setActive(!isProvenaDisabled());
                this.showWarningIfNotConfigured();
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
        });

        authManager.getCachedIdentity(true).then(identity => {
            console.log(identity);
            logger.logSessionStart();
            logger.logProjectOpen(loggingHash(getStorageRootPath(context) || ''));
            this.showWalkthroughIfNeeded(identity !== null);
        });

        context.subscriptions.push(...disposables);
    }

    isProvenaConfigured(isLoggedIn: boolean): boolean {
        const provenaActive = vscode.workspace.getConfiguration().get(CONFIG_PROVENA_ACTIVE);
        if (provenaActive === false) {
            // We never show the walkthrough if provena is explicitly inactive
            return true;
        }
        return provenaActive !== undefined && isLoggedIn;
    }

    showWarningIfNotConfigured() {
        const isLoggedIn = this.authManager.isLoggedIn;
        if (this.isProvenaConfigured(isLoggedIn)) {
            return;
        }
        const now = new Date().getTime();
        if (this.lastWarningTime && now - this.lastWarningTime < 5 * 1000) {
            // Don't show the warning more than once every 5 seconds
            return;
        }
        this.lastWarningTime = now;

        this.statusBarManager.setState(StatusBarState.NOT_SET_UP);
        vscode.window.showWarningMessage(
            "Warning: You must finish setting up Provena (or disable it) to get credit for your work.",
            "Open Walkthrough"
        ).then(selection => {
            if (selection === "Open Walkthrough") {
                this.showWalkthroughIfNeeded(isLoggedIn);
            }
        });
    }

    showWalkthroughIfNeeded(isLoggedIn: boolean) {
        if (this.isProvenaConfigured(isLoggedIn)) {
            return;
        }
        vscode.commands.executeCommand(COMMAND_SETUP);
    }
}