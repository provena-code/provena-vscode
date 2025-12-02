// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { ensureLoggedIn, getCachedIdentity, initializeAuth, onAuthChange } from './auth';
import { CONFIG_PROVENA_ACTIVE, CONTEXT_IS_LOGGED_IN, CONTEXT_USERNAME } from './constants';
import { EditDisplay } from './display/EditDisplay';
import { EventLogger } from './logging/EventLogger';
import { FileDataMap } from './recorder/FileDataMap';
import { EditList } from 'provena';


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log('start!');

	initializeAuth(context);

	let isLoggedIn = false;

	onAuthChange()(({ providerId, identity }) => {
		console.log(`Auth change for provider ${providerId}:`, identity);
		isLoggedIn = identity !== null;
		vscode.commands.executeCommand('setContext', CONTEXT_IS_LOGGED_IN, identity !== null);
		vscode.commands.executeCommand('setContext', CONTEXT_USERNAME, identity ? identity.email : undefined);
	});

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

	disposables.push(vscode.commands.registerCommand('provena.login', () => {
		ensureLoggedIn();
	}));

	const editDisplay = new EditDisplay(context);
	function updateEditDisplay(editList: EditList) {
		editDisplay.update(editList);
	}

	let lastActiveDocument: vscode.TextDocument | undefined = undefined;
	function switchActiveEditor(document: vscode.TextDocument, force: boolean = false) {
		if (!document || (!force && document === lastActiveDocument)) {
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
		updateEditDisplay(editList);
		// logger.logFileFocus(document.uri.toString());
	}

	disposables.push(vscode.window.onDidChangeActiveTextEditor(editor => {
		if (isProvenaActive() && editor) {
			switchActiveEditor(editor.document);
		}
	}));

	let lastCopiedText: string | null = null;

	disposables.push(vscode.workspace.onDidChangeTextDocument(async event => {
		if (!isProvenaActive()) {
			return;
		}
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
		updateEditDisplay(editList);
		// console.log(`Current edits: ${editList.toString()}`);

		showWarningIfNotConfigured(isLoggedIn);
	}));

	disposables.push(vscode.commands.registerCommand('provena.setActive', () => {
		vscode.window.showInformationMessage("Provena is now active for this workspace.");
		vscode.workspace.getConfiguration().update(CONFIG_PROVENA_ACTIVE, true, vscode.ConfigurationTarget.Workspace);
	}));

	disposables.push(vscode.commands.registerCommand('provena.setInactive', () => {
		vscode.window.showInformationMessage("Provena is disabled. To change this setting, ask your instructor.");
		vscode.workspace.getConfiguration().update(CONFIG_PROVENA_ACTIVE, false, vscode.ConfigurationTarget.Workspace);
	}));

	disposables.push(vscode.commands.registerCommand('provena.openAuthorshipView', (documentURI: vscode.Uri) => {
		editDisplay.reveal();
		if (documentURI) {
			console.log(`Opening authorship view for document: ${documentURI.toString()}`);
			const document = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === documentURI.toString());
			console.log("found document:", document);
			if (document) {
				switchActiveEditor(document, true);
			}
		}
	}));

	getCachedIdentity(true).then(identity => {
		console.log(identity);
		showWalkthroughIfNeeded(identity !== null);
	});

	context.subscriptions.push(...disposables);
}

function isProvenaActive(): boolean {
	const provenaActive = vscode.workspace.getConfiguration().get(CONFIG_PROVENA_ACTIVE);
	return provenaActive === true;
}

function isProvenaConfigured(isLoggedIn: boolean): boolean {
	const provenaActive = vscode.workspace.getConfiguration().get(CONFIG_PROVENA_ACTIVE);
	if (provenaActive === false) {
		// We never show the walkthrough if provena is explicitly inactive
		return false;
	}
	return provenaActive !== undefined && isLoggedIn;
}

let lastWarningTime: number | null = null;
function showWarningIfNotConfigured(isLoggedIn: boolean) {
	if (isProvenaConfigured(isLoggedIn)) {
		return;
	}
	const now = new Date().getTime();
	if (lastWarningTime && now - lastWarningTime < 5 * 1000) {
		// Don't show the warning more than once every 5 seconds
		return;
	}
	lastWarningTime = now;

	vscode.window.showWarningMessage(
		"Warning: You must finish setting up Provena (or disable it) to get credit for your work.",
		"Open Walkthrough"
	).then(selection => {
		if (selection === "Open Walkthrough") {
			showWalkthroughIfNeeded(isLoggedIn);
		}
	});
}

function showWalkthroughIfNeeded(isLoggedIn: boolean) {
	if (isProvenaConfigured(isLoggedIn)) {
		return;
	}

	vscode.commands.executeCommand(
		'workbench.action.openWalkthrough',
		{
			category: 'hintslab.provena#setup',
			step: '*',
			openToSide: true
		}
	);
}

// This method is called when your extension is deactivated
export function deactivate() {}
