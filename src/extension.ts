// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { EditList } from './edits/EditList';
import { Metadata } from './shared/edit-data';
import { FileDataMap } from './recorder/FileDataMap';
import { EditDisplay } from './display/EditDisplay';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	const fileDataMap = new FileDataMap(true);
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

	let lastActiveDocument: vscode.TextDocument | undefined = undefined;
	function switchActiveEditor(document: vscode.TextDocument) {
		if (!document || document === lastActiveDocument) {
			return;
		}
		console.log(`Document changed: ${document.uri.toString()}`);
		lastActiveDocument = document;
		const { editList } = fileDataMap.getFileData(document.uri);
		if (editList.isEmpty()) {
			editList.setInitialText(document.getText(), {
				author: 'init',
				startTime: new Date().getTime(),
				endTime: new Date().getTime(),
			});
		} else {
			// TODO: Ensure that last text == new text
		}
		editDisplay.update(editList);
	}

	disposables.push(vscode.window.onDidChangeActiveTextEditor(editor => {
		if (editor) {
			switchActiveEditor(editor.document);
		}
	}));

	disposables.push(vscode.workspace.onDidChangeTextDocument(async event => {
		const { editList, eventRecorder } = fileDataMap.getFileData(event.document.uri);
		eventRecorder.record(event);
		console.log(`Reason: ${event.reason}, count: ${event.contentChanges.length}`);
		let author = 'other';
		const date = new Date().getTime();

		switchActiveEditor(event.document);

		// if (event.reason === vscode.TextDocumentChangeReason.Undo) {
		// 	author = 'user';
		// 	fileDataMap.pushUndo(event.document.uri);
		// 	// Then proceed with the edit (which will be a )
		// } else if (event.reason === vscode.TextDocumentChangeReason.Redo) {

		// }

		const text = await vscode.env.clipboard.readText();
		const isUndoOrRedo =
			event.reason === vscode.TextDocumentChangeReason.Undo ||
			event.reason === vscode.TextDocumentChangeReason.Redo;

		if (isUndoOrRedo) {
			// Shouldn't really be used
			author = 'undo-redo';
		} else {
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
		}
		event.contentChanges.forEach(change => {
			const metadata : Metadata = {
				author,
				startTime: date,
				endTime: date,
			};
			editList.addEdit(change, metadata, isUndoOrRedo);
			// console.log(`Document changed: ${change.text}, range: ${rangeToString(change.range)}, rangeLength: ${change.rangeLength}`);
		});
		editDisplay.update(editList);
		// console.log(`Current edits: ${editList.toString()}`);
	}));

	context.subscriptions.push(...disposables);
}

// This method is called when your extension is deactivated
export function deactivate() {}
