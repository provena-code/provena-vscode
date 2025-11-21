// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { FileDataMap } from './recorder/FileDataMap';
import { EditDisplay } from './display/EditDisplay';
import { EventLogger } from './logging/EventLogger';
import { initializeAuth, ensureLoggedIn, getVerifiedGoogleEmail } from './auth';
import { NoStoredIdentityError } from './auth/types';


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	initializeAuth(context);

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

	disposables.push(vscode.commands.registerCommand('ta-editor.login', () => {
		ensureLoggedIn();
	}));

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
		lastActiveDocument = document;
		console.log(`Document changed: ${document.uri.toString()}`);

		// If the document is not in a workspace, ignore it
		if (!vscode.workspace.getWorkspaceFolder(document.uri)) {
			return;
		}

		const { editList } = fileDataMap.getFileData(document.uri);
		// TODO: We should really have a sync text event that triggers if ever the
		// text doesn't match
		if (editList.isEmpty()) {
			editList.setInitialText(document.getText(), new Date().getTime());
		} else {
			// TODO: Ensure that last text == new text
		}
		editDisplay.update(editList);
		// logger.logFileFocus(document.uri.toString());
	}

	disposables.push(vscode.window.onDidChangeActiveTextEditor(editor => {
		if (editor) {
			switchActiveEditor(editor.document);
		}
	}));

	let lastCopiedText: string | null = null;

	disposables.push(vscode.workspace.onDidChangeTextDocument(async event => {
        console.log(event);

		switchActiveEditor(event.document);
		if (!vscode.workspace.getWorkspaceFolder(event.document.uri)) {
			return;
		}

		const { editList, eventRecorder } = fileDataMap.getFileData(event.document.uri);

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

	// Example of how to use getVerifiedGoogleEmail
	// This will also trigger the login prompt on first use if configured
	getVerifiedGoogleEmail().then(identity => {
		console.log(`Logged in as ${identity.email} (verified: ${identity.verified})`);
	}).catch(err => {
		if (err instanceof NoStoredIdentityError) {
			console.log("User is not logged in and cancelled login prompt.");
		} else {
			console.error("An error occurred during authentication:", err);
		}
	});
}

// This method is called when your extension is deactivated
export function deactivate() {}
