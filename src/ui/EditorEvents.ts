import * as vscode from 'vscode';
import { getCodeStateSecion } from '../logging/Util';
import { Singletons } from "../Singletons";
import { isProvenaActive } from './SetupManager';

export function createEditorEvents(singletons: Singletons) {

    const { context, vscodeLogger, editDisplay, setupManager, editListService } = singletons;
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

        // TODO: Raise a warning dialog if the file is not in a workspace
		// If the document is not in a workspace, ignore it
		if (isOutsideOfWorkspace(document)) {
			return;
		}

		const verified = editListService.isEditListVerified(document);
		vscodeLogger.logFileFocus(document, !verified);

		// Doesn't reveal, just updates the codestate section
		editDisplay.switchToCodestateSection(
			getCodeStateSecion(document.uri)
		);
	}

	disposables.push(vscode.window.onDidChangeActiveTextEditor(editor => {
		if (isProvenaActive() && editor) {
			switchActiveEditor(editor.document);
		}
	}));

	disposables.push(vscode.window.onDidChangeTextEditorSelection(event => {
		vscodeLogger.checkForCopyLogEvent(event.textEditor.document);
	}));

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
