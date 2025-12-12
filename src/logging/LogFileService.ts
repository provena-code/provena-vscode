import * as fs from 'fs/promises';
import * as path from 'path';
import { MainTableEvent } from '../api';
import { BatchEventHandler, IBatchEventHandler } from './BatchEventHandler';
import { EventLogger } from './EventLogger';
import { JSONLLogger } from './JSONLogger';
import { generateID } from './Util';

const logsDirName = 'logs';
const extension = '.jsonl';
const logFilePrefix = 'log';
const cursorSuffix = '.cursor';

function isLogFile(fileName: string): boolean {
    return fileName.startsWith(logFilePrefix) && fileName.endsWith(extension);
}

export enum SyncResult {
    Success = 'success',
    Unavailable = 'unavailable',
    Rejected = 'rejected'
}

export interface ILogSyncer {
    getLastSyncedLogLine(): Promise<number>;
    pushLogLines(lines: object[]): Promise<SyncResult>;
}

export class LogFileService implements IBatchEventHandler {
    private readonly rootDir: string;
    private isSyncing: boolean = false;
    private nSyncedLogs: number = 0;
    public readonly localLogger: JSONLLogger;
    public readonly sessionID = generateID();

    constructor(
        public readonly syncer: ILogSyncer,
        rootDir: string
    ) {
        this.rootDir = path.join(rootDir, logsDirName);
        fs.mkdir(this.rootDir, { recursive: true });
        this.localLogger = new JSONLLogger(this.getNewLogFilePath());
    }

    async onEvents(events: MainTableEvent[]): Promise<boolean> {
        const syncResult = await this.syncer.pushLogLines(events);
        if (syncResult === SyncResult.Success) {
            this.nSyncedLogs += events.length;
            await this.setCachedLastSyncedLogLine(this.localLogger.logPath, this.nSyncedLogs);
            return true;
        }
        // TODO: Decide how to handle Rejected logs
        return false;
    }

    public registerWithLogger(logger: EventLogger) {
        const batchHandler = new BatchEventHandler(this, 50, 3000);
        logger.registerEventHandler(batchHandler);
        this.localLogger.register(logger);
    }

    private getNewLogFilePath(): string {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        return `${this.rootDir}/${logFilePrefix}_${timestamp}_${this.sessionID}${extension}`;
    }

    /**
     * Retrieve all log entries from all log files in the root directory.
     */
    async getAllLogs(): Promise<object[]> {
        const logEntries: object[] = [];
        const files = (await fs.readdir(this.rootDir)).filter(isLogFile).sort();
        for (const file of files) {
            const filePath = path.join(this.rootDir, file);
            const content = await fs.readFile(filePath, 'utf-8');
            const lines = content.split('\n').filter(line => line.trim() !== '');
            for (const line of lines) {
                try {
                    logEntries.push(JSON.parse(line));
                } catch {
                    // Ignore lines that are not valid JSON
                }
            }
        }
        return logEntries;
    }

    getCursorPath(logPath: string): string {
        return logPath + cursorSuffix;
    }

    async getCachedLastSyncedLogLine(logPath: string): Promise<number> {
        const cursorPath = this.getCursorPath(logPath);
        try {
            const content = await fs.readFile(cursorPath, 'utf-8');
            return parseInt(content);
        } catch {
            return -1;
        }
    }

    async setCachedLastSyncedLogLine(logPath: string, lineNumber: number): Promise<void> {
        const cursorPath = this.getCursorPath(logPath);
        await fs.writeFile(cursorPath, lineNumber.toString(), 'utf-8');
    }

    async pushUnsyncedLogs(): Promise<boolean> {
        if (this.isSyncing) {
            return false;
        }
        this.isSyncing = true;
        const files = (await fs.readdir(this.rootDir)).filter(isLogFile).sort();
        for (const file of files) {
            if (file.includes(this.sessionID)) {
                continue;
            }
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
            lastSyncedLine = await this.syncer.getLastSyncedLogLine();
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
                if (syncResult === SyncResult.Success) {
                    await this.setCachedLastSyncedLogLine(filePath, lastSyncedLine + unsyncedLines.length);
                } else if (syncResult === SyncResult.Unavailable) {
                    this.isSyncing = false;
                    console.log(`Unable to sync right now; stopping further sync attempts.`);
                    return false;
                } else if (syncResult === SyncResult.Rejected) {
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
        return true;
    }
}