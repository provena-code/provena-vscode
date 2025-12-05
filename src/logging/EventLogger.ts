import { ErrorHandler } from "./ErrorHandler";
import { EventLoggerBase } from "./EventLoggerBase";
import { LogState } from "./LogState";
import { generateID } from "./Util";
import { MainTableEvent, EventType, DefaultService, OpenAPI, TempCodeStateEntry, LogResult, CodeStateSectionEntry } from "../api";

export type AdditionalColumns = Parameters<typeof DefaultService.getAdditionalColumnTypesPlaceholderGet>[0];

export type CodeState = CodeStateSectionEntry[];

export interface IEventHandler {
    onEvent(event: MainTableEvent): void;
}

export interface IFlushableEventHandler extends IEventHandler {
    flush(): void;
}

export class EventLogger extends EventLoggerBase {

    private state: LogState;

    private eventHandlers: IEventHandler[] = [];

    constructor(startState: LogState) {
        super();
        this.state = startState;
        this.state.Order = this.state.Order || 0;
    }

    // TODO: Consider authentication, etc., and better understand this
    public static configure(baseURL: string) {
        if (baseURL.endsWith('/')) {
            baseURL = baseURL.slice(0, -1);
        }
        OpenAPI.BASE = baseURL;
        // OpenAPI.CREDENTIALS = 'include';
        // OpenAPI.WITH_CREDENTIALS = true;
    }

    public registerEventHandler(handler: IEventHandler) {
        this.eventHandlers.push(handler);
    }

    public flush() {
        for (const handler of this.eventHandlers) {
            if ('flush' in handler) {
                (handler as IFlushableEventHandler).flush();
            }
        }
    }

    public updateState(newState: Partial<LogState>) {
        this.state = { ...this.state, ...newState };
    }

    public logEvent<T extends Partial<MainTableEvent>>(eventType: EventType, eventSpecificColumns: T) {
        // console.log("Preparing to log event of type:", eventType, "with specific columns:", eventSpecificColumns);
        const now = Date.now();
        const timestamp = new Date(now).toISOString();

        const event: MainTableEvent = {
            EventType: eventType,
            EventID: generateID(),
            SubjectID: this.state.SubjectID,
            ToolInstances: this.state.ToolInstances,
            // Filled in by the server
            CodeStateID: null,
            Order: this.state.Order,
            // Assuming we update the spec to have timezone included in the timestamp
            ClientTimestamp: timestamp,
            ...eventSpecificColumns
        };
        // console.log("Constructed event:", event);

        // Scoped to just this session
        this.state.Order = (this.state.Order ?? 0) + 1;

        for (const handler of this.eventHandlers) {
            handler.onEvent(event);
        }
    }

    private lastSessionID: string | null = null;

    logSessionStart(sessionID?: string) {
        if (this.lastSessionID) {
            ErrorHandler.logError(`Session already started with ID: ${this.lastSessionID}`);
        }
        this.lastSessionID = sessionID || generateID();

        super.logSessionStart(this.lastSessionID);
    }

    logSessionEnd() {
        if (this.lastSessionID === null) {
            ErrorHandler.logError("Session not started");
            this.lastSessionID = generateID();
        }
        super.logSessionEnd(this.lastSessionID);
        this.lastSessionID = null;
    }
}