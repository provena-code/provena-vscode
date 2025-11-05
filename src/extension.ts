// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { EditList } from './edits/EditList';
import { Metadata } from './shared/edit-data';
import { FileDataMap } from './recorder/FileDataMap';
import { EditDisplay } from './display/EditDisplay';
import { Author } from './shared/Author';
import { CopyEvent } from './edits/event-types';
import { EventLogger } from './logging/EventLogger';
import { EventInitiator } from './api';


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {


	EventLogger.configure('http://127.0.0.1:8000/');

	const logger = new EventLogger({
		SubjectID: '123',
		ToolInstances: 'tool123',
		Order: 0,
		CourseID: 'course123',
		CourseSectionID: 'section123',
		TermID: 'term123',
		AssignmentID: 'assignment123',
		ProblemID: 'problem123',
		Attempt: 1,
		ExperimentalCondition: 'condition123',
		TeamID: 'team123',
	});


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
		// TODO: We should really have a sync text event that triggers if ever the
		// text doesn't match
		if (editList.isEmpty()) {
			editList.setInitialText(document.getText(), new Date().getTime());
		} else {
			// TODO: Ensure that last text == new text
		}
		editDisplay.update(editList);
		logger.logFileFocus(document.uri.toString());
	}

	disposables.push(vscode.window.onDidChangeActiveTextEditor(editor => {
		if (editor) {
			switchActiveEditor(editor.document);
		}
	}));

	let lastCopiedText: string | null = null;

	disposables.push(vscode.workspace.onDidChangeTextDocument(async event => {
        console.log(event);

		const { editList, eventRecorder } = fileDataMap.getFileData(event.document.uri);

		switchActiveEditor(event.document);

		const clipboardText = await vscode.env.clipboard.readText();
		if (clipboardText !== lastCopiedText) {
			eventRecorder.recordCopy(clipboardText);
			lastCopiedText = clipboardText;
		}
		eventRecorder.recordDocumentChange(event);
		editDisplay.update(editList);
		// console.log(`Current edits: ${editList.toString()}`);
	}));

	context.subscriptions.push(...disposables);
}

// This method is called when your extension is deactivated
export function deactivate() {}
