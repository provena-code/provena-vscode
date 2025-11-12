
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { COPY_EVENT_TYPE, EDIT_EVENT_TYPE, EditEvent, FOCUS_EVENT_TYPE, FocusDocumentEvent, IChangeEvent, LogEvent } from 'provena';
import { EventListener } from 'provena';

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

class EventWriter implements EventListener {
    constructor(private readonly outputStream: OutputStream) {}

    onEvent(event: LogEvent): void {
        const json = JSON.stringify(event);
        this.outputStream.write(json);
        this.outputStream.write(',\n');
    }
}

export function getDocumentTextHash(document: vscode.TextDocument): string {
    const text = document.getText();
    let hash = 0, i, chr;
    if (text.length === 0) {
        return hash.toString();
    }

    for (i = 0; i < text.length; i++) {
        chr = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash.toString();
}

export class EventRecorder {
    private hasInitialized = false;

    private readonly eventListeners: EventListener[] = [];

    constructor(
        private readonly outputStream: OutputStream,
        public readonly alwaysRecordDocumentText = true,
    ) {
        if (this.outputStream.isNewFile) {
            this.outputStream.write('[\n');
        }
        this.eventListeners.push(new EventWriter(outputStream));
    }

    public addEventListener(eventListener: EventListener) {
        this.eventListeners.push(eventListener);
    }

    getEventBaseData() {
        return {
            time: new Date().getTime(),
        };
    }

    getDocumentData(document: vscode.TextDocument) {
        const text = this.alwaysRecordDocumentText ? document.getText() : undefined;
        return {
            ...this.getEventBaseData(),
            documentText: text,
            documentUri: document.uri.toString(),
            documentTextHash: getDocumentTextHash(document),
        };
    }

    recordData(eventData: LogEvent) {
        this.eventListeners.forEach(l => l.onEvent(eventData));
    }

    recordDocumentFocused(document: vscode.TextDocument) {
        this.recordData({
            type: FOCUS_EVENT_TYPE,
            ...this.getDocumentData(document),
        });
        this.hasInitialized = true;
    }

    recordCopy(copiedText: string) {
        this.recordData({
            type: COPY_EVENT_TYPE,
            ...this.getEventBaseData(),
            copiedText,
        });
    }

    recordDocumentChange(event: vscode.TextDocumentChangeEvent) {
        if (this.outputStream.isNewFile && !this.hasInitialized) {
            this.recordDocumentFocused(event.document);
        }

        const contentChanges: readonly IChangeEvent[] = event.contentChanges;

        // flatten the event to json
        const eventData: EditEvent = {
            type: EDIT_EVENT_TYPE,
            ...this.getDocumentData(event.document),
            isUndoOrRedo: event.reason === vscode.TextDocumentChangeReason.Redo ||
                event.reason === vscode.TextDocumentChangeReason.Undo,
            contentChanges,
        };
        this.recordData(eventData);
    }
}