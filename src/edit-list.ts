import { deprecate } from 'node:util';
import { IChangeEvent } from './recorder-util';
import { EditRange, Span, Metadata, copyEditRange, EditNode, copyMetadata, QueryMatch } from './shared/edit-data';

/**
 * Manages a history of edits with associated metadata from a code file.
 * All edits are non-overlapping and sorted by their start position.
 */
// TODO: All indexOf calls could be replaced with binary search for efficiency
// or a map from range to edit could be maintained
export class EditList {
    private edits = [] as EditNode[];
    private readonly headChildren = [] as EditNode[];

    trace: (...args: any[]) => void = (..._args: any[]) => { };

    getEdits(): readonly EditRange[] {
        return this.edits;
    }

    getHeadChildren(): readonly EditNode[] {
        return this.headChildren;
    }

    query(text: string): QueryMatch | null {
        for (const headChild of this.headChildren) {
            const match = headChild.search(text, 0, 0);
            if (match) {
                return match;
            }
        }
        return null;
    }

    isEmpty(): boolean {
        return this.edits.length === 0;
    }

    // Use binary search to find the edit at a given position
    // This method is a bit confusing, since there could be
    // two edits abutting the position; currently unused
    // findEditAt(position: number): EditNode | undefined {
    //     let low = 0;
    //     let high = this.edits.length - 1;
    //     while (low <= high) {
    //         const mid = Math.floor((low + high) / 2);
    //         const edit = this.edits[mid];
    //         if (edit.range.contains(position)) return edit;
    //         if (edit.range.end < position) low = mid + 1;
    //         else high = mid - 1;
    //     }
    //     return undefined;
    // }

    findEditsWithinRange(range: Span): EditNode[] {
        const result: EditNode[] = [];
        let lastBefore = this.findLastEditBefore(range.start);
        for (let i = lastBefore + 1; i < this.edits.length; i++) {
            // Ignore edits that abut but do not overlap
            if (this.edits[i].range.end <= range.start) {
                continue;
            }
            if (this.edits[i].range.start >= range.end) {
                break;
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
        const child = new EditNode(range, text, metadata);
        this.edits.push(child);
        this.headChildren.push(child);
    }

    addEdit(changeEvent: IChangeEvent, metadata: Metadata) {
        this.trace('Current edits:', this.toStringWithRanges());

        // TODO: What do we do with rangeOffset?
        const { text, rangeLength, rangeOffset } = changeEvent;
        const replacedSpan = new Span(rangeOffset, rangeLength + rangeOffset);
        this.trace(`Adding edit: "${text}" at ${replacedSpan}`);
        const overlappingEdits = this.findEditsWithinRange(replacedSpan);
        const containedEdits = [];
        for (const edit of overlappingEdits) {
            const containsStart = edit.range.containsProperly(replacedSpan.start);
            const containsEnd = edit.range.containsProperly(replacedSpan.end);
            if (containsStart && containsEnd) {
                if (replacedSpan.start === replacedSpan.end) {
                    // If it's a 0-length edit (insertion)
                    // Only need one split, and nothing is contained, since this edit
                    // doesn't replace anything. It just splits existing text in two.
                    this.splitEdit(edit, replacedSpan.start);
                } else {
                    // If the edit completely contains the change range, split it into three parts
                    // Left part (before), middle part (to be replaced), right part (after)
                    const { rightEdit } = this.splitEdit(edit, replacedSpan.start);
                    const { leftEdit } = this.splitEdit(rightEdit, replacedSpan.end);
                    containedEdits.push(leftEdit);
                }
            } else if (containsStart) {
                // If the edit contains only the start of the change range, split off the end
                const { rightEdit } = this.splitEdit(edit, replacedSpan.start);
                containedEdits.push(rightEdit);
            } else if (containsEnd) {
                // If the edit contains only the end of the change range, split off the start
                const { leftEdit } = this.splitEdit(edit, replacedSpan.end);
                containedEdits.push(leftEdit);
            } else if (replacedSpan.start <= edit.range.start && replacedSpan.end >= edit.range.end) {
                // If the span completely contains the edit, just remove it;
                // No need to split it up
                containedEdits.push(edit);
            } else {
                this.trace(`Overlapping edits should be split: contains start ${containsStart}, contains end ${containsEnd}`, edit, replacedSpan);
            }
        }

        this.trace('Removing edits:', containedEdits.map(e => e.text + `${e.range}`).join(', '));

        // Remove contained edits, which are now superseded by this edit
        if (containedEdits.length > 0) {
            let before = this.findLastEditBefore(replacedSpan.start);
            let after = this.findFirstEditAfter(replacedSpan.end);
            if (after === -1) {
                after = this.edits.length;
            }

            if (before !== -1 && after !== this.edits.length) {
                // If there are edits both before and after the removed edits,
                // connect them
                this.edits[before].addChild(this.edits[after]);
            }

            const expectedLength = after - before - 1;
            if (expectedLength !== containedEdits.length) {
                this.trace('Before:', this.toStringWithRanges());
                this.trace(`Finding edits between ${before} and ${after}, expected ${containedEdits.length}, found ${expectedLength}`);
                this.trace('Contained edits:', containedEdits.map(e => e.text + `${e.range}`).join(', '));
                throw new Error('Internal error: mismatch in contained edits');
            }
            this.trace('Removing edits:', containedEdits);
            this.edits.splice(before + 1, expectedLength);
        }

        // We don't have to worry about shifting edits that overlap with
        // the change because they will be removed
        this.shiftEdits(replacedSpan.end, replacedSpan, text);

        this.trace('After splits, shifts and removals:', this.toStringWithRanges());

        if (text.length !== 0) {
            const index = this.findLastEditBefore(replacedSpan.start) + 1;
            const priorEdit = this.edits[index - 1];
            const subsequentEdit = this.edits[index];
            const nPriorEditChildren = priorEdit?.getChildren().length;
            if (priorEdit && priorEdit.metadata.author === metadata.author && priorEdit.range.end === replacedSpan.start &&
                // We only append if this doesn't delete text and it inserts in an existing gap
                replacedSpan.start === replacedSpan.end && overlappingEdits.length === 0
                // // Make sure that we didn't split any edits with this insertion
                // // Any edit with more than 1 child can't be appended to
                // nPriorEditChildren <= 1 &&
                // // If that edit has a child, it should also be active; otherwise we shouldn't add to it
                // (nPriorEditChildren === 0 || this.edits.includes(priorEdit.getChildren()[0]))
            ) {
                // If this edit is immediately after an edit by the same author, merge them
                this.trace('Merging with prior edit', priorEdit, `${priorEdit.text} -> "${priorEdit.text + text}"`);
                priorEdit.range = new Span(priorEdit.range.start, replacedSpan.start + text.length);
                priorEdit.text += text;
                priorEdit.metadata.endTime = metadata.endTime;

                for (const edge of priorEdit.getOutEdges()) {
                    // Only update the active edge
                    if (edge.child === subsequentEdit) {
                        edge.textIndices.push(priorEdit.text.length);
                    }
                }

                // No need to connect to subsequent edit; split would have already done so
            } else {
                // Otherwise, insert a new edit
                this.trace(`Adding edit: "${text}" at ${replacedSpan}`);
                const editRange = new Span(replacedSpan.start, replacedSpan.start + text.length);
                const edit = new EditNode(editRange, text, metadata);
                this.trace('Inserting at', index);
                this.edits.splice(index, 0, edit);

                if (priorEdit && priorEdit.range.end === edit.range.start) {
                    // If this edit is immediately after an edit, connect them
                    this.trace('Connecting to prior edit');
                    priorEdit.addChild(edit);
                }
                if (subsequentEdit && subsequentEdit.range.start === edit.range.end) {
                    // If this edit is immediately before an edit, connect them
                    this.trace('Connecting to subsequent edit');
                    edit.addChild(subsequentEdit);
                }
            }
        }

        // this.defragment();

        if (!this.headChildren.includes(this.edits[0])) {
            this.headChildren.push(this.edits[0]);
        }

        this.trace('Final edits:', this.toStringWithRanges());
    }

    // Not needed, since we append to existing edits, and we don't actually
    // want to heal splits in the graph
    private defragment() {
        for (let i = 0; i < this.edits.length - 1; i++) {
            const current = this.edits[i];
            const next = this.edits[i + 1];
            // this.trace(`Checking ${current.range} and ${next.range}`);
            if (current.range.end === next.range.start &&
                current.metadata.author === next.metadata.author
            ) {
                this.trace('Merging edits');
                // Merge next into current
                const mergedEdit = new EditNode(
                    new Span(current.range.start, next.range.end),
                    current.text + next.text,
                    {
                        author: current.metadata.author,
                        startTime: Math.min(current.metadata.startTime, next.metadata.startTime),
                        endTime: Math.max(current.metadata.endTime, next.metadata.endTime)
                    }
                );
                for (const child of current.getChildren()) {
                    if (child !== next) {
                        mergedEdit.addChild(child);
                    }
                }
                for (const child of next.getChildren()) {
                    mergedEdit.addChild(child);
                }
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

    // TODO: Handle internally: update edges indices on split
    private splitEdit(edit: EditNode, splitPosition: number) {
        if (splitPosition <= edit.range.start || splitPosition >= edit.range.end) {
            throw new Error(`Invalid split position ${edit.range} at ${splitPosition}`);
        }
        this.trace(`Splitting edit ${edit.text} at ${splitPosition}`);

        const leftEdit: EditNode = new EditNode(
            new Span(edit.range.start, splitPosition),
            edit.text.substring(0, splitPosition - edit.range.start),
            copyMetadata(edit.metadata)
        );
        const rightEdit: EditNode = new EditNode(
            new Span(splitPosition, edit.range.end),
            edit.text.substring(splitPosition - edit.range.start),
            copyMetadata(edit.metadata)
        );
        leftEdit.addChild(rightEdit);
        rightEdit.addChildren(edit.getChildren());
        edit.getParents().forEach(parent => {
            parent.addChild(leftEdit);
        });
        edit.removeConnections();
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

    // TODO: Not sure how I want to copy the nodes
    // or if that's even necessary with the new approach
    copy() {
        const newList = new EditList();
        // TODO: Note shallow copy
        newList.edits = this.edits.map(e => e.shallowCopy());
        return newList;
    }
}
