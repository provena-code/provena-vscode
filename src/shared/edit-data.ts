
export type Metadata = {
    author: string;
    startTime: number;
    endTime: number;
}

export type EditRange = {
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
