
import * as vscode from 'vscode';
import { EditList, EditNode, Span, toPOJO } from 'provena';
import * as devalue from 'devalue';

export class EditDisplay {

    private panel: vscode.WebviewPanel | undefined;
    private isWebviewLoaded: boolean = false;
    private onLoadedCallback: (() => void) | null = null;

    constructor(
        private readonly context: vscode.ExtensionContext,
    ) {
    }

    private createNewPanel(context: vscode.ExtensionContext) {
        const panel = vscode.window.createWebviewPanel(
            'ta-display', // internal identifier
            'Authorship', // title shown to user
            vscode.ViewColumn.Two, // editor column to show
            {
                enableScripts: true, // allow JS in the webview
            }
        );
        this.setWebviewContent(
            panel.webview, this.context.extensionUri
        );
        panel.onDidDispose(() => {
            this.panel = undefined;
        });

        // Currently not used; keeping in case it becomes needed
        // Seems like messages can be posted before it loads...
        this.isWebviewLoaded = false;
        this.onLoadedCallback = null;
        // TODO: Need to add a postMessage when the webview is loaded
        // so we don't try to post messages before it's ready
        panel.webview.onDidReceiveMessage(message => {
            console.log('Received message from webview:', message);
            if (message.type === 'webviewLoaded') {
                this.onLoadedCallback?.();
                this.isWebviewLoaded = true;
                this.onLoadedCallback = null;
            }
        });
        return panel;
    }

    public reveal(preserveFocus: boolean = false) {
        if (!this.panel) {
            this.panel = this.createNewPanel(this.context);
        }
        if (!this.panel.visible) {
            this.panel.reveal(undefined, preserveFocus);
        }
    }

    public update(editList: EditList) {
        if (!this.panel) {
            return;
        }
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


    private setWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri) {
      // Resolve URIs for your bundled assets
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(extensionUri, 'media', 'bundle.js')
        );
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(extensionUri, 'media', 'style.css')
        );

        const nonce = this.getNonce();

        const content = /*html*/`
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
        webview.html = content;
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