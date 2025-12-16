import { ApiError, DefaultService, MainTableEvent } from "../api";
import { ILogSyncer, SyncResult, SyncResultType } from "./LogFileService";

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
                return { result: SyncResultType.Success };
            } else {
                console.log(`Failed to push log lines`, result);
                const error_messages = (result.errors ?? []).join("\n");
                const warning_messages = (result.warnings ?? []).join("\n");
                const all_errors = error_messages + warning_messages;
                return { result: SyncResultType.Rejected, error: all_errors };
            }
        } catch (error) {
            if (error instanceof ApiError && error.status === 422) {
                console.log(`Malformatted log lines`, error);
                return { result: SyncResultType.Rejected, error: error.statusText };
            }

            // Could be any server error other than malformatted data
            // but most likely the server is down. Regardless, suggests we
            // should resend.
            console.error(`Error pushing log lines`, error);
            return { result: SyncResultType.Unavailable };
        }
    }
}