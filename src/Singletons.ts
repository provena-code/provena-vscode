import * as vscode from 'vscode';
import { AuthManager } from './auth/AuthManager';
import { ConfigService } from './config/ConfigService';
import { EditDisplay } from './display/EditDisplay';
import { EditListService } from './display/EditListService';
import { EventLogger } from './logging/EventLogger';
import { LogFileService } from './logging/LogFileService';
import { VSCodeLogger } from './logging/VSCodeLogger';
import { SetupManager } from './ui/SetupManager';
import { StatusBarManager } from './ui/StatusBarManager';

 type _Singletons = {
    context: vscode.ExtensionContext;
    configService: ConfigService;
    logger: EventLogger;
    vscodeLogger: VSCodeLogger;
    authManager: AuthManager;
    editDisplay: EditDisplay;
    setupManager: SetupManager;
    statusBarManager: StatusBarManager;
    editListService: EditListService;
    logFileService?: LogFileService;
};

export type Singletons = Readonly<_Singletons>;