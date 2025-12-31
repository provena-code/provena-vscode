import * as fs from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';
import { MainTableEvent } from '../api';
import { COMMAND_SHOW_SYNC_STATUS, COMMAND_SYNC } from '../constants';
import { isProvenaActive } from '../ui/SetupManager';
import { StatusBarManager, StatusBarState } from '../ui/StatusBarManager';
import { showProvenaStatus } from '../ui/SyncErrorDialog';
import { BatchEventHandler, IBatchEventHandler } from './BatchEventHandler';
import { EventLogger } from './EventLogger';
import { JSONLLogger } from './JSONLogger';

const logsDirName = 'logs';
const logFileExtension = '.jsonl';
const logFilePrefix = 'log';
const cursorFileSuffix = '.cursor';

function isLogFile(fileName: string): boolean {
    return fileName.startsWith(logFilePrefix) && fileName.endsWith(logFileExtension);
}

export enum SyncResultType {
    Success = 'success',
    Unavailable = 'unavailable',
    Rejected = 'rejected'
}

type SuccessSyncResult<T> = {
    result: SyncResultType.Success
    response: T
};

type FailedSyncResult = {
    result: SyncResultType.Unavailable | SyncResultType.Rejected,
    error?: string
    // response?: never
};

export type SyncResult<T> = SuccessSyncResult<T> | FailedSyncResult;

class SessionSyncStatus {
    errors: string[] = [];
    lastSyncedTime?: Date;
    totalLogs = 0;
    syncedLogs = 0;
    serverUnavailable = false;

    get isSynced(): boolean {
        return this.syncedLogs === this.totalLogs;
    }

    setSuccess(syncedLogs: number) {
        this.syncedLogs = syncedLogs;
        this.totalLogs = syncedLogs;
        this.errors = [];
    }

    getSummary(): string {
        const status = this.isSynced ? 'Synced' : 'Not Synced';
        const dateStatus = this.lastSyncedTime ? ` at ${this.lastSyncedTime.toDateString()}` : '';
        return `${status}: ${this.syncedLogs}/${this.totalLogs} logs${dateStatus}`;
    }
}

export class SyncStatus {
    thisSession = new SessionSyncStatus();
    priorSessions = new SessionSyncStatus();

    get isSynced(): boolean {
        return this.thisSession.isSynced && this.priorSessions.isSynced;
    }

    get serverUnavailable(): boolean {
        return this.thisSession.serverUnavailable || this.priorSessions.serverUnavailable;
    }

    get errors(): string[] {
        return [...this.thisSession.errors, ...this.priorSessions.errors];
    }

    getSummary(): string {
        return `This Session: ${this.thisSession.getSummary()}. Prior Sessions: ${this.priorSessions.getSummary()}.`;
    }
}

export interface ILogSyncer {
    getLastSyncedLogLine(sessionID: string): Promise<SyncResult<number>>;
    pushLogLines(lines: object[]): Promise<SyncResult<void>>;
}

export type LogFile = {
    filePath: string,
    lines: string[],
    sessionID: string
}

export class LogFileService implements IBatchEventHandler {
    private readonly rootDir: string;
    private isSyncing: boolean = false;
    private nSyncedLogs: number = 0;
    private batchHandler?: BatchEventHandler;
    public readonly localLogger: JSONLLogger;
    private readonly status = new SyncStatus();

    constructor(
        public readonly sessionID: string,
        public readonly syncer: ILogSyncer,
        private readonly statusBarManager: StatusBarManager,
        rootDir: string
    ) {
        this.rootDir = path.join(rootDir, logsDirName);
        fs.mkdir(this.rootDir, { recursive: true });
        this.localLogger = new JSONLLogger(this.getNewLogFilePath());
        console.log(`Logging this session to ${this.localLogger.logPath}`);
    }

    public init() {
        vscode.commands.registerCommand(COMMAND_SYNC, async () => {
            await Promise.all([
                this.pushUnsyncedLogs(),
                this.batchHandler?.flush()
            ]);
            this.updateStatusBar(true);
        });
        vscode.commands.registerCommand(COMMAND_SHOW_SYNC_STATUS, () => {
            showProvenaStatus(this.status);
        });
        this.pushUnsyncedLogs();
    }

    async onEvents(events: MainTableEvent[]): Promise<boolean> {
        if (!isProvenaActive()) {
            return false;
        }
        this.statusBarManager.setState(StatusBarState.SYNCING);
        const syncResult = await this.syncer.pushLogLines(events);
        const sessionStatus = this.status.thisSession;
        sessionStatus.serverUnavailable = syncResult.result === SyncResultType.Unavailable;
        if (syncResult.result === SyncResultType.Success) {
            this.nSyncedLogs += events.length;
            await this.setCachedLastSyncedLogLine(this.localLogger.logPath, this.nSyncedLogs);
            sessionStatus.lastSyncedTime = new Date();
            sessionStatus.setSuccess(this.nSyncedLogs);
            this.updateStatusBar();

            // If we just successfully synced this session, and
            // there are still unsynced logs from previous sessions,
            // we should also try to sync those logs
            if (!this.status.priorSessions.isSynced) {
                // Doesn't need to block
                this.pushUnsyncedLogs();
            }
            return true;
        }
        // TODO: Decide how to handle Rejected logs
        sessionStatus.totalLogs = this.nSyncedLogs + events.length;
        // TODO: For some reason the error is "unknown"
        sessionStatus.errors.push(`Failed to sync this session: ${syncResult.error}`);
        this.updateStatusBar();
        return false;
    }

    private updateStatusBar(forceShowErrors: boolean = false): void {
        // Avoid early "failed" sync when we haven't logged anything yet
        // TODO: This doesn't work the very first time with no historical logs ==> False Failure
        if (this.isSyncing || this.status.thisSession.totalLogs === 0) {
            this.statusBarManager.setState(StatusBarState.SYNCING);
        } else if (this.status.isSynced) {
            this.statusBarManager.setState(StatusBarState.SYNCED);
        } else if (!forceShowErrors && this.status.serverUnavailable) {
            this.statusBarManager.setState(StatusBarState.UNABLE_TO_SYNC);
        } else {
            // console.log('Setting status bar to ERROR state due to sync errors:', this.status.errors);
            // console.log('syncing', this.isSyncing);
            // console.log(this.status.priorSessions.isSynced, this.status.thisSession.isSynced);
            this.statusBarManager.setState(StatusBarState.ERROR);
        }
    }

    public registerWithLogger(logger: EventLogger) {
        this.batchHandler = new BatchEventHandler(this, 50, 3000);
        logger.registerEventHandler(this.batchHandler);
        this.localLogger.register(logger);
    }

    private getNewLogFilePath(): string {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        return `${this.rootDir}/${logFilePrefix}_${timestamp}_${this.sessionID}${logFileExtension}`;
    }

    private getCursorPath(logPath: string): string {
        return logPath + cursorFileSuffix;
    }

    private async getCachedLastSyncedLogLine(logPath: string): Promise<number> {
        const cursorPath = this.getCursorPath(logPath);
        try {
            const content = await fs.readFile(cursorPath, 'utf-8');
            return parseInt(content);
        } catch {
            return -1;
        }
    }

    private async setCachedLastSyncedLogLine(logPath: string, lineNumber: number): Promise<void> {
        const cursorPath = this.getCursorPath(logPath);
        await fs.writeFile(cursorPath, lineNumber.toString(), 'utf-8');
    }

    public async getAllLogs(): Promise<LogFile[]> {
        const files = (await fs.readdir(this.rootDir)).filter(isLogFile).sort();
        const logFiles: LogFile[] = [];
        for (const file of files) {
            if (file.includes(this.sessionID)) {
                continue;
            }
            const parts = file.replace(logFileExtension, '').split('_');
            if (parts.length < 3) {
                console.log(`Skipping malformed log file: ${file}`);
                continue;
            }
            const sessionID = parts[2];
            const filePath = path.join(this.rootDir, file);
            const content = await fs.readFile(filePath, 'utf-8');
            const lines = content.split('\n').filter(line => line.trim() !== '');
            logFiles.push({ filePath, lines, sessionID });

        }
        return logFiles;
    }

    public async pushUnsyncedLogs(): Promise<boolean> {
        if (!isProvenaActive()) {
            return false;
        }
        if (this.isSyncing) {
            return false;
        }
        this.isSyncing = true;
        this.updateStatusBar();
        const status = this.status.priorSessions = new SessionSyncStatus();
        const logFiles = await this.getAllLogs();
        for (const logFile of logFiles) {
            if (logFile.sessionID === this.sessionID) {
                continue;
            }

            // Probably should keep synchronous so the logs arrive in their original order
            const shouldContinue = await this.syncFile(logFile, status)
                // Shouldn't happen, but just to make sure we finish
                .catch((e) => {
                    status.errors.push(`Error syncing log file ${logFile.filePath}: ${e}`);
                    console.log(`Error syncing log file ${logFile.filePath}:`, e);
                    return true;
                });
            if (!shouldContinue) {
                break;
            }
        }
        this.isSyncing = false;
        this.updateStatusBar();
        return true;
    }

    private async syncFile(logFile: LogFile, status: SessionSyncStatus): Promise<boolean> {
        const { filePath, lines, sessionID } = logFile;
        if (lines.length === 0) {
            return true;
        }

        // 0-based
        let lastSyncedLine = await this.getCachedLastSyncedLogLine(filePath);
        if (lastSyncedLine === lines.length - 1) {
            // console.log(`Log file ${filePath} is already fully synced.`);
            status.totalLogs += lines.length;
            status.syncedLogs += lines.length;
            // Only skip checking the server if we're sure
            // it's up to date on this file
            return true; // Already synced
        }

        // Check the server even if we have a cached value, since
        // it could have changed since we cached it
        const serverLastSyncedLine = await this.syncer.getLastSyncedLogLine(sessionID);
        // If the server can't be reached, don't try to sync further
        if (serverLastSyncedLine.result !== SyncResultType.Success) {
            if (serverLastSyncedLine.result === SyncResultType.Unavailable) {
                // Shouldn't be possible to fail for any other reason
                this.handleUnavailableServer(status, serverLastSyncedLine);
                return false;
            } else {
                status.errors.push(`Unknown server error.`);
                return true;
            }
        }

        // Otherwise, use and cache it
        lastSyncedLine = serverLastSyncedLine.response;
        await this.setCachedLastSyncedLogLine(filePath, lastSyncedLine);
        // console.log(`Syncing log file ${filePath} from line ${lastSyncedLine + 1}`);

        const unsyncedLines = lines.slice(lastSyncedLine + 1);
        if (unsyncedLines.length > 0) {
            const logObjects = unsyncedLines.map(line => {
                try {
                    return JSON.parse(line);
                } catch {
                    return null;
                }
            }).filter(obj => obj !== null) as object[];
            const syncResult = await this.syncer.pushLogLines(logObjects);

            status.totalLogs += lines.length;
            status.syncedLogs += lastSyncedLine + 1;
            if (syncResult.result === SyncResultType.Success) {
                await this.setCachedLastSyncedLogLine(filePath, lastSyncedLine + unsyncedLines.length);
                status.syncedLogs += unsyncedLines.length;
            }
            if (syncResult.result === SyncResultType.Unavailable) {
                this.handleUnavailableServer(status, syncResult);
                return false;
            } else if (syncResult.result === SyncResultType.Rejected) {
                status.errors.push(`Server rejected log for session ${sessionID}: ${syncResult.error}`);
                console.log(`Server rejected log ${filePath}`, logObjects);
                // TODO: Decide how to handle Rejected logs
                // If the server is battle-tested, then sure, we should ignore them
                // but for now, I'd rather have the chance to fix the server if something's wrong
                // and try resending them later...
                // await this.setCachedLastSyncedLogLine(filePath, lastSyncedLine + unsyncedLines.length);
                return true;
            }
        }
        return true;
    }

    handleUnavailableServer(status: SessionSyncStatus, syncResult: FailedSyncResult) {
        status.serverUnavailable = true;
        status.errors.push(`Could not connect to the server: ${syncResult.error}`);
        console.log(`Unable to sync right now; stopping further sync attempts.`);
    }
}