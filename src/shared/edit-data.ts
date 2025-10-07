
export type Metadata = {
    author: string;
    startTime: number;
    endTime: number;
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
    public readonly children: EditNode[] = [];

    constructor(
        public range: Span,
        public text: string,
        public metadata: Metadata
    ) {

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
