import * as vscode from 'vscode';
import { Singletons } from "../Singletons";
import { isProvenaActive } from './SetupManager';

export function createEditorEvents(singletons: Singletons) {

    const { context, vscodeLogger, fileDataMap, editDisplay, setupManager, authManager } = singletons;
    const disposables: vscode.Disposable[] = [];

    function isOutsideOfWorkspace(document: vscode.TextDocument): boolean {
        return !vscode.workspace.getWorkspaceFolder(document.uri);
    }

	let lastActiveDocument: vscode.TextDocument | undefined = undefined;
	function switchActiveEditor(document: vscode.TextDocument, force: boolean = false) {

		if (!document || (!force && document === lastActiveDocument)) {
			return;
		}

		lastActiveDocument = document;
		console.log(`Document changed: ${document.uri.toString()}`);

        // TODO: Raise a warning dialog if the file is not in a workspace
		// If the document is not in a workspace, ignore it
		if (isOutsideOfWorkspace(document)) {
			return;
		}

		vscodeLogger.logFileFocus(document);
        // TODO: Decide on whether we want to verify editList integrity on focus

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
		if (isProvenaActive() && editor) {
			switchActiveEditor(editor.document);
		}
	}));

	disposables.push(vscode.window.onDidChangeTextEditorSelection(event => {
		vscodeLogger.checkForCopyLogEvent(event.textEditor.document);
	}));

	let lastCopiedText: string | null = null;

	disposables.push(vscode.workspace.onDidChangeTextDocument(async event => {
		// TODO: Should be redundant soon, but should test
		if (!isProvenaActive()) {
			return;
		}

        // Still need update the last opened file
		switchActiveEditor(event.document);

		if (isOutsideOfWorkspace(event.document)) {
			return;
		}

        vscodeLogger.logFileEdit(event);

		const { editList, eventRecorder } = fileDataMap.getFileData(event.document.uri);

		const clipboardText = await vscode.env.clipboard.readText();
		if (clipboardText !== lastCopiedText) {
			eventRecorder.recordCopy(clipboardText);
			lastCopiedText = clipboardText;
		}
		// TODO: The event recorder should probably
		// generate -> ProgSnap... but maybe the other way around?
		eventRecorder.recordDocumentChange(event);
		editDisplay.update(editList);
		// console.log(`Current edits: ${editList.toString()}`);

		setupManager.showWarningIfNotConfigured();
	}));

    disposables.push(vscode.workspace.onDidOpenTextDocument(document => {
        vscodeLogger.logFileOpen(document);
    }));

    disposables.push(vscode.workspace.onDidCloseTextDocument(document => {
        vscodeLogger.logFileClose(document);
    }));

    disposables.push(vscode.workspace.onDidSaveTextDocument(document => {
        vscodeLogger.logFileSave(document);
    }));

	disposables.push(vscode.tasks.onDidStartTask(event => {
		console.log(`Task started: ${event.execution.task.name}`);
	}));

	// Detect when a command actually starts running in the terminal
    disposables.push(vscode.window.onDidStartTerminalShellExecution(event => {
        const commandLine = event.execution.commandLine.value;
        const terminalName = event.terminal.name;

        // Filter out empty lines or noise
        if (!commandLine) {
			return;
		}

        console.log(`User ran command: ${commandLine} in terminal: ${terminalName}`);

        // Example heuristic: Check if it looks like a run command
        if (commandLine.startsWith('npm run') || commandLine.includes('python')) {
            vscode.window.showInformationMessage(`Detected run command: ${commandLine}`);
        }
    }));

    // TODO: Many more events

    context.subscriptions.push(...disposables);
}
