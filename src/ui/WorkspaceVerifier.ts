import * as vscode from 'vscode';

export function isOutsideOfWorkspace(document: vscode.TextDocument): boolean {
    return isURIOutsideOfWorkspace(document.uri);
}

export function isURIOutsideOfWorkspace(uri: vscode.Uri): boolean {
    return !vscode.workspace.getWorkspaceFolder(uri);
}

export function showWarningIfOutsideWorkspace(document: vscode.TextDocument) {
    if (isOutsideOfWorkspace(document)) {
        vscode.window.showWarningMessage(
            `The current file "${document.uri.fsPath}" is not part of this workspace, so Provena will not record your work.`
        );
    }
}