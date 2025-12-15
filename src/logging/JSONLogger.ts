import * as fs from 'fs';
import * as path from 'path';
import { MainTableEvent } from "../api";
import { BatchEventHandler, IBatchEventHandler } from "./BatchEventHandler";
import { EventLogger } from "./EventLogger";

export class JSONLLogger implements IBatchEventHandler {

    private readonly batchEventHandler: BatchEventHandler;

    constructor(
        public readonly logPath: string,
    ) {
        console.log(logPath);
        this.batchEventHandler = new BatchEventHandler(this, 20, 200);
        fs.mkdirSync(path.dirname(this.logPath), { recursive: true });
        // Initialize the log file
    }

    public register(eventLogger: EventLogger) {
        eventLogger.registerEventHandler(this.batchEventHandler);
    }

    async onEvents(events: MainTableEvent[]): Promise<boolean> {
        const logLines = events.map(entry => JSON.stringify(entry)).join('\n') + '\n';
        fs.appendFileSync(this.logPath, logLines);
        return true;
    }
}
