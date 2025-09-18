import * as vscode from 'vscode';

export type Metadata = {
    author: string;
    startTime: number;
    endTime: number;
}

export type EditRange = {
    range: vscode.Range;
    text: string;
    metadata: Metadata;
}

/**
 * Manages a history of edits with associated metadata from a code file.
 * All edits are non-overlapping and sorted by their start position.
 */
// TODO: All indexOf calls could be replaced with binary search for efficiency
// or a map from range to edit could be maintained
export class EditList {
    private edits = [] as EditRange[];

    // Use binary search to find the edit at a given position
    findEditAt(position: vscode.Position): EditRange | undefined {
        let low = 0;
        let high = this.edits.length - 1;
        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            const edit = this.edits[mid];
            if (edit.range.contains(position)) return edit;
            if (edit.range.end.isBefore(position)) low = mid + 1;
            else high = mid - 1;
        }
        return undefined;
    }

    findEditsInRange(range: vscode.Range): EditRange[] {
        const result: EditRange[] = [];
        let lastBefore = this.findLastEditBefore(range.start);
        let firstAfter = this.findFirstEditAfter(range.end);
        if (firstAfter === -1) firstAfter = this.edits.length;
        for (let i = lastBefore + 1; i < firstAfter; i++) {
            // Ignore edits that abut but do not overlap
            if (this.edits[i].range.start.isAfterOrEqual(range.end) ||
                this.edits[i].range.end.isBeforeOrEqual(range.start)) {
                continue;
            }
            result.push(this.edits[i]);
        }
        return result;
    }

    private findLastEditBefore(position: vscode.Position): number {
        let low = 0;
        let high = this.edits.length - 1;
        let result = -1;
        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            const edit = this.edits[mid];
            if (edit.range.end.isBeforeOrEqual(position)) {
                result = mid;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }
        return result;
    }

    private findFirstEditAfter(position: vscode.Position): number {
        let low = 0;
        let high = this.edits.length - 1;
        let result = this.edits.length;
        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            const edit = this.edits[mid];
            if (edit.range.start.isAfterOrEqual(position)) {
                result = mid;
                high = mid - 1;
            } else {
                low = mid + 1;
            }
        }
        return result;
    }

    addEdit(changeEvent: vscode.TextDocumentContentChangeEvent, metadata: Metadata) {
        const { range, text, rangeLength } = changeEvent;
        const overlappingEdits = this.findEditsInRange(range);
        const containedEdits = [];
        for (const edit of overlappingEdits) {
            const containsStart = edit.range.contains(range.start);
            const containsEnd = edit.range.contains(range.end);
            if (containsStart && containsEnd) {
                // If the edit completely contains the change range, split it into three parts
                // Left part (before), middle part (to be replaced), right part (after)
                const { rightEdit: rest } = this.splitEdit(edit, range.start);
                const { leftEdit: middleEdit } = this.splitEdit(rest, range.end);
                containedEdits.push(middleEdit);
            } else if (containsStart) {
                const { rightEdit } = this.splitEdit(edit, range.start);
                containedEdits.push(rightEdit);
            } else if (containsEnd) {
                const { leftEdit } = this.splitEdit(edit, range.end);
                containedEdits.push(leftEdit);
            } else {
                console.warn('Overlapping edits should be split', edit, range);
            }
        }
        // We don't have to worry about shifting edits that overlap with
        // the change because they will be removed
        // TODO: This definitely doesn't work for multi-line edits, where the text itself
        // might be the only clue about what line things end up on...
        this.shiftEdits(range.end, text.length - rangeLength);

        // TODO: If this is right next to an edit by the same author, edit instead
        // of adding a new one
        // TODO: Same problem here with multi-line edits
        const editRange = new vscode.Range(range.start, range.start.translate(0, text.length));
        const edit: EditRange = { range: editRange, text, metadata };
        const index = this.findLastEditBefore(range.start) + 1;
        console.log('Inserting at', index);
        this.edits.splice(index, 0, edit);

        console.log('Removing edits:', containedEdits.map(e => e.text + `[${rangeToString(e.range)}]`).join(', '));
        // Remove contained edits, which are now superseded by this edit
        for (const containedEdit of containedEdits) {
            const containedIndex = this.edits.indexOf(containedEdit);
            this.edits.splice(containedIndex, 1);

            // Expand the metadata time range to include the contained edit
            edit.metadata.startTime = Math.min(edit.metadata.startTime, containedEdit.metadata.startTime);
            edit.metadata.endTime = Math.max(edit.metadata.endTime, containedEdit.metadata.endTime);
        }

        // TODO: First check if anything was added/deleted
        this.defragment();
    }

    private defragment() {
        for (let i = 0; i < this.edits.length - 1; i++) {
            const current = this.edits[i];
            const next = this.edits[i + 1];
            console.log(`Checking ${rangeToString(current.range)} and ${rangeToString(next.range)}`);
            if (current.range.end.isEqual(next.range.start) &&
                current.metadata.author === next.metadata.author
            ) {
                console.log('Merging edits');
                // Merge next into current
                const mergedEdit: EditRange = {
                    range: new vscode.Range(current.range.start, next.range.end),
                    text: current.text + next.text,
                    metadata: {
                        author: current.metadata.author,
                        startTime: Math.min(current.metadata.startTime, next.metadata.startTime),
                        endTime: Math.max(current.metadata.endTime, next.metadata.endTime)
                    }
                };
                this.edits.splice(i, 2, mergedEdit);
                i--; // Recheck at this index
            }
        }
    }

    private splitEdit(edit: EditRange, splitPosition: vscode.Position) {
        if (splitPosition.isBefore(edit.range.start) || splitPosition.isAfter(edit.range.end)) {
            throw new Error('Invalid split position');
        }

        const leftEdit: EditRange = {
            range: new vscode.Range(edit.range.start, splitPosition),
            text: edit.text.substring(0, edit.range.start.isEqual(edit.range.end) ? 0 : edit.text.length * (splitPosition.character - edit.range.start.character) / (edit.range.end.character - edit.range.start.character)),
            metadata: edit.metadata
        };
        const rightEdit: EditRange = {
            range: new vscode.Range(splitPosition, edit.range.end),
            text: edit.text.substring(edit.range.start.isEqual(edit.range.end) ? 0 : edit.text.length * (edit.range.end.character - splitPosition.character) / (edit.range.end.character - edit.range.start.character)),
            metadata: edit.metadata
        };
        const index = this.edits.indexOf(edit);
        this.edits.splice(index, 1, leftEdit, rightEdit);
        return { leftEdit, rightEdit };
    }

    private shiftEdits(start: vscode.Position, delta: number) {
    }

    toPlainText(): string {
        return this.edits.map(edit => edit.text).join('');
    }

    toString(): string {
        return this.edits.map(edit => {
            return `<[${edit.metadata.author}]"${edit.text}/>`;
        }).join('');
    }
}

export function rangeToString(range: vscode.Range): string {
    return `(${range.start.line},${range.start.character})-(${range.end.line},${range.end.character})`;
}
