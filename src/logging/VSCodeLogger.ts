import * as vscode from 'vscode';
import { EditType } from '../api';
import { Singletons } from "../Singletons";
import { EventLogger } from "./EventLogger";
import { getCodeStateSecion } from './Util';

export class VSCodeLogger {
    private logger!: EventLogger;
    // private lastCopiedText: string = "";

    init(singletons: Singletons) {
        this.logger = singletons.logger;
    }

    // public async checkForCopyLogEvent() {
    //     vscode.env.clipboard.readText().then((text) => {
    //         if (this.lastCopiedText !== text) {
    //             this.lastCopiedText = text;
    //             this.logger.logCopy
    //         }
    //     }
    // }

    public logFileFocus(document: vscode.TextDocument) {
        this.logger.logFileFocus(getCodeStateSecion(document.uri));
    }

    public async logFileEdit(event: vscode.TextDocumentChangeEvent) {
        const copiedText = await vscode.env.clipboard.readText();
        const documentText = event.document.getText();
        const document = event.document;
        const codeStateSection = getCodeStateSecion(document.uri);

        let editType: EditType | undefined = undefined;
        if (event.reason === vscode.TextDocumentChangeReason.Undo) {
            editType = EditType.UNDO;
        } else if (event.reason === vscode.TextDocumentChangeReason.Redo) {
            editType = EditType.REDO;
        }

        let parentEventID: string | undefined = undefined;

        event.contentChanges.forEach((change) => {
            const isInsertion = change.text.length > 0;
            const isDeletion = change.rangeLength > 0;
            if (!isInsertion && !isDeletion) {
                console.log("Skipping non-edit event", change);
                return;
            }

            if (editType === undefined) {
                if (change.text === copiedText) {
                    editType = EditType.PASTE;
                } else if (isInsertion && isDeletion) {
                    editType = EditType.REPLACE;
                } else if (isInsertion) {
                    editType = EditType.INSERT;
                } else {
                    editType = EditType.DELETE;
                }
            }

            const deletedText = documentText.substring(change.rangeOffset, change.rangeOffset + change.rangeLength);
            console.log(deletedText, change.rangeOffset, change.rangeLength);
            console.log(documentText);
            parentEventID = this.logger.logFileEdit(
                codeStateSection,
                editType,
                undefined,
                undefined,
                change.rangeOffset.toString(),
                change.text,
                undefined,
                change.rangeLength,
                parentEventID
            ).ParentEventID || undefined;
        });
    }

    public logFileSave(document: vscode.TextDocument) {
        this.logger.logFileSave(getCodeStateSecion(document.uri), document.getText());
    }

    public logFileClose(document: vscode.TextDocument) {
        this.logger.logFileClose(getCodeStateSecion(document.uri));
    }

    public logFileOpen(document: vscode.TextDocument) {
        this.logger.logFileOpen(getCodeStateSecion(document.uri), document.getText());
    }
}