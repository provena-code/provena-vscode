import * as vscode from 'vscode';
import { COMMAND_SYNC } from "../constants";
import { SyncStatus } from "../logging/LogFileService";

export function showProvenaStatus(status: SyncStatus) {
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