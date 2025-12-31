import { ApiError, DefaultService, MainTableEvent } from "../api";
import { ILogSyncer, SyncResult, SyncResultType } from "./LogFileService";


function getSuccessResult<T>(response?: T): SyncResult<T> {
    return {
        result: SyncResultType.Success,
        response: response as T,
    };
}

function getSyncErrorResult<T>(error: any): SyncResult<T> {
    if (!error) {
        return {
            result: SyncResultType.Unavailable,
            error: 'Unknown error',
        };
    }

    const status = (error instanceof ApiError) ? error.status : null;
    const body = (error instanceof ApiError) ? error.body : null;
    let bodyMessage = '';
    try {
        bodyMessage = JSON.stringify(body);
    } catch { }

    if (status === 422) {
        console.log(`Malformatted log lines`, error);
        return {
            result: SyncResultType.Rejected,
            error: `There was an a formatting error when sending data to the Provena server:\n${bodyMessage}`
        };
    }
    if (status === 500) {
        return {
            result: SyncResultType.Unavailable,
            error: `Syncing caused an error with the Provena server: ${bodyMessage}.`
        };
    }

    // Could be any server error other than malformatted data / error
    // but most likely the server is down. Regardless, suggests we
    // should resend.
    console.error(`Error pushing log lines`, error);
    return {
        result: SyncResultType.Unavailable,
        error: `The Provena server appears to be unavailable. Status: ${status}`
    };
}

export class ServerLogger implements ILogSyncer {
    // A bit hacky return value, but it nicely disjoints a real result from a failure
    async getLastSyncedLogLine(sessionID: string): Promise<SyncResult<number>> {
        try {
            const response = await DefaultService.getLastSyncedOrder(sessionID);
            return getSuccessResult(response);
        } catch (error) {
            console.warn(`Error fetching last synced log line`, error);
            return getSyncErrorResult(error);
        }
    }


    async pushLogLines(lines: object[]): Promise<SyncResult<void>> {
        console.log(`Pushing ${lines.length} log lines to server`);
        try {
            const result = await DefaultService.addEvents(lines as MainTableEvent[]);
            if (result.success) {
                return getSuccessResult();
            } else {
                console.log(`Failed to push log lines`, result);
                const error_messages = (result.errors ?? []).join("\n");
                const warning_messages = (result.warnings ?? []).join("\n");
                const all_errors = error_messages + warning_messages;
                return { result: SyncResultType.Rejected, error: all_errors };
            }
        } catch (error) {
            return getSyncErrorResult(error);
        }
    }
}