import { EditNode, Span } from "provena";
import { CodeRenderer } from "./CodeRenderer";
import * as devalue from 'devalue';
import { GraphRenderer } from "./GraphRenderer";

const renderer = new CodeRenderer('code-container');
const graphRenderer = new GraphRenderer('graph-container');

function loadData(editsString: string) {
    const edits: EditNode[] = devalue.parse(editsString, {
        EditNode: (obj) => {
            const node = new EditNode(obj.range, obj.text, obj.metadata);
            if (obj.outEdges) {
                console.log('OutEdges', obj.outEdges);
                (node as any).outEdges = obj.outEdges;
            }
            if (obj.parents) {
                (node as any).parents = obj.parents;
            }
            return node;
        },
        Span: (obj) => new Span(obj.start, obj.end),
    });
    console.log(edits);
    renderer.render(edits);
    graphRenderer.render(edits);
}

window.onmessage = (event) => {
    console.log(event);
    const type = event.data?.type;
    if (type === 'updateEdits') {
        loadData(event.data.edits);
    }
};

window.onload = () => {
    graphRenderer.init();

    // const defaultData = String.raw`[[1,39,76,91,100,113,123],["EditNode",2],{"range":3,"text":7,"metadata":8,"children":11},["Span",4],{"start":5,"end":6},0,165,"\r\ndef bob_fruit(fruit, fruit_quantity, fruit_cost):\r\n    print(\"Bob bought\", fruit_quantity, fruit + \".\")\r\n    cost = fruit_quantity * fruit_cost * 1.07\r\n    # This ",{"author":9,"startTime":10,"endTime":10},"init",1759782807403,[12,28],["EditNode",13],{"range":14,"text":18,"metadata":8,"children":19},["Span",15],{"start":16,"end":17},171,182,"is an edit ",[20],["EditNode",21],{"range":22,"text":26,"metadata":8,"children":27},["Span",23],{"start":24,"end":25},176,214," this a test is tet a\r\n    return cost",[],["EditNode",29],{"range":30,"text":33,"metadata":34,"children":38},["Span",31],{"start":6,"end":32},179,"this is stome ",{"author":35,"startTime":36,"endTime":37},"user",1759782811701,1759782828756,[12],["EditNode",40],{"range":41,"text":43,"metadata":34,"children":44},["Span",42],{"start":6,"end":17},"this but when... ",[45],["EditNode",46],{"range":47,"text":50,"metadata":34,"children":51},["Span",48],{"start":24,"end":49},177,"n",[52,66],["EditNode",53],{"range":54,"text":57,"metadata":34,"children":58},["Span",55],{"start":24,"end":56},180,"is s",[59],["EditNode",60],{"range":61,"text":64,"metadata":34,"children":65},["Span",62],{"start":63,"end":32},174,"tome ",[12],["EditNode",67],{"range":68,"text":71,"metadata":72,"children":75},["Span",69],{"start":70,"end":24},170,"stuff ",{"author":35,"startTime":73,"endTime":74},1759782816342,1759782817055,[52],["EditNode",77],{"range":78,"text":81,"metadata":8,"children":82},["Span",79],{"start":17,"end":80},186,"this",[83,91],["EditNode",84],{"range":85,"text":89,"metadata":8,"children":90},["Span",86],{"start":87,"end":88},196,229," a test is tet a\r\n    return cost",[],["EditNode",92],{"range":93,"text":95,"metadata":96,"children":99},["Span",94],{"start":80,"end":87}," or is it?",{"author":35,"startTime":97,"endTime":98},1759782829876,1759782830876,[83],["EditNode",101],{"range":102,"text":105,"metadata":8,"children":106},["Span",103],{"start":87,"end":104},207," a test is ",[107,113],["EditNode",108],{"range":109,"text":111,"metadata":8,"children":112},["Span",110],{"start":104,"end":88},"tet a\r\n    return cost",[],["EditNode",114],{"range":115,"text":118,"metadata":119,"children":122},["Span",116],{"start":104,"end":117},218,"this a test",{"author":120,"startTime":121,"endTime":121},"other",1759782833561,[],["EditNode",124],{"range":125,"text":128,"metadata":8,"children":129},["Span",126],{"start":117,"end":127},235,"\r\n    return cost",[]]`;
    const defaultData = String.raw`[[1,22,12],["EditNode",2],{"range":3,"text":7,"metadata":8,"children":11,"parents":32},["Span",4],{"start":5,"end":6},0,433,"# It is recommended that you spend 2 hours outside of class working on homework for every 1 hour spent in class.\r\n# Write a program that asks for a user’s class name.\r\n# Ask the number of hours they are in class every week.\r\n# You will calculate the amount of time they should be spending on\r\n# homework outside of class every week and print it to the user.\r\n\r\nclass_name = input(\"What is the name of your class?\")\r\nhours_per_week = ",{"author":9,"startTime":10,"endTime":10},"init",1759957836531,[12,22],["EditNode",13],{"range":14,"text":18,"metadata":19,"children":20,"parents":21},["Span",15],{"start":16,"end":17},434,675,"float(input(\"How many hours do you spend in \" + class_name + \" class every week?\"))\r\nhomework_time = hours_per_week * 2\r\nprint(\"You should spend an additional\", homework_time, \"hours studying\", class_name, \"every week.\")\r\n\r\nprint(\"Goodbye!\")",{"author":9,"startTime":10,"endTime":10},[],[1,22],["EditNode",23],{"range":24,"text":26,"metadata":27,"children":30,"parents":31},["Span",25],{"start":6,"end":16},"#",{"author":28,"startTime":29,"endTime":29},"user",1759957836609,[12],[1],[]]`;
    const params = new URLSearchParams(window.location.search);
    if (params.has('test')) {
        loadData(defaultData);
    }

    const vscode = acquireVsCodeApi();
    vscode.postMessage({ type: 'webviewLoaded' }, '*');
    console.log('Webview loaded');
};