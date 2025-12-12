import * as vscode from 'vscode';
import { Singletons } from "../Singletons";

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
		if (setupManager.isProvenaActive() && editor) {
			switchActiveEditor(editor.document);
		}
	}));

	let lastCopiedText: string | null = null;

	disposables.push(vscode.workspace.onDidChangeTextDocument(async event => {
		if (!setupManager.isProvenaActive()) {
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

		setupManager.showWarningIfNotConfigured(authManager.isLoggedIn);
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

    // TODO: Many more events

    context.subscriptions.push(...disposables);
}
