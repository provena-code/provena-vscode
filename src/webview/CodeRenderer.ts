import { EditNode, EditRange, Metadata } from "../shared/edit-data";

export class CodeRenderer {
    private readonly rootElement: HTMLElement;

    constructor(rootElementId: string) {
        this.rootElement = document.getElementById(rootElementId) as HTMLElement;
    }

    public render(editList: EditNode[]) {
        const htmlParts = editList.map(edit => this.renderEdit(edit));
        this.rootElement.innerHTML = htmlParts.join('');
    }

    private renderEdit(editRange: EditNode) {
        return `<span class="edit-range ${this.getAuthorClass(editRange.metadata.author)}"
        ${this.metadataToHTMLData(editRange.metadata)}>${editRange.text}</span>`;
    }

    private getAuthorClass(author: string) {
        return `author-${author.replace(/\s+/g, '-').toLowerCase()}`;
    }

    private metadataToHTMLData(metadata: Metadata) {
        return `data-author="${metadata.author}" data-start-time="${metadata.startTime}" data-end-time="${metadata.endTime}"`;
    }
}