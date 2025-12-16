import * as vscode from 'vscode';
import { AuthManager } from './auth/AuthManager';
import { EditDisplay } from './display/EditDisplay';
import { EventLogger } from './logging/EventLogger';
import { VSCodeLogger } from './logging/VSCodeLogger';
import { FileDataMap } from './recorder/FileDataMap';
import { SetupManager } from './ui/SetupManager';
import { StatusBarManager } from './ui/StatusBarManager';

 type _Singletons = {
    context: vscode.ExtensionContext;
    logger: EventLogger;
    vscodeLogger: VSCodeLogger;
    authManager: AuthManager;
    editDisplay: EditDisplay;
    setupManager: SetupManager;
    fileDataMap: FileDataMap;
    statusBarManager: StatusBarManager;
};

export type Singletons = Readonly<_Singletons>;