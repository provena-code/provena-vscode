import { MainTableEvent } from "../api";
import { CodeState, IEventHandler } from "./EventLogger";

export type EventWithCodestate = {
    event: MainTableEvent;
    codestate: CodeState;
}

export interface IBatchEventHandler {
    onEvents(events: EventWithCodestate[]): void;
}

export class BatchEventHandler implements IEventHandler {

    private eventQueue: EventWithCodestate[] = [];
    private timer: NodeJS.Timeout | null = null;

    private readonly batchEventHandlers: IBatchEventHandler[] = [];

    public constructor(
        public readonly maxEventsPerBatch: number = 20,
        public readonly maxWaitTimeMs: number = 500
    ) {
    }

    public registerBatchEventHandler(handler: IBatchEventHandler) {
        this.batchEventHandlers.push(handler);
        return this;
    }

    onEvent(event: MainTableEvent, codestate: CodeState): void {
        this.eventQueue.push({ event, codestate });
        if (this.eventQueue.length >= this.maxEventsPerBatch) {
            this.flush();
        } else if (!this.timer) {
            this.timer = setTimeout(() => this.flush(), this.maxWaitTimeMs);
        }
    }

    flush(): void {
        if (this.eventQueue.length === 0) {
            return;
        }

        // Notify all registered batch event handlers
        for (const handler of this.batchEventHandlers) {
            handler.onEvents(this.eventQueue);
        }

        // Clear the queues and reset the timer
        this.eventQueue = [];
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }
}