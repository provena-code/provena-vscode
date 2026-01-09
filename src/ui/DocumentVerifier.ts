import * as vscode from 'vscode';
import { CONFIG_IGNORE_FILE_WARNINGS } from '../constants';
import { isProvenaDisabled } from './SetupManager';

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
    if (uri.scheme !== 'file') {
        // Get just the file associated with it, even if it's, e.g. a notebook cell
        try {
            const simplifiedURI = vscode.Uri.file(uri.path);
            return !vscode.workspace.getWorkspaceFolder(simplifiedURI);
        } catch {
            console.warn(`Unable to simplify URI for workspace check: ${uri.toString()}`);
            return true;
        }
    }
    return !vscode.workspace.getWorkspaceFolder(uri);
}

export function showWarningIfUnableToLog(document: vscode.TextDocument) {
    if (isProvenaDisabled()) {
        return;
    }
    // Only show the warning for files edited directly on disk (and notebook cells)
    if (document.uri.scheme !== 'file' && document.uri.scheme !== 'vscode-notebook-cell') {
        return;
    }
    if (isOutsideOfWorkspace(document)) {
        showWarningIfNeeded(document,
            `The current file "${document.uri.fsPath}" is not part of this workspace, so Provena will not record your work.`
        );
    } else if (isDocumentTooLargeForLogging(document)) {
        showWarningIfNeeded(document,
            `The current file "${document.uri.fsPath}" is too large for Provena to log (over ${MAX_LOGGABLE_CHARS} characters).`
        );
    }
}

function showWarningIfNeeded(document: vscode.TextDocument, warning: string) {
    const ignoredFiles = vscode.workspace.getConfiguration().get(CONFIG_IGNORE_FILE_WARNINGS);
    const isIgnored = Array.isArray(ignoredFiles) && ignoredFiles.includes(document.uri.toString());
    if (isIgnored) {
        return;
    }
    vscode.window.showWarningMessage(
            warning,
            'Ok',
            'Ignore warnings for this file'
        ).then(selection => {
            if (selection === 'Ignore warnings for this file') {
                ignoreWarningsForFile(document);
            }
        });
}

function ignoreWarningsForFile(document: vscode.TextDocument) {
    const config = vscode.workspace.getConfiguration();
    const ignoredFiles = config.get(CONFIG_IGNORE_FILE_WARNINGS) as string[] || [];
    if (!ignoredFiles.includes(document.uri.toString())) {
        ignoredFiles.push(document.uri.toString());
        config.update(CONFIG_IGNORE_FILE_WARNINGS, ignoredFiles, vscode.ConfigurationTarget.Workspace);
    }
}