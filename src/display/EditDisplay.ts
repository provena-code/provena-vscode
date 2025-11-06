
import * as vscode from 'vscode';
import { EditList, EditNode, Span, toPOJO } from 'provena';
import * as devalue from 'devalue';

export class EditDisplay {

    constructor(
        readonly panel: vscode.WebviewPanel,
        context: vscode.ExtensionContext,
    ) {
        this.panel.webview.html = this.getWebviewContent(this.panel.webview, context.extensionUri);
    }

    public update(editList: EditList) {
        const edits = editList.getEdits();
        const serializedEdits = devalue.stringify(edits, {
            EditNode: (node) => node instanceof EditNode && {
                ...node,
                parents: undefined, // don't serialize parents to avoid cycles
            },
            Span: (span) => span instanceof Span && toPOJO(span),
        });
        this.panel.webview.postMessage({ type: 'updateEdits', edits: serializedEdits });
    }


    private getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri) {
      // Resolve URIs for your bundled assets
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(extensionUri, 'media', 'bundle.js')
        );
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(extensionUri, 'media', 'style.css')
        );

        const nonce = this.getNonce();

        return /*html*/`
            <!DOCTYPE html>
            <html lang="en">
            <head>
            <meta charset="UTF-8">
            <!-- CSP so only your bundle runs -->
            <meta http-equiv="Content-Security-Policy"
                    content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">

            <link href="${styleUri}" rel="stylesheet" />
            <title>Webview</title>
            </head>
            <body>
            <div id="root">
                <div>
                    <pre id="code-container"></pre>
                </div>
                <!-- <div id="graph-container"></div> -->
            </div>
            <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;
    }

    private getNonce() {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 16; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}