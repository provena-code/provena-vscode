
import * as vscode from 'vscode';
import { EditList } from 'provena';
import { EventRecorder, FileOutputStream } from './EventRecorder';
import { EditListBuilder } from 'provena';

type FileData = {
    uri: vscode.Uri;
    editList: EditList;
    eventRecorder: EventRecorder;
    editAttributor: EditListBuilder;
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
            const editListBuilder = new EditListBuilder(editList);
            stream.addEventListener(editListBuilder);
            this.fileDataMap.set(key, {
                uri: fileUri,
                editList,
                eventRecorder: stream,
                editAttributor: new EditListBuilder(editList)
            });
        }
        return this.fileDataMap.get(key)!;
    }
}