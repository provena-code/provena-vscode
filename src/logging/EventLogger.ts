import { EventType, MainTableEvent, OpenAPI } from "../api";
import { EventLoggerBase } from "./EventLoggerBase";
import { LogState } from "./LogState";
import { generateID } from "./Util";

export interface IEventHandler {
    onEvent(event: MainTableEvent): void;
}

export interface IFlushableEventHandler extends IEventHandler {
    flush(): void;
}

export class EventLogger extends EventLoggerBase {

    private state: LogState;

    private eventHandlers: IEventHandler[] = [];

    private active = true;

    constructor(sessionID: string, toolInstances: string, subjectID?: string) {
        super();
        this.state = {
            SessionID: sessionID,
            ToolInstances: toolInstances,
            Order: 0,
            SubjectID: subjectID,
        };
    }

    public setActive(active: boolean) {
        if (this.active && !active) {
            this.flush();
        }
        this.active = active;
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
            SessionID: this.state.SessionID,
            ...eventSpecificColumns
        };

        // Return before modifying state if not active
        if (!this.active) {
            return event;
        }

        // Scoped to just this session
        this.state.Order = this.state.Order + 1;

        for (const handler of this.eventHandlers) {
            handler.onEvent(event);
        }

        console.log(event.EventType, event);

        return event;
    }

    logSessionStart() {
        return super.logSessionStart(this.state.SessionID);
    }

    logSessionEnd() {
        return super.logSessionEnd(this.state.SessionID);
    }
}