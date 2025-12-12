// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { name, publisher, version } from '../package.json';
import { AuthManager } from './auth/AuthManager';
import { CONTEXT_IS_LOGGED_IN } from './constants';
import { EditDisplay } from './display/EditDisplay';
import { EventLogger } from './logging/EventLogger';
import { LogFileService, SyncResult } from './logging/LogFileService';
import { getStorageRootPath } from './logging/Util';
import { VSCodeLogger } from './logging/VSCodeLogger';
import { FileDataMap } from './recorder/FileDataMap';
import { Singletons } from './Singletons';
import { createEditorEvents } from './ui/EditorEvents';
import { SetupManager } from './ui/SetupManager';

let loggerToClose: EventLogger | null = null;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log('start!');

	EventLogger.configure('http://127.0.0.1:8000/');

	// Might be a good idea to force 0-args constructors
	const toolInstance = `${publisher}.${name}-${version}`;
	const logger = loggerToClose = new EventLogger(toolInstance);
	const vscodeLogger = new VSCodeLogger();
	const authManager = new AuthManager(context);
	const editDisplay = new EditDisplay(context);
	const setupManager = new SetupManager();
	const fileDataMap = new FileDataMap(true);

	const singletons: Singletons = {
		context,
		logger,
		authManager,
		editDisplay,
		setupManager,
		fileDataMap,
		vscodeLogger,
	};

	const storageRootPath = getStorageRootPath(context);
	let logFileService: LogFileService | null = null;
	if (storageRootPath) {
		// TODO: Create actual server sync
		logFileService = new LogFileService({
			getLastSyncedLogLine: async () => -1,
			pushLogLines: async (lines: object[]) => {
				console.log("Pushing log lines to server:", lines.length);
				return SyncResult.Unavailable;
			},
		}, storageRootPath);
		logFileService.pushUnsyncedLogs();
		logFileService.registerWithLogger(logger);
	}

	setupManager.init(singletons);
	vscodeLogger.init(singletons);
	createEditorEvents(singletons);

	authManager.onAuthChange(({ providerId, identity }) => {
		console.log(`Auth change for provider ${providerId}:`, identity);
		logger.updateState({ SubjectID: identity?.email });
		vscode.commands.executeCommand('setContext', CONTEXT_IS_LOGGED_IN, identity !== null);
	});
}

// This method is called when your extension is deactivated
export function deactivate() {
	loggerToClose?.logSessionEnd();
	// Flushes all listeners
	loggerToClose?.flush();
}