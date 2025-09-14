
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

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

export class EventRecorderMap {
    private streamMap: Map<string, EventRecorder> = new Map();

    getRecorder(fileUri: vscode.Uri, overwrite: boolean): EventRecorder {
        const key = fileUri.toString();
        if (!this.streamMap.has(key)) {
            const stream = new EventRecorder(FileOutputStream.nextToFileUri(fileUri, overwrite));
            this.streamMap.set(key, stream);
        }
        return this.streamMap.get(key)!;
    }
}

export type EventLog = {
    contentChanges: readonly vscode.TextDocumentContentChangeEvent[];
    reason: vscode.TextDocumentChangeReason | undefined;
    documentText: string;
    documentUri: vscode.Uri;
    time: number;
};

export class EventRecorder {
    private hasInitialized = false;

    constructor(
        private readonly outputStream: OutputStream
    ) {
        if (this.outputStream.isNewFile) {
            this.outputStream.write('[\n');
        }
    }

    getDocumentData(document: vscode.TextDocument) {
        return {
            documentText: document.getText(),
            documentUri: document.uri,
            time: new Date().getTime(),
        }
    }

    writeData(data: EventLog) {
        const json = JSON.stringify(data);
        this.outputStream.write(json);
        this.outputStream.write(',\n');
    }

    init(document: vscode.TextDocument) {
        this.writeData({
            ...this.getDocumentData(document),
            contentChanges: [],
            reason: undefined,
        } as EventLog);
        this.hasInitialized = true;
    }

    record(event: vscode.TextDocumentChangeEvent) {
        if (this.outputStream.isNewFile && !this.hasInitialized) {
            this.init(event.document);
        }
        // flatten the event to json
        const eventData = { 
            ...event,
            document: undefined,
            ...this.getDocumentData(event.document),
        };
        this.writeData(eventData);
    }
}