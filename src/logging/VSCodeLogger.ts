import * as vscode from 'vscode';
import { EditType } from '../api';
import { Singletons } from "../Singletons";
import { EventLogger } from "./EventLogger";
import { getCodeStateSection } from './Util';

export class VSCodeLogger {
    private logger!: EventLogger;

    private lastCopiedText: string = "";
    private documentsCheckedForCopy: vscode.Uri[] = [];

    init(singletons: Singletons) {
        this.logger = singletons.logger;
    }

    public async checkForCopyLogEvent(document: vscode.TextDocument) {

        const copiedText = await vscode.env.clipboard.readText();
        if (this.lastCopiedText === copiedText && this.documentsCheckedForCopy.includes(document.uri)) {
            return;
        }
        if (this.lastCopiedText !== copiedText) {
            this.documentsCheckedForCopy = [];
            this.lastCopiedText = copiedText;
        }
        // TODO: Cut events won't register a copy event, and if we don't check
        // history, they're treated as external pastes if/when they're pasted.
        // It's pretty tricky to find cut events, since I believe the clipboard
        // doesn't always update until after the deletion event is raised, so
        // there's no easy way to say "this is a cut". I've seen this happen in
        // the logs but have't been able to reproduce it.
        this.documentsCheckedForCopy.push(document.uri);
        const index = document.getText().indexOf(copiedText);
        if (index === -1) {
            return;
        }
        this.logger.logFileCopytext(
            copiedText,
            getCodeStateSection(document.uri),
            index.toString(),
        );
    }

    public logFileFocus(document: vscode.TextDocument, addCode: boolean) {
        this.logger.logFileFocus(
            getCodeStateSection(document.uri),
            undefined,
            addCode ? document.getText() : undefined
        );
        this.checkForCopyLogEvent(document);
    }

    // TODO: Sometimes edits seem to appear out of order with other events,
    // and I'm guessing it's b/c they're async, waiting to check the clipboard.
    public async logFileEdit(event: vscode.TextDocumentChangeEvent) {
        // TODO:
        // Sometimes this sequence can happen out of order, where an paste edit event calls this,
        // and while it's awating the clipboard, the document's text is updated with the paste,
        // so that the text is "in" the document, but that's looking "into the future".
        // This creates a problematic fake CodeStateSection/SourceLocation for the copied text.
        // I actually don't think that's an async issue, just that the document
        // text should already be updated to the edit.
        // So the real solution is to exclude the pasted text from the search for the copied text,
        // but I don't know if that should be done by the logger or in post processing...
        await this.checkForCopyLogEvent(event.document);
        const copiedText = this.lastCopiedText;

        const document = event.document;
        const codeStateSection = getCodeStateSection(document.uri);

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

            const thisParentEventID = this.logger.logFileEdit(
                codeStateSection,
                editType,
                undefined,
                undefined,
                change.rangeOffset.toString(),
                change.text,
                undefined,
                change.rangeLength,
                parentEventID
            ).EventID || undefined;

            if (!parentEventID) {
                parentEventID = thisParentEventID;
            }
        });
    }

    public logFileSave(document: vscode.TextDocument, fileContents: string) {
        this.logger.logFileSave(getCodeStateSection(document.uri), fileContents);
        this.checkForCopyLogEvent(document);
    }

    public logFileClose(document: vscode.TextDocument) {
        this.logger.logFileClose(getCodeStateSection(document.uri));
        this.checkForCopyLogEvent(document);
    }

    public logFileOpen(document: vscode.TextDocument) {
        this.logger.logFileOpen(getCodeStateSection(document.uri), document.getText());
        this.checkForCopyLogEvent(document);
    }

    public logFileRename(oldUri: vscode.Uri, newUri: vscode.Uri) {
        this.logger.logFileRename(
            getCodeStateSection(oldUri),
            getCodeStateSection(newUri)
        );
    }

    public logFileCreate(uri: vscode.Uri) {
        this.logger.logFileCreate(getCodeStateSection(uri));
    }

    public logFileDelete(uri: vscode.Uri) {
        this.logger.logFileDelete(getCodeStateSection(uri));
    }
}