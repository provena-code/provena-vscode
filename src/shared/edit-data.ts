
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
    children: SimplifiedEditNode[];
}

export class EditNode implements EditRange {
    private readonly children: EditNode[] = [];
    private readonly parents: EditNode[] = [];

    constructor(
        public range: Span,
        public text: string,
        public metadata: Metadata
    ) {

    }

    getChildren(): readonly EditNode[] {
        return this.children;
    }

    getParents(): readonly EditNode[] {
        return this.parents;
    }

    addChildren(children: readonly EditNode[]) {
        children.forEach(child => this.addChild(child));
    }

    addChild(child: EditNode) {
        this.children.push(child);
        child.parents.push(this);
    }

    removeConnections() {
        this.parents.forEach(parent => {
            const index = parent.children.indexOf(this);
            if (index !== -1) {
                parent.children.splice(index, 1);
            }
        });
        this.children.forEach(child => {
            const index = child.parents.indexOf(this);
            if (index !== -1) {
                child.parents.splice(index, 1);
            }
        });
        this.parents.length = 0;
        this.children.length = 0;
    }

    shallowCopy(): EditNode {
        const copy = new EditNode(
            this.range.copy(),
            this.text,
            { ...this.metadata }
        );
        copy.children.push(...this.children);
        return copy;
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
            // We matched all of this node, but not the whole query,
            // so continue the search in each of the children
            for (const child of this.children) {
                const match = child.search(query, nQueryIndex, 0);
                if (match) {
                    match.unshift({
                        node: this,
                        range: new Span(startNodeIndex, nNodeIndex - 1)
                    });
                    return match;
                }
            }
        }
        // The query doesn't match this node, so try the children
        for (const child of this.children) {
            const match = child.search(query, queryIndex, 0);
            if (match) {
                return match;
            }
        }
        return null;
    }

    toPrintable(): SimplifiedEditNode {
        return {
            text: this.text,
            children: this.children.map(c => c.toPrintable()),
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
