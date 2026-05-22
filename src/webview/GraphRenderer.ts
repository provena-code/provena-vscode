import * as d3 from 'd3';
import * as dagreD3 from 'dagre-d3-es';
import { EditNode } from 'provena';

export class GraphRenderer {
    private readonly rootElement: HTMLElement;

    constructor(rootElementId: string) {
        this.rootElement = document.getElementById(rootElementId) as HTMLElement;
    }

    public init() {
        if (!this.rootElement) {
            return;
        }
        // initialize d3 and dagreD3
        d3.select(this.rootElement).append("svg")
            .attr("width", 800)
            .attr("height", 600);
    }

    private findNodes(edit: EditNode, nodes: Map<EditNode, number>) {
        if (nodes.has(edit)) {
            return;
        }
        nodes.set(edit, nodes.size);
        for (const child of edit.getChildren()) {
            this.findNodes(child, nodes);
        }
        return nodes;
    }

    public render(editList: EditNode[]) {
        if (!this.rootElement) {
            return;
        }
        const g = new dagreD3.graphlib.Graph().setGraph({})
            .setDefaultEdgeLabel(function() { return {}; });

        const allNodes: Map<EditNode, number> = new Map();
        for (const edit of editList) {
            this.findNodes(edit, allNodes);
        }

        const maxLabelLength = 15;
        // Add nodes to the graph
        allNodes.forEach((index, edit) => {
            let text = edit.text;
            // escape newlines \n, \r or \r\n as ↪
            text = text.replace(/\r\n/g, '↪').replace(/\n/g, '↪').replace(/\r/g, '↪');
            text = text.replace(/ /g, '·');
            if (text.length > maxLabelLength) {
                const halfLength = Math.floor((maxLabelLength - 3) / 2);
                text = text.substring(0, halfLength) + '...' + text.substring(text.length - halfLength);
            }
            const padding = 5;
            const textSize = measureTextSize(text, "10px 'Courier New'");
            g.setNode(index.toString(), { label: text, width: textSize.width + padding * 2, height: textSize.height + padding * 2 });
            for (const child of edit.getChildren()) {
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
        var svg = d3.select("svg");
        // clear the svg
        svg.selectAll("*").remove();
        var svgGroup = svg.append("g");

        // Run the renderer. This is what draws the final graph.
        render(d3.select("svg g"), g);

        // Center the graph
        svg.attr("height", g.graph().height + 40);
        svg.attr("width", g.graph().width + 40);
        var xCenterOffset = (parseFloat(svg.attr("width")) - g.graph().width) / 2;
        svgGroup.attr("transform", "translate(" + xCenterOffset + ", 20)");
    }
}

/**
 * Measure the pixel width of a single-line text string with a given CSS font style.
 *
 * @param text - The text to measure
 * @param font - A full CSS font string (e.g. "bold 16px Arial")
 * @returns width, height in pixels
 */
function measureTextSize(text: string, font: string): { width: number, height: number } {
    // Create a single offscreen canvas for reuse (faster than creating each time)
    let canvas = document.getElementById("__textMeasuringCanvas") as HTMLCanvasElement;
    if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.id = "__textMeasuringCanvas";
        canvas.style.display = "none";
        document.body.appendChild(canvas);
    }

    const context = canvas.getContext("2d");
    if (!context) {
        throw new Error("2D context not available");
    }

    context.font = font;
    const metrics = context.measureText(text);
    return { width: metrics.width, height: metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent };
}
