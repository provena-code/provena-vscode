import * as vscode from 'vscode';
import { COMMAND_SET_ACTIVE, COMMAND_SYNC } from "../constants";
import { SyncStatus } from "../logging/LogFileService";
import { shouldLogRemotely } from './SetupManager';

export function showProvenaStatus(status: SyncStatus) {

    if (!shouldLogRemotely()) {
        vscode.window.showInformationMessage(`Provena is not active in this workspace.`,
            'Ok',
            'Activate Provena',
        ).then(selection => {
            if (selection === 'Activate Provena') {
                vscode.commands.executeCommand(COMMAND_SET_ACTIVE);
            }
        });
        return;
    }

    const errorsString = 'Errors: ' + status.errors.join('\n');

    if (status.isSynced) {
        vscode.window.showInformationMessage(`Successfully synced Provena! ${status.getSummary()}`);
        return;
    }

    vscode.window.showErrorMessage(`Error syncing Provena! ${status.getSummary()}`,
        'Retry',
        'Copy Error Message',
        'Dismiss'
    ).then((selection) => {
        if (selection === 'Retry') {
            vscode.commands.executeCommand(COMMAND_SYNC);
        } else if (selection === 'Copy Error Message') {
            vscode.env.clipboard.writeText(errorsString);
        }
    });
}