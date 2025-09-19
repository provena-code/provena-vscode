// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { EditList } from './edit-list';
import { Metadata } from './shared/edit-data';
import { FileDataMap } from './files';
import { EditDisplay } from './edit-display';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	const fileDataMap = new FileDataMap();
	const disposables = [];

	const panel = vscode.window.createWebviewPanel(
		'ta-display', // internal identifier
		'Authorship', // title shown to user
		vscode.ViewColumn.Two, // editor column to show
		{
			enableScripts: true, // allow JS in the webview
		}
	);
	const editDisplay = new EditDisplay(panel, context);
	disposables.push(panel);

	console.log('start!');


	disposables.push(vscode.window.onDidChangeActiveTextEditor(editor => {
		if (!editor) {
			return;
		}
		console.log(`Document changed: ${editor.document.uri.toString()}`);
		const { editList } = fileDataMap.getFileData(editor.document.uri, true);
		if (editList.isEmpty()) {
			editList.setInitialText(editor.document.getText(), {
				author: 'init',
				startTime: new Date().getTime(),
				endTime: new Date().getTime(),
			});
		} else {
			// TODO: Ensure that last text == new text
		}
		editDisplay.update(editList);
	}));

	disposables.push(vscode.workspace.onDidChangeTextDocument(event => {
		const { editList, eventRecorder } = fileDataMap.getFileData(event.document.uri, true);
		eventRecorder.record(event);
		console.log(`Reason: ${event.reason}, count: ${event.contentChanges.length}`);
		let author = 'other';
		const date = new Date().getTime();
		if (event.reason === undefined) {
			if (event.contentChanges.length === 1) {
				if (event.contentChanges[0].text.length <= 3) {
					author = 'user';
				}
				// const clipboardText = vscode.env.clipboard.readText();
				// const editText = event.contentChanges[0].text;
				// clipboardText.then(text => {
				// 	// console.log(`Clipboard text: ${text}, Edit text: ${editText}`);
				// 	if (text === editText) {
				// 		// console.log('Pasting from clipboard');
				// 	}
				// });
			}
		} else {
			// TODO: Handle undo/redo properly
		}
		event.contentChanges.forEach(change => {
			const metadata : Metadata = {
				author,
				startTime: date,
				endTime: date,
			};
			editList.addEdit(change, metadata);
			// console.log(`Document changed: ${change.text}, range: ${rangeToString(change.range)}, rangeLength: ${change.rangeLength}`);
		});
		editDisplay.update(editList);
		// console.log(`Current edits: ${editList.toString()}`);
	}));

	context.subscriptions.push(...disposables);
}

// This method is called when your extension is deactivated
export function deactivate() {}
