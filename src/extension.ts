// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { name, publisher, version } from '../package.json';
import { AuthManager } from './auth/AuthManager';
import { envConfig } from './config';
import { CONTEXT_IS_LOGGED_IN } from './constants';
import { EditDisplay } from './display/EditDisplay';
import { EditListService } from './display/EditListService';
import { EventLogger } from './logging/EventLogger';
import { LogFileService } from './logging/LogFileService';
import { ServerLogger } from './logging/ServerLogger';
import { generateID, getStorageRootPath } from './logging/Util';
import { VSCodeLogger } from './logging/VSCodeLogger';
import { Singletons } from './Singletons';
import { createEditorEvents } from './ui/EditorEvents';
import { isProvenaDisabled, SetupManager } from './ui/SetupManager';
import { StatusBarManager } from './ui/StatusBarManager';

let loggerToClose: EventLogger | undefined = undefined;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log('start!');

	EventLogger.configure(envConfig.apiRoot);
	console.log('API Root:', envConfig.apiRoot);

	// Might be a good idea to force 0-args constructors
	const sessionID = generateID();
	const toolInstance = `${publisher}.${name}-${version}`;
	const logger = loggerToClose = new EventLogger(sessionID, toolInstance);
	logger.setActive(!isProvenaDisabled());

	const vscodeLogger = new VSCodeLogger();
	const authManager = new AuthManager(context);
	const editDisplay = new EditDisplay(context);
	const setupManager = new SetupManager();
	const statusBarManager = new StatusBarManager();

	// TODO: I've temporarily disabled loading from logs because
	// we aren't showing the authorship view, and we don't really
	// need that hitsorical data to detect desyncs and log the file state
	// (which is the other reason to keep an active EditList).
	// Eventually this should be re-enabled, but we need to make it
	// more performant (e.g. by serializing the EditList and only)
	// loading it when the file is opened.
	const editListService = new EditListService(false);


	const storageRootPath = getStorageRootPath(context);
	let logFileService: LogFileService | undefined = undefined;
	if (storageRootPath) {
		logFileService = new LogFileService(
			sessionID,
			new ServerLogger(),
			statusBarManager,
			storageRootPath
		);
		logFileService.init();
		logFileService.registerWithLogger(logger);
	} else {
		console.warn('No storage root path available; local logging disabled.');
	}

	const singletons: Singletons = {
		context,
		logger,
		authManager,
		editDisplay,
		setupManager,
		vscodeLogger,
		statusBarManager,
		editListService,
		logFileService,
	};


	editListService.init(singletons);
	setupManager.init(singletons);
	vscodeLogger.init(singletons);
	createEditorEvents(singletons);
	editDisplay.init(singletons);

	authManager.onAuthChange(({ providerId, identity }) => {
		console.log(`Auth change for provider ${providerId}:`);
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