import { EditNode, EditRange, Span } from "../shared/edit-data";
import { CodeRenderer } from "./CodeRenderer";
import * as devalue from 'devalue';

const renderer = new CodeRenderer('code-container');

window.onmessage = (event) => {
    console.log(event);
    const type = event.data?.type;
    if (type === 'updateEdits') {
        const edits: EditNode[] = devalue.parse(event.data.edits, {
            EditNode: (obj) => {
                const node = new EditNode(obj.range, obj.text, obj.metadata);
                if (obj.children) {
                    node.children.push(...obj.children);
                }
                return node;
            },
            Span: (obj) => new Span(obj.start, obj.end),
        });
        console.log(edits);
        renderer.render(edits);
    }
};