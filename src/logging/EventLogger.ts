import { CodeStateSectionEntry, DefaultService, EventType, MainTableEvent, OpenAPI } from "../api";
import { ErrorHandler } from "./ErrorHandler";
import { EventLoggerBase } from "./EventLoggerBase";
import { LogState } from "./LogState";
import { generateID } from "./Util";

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

    constructor(toolInstances: string, subjectID?: string) {
        super();
        this.state = {
            ToolInstances: toolInstances,
            Order: 0,
            SubjectID: subjectID,
        };
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

    public logEvent<T extends Partial<MainTableEvent>>(eventType: EventType, eventSpecificColumns: T): MainTableEvent {
        // console.log("Preparing to log event of type:", eventType, "with specific columns:", eventSpecificColumns);
        const now = Date.now();
        const timestamp = new Date(now).toISOString();

        const event: MainTableEvent = {
            EventType: eventType,
            EventID: generateID(),
            SubjectID: this.state.SubjectID!,
            ToolInstances: this.state.ToolInstances,
            // Filled in by the server
            CodeStateID: undefined!,
            Order: this.state.Order,
            ClientTimestamp: timestamp,
            ...eventSpecificColumns
        };
        // console.log("Constructed event:", event);

        // Scoped to just this session
        this.state.Order = this.state.Order + 1;

        for (const handler of this.eventHandlers) {
            handler.onEvent(event);
        }

        return event;
    }

    private lastSessionID: string | null = null;

    logSessionStart(sessionID?: string) {
        if (this.lastSessionID) {
            ErrorHandler.logError(`Session already started with ID: ${this.lastSessionID}`);
        }
        this.lastSessionID = sessionID || generateID();

        return super.logSessionStart(this.lastSessionID);
    }

    logSessionEnd() {
        if (this.lastSessionID === null) {
            ErrorHandler.logError("Session not started");
            this.lastSessionID = generateID();
        }
        const result = super.logSessionEnd(this.lastSessionID);
        this.lastSessionID = null;
        return result;
    }
}