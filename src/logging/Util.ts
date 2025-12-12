
import { randomUUID } from 'node:crypto';
import * as vscode from 'vscode';

export function generateID(): string {
    return randomUUID();
}

export function getCodeStateSecion(uri: vscode.Uri): string {
    return vscode.workspace.asRelativePath(uri);
}

export function getStorageRootPath(context: vscode.ExtensionContext): string | undefined {
    return context.storageUri?.fsPath;
}