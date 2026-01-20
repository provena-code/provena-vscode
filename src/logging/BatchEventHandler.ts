import { MainTableEvent } from "../api";
import { IFlushableEventHandler } from "./EventLogger";

export interface IBatchEventHandler {
    onEvents(events: MainTableEvent[]): Promise<boolean>;
}

export class BatchEventHandler implements IFlushableEventHandler {

    private eventQueue: MainTableEvent[] = [];
    private timer: NodeJS.Timeout | null = null;
    private eventsSinceLastFlushAttempt: number = 0;
    private isFlushing: boolean = false;


    public constructor(
        private readonly batchEventHandler: IBatchEventHandler,
        public readonly maxEventsPerBatch: number = 20,
        public readonly maxWaitTimeMs: number = 500
    ) {
    }

    onEvent(event: MainTableEvent): void {
        this.eventQueue.push(event);
        if (this.isFlushing) {
            return;
        }
        this.eventsSinceLastFlushAttempt++;
        if (this.eventsSinceLastFlushAttempt >= this.maxEventsPerBatch) {
            this.flush();
        } else if (!this.timer) {
            this.timer = setTimeout(() => this.flush(), this.maxWaitTimeMs);
        }
    }

    async flush(): Promise<void> {
        if (this.eventQueue.length === 0 || this.isFlushing) {
            return;
        }
        this.isFlushing = true;
        this.eventsSinceLastFlushAttempt = 0;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        const eventsToProcess = [...this.eventQueue];
        const eventCount = eventsToProcess.length;

        try {
            const success = await this.batchEventHandler.onEvents(eventsToProcess);
            if (success) {
                // Only clear the queue if the flush was successful
                // and only remove the events that were processed
                this.eventQueue.splice(0, eventCount);
            }
        }
        catch (error) {
            console.error("Error flushing events:", error);
        } finally {
            this.isFlushing = false;
        }
    }
}