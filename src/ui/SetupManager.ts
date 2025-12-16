import * as vscode from 'vscode';
import { AuthManager } from "../auth/AuthManager";
import { COMMAND_LOGIN, COMMAND_SET_ACTIVE, COMMAND_SET_INACTIVE, COMMAND_SETUP, CONFIG_PROVENA_ACTIVE } from "../constants";
import { getStorageRootPath } from "../logging/Util";
import { Singletons } from "../Singletons";
import { loggingHash } from "../util";

export class SetupManager {
    lastWarningTime: number | null = null;
    authManager!: AuthManager;

    constructor() {

    }

    // TODO: Set provena status when setting up UI
    // and enable logging after its set up...
    // and disable it beforehand ://
    init(singletons: Singletons) {
        this.authManager = singletons.authManager;

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

        disposables.push(vscode.commands.registerCommand(COMMAND_LOGIN, () => {
            authManager.ensureLoggedIn();
        }));

        disposables.push(vscode.commands.registerCommand(COMMAND_SET_ACTIVE, () => {
            vscode.window.showInformationMessage("Provena is now active for this workspace.");
            vscode.workspace.getConfiguration().update(CONFIG_PROVENA_ACTIVE, true, vscode.ConfigurationTarget.Workspace);
        }));

        disposables.push(vscode.commands.registerCommand(COMMAND_SET_INACTIVE, () => {
            vscode.window.showInformationMessage("Provena is disabled. To change this setting, ask your instructor.");
            vscode.workspace.getConfiguration().update(CONFIG_PROVENA_ACTIVE, false, vscode.ConfigurationTarget.Workspace);
        }));

        disposables.push(vscode.commands.registerCommand('provena.openAuthorshipView', (documentURI: vscode.Uri) => {
            editDisplay.reveal();
            if (documentURI) {
                console.log(`Opening authorship view for document: ${documentURI.toString()}`);
                const document = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === documentURI.toString());
                console.log("found document:", document);
                if (document) {
                    vscode.window.showTextDocument(document);
                }
            }
        }));

        disposables.push(vscode.workspace.onDidChangeWorkspaceFolders(event => {
            // Need to reconfigure and verify
            // Does this ever trigger without restarting the plugin?
        }));

        authManager.getCachedIdentity(true).then(identity => {
            console.log(identity);
            logger.updateState({ SubjectID: identity?.email });
            logger.logSessionStart();
            logger.logProjectOpen(loggingHash(getStorageRootPath(context) || ''));
            this.showWalkthroughIfNeeded(identity !== null);
        });

        context.subscriptions.push(...disposables);
    }

    isProvenaActive(): boolean {
        const provenaActive = vscode.workspace.getConfiguration().get(CONFIG_PROVENA_ACTIVE);
        return provenaActive === true;
    }

    isProvenaConfigured(isLoggedIn: boolean): boolean {
        const provenaActive = vscode.workspace.getConfiguration().get(CONFIG_PROVENA_ACTIVE);
        if (provenaActive === false) {
            // We never show the walkthrough if provena is explicitly inactive
            return false;
        }
        return provenaActive !== undefined && isLoggedIn;
    }

    showWarningIfNotConfigured(isLoggedIn: boolean) {
        if (this.isProvenaConfigured(isLoggedIn)) {
            return;
        }
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