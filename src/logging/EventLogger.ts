import { ErrorHandler } from "./ErrorHandler";
import { EventLoggerBase } from "./EventLoggerBase";
import { LogState } from "./LogState";
import { generateID } from "./Util";
import { MainTableEvent, EventType, DefaultService, OpenAPI, TempCodeStateEntry, LogResult, CodeStateSectionEntry } from "../api";

export type AdditionalColumns = Parameters<typeof DefaultService.getAdditionalColumnTypesPlaceholderGet>[0];

export type CodeState = CodeStateSectionEntry[];

export class EventLogger extends EventLoggerBase {

    private state: LogState;

    private currentCodeStateID = 0;
    private codeStateHistory: TempCodeStateEntry[] = [];

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

    public updateState(newState: Partial<LogState>) {
        this.state = { ...this.state, ...newState };
    }

    public updateSingleFileCodeState(code: string) {
        this.updateMultipartCodeState([{
            Code: code,
        }]);
    }

    public updateMultipartCodeState(codestate: CodeState) {
        this.currentCodeStateID++;
        const nextCodeState = {
            temp_codestate_id: this.currentCodeStateID.toString(),
            sections: codestate,
        };
        this.codeStateHistory.push(nextCodeState);
    }

    public logEvent<T extends Partial<MainTableEvent>>(eventType: EventType, eventSpecificColumns: T) {
        console.log("Preparing to log event of type:", eventType, "with specific columns:", eventSpecificColumns);
        const now = Date.now();
        // ISO 8601 format with milliseconds in local timezone
        const timestamp = new Date(now).toISOString();
        // Add ms
        console.log("Generated timestamp for event:", timestamp);

        if (this.codeStateHistory.length === 0) {
            this.addEmptyCodeState();
        }

        const event: MainTableEvent = {
            EventType: eventType,
            EventID: generateID(),
            SubjectID: this.state.SubjectID,
            ToolInstances: this.state.ToolInstances,
            CodeStateID: this.currentCodeStateID.toString(),
            Order: this.state.Order,
            // Assuming we update the spec to have timezone included
            ClientTimestamp: timestamp,
            ...eventSpecificColumns
        };
        console.log("Constructed event:", event);

        // TODO: Should the server modify this to make order global...
        // or should events always be within session (I like the former)
        this.state.Order = (this.state.Order ?? 0) + 1;

        // TODO: Batch this
        const lastSentCodeStateID = this.currentCodeStateID;

        console.log("Logging event:", event, "with codestates:", this.codeStateHistory);
        DefaultService.addEventsWithCodeStates({
            events: [event],
            code_states: this.codeStateHistory
        }).then((response: LogResult) => {
            console.log("Event logged successfully:", response);
            if (response?.success) {
                // Remove any code states that predate the current one
                // Keep the current one, since we'll still need it.
                while (true) {
                    const codeState = this.codeStateHistory[0];
                    if (!codeState) {
                        break;
                    }
                    const numericCSID = parseInt(codeState.temp_codestate_id);
                    if (numericCSID >= lastSentCodeStateID) {
                        break;
                    }
                    this.codeStateHistory.shift();
                }
            }
        });
    }

    private addEmptyCodeState() {
        this.currentCodeStateID++;
        this.codeStateHistory.push(
            {temp_codestate_id: this.currentCodeStateID.toString(), sections: [], is_blank: true}
        );
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
        if (this.lastSessionID == null) {
            ErrorHandler.logError("Session not started");
            this.lastSessionID = generateID();
        }
        super.logSessionEnd(this.lastSessionID);
        this.lastSessionID = null;
    }
}