
import * as vscode from 'vscode';
import { EditList } from '../edits/EditList';
import { EventRecorder, FileOutputStream } from './EventRecorder';
import { EditAttributor } from '../edits/EditAttributor';

type FileData = {
    uri: vscode.Uri;
    editList: EditList;
    eventRecorder: EventRecorder;
    editAttributor: EditAttributor;
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
            const editList = new EditList();
            this.fileDataMap.set(key, {
                uri: fileUri,
                editList,
                eventRecorder: stream,
                editAttributor: new EditAttributor(editList)
            });
        }
        return this.fileDataMap.get(key)!;
    }
}