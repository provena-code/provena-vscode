import * as vscode from 'vscode';
import { getCodeStateSection } from '../logging/Util';
import { Singletons } from "../Singletons";
import { isDocumentValidForLogging, isURIOutsideOfWorkspace, showWarningIfUnableToLog } from './DocumentVerifier';
import { isProvenaActive } from './SetupManager';

export function createEditorEvents(singletons: Singletons) {

    const { context, vscodeLogger, editDisplay, setupManager, editListService } = singletons;
    const disposables: vscode.Disposable[] = [];

	let lastActiveDocument: vscode.TextDocument | undefined = undefined;
	function switchActiveEditor(document: vscode.TextDocument, force: boolean = false) {

		if (!document || (!force && document === lastActiveDocument)) {
			return;
		}

		lastActiveDocument = document;

		// If the document is not in a workspace, ignore it
		if (!isDocumentValidForLogging(document)) {
			// Only show the warning on focus to avoid spamming
			showWarningIfUnableToLog(document);
			return;
		}

		const verified = editListService.isEditListVerified(document);
		vscodeLogger.logFileFocus(document, !verified);

		// Doesn't reveal, just updates the codestate section
		editDisplay.switchToCodestateSection(
			getCodeStateSection(document.uri)
		);
	}

	// ---- Window Events ----

	disposables.push(vscode.window.onDidChangeActiveTextEditor(editor => {
		if (isProvenaActive() && editor) {
			switchActiveEditor(editor.document);
		}
	}));

	disposables.push(vscode.window.onDidChangeTextEditorSelection(event => {
		if (!isDocumentValidForLogging(event.textEditor.document)) {
			return;
		}
		vscodeLogger.checkForCopyLogEvent(event.textEditor.document);
	}));

	// ---- Workspace Events ----

	disposables.push(vscode.workspace.onDidChangeTextDocument(event => {
		setupManager.showWarningIfNotConfigured();

        // Still need update the last opened file
		switchActiveEditor(event.document);

		if (!isDocumentValidForLogging(event.document)) {
			return;
		}

        vscodeLogger.logFileEdit(event);
	}));

	disposables.push(vscode.workspace.onDidCreateFiles(event => {
		event.files.forEach(file => {
			if (isURIOutsideOfWorkspace(file)) {
				return;
			}
			vscodeLogger.logFileCreate(file);
		});
	}));


	disposables.push(vscode.workspace.onDidDeleteFiles(event => {
		event.files.forEach(file => {
			if (isURIOutsideOfWorkspace(file)) {
				return;
			}
			vscodeLogger.logFileDelete(file);
		});
	}));

    disposables.push(vscode.workspace.onDidOpenTextDocument(document => {
		if (!isDocumentValidForLogging(document)) {
			return;
		}
        vscodeLogger.logFileOpen(document);
    }));

    disposables.push(vscode.workspace.onDidCloseTextDocument(document => {
		if (!isDocumentValidForLogging(document)) {
			return;
		}
        vscodeLogger.logFileClose(document);
    }));

    disposables.push(vscode.workspace.onDidSaveTextDocument(async document => {
		if (!isDocumentValidForLogging(document)) {
			return;
		}

		try {
			// Read the document from disk, rather than vscode's in-memory version
			// to ensure it matches a file upload.
			const fileContents = await vscode.workspace.fs.readFile(document.uri);
			const fileContentsString = Buffer.from(fileContents).toString('utf8');
			vscodeLogger.logFileSave(document, fileContentsString);
		} catch {
			console.warn(`Failed to read file from disk for save event: ${document.uri.toString()}`);
			// If reading from disk fails, fall back to in-memory version
			vscodeLogger.logFileSave(document, document.getText());
		}
    }));

	disposables.push(vscode.workspace.onDidRenameFiles(event => {
		event.files.forEach(file => {
			if (isURIOutsideOfWorkspace(file.oldUri) && isURIOutsideOfWorkspace(file.newUri)) {
				return;
			}
			vscodeLogger.logFileRename(file.oldUri, file.newUri);
		});
	}));

	// ---- Task and Terminal Events ----
	// (Not currently working...)

	// disposables.push(vscode.tasks.onDidStartTask(event => {
	// 	console.log(`Task started: ${event.execution.task.name}`);
	// }));

	// Detect when a command actually starts running in the terminal
    // disposables.push(vscode.window.onDidStartTerminalShellExecution(event => {
    //     const commandLine = event.execution.commandLine.value;
    //     const terminalName = event.terminal.name;

    //     // Filter out empty lines or noise
    //     if (!commandLine) {
	// 		return;
	// 	}

    //     console.log(`User ran command: ${commandLine} in terminal: ${terminalName}`);

    //     // Example heuristic: Check if it looks like a run command
    //     if (commandLine.startsWith('npm run') || commandLine.includes('python')) {
    //         vscode.window.showInformationMessage(`Detected run command: ${commandLine}`);
    //     }
    // }));

    // TODO: Many more events

    context.subscriptions.push(...disposables);
}
