
import { randomUUID } from 'node:crypto';
import * as vscode from 'vscode';
import { loggingHash } from '../util';

export function generateID(): string {
    return randomUUID();
}


export function getCodeStateSection(uri: vscode.Uri, originalURIScheme: string = uri.scheme): string {

    // TODO: This is a basic patch for notebook cells,
    // but it won't work with the rest of the architecture
    // for various reasons. For now it ensures the logs exist...
    if (uri.scheme !== 'file') {
        try {
            const fileUri = vscode.Uri.file(uri.path);
            let section = getCodeStateSection(fileUri);
            if (uri.fragment && uri.fragment.length > 0) {
                section += `#fragment-${uri.fragment}`;
            }
            return section;
        } catch { }
    }

    const relativePath = vscode.workspace.asRelativePath(uri, false);
    // Files should always have a different relative path than uri.path.
    // I believe for workspace files (which right now should be the only thing)
    // we log, this should always be the case, so we don't even need this if...
    if (uri.scheme === 'file' && relativePath !== uri.path) {
        return relativePath;
    }

    // Otherwise, we risk including the filepath, which may be sensitive,
    // so have to hash it

    const uriString = uri.toString();
    const hash = loggingHash(uriString);
    const result = `hashed-${originalURIScheme}://${hash}`;
    console.warn(`Using hashed code state section for non-file URI: ${result}`);
    return result;
}

export function getStorageRootPath(context: vscode.ExtensionContext): string | undefined {
    return context.storageUri?.fsPath;
}