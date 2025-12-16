import * as fs from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';
import { MainTableEvent } from '../api';
import { COMMAND_SYNC } from '../constants';
import { StatusBarManager, StatusBarState } from '../ui/StatusBarManager';
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

export type SyncResult = {
    result: SyncResultType,
    error?: string
};

class SessionSyncStatus {
    errors: string[] = [];
    lastSyncedTime?: Date;
    totalLogs = 0;
    syncedLogs = 0;
    serverUnavailable = false;

    get isSynced(): boolean {
        // If we haven't tried syncing yet, then we're not synced
        return this.totalLogs > 0 && this.syncedLogs === this.totalLogs;
    }
}

class SyncStatus {
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
}

export interface ILogSyncer {
    getLastSyncedLogLine(sessionID: string): Promise<number>;
    pushLogLines(lines: object[]): Promise<SyncResult>;
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
    }

    public init() {
        vscode.commands.registerCommand(COMMAND_SYNC, async () => {
            // Only use the status to update the UI
            // Let the sync process itself skip redundant updates
            if (!this.status.isSynced) {
                this.statusBarManager.setState(StatusBarState.SYNCING);
            }
            await Promise.all([
                this.pushUnsyncedLogs(),
                this.batchHandler?.flush()
            ]);
            this.updateStatusForSyncComplete(true);
        });
        this.pushUnsyncedLogs();
    }

    async onEvents(events: MainTableEvent[]): Promise<boolean> {
        this.statusBarManager.setState(StatusBarState.SYNCING);
        console.log('----starting sync-----');
        const syncResult = await this.syncer.pushLogLines(events);
        const sessionStatus = this.status.thisSession;
        sessionStatus.serverUnavailable = syncResult.result === SyncResultType.Unavailable;
        if (syncResult.result === SyncResultType.Success) {
            await this.setCachedLastSyncedLogLine(this.localLogger.logPath, this.nSyncedLogs);
            this.nSyncedLogs += events.length;
            sessionStatus.lastSyncedTime = new Date();
            sessionStatus.syncedLogs = sessionStatus.totalLogs = this.nSyncedLogs;
            this.updateStatusForSyncComplete();

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
        sessionStatus.errors.push(`Failed to sync this session: ${syncResult.error}`);
        this.updateStatusForSyncComplete();
        return false;
    }

    private updateStatusForSyncComplete(forceShowErrors: boolean = false): void {
        if (this.status.isSynced) {
            this.statusBarManager.setState(StatusBarState.SYNCED);
        } else if (!forceShowErrors && this.status.serverUnavailable) {
            this.statusBarManager.setState(StatusBarState.UNABLE_TO_SYNC);
        } else {
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

    public async pushUnsyncedLogs(): Promise<boolean> {
        if (this.isSyncing) {
            return false;
        }
        this.isSyncing = true;
        this.statusBarManager.setState(StatusBarState.SYNCING);
        const status = this.status.priorSessions = new SessionSyncStatus();
        const files = (await fs.readdir(this.rootDir)).filter(isLogFile).sort();
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

            if (lines.length === 0) {
                continue;
            }

            // 0-based
            let lastSyncedLine = await this.getCachedLastSyncedLogLine(filePath);
            if (lastSyncedLine === lines.length - 1) {
                console.log(`Log file ${filePath} is already fully synced.`);
                // Only skip checking the server if we're sure
                // it's up to date on this file
                continue; // Already synced
            }

            // Check the server even if we have a cached value, since
            // it could have changed we cached it
            lastSyncedLine = await this.syncer.getLastSyncedLogLine(sessionID);
            // and cache it
            await this.setCachedLastSyncedLogLine(filePath, lastSyncedLine);
            console.log(`Syncing log file ${filePath} from line ${lastSyncedLine + 1}`);

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
                    this.isSyncing = false;
                    status.serverUnavailable = true;
                    status.errors.push(`Could not connect to the server: ${syncResult.error}`);
                    console.log(`Unable to sync right now; stopping further sync attempts.`);
                    return false;
                } else if (syncResult.result === SyncResultType.Rejected) {
                    status.errors.push(`Server rejected log for session ${sessionID}: ${syncResult.error}`);
                    console.log(`Server rejected log ${filePath}`, logObjects);
                    // TODO: Decide how to handle Rejected logs
                    // If the server is battle-tested, then sure, we should ignore them
                    // but for now, I'd rather have the chance to fix the server if something's wrong
                    // and try resending them later...
                    // await this.setCachedLastSyncedLogLine(filePath, lastSyncedLine + unsyncedLines.length);
                    continue;
                }
            }
        }
        this.isSyncing = false;
        this.updateStatusForSyncComplete();
        return true;
    }
}