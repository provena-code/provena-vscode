
import * as vscode from 'vscode';
import { EditList } from './edit-list';
import { EventRecorder, FileOutputStream } from './recorder';

type FileData = {
    uri: vscode.Uri;
    editList: EditList;
    eventRecorder: EventRecorder;
};

export class FileDataMap {
    private fileDataMap: Map<string, FileData> = new Map();

    getFileData(fileUri: vscode.Uri, overwrite: boolean): FileData {
        const key = fileUri.toString();
        if (!this.fileDataMap.has(key)) {
            // Probably at some point this should be initialized
            // from elsewhere, e.g. a passed function
            const stream = new EventRecorder(FileOutputStream.nextToFileUri(fileUri, overwrite));
            this.fileDataMap.set(key, {
                uri: fileUri,
                editList: new EditList(),
                eventRecorder: stream,
            });
        }
        return this.fileDataMap.get(key)!;
    }
}