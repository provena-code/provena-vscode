
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { EditEvent, FocusDocumentEvent, IChangeEvent, LogEvent } from './event-types';

interface OutputStream {
    write(data: string): void;
    isNewFile: boolean;
}

export class FileOutputStream implements OutputStream {
    private encoder = new TextEncoder();
    readonly isNewFile: boolean;

    constructor(
        private readonly fileUri: vscode.Uri,
        overwrite: boolean
    ) {
        this.isNewFile = overwrite || !fs.existsSync(fileUri.fsPath);
        if (overwrite) {
            try {
                fs.unlinkSync(fileUri.fsPath);
            } catch (err) {
                // File does not exist, no action needed
            }
        }
        fs.mkdirSync(path.dirname(fileUri.fsPath), { recursive: true });

        // const wsedit = new vscode.WorkspaceEdit();
        // // const wsPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath; // gets the path of the first workspace folder
        // // const filePath = vscode.Uri.file(wsPath + '/hello/world.md');
        // // vscode.window.showInformationMessage(filePath.toString());
        // wsedit.createFile(fileUri, { ignoreIfExists: true });
        // vscode.workspace.applyEdit(wsedit);
    }

    write(data: string): void {
        fs.appendFileSync(this.fileUri.fsPath, this.encoder.encode(data));
    }

    static nextToFileUri(fileUri: vscode.Uri, overwrite: boolean): FileOutputStream {
        const nextFileUri = vscode.Uri.file(fileUri.fsPath + '.log');
        return new FileOutputStream(nextFileUri, overwrite);
    }

}


export class EventRecorder {
    private hasInitialized = false;

    constructor(
        private readonly outputStream: OutputStream,
        public readonly alwaysRecordDocumentText = true,
    ) {
        if (this.outputStream.isNewFile) {
            this.outputStream.write('[\n');
        }
    }

    getDocumentData(document: vscode.TextDocument) {
        const text = this.alwaysRecordDocumentText ? document.getText() : undefined;
        return {
            documentText: text,
            documentUri: document.uri.toString(),
            time: new Date().getTime(),
        };
    }

    writeData(eventData: LogEvent) {
        const json = JSON.stringify(eventData);
        this.outputStream.write(json);
        this.outputStream.write(',\n');
    }

    recordDocumentFocused(document: vscode.TextDocument) {
        this.writeData({
            type: 'FocusDocumentEvent',
            ...this.getDocumentData(document),
        } as FocusDocumentEvent);
        this.hasInitialized = true;
    }

    recordDocumentChange(event: vscode.TextDocumentChangeEvent) {
        if (this.outputStream.isNewFile && !this.hasInitialized) {
            this.recordDocumentFocused(event.document);
        }

        const contentChanges: readonly IChangeEvent[] = event.contentChanges;

        // flatten the event to json
        const eventData = {
            type: 'EditEvent',
            ...this.getDocumentData(event.document),
            isUndoOrRedo: event.reason === vscode.TextDocumentChangeReason.Redo ||
                event.reason === vscode.TextDocumentChangeReason.Undo,
            contentChanges,
        } as EditEvent;
        this.writeData(eventData);
    }
}