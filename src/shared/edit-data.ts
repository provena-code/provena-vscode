
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

    toPrintable(): SimplifiedEditNode {
        return {
            text: this.text,
            children: this.children.map(c => c.toPrintable()),
        }
    }
}

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
