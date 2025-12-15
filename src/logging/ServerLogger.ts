import { ApiError, DefaultService, MainTableEvent } from "../api";
import { ILogSyncer, SyncResult } from "./LogFileService";

export class ServerLogger implements ILogSyncer {
    async getLastSyncedLogLine(sessionID: string): Promise<number> {
        try {
            const result = await DefaultService.getLastSyncedOrder(sessionID);
            return result;
        } catch (error) {
            console.error(`Error fetching last synced log line`, error);
            return -1;
        }
    }

    async pushLogLines(lines: object[]): Promise<SyncResult> {
        try {
            const result = await DefaultService.addEvents(lines as MainTableEvent[]);
            if (result.success) {
                return SyncResult.Success;
            } else {
                console.log(`Failed to push log lines`, result);
                return SyncResult.Rejected;
            }
        } catch (error) {
            if (error instanceof ApiError && error.status === 422) {
                console.log(`Malformatted log lines`, error);
                return SyncResult.Rejected;
            }

            console.error(`Error pushing log lines`, error);
            return SyncResult.Unavailable;
        }
    }
}