import { DocumentStatus, PS2 } from "provena";
import { isFileRenameEvent } from "provena/src/progsnap/PS2EventTypes";
import * as vscode from 'vscode';
import { MainTableEvent } from "../api";
import { IEventHandler } from "../logging/EventLogger";
import { getCodeStateSecion } from "../logging/Util";
import { Singletons } from "../Singletons";
import { EditDisplay } from "./EditDisplay";

function toCSS(codestateSection: string | vscode.Uri): string {
    if (codestateSection instanceof vscode.Uri) {
        codestateSection = getCodeStateSecion(codestateSection);
    }
    return codestateSection;
}

export class EditListService implements IEventHandler {

    private editLists: Map<string, PS2.Builder> = new Map();
    private editDisplay!: EditDisplay;
    private isInitialized: boolean = false;
    private pendingEvents: any[] = [];

    public init(singletons: Singletons) {
        this.editDisplay = singletons.editDisplay;
        singletons.logger.registerEventHandler(this);

        singletons.logFileService?.getAllLogs().then((logs) => {
            logs.forEach((log) => {
                log.lines.forEach((line) => {
                    try {
                        const event = JSON.parse(line);
                        this.onEvent(event, true);
                    } catch (e) {
                        console.error("Failed to parse log line:", line, e);
                    }
                });
            });
            this.pendingEvents.forEach((event) => {
                this.onEvent(event, true);
            });
            this.pendingEvents = [];
            this.isInitialized = true;
            this.editDisplay.update();
        });
    }

    addEvents(events: any[]) {
        events.forEach((event) => {
            this.onEvent(event);
        });
    }

    onEvent(event: MainTableEvent, fromLogs = false): void {
        // If we haven't read the logs yet, queue up the events
        if (!fromLogs && !this.isInitialized) {
            this.pendingEvents.push(event);
            return;
        }
        if (event.CodeStateSection) {
            const codestateSection = event.CodeStateSection;
            const builder = this.getOrCreateBuilder(codestateSection);
            const parsedEvent = builder.addEventUnsafe(event);
            if (parsedEvent && isFileRenameEvent(parsedEvent)) {
                this.renameEditList(
                    parsedEvent.CodeStateSection,
                    parsedEvent.DestinationCodeStateSection
                );
            }
            if (!fromLogs) {
                // Defer updates until the end when loading logs
                this.editDisplay.update(builder.editList);
            }
        }
    }

    public isEditListVerified(document: vscode.TextDocument): boolean {
        const codestateSection = toCSS(document.uri);
        const builder = this.editLists.get(codestateSection);
        if (!builder) {
            return false;
        }
        const status = builder.editListBuilder.verifyDocumentText(document.getText(), 0, false);
        return status === DocumentStatus.Synced;
    }

    // TODO: Test!
    public renameEditList(oldCodestateSection: string, newCodestateSection: string) {
        const editList = this.editLists.get(oldCodestateSection);
        if (editList) {
            this.editLists.set(newCodestateSection, editList);
            this.editLists.delete(oldCodestateSection);
        }
    }

    /**
     * Gets or creates an EditList builder for the given codestate section.
     * Note: this method should not be used for logging, as this will
     * happen automatically.
     * @param codestateSection
     * @returns
     */
    public getOrCreateBuilder(codestateSection: string | vscode.Uri): PS2.Builder {
        codestateSection = toCSS(codestateSection);
        let builder = this.editLists.get(codestateSection);
        if (!builder) {
            builder = new PS2.Builder(true);
            this.editLists.set(codestateSection, builder);
        }
        return builder;
    }
}