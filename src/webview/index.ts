import { EditRange } from "../shared/edit-data";
import { CodeRenderer } from "./CodeRenderer";

const renderer = new CodeRenderer('code-container');

window.onmessage = (event) => {
    console.log(event);
    const type = event.data?.type;
    if (type === 'updateEdits') {
        const { edits }: { edits: EditRange[] } = event.data;
        renderer.render(edits);
    }
};