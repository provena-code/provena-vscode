// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { EditList, Metadata } from './edit-list';
import { EventRecorderMap } from './recorder';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	const editList = new EditList();
	const recorderMap = new EventRecorderMap();

	console.log('start!');
	const disposable = vscode.workspace.onDidChangeTextDocument(event => {
		recorderMap.getRecorder(event.document.uri, false).record(event);
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
		console.log(`Current edits: ${editList.toString()}`);
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
