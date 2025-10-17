import { IChangeEvent } from "../recorder/EventLog";
import { Author } from "../shared/Author";
import { QueryMatch } from "../shared/edit-data";
import { EditList } from "./EditList";

class CopiedText {
    constructor(public readonly text: string, public readonly match: QueryMatch | null) {}
}

export class EditListBuilder {

    private copiedText: CopiedText | null = null;

    public get lastCopiedText() {
        return this.copiedText?.text;
    }

    constructor(public readonly editList: EditList) {}

    private getAuthor(edits: readonly IChangeEvent[], isUndoOrRedo: boolean): Author {
        if (isUndoOrRedo) {
            // Undo/redo should not create EditNodes, so if they
            // do, something went wrong, and we don't know the author.
            return Author.Unknown;
        }

        if (edits.length > 1) {
            // TODO: Could check if this text already exists
            // or for common actions (e.g. rename)
            return Author.System;
        }

        const edit = edits[0];

        // Let short text edits be from the user, regardless
        // of the source
        if (edit.text.length < 5) {
            return Author.User;
        }

        if (edit.text === this.lastCopiedText) {
            return Author.ExternalPaste;
        }

        return Author.System;
    }

    public addEdits(edits: readonly IChangeEvent[], isUndoOrRedo: boolean, time = new Date().getTime()) {
        if (edits.length === 0) {
            return;
        }

        const author = this.getAuthor(edits, isUndoOrRedo);

        for (const edit of edits) {
            let match: QueryMatch | null = null;
            if (author === Author.ExternalPaste && !isUndoOrRedo && this.copiedText) {
                match = this.copiedText.match;
            }

            const metadata = {
                author,
                startTime: time,
                endTime: time,
            };
            this.editList.addEdit(edit, metadata, isUndoOrRedo, match);
        }

    }

    public setCopiedText(text: string) {
        if (!text || text.length === 0) {
            this.copiedText = null;
            return;
        }
        if (this.copiedText && this.copiedText.text === text) {
            return;
        }
        const currentMatches = this.editList.searchCurrentEdits(text);
        if (currentMatches.length > 0) {
            // TODO: Choose the most generous one
            this.copiedText = new CopiedText(text, currentMatches[0]);
            return;
        }
        const match = this.editList.searchHistory(text);
        this.copiedText = new CopiedText(text, match);
    }

}