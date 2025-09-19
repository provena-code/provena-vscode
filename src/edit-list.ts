import { IChangeEvent } from './recorder-util';
import { EditRange, Span, Metadata } from './shared/edit-data';

/**
 * Manages a history of edits with associated metadata from a code file.
 * All edits are non-overlapping and sorted by their start position.
 */
// TODO: All indexOf calls could be replaced with binary search for efficiency
// or a map from range to edit could be maintained
export class EditList {
    private edits = [] as EditRange[];

    trace: (...args: any[]) => void = (..._args: any[]) => { };

    getEdits(): readonly EditRange[] {
        return this.edits;
    }

    // Use binary search to find the edit at a given position
    findEditAt(position: number): EditRange | undefined {
        let low = 0;
        let high = this.edits.length - 1;
        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            const edit = this.edits[mid];
            if (edit.range.contains(position)) return edit;
            if (edit.range.end < position) low = mid + 1;
            else high = mid - 1;
        }
        return undefined;
    }

    findEditsInRange(range: Span): EditRange[] {
        const result: EditRange[] = [];
        let lastBefore = this.findLastEditBefore(range.start);
        let firstAfter = this.findFirstEditAfter(range.end);
        if (firstAfter === -1) firstAfter = this.edits.length;
        for (let i = lastBefore + 1; i < firstAfter; i++) {
            // Ignore edits that abut but do not overlap
            if (this.edits[i].range.start >= range.end ||
                this.edits[i].range.end <= range.start) {
                continue;
            }
            result.push(this.edits[i]);
        }
        return result;
    }

    private findLastEditBefore(position: number): number {
        let low = 0;
        let high = this.edits.length - 1;
        let result = -1;
        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            const edit = this.edits[mid];
            if (edit.range.end <= position) {
                result = mid;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }
        return result;
    }

    private findFirstEditAfter(position: number): number {
        let low = 0;
        let high = this.edits.length - 1;
        let result = this.edits.length;
        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            const edit = this.edits[mid];
            if (edit.range.start >= position) {
                result = mid;
                high = mid - 1;
            } else {
                low = mid + 1;
            }
        }
        return result;
    }

    setInitialText(text: string, metadata: Metadata) {
        if (this.edits.length > 0) {
            throw new Error('Initial text can only be set on an empty EditList');
        }
        const range = new Span(0, text.length);
        this.edits.push({ range, text, metadata });
    }

    addEdit(changeEvent: IChangeEvent, metadata: Metadata) {
        this.trace('Current edits:', this.toStringWithRanges());

        // TODO: What do we do with rangeOffset?
        const { text, rangeLength, rangeOffset } = changeEvent;
        const span = new Span(rangeOffset, rangeLength + rangeOffset);
        this.trace(`Adding edit: "${text}" at ${span}`);
        const overlappingEdits = this.findEditsInRange(span);
        const containedEdits = [];
        for (const edit of overlappingEdits) {
            const containsStart = edit.range.contains(span.start);
            const containsEnd = edit.range.contains(span.end);
            // If edits abut but don't overlap meaningfully, skip them
            if (edit.range.end === span.start || edit.range.start === span.end) {
                continue;
            }
            if (containsStart && containsEnd) {
                if (span.start === span.end) {
                    // If it's a 0-length edit (insertion)
                    // Only need one split, and nothing is contained, since this edit
                    // doesn't replace anything. It just splits existing text in two.
                    this.splitEdit(edit, span.start);
                } else if (span.start === edit.range.start && span.end === edit.range.end) {
                    // If the edit exactly matches the change range, just remove it
                    // No need to split it up
                    containedEdits.push(edit);
                } else if (span.start === edit.range.start) {
                    // If the edit starts at the same place as the change range, split off the end
                    const { leftEdit } = this.splitEdit(edit, span.end);
                    containedEdits.push(leftEdit);
                } else if (span.end === edit.range.end) {
                    // If the edit ends at the same place as the change range, split off the start
                    const { rightEdit } = this.splitEdit(edit, span.start);
                    containedEdits.push(rightEdit);
                } else {
                    // If the edit completely contains the change range, split it into three parts
                    // Left part (before), middle part (to be replaced), right part (after)
                    const { rightEdit: rest } = this.splitEdit(edit, span.start);
                    const { leftEdit: middleEdit } = this.splitEdit(rest, span.end);
                    containedEdits.push(middleEdit);
                }
            } else if (containsStart) {
                const { rightEdit } = this.splitEdit(edit, span.start);
                containedEdits.push(rightEdit);
            } else if (containsEnd) {
                const { leftEdit } = this.splitEdit(edit, span.end);
                containedEdits.push(leftEdit);
            } else {
                console.warn('Overlapping edits should be split', edit, span);
            }
        }
        // We don't have to worry about shifting edits that overlap with
        // the change because they will be removed
        // TODO: This definitely doesn't work for multi-line edits, where the text itself
        // might be the only clue about what line things end up on...
        this.shiftEdits(span.end, span, text);

        this.trace('After splits and shifts:', this.toStringWithRanges());
        this.trace('Contained edits:', containedEdits.map(e => e.text + `[${e.range}]`).join(', '));
        this.trace(`Adding edit: "${text}" at ${span}`);

        let edit: EditRange | undefined = undefined;
        if (text.length !== 0) {
            // TODO: If this is right next to an edit by the same author, edit instead
            // of adding a new one
            // TODO: Same problem here with multi-line edits
            const editRange = new Span(span.start, span.start + text.length);
            edit = { range: editRange, text, metadata };
            const index = this.findLastEditBefore(span.start) + 1;
            this.trace('Inserting at', index);
            this.edits.splice(index, 0, edit);
        }

        this.trace('Removing edits:', containedEdits.map(e => e.text + `[${e.range}]`).join(', '));
        // Remove contained edits, which are now superseded by this edit
        for (const containedEdit of containedEdits) {
            const containedIndex = this.edits.indexOf(containedEdit);
            this.edits.splice(containedIndex, 1);

            if (!edit) {
                continue;
            }
            // Expand the metadata time range to include the contained edit
            edit.metadata.startTime = Math.min(edit.metadata.startTime, containedEdit.metadata.startTime);
            edit.metadata.endTime = Math.max(edit.metadata.endTime, containedEdit.metadata.endTime);
        }

        // TODO: First check if anything was added/deleted
        this.defragment();

        this.trace('Final edits:', this.toStringWithRanges());
    }

    private defragment() {
        for (let i = 0; i < this.edits.length - 1; i++) {
            const current = this.edits[i];
            const next = this.edits[i + 1];
            this.trace(`Checking ${current.range} and ${next.range}`);
            if (current.range.end === next.range.start &&
                current.metadata.author === next.metadata.author
            ) {
                this.trace('Merging edits');
                // Merge next into current
                const mergedEdit: EditRange = {
                    range: new Span(current.range.start, next.range.end),
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

    // private getSubstringFromEdit(edit: EditRange, range: vscode.Range): string {
    //     if (!edit.range.contains(range)) {
    //         throw new Error(`Range ${rangeToString(range)} is not contained in edit range ${rangeToString(edit.range)}`);
    //     }
    //     if (edit.range.isEmpty) {
    //         return '';
    //     }
    //     if (range.end.line === edit.range.start.line) {
    //         return edit.text.substring(range.start.character - edit.range.start.character, range.end.character - edit.range.start.character);
    //     }
    //     const lines = edit.text.split('\n');
    //     const rangeLines = lines.slice(range.start.line - edit.range.start.line, range.end.line - edit.range.start.line + 1);
    //     rangeLines[rangeLines.length - 1] = rangeLines[rangeLines.length - 1].substring(0, range.end.character);
    //     rangeLines[0] = rangeLines[0].substring(range.start.character);
    //     return rangeLines.join('\n');
    // }

    private splitEdit(edit: EditRange, splitPosition: number) {
        if (splitPosition <= edit.range.start || splitPosition >= edit.range.end) {
            throw new Error(`Invalid split position ${edit.range} at ${splitPosition}`);
        }

        const leftEdit: EditRange = {
            range: new Span(edit.range.start, splitPosition),
            text: edit.text.substring(0, splitPosition - edit.range.start),
            metadata: edit.metadata
        };
        const rightEdit: EditRange = {
            range: new Span(splitPosition, edit.range.end),
            text: edit.text.substring(splitPosition - edit.range.start),
            metadata: edit.metadata
        };
        const index = this.edits.indexOf(edit);
        this.edits.splice(index, 1, leftEdit, rightEdit);
        return { leftEdit, rightEdit };
    }

    private shiftEdits(start: number, replacedRange: Span, text: string) {
        const delta = text.length - (replacedRange.end - replacedRange.start);
        if (delta === 0) {
            return;
        }
        for (const edit of this.edits) {
            if (edit.range.end <= start) {
                continue;
            }
            edit.range = edit.range.shift(delta);
        }
    }

    toPlainText(): string {
        return this.edits.map(edit => edit.text).join('');
    }

    toStringWithRanges(): string {
        return this.edits.map(edit => {
            return `<[${edit.metadata.author}]${edit.text}${edit.range}/>`;
        }).join('');
    }

    toString(): string {
        return this.edits.map(edit => {
            return `<[${edit.metadata.author}]${edit.text}/>`;
        }).join('');
    }
}
