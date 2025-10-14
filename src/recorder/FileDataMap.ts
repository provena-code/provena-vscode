
import * as vscode from 'vscode';
import { EditList } from '../edits/EditList';
import { EventRecorder, FileOutputStream } from './EventRecorder';

type FileData = {
    uri: vscode.Uri;
    editList: EditList;
    eventRecorder: EventRecorder;
    undoStack: EditList[];
};

export class FileDataMap {
    private fileDataMap: Map<string, FileData> = new Map();

    constructor(public readonly overwrite: boolean) { }

    getFileData(fileUri: vscode.Uri): FileData {
        const key = fileUri.toString();
        if (!this.fileDataMap.has(key)) {
            // Probably at some point this should be initialized
            // from elsewhere, e.g. a passed function
            const stream = new EventRecorder(FileOutputStream.nextToFileUri(fileUri, this.overwrite));
            this.fileDataMap.set(key, {
                uri: fileUri,
                editList: new EditList(),
                eventRecorder: stream,
                undoStack: [],
            });
        }
        return this.fileDataMap.get(key)!;
    }

    pushUndo(fileUri: vscode.Uri) {
        const data = this.getFileData(fileUri);
        data.undoStack.push(data.editList.copy());
    }

    popUndo(fileUri: vscode.Uri): EditList | undefined {
        const data = this.getFileData(fileUri);
        return data.undoStack.pop();
    }
}