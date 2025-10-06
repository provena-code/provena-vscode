import * as dagreD3 from 'dagre-d3-es';
import { EditNode } from '../shared/edit-data';
import * as d3 from 'd3';

export class GraphRenderer {
    private readonly rootElement: HTMLElement;

    constructor(rootElementId: string) {
        this.rootElement = document.getElementById(rootElementId) as HTMLElement;
    }

    private findNodes(edit: EditNode, nodes: Map<EditNode, number>) {
        // TODO: Make more efficient
        if (nodes.has(edit)) {
            return;
        }
        nodes.set(edit, nodes.size);
        for (const child of edit.children) {
            this.findNodes(child, nodes);
        }
        return nodes;
    }

    public render(editList: EditNode[]) {
        const g = new dagreD3.graphlib.Graph().setGraph({})
            .setDefaultEdgeLabel(function() { return {}; });

        const allNodes: Map<EditNode, number> = new Map();
        for (const edit of editList) {
            this.findNodes(edit, allNodes);
        }

        const maxLabelLength = 10;
        // Add nodes to the graph
        allNodes.forEach((index, edit) => {
            let text = edit.text;
            if (text.length > maxLabelLength) {
                text = text.substring(0, maxLabelLength - 3) + '...';
            }
            g.setNode(index.toString(), { label: `${edit.metadata.author}\n${text}`, width: 50, height: 25 });
            for (const child of edit.children) {
                const childIndex = allNodes.get(child);
                if (childIndex !== undefined) {
                    g.setEdge(index.toString(), childIndex.toString());
                } else {
                    console.warn('Child not found in allNodes map', child);
                }
            }
        });

        // Create the renderer
        const render = dagreD3.render();

        // Set up an SVG group so that we can translate the final graph.
        var svg = d3.select("svg"),
            svgGroup = svg.append("g");

        // Run the renderer. This is what draws the final graph.
        render(d3.select("svg g"), g);

        // Center the graph
        var xCenterOffset = (svg.attr("width") - g.graph().width) / 2;
        svgGroup.attr("transform", "translate(" + xCenterOffset + ", 20)");
        svg.attr("height", g.graph().height + 40);
    }
}