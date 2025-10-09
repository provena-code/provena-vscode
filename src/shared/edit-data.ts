
export type Metadata = {
    author: string;
    startTime: number;
    endTime: number;
}

export function copyMetadata(metadata: Metadata): Metadata {
    // May be more complex at some point
    return { ...metadata };
}

export interface EditRange {
    range: Span;
    text: string;
    metadata: Metadata;
}

export function copyEditRange(edit: EditRange): EditRange {
    return {
        range: edit.range.copy(),
        text: edit.text,
        metadata: { ...edit.metadata }
    };
}

export function toPOJO(obj: any): any {
    return Object.assign({}, obj);
}

type SimplifiedEditNode = {
    text: string;
    children: { textIndices: number[]; child: SimplifiedEditNode }[];
}

type EditEdge = {
    /**
     * The lengths of the parent node's text after which the child node could come.
     * For example, if the parent is "Hello", and the indices are [2, 3, 4], then this edge represents
     * edges from "He", "Hel", and "Hell" to the child node.
     */
    textIndices: number[];
    child: EditNode;
}

export class EditNode implements EditRange {
    private readonly outEdges: EditEdge[] = [];
    private readonly parents: EditNode[] = [];

    constructor(
        public range: Span,
        public text: string,
        public metadata: Metadata
    ) {

    }

    getChildren(): readonly EditNode[] {
        return this.outEdges.map(edge => edge.child);
    }

    getOutEdges(): readonly EditEdge[] {
        return this.outEdges;
    }

    getParents(): readonly EditNode[] {
        return this.parents;
    }

    addChildren(children: readonly EditNode[]) {
        children.forEach(child => this.addChild(child));
    }

    addChild(child: EditNode) {
        this.outEdges.push({
            textIndices: [this.text.length],
            child
        });
        child.parents.push(this);
    }

    removeChild(child: EditNode, removeFromParents = true) {
        const edgeIndex = this.outEdges.findIndex(edge => edge.child === child);
        if (edgeIndex !== -1) {
            this.outEdges.splice(edgeIndex, 1);
            if (removeFromParents) {
                const parentIndex = child.parents.indexOf(this);
                if (parentIndex !== -1) {
                    child.parents.splice(parentIndex, 1);
                }
            }
        }
    }

    removeConnections() {
        this.parents.forEach(parent => {
            parent.removeChild(this, false);
        });
        this.outEdges.forEach(edge => {
            const index = edge.child.parents.indexOf(this);
            if (index !== -1) {
                edge.child.parents.splice(index, 1);
            }
        });
        this.parents.length = 0;
        this.outEdges.length = 0;
    }

    splitAndRemove(splitPosition: number): { leftEdit: EditNode; rightEdit: EditNode } {
        if (splitPosition <= this.range.start || splitPosition >= this.range.end) {
            throw new Error(`Invalid split position ${this.range} at ${splitPosition}`);
        }

        const leftEdit: EditNode = new EditNode(
            new Span(this.range.start, splitPosition),
            this.text.substring(0, splitPosition - this.range.start),
            copyMetadata(this.metadata)
        );
        const rightEdit: EditNode = new EditNode(
            new Span(splitPosition, this.range.end),
            this.text.substring(splitPosition - this.range.start),
            copyMetadata(this.metadata)
        );

        rightEdit.addChildren(this.getChildren());
        for (const edge of this.getOutEdges()) {
            const leftIndices = edge.textIndices.filter(index => index <= leftEdit.text.length);
            const rightIndices = edge.textIndices.filter(index => index > leftEdit.text.length)
                .map(index => index - leftEdit.text.length);
            if (leftIndices.length > 0) {
                leftEdit.outEdges.push({ textIndices: leftIndices, child: edge.child });
            }
            if (rightIndices.length > 0) {
                rightEdit.outEdges.push({ textIndices: rightIndices, child: edge.child });
            }
        }
        leftEdit.addChild(rightEdit);

        this.getParents().forEach(parent => {
            parent.addChild(leftEdit);
        });

        this.removeConnections();

        return { leftEdit, rightEdit };
    }

    shallowCopy(): EditNode {
        const copy = new EditNode(
            this.range.copy(),
            this.text,
            { ...this.metadata }
        );
        copy.outEdges.push(...this.outEdges);
        return copy;
    }

    private searchEdges(query: string, nQueryIndex: number, nNodeIndex: number, startNodeIndex: number): QueryMatch | null {
        // We matched all of this node, but not the whole query,
        // so continue the search in each of the children
        for (const edge of this.outEdges) {
            if (!edge.textIndices.includes(nNodeIndex)) {
                continue;
            }
            const match = edge.child.search(query, nQueryIndex, 0);
            if (match) {
                match.unshift({
                    node: this,
                    range: new Span(startNodeIndex, nNodeIndex - 1)
                });
                return match;
            }
        }
        return null;
    }

    search(query: string, queryIndex: number, nodeIndex: number): QueryMatch | null {
        if (query.length === 0) {
            throw new Error('Query cannot be empty');
        }
        for (; nodeIndex < this.text.length; nodeIndex++) {
            let nQueryIndex = queryIndex;
            let nNodeIndex = nodeIndex;
            const startNodeIndex = nNodeIndex;
            // TODO: In theory could use rabin-karp hasing or similar to speed this up
            // TODO: Will ultimately stop early when we use indexing within the parent
            while (nQueryIndex < query.length && nNodeIndex < this.text.length
                && query.charAt(nQueryIndex) === this.text.charAt(nNodeIndex)) {
                nQueryIndex++;
                nNodeIndex++;

                // If we're ready to break out of the loop, skip checking children
                if (nQueryIndex < query.length && nNodeIndex < this.text.length) {
                    const match = this.searchEdges(query, nQueryIndex, nNodeIndex, startNodeIndex);
                    if (match) {
                        return match;
                    }
                }
            }
            // We've matched the entire query, so we have a match!
            if (nQueryIndex === query.length) {
                return [{
                    node: this,
                    range: new Span(startNodeIndex, Math.min(nNodeIndex - 1, this.text.length - 1))
                }];
            }
            // We didn't find a full match starting at this index
            if (nNodeIndex < this.text.length) {
                continue;
            }

            const match = this.searchEdges(query, nQueryIndex, nNodeIndex, startNodeIndex);
            if (match) {
                return match;
            }
        }
        // The query doesn't match this node, so try the children
        for (const edge of this.outEdges) {
            const match = edge.child.search(query, queryIndex, 0);
            if (match) {
                return match;
            }
        }
        return null;
    }

    toPrintable(): SimplifiedEditNode {
        return {
            text: this.text,
            children: this.outEdges.map(c => ({ textIndices: c.textIndices, child: c.child.toPrintable() })),
        };
    }
}

export type QueryMatch = {
    node: EditNode;
    range: Span;
}[];

export class Span {
    constructor(public readonly start: number, public readonly end: number) {
        if (start > end) {
            throw new Error(`Invalid span: start ${start} > end ${end}`);
        }
    }

    contains(position: number) {
        return position >= this.start && position <= this.end;
    }

    containsProperly(position: number) {
        return position > this.start && position < this.end;
    }

    shift(delta: number): Span {
        return new Span(this.start + delta, this.end + delta);
    }

    toString() {
        return `[${this.start}, ${this.end}]`;
    }

    copy() {
        return new Span(this.start, this.end);
    }
}
