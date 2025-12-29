import * as vscode from 'vscode';

// ~200 KB
// Theoretical size could be up to ~400 KB due to UTF-8 encoding, but
// most text files will be mostly ASCII so this is a reasonable limit.
const MAX_LOGGABLE_CHARS = 200 * 1024;

export function isDocumentValidForLogging(document: vscode.TextDocument): boolean {
    return !isOutsideOfWorkspace(document) && !isDocumentTooLargeForLogging(document);
}

function isDocumentTooLargeForLogging(document: vscode.TextDocument): boolean {
    return document.getText().length > MAX_LOGGABLE_CHARS;
}

function isOutsideOfWorkspace(document: vscode.TextDocument): boolean {
    return isURIOutsideOfWorkspace(document.uri);
}

export function isURIOutsideOfWorkspace(uri: vscode.Uri): boolean {
    return !vscode.workspace.getWorkspaceFolder(uri);
}

export function showWarningIfUnableToLog(document: vscode.TextDocument) {
    if (isOutsideOfWorkspace(document)) {
        vscode.window.showWarningMessage(
            `The current file "${document.uri.fsPath}" is not part of this workspace, so Provena will not record your work.`
        );
    } else if (isDocumentTooLargeForLogging(document)) {
        vscode.window.showWarningMessage(
            `The current file "${document.uri.fsPath}" is too large for Provena to log (over ${MAX_LOGGABLE_CHARS} characters).`
        );
    }
}