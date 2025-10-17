
export type EventBase = {
    type: string;
    time: number;
}

export type DocumentEventBase = EventBase & {
    documentUri: string;
    documentText?: string;
}

export interface IChangeEvent {
    text: string;
    rangeLength: number;
    rangeOffset: number;
}

export type EditEvent = DocumentEventBase & {
    contentChanges: readonly IChangeEvent[];
    isUndoOrRedo: boolean;
    reason: number | undefined;
};

export type CopyEvent = EventBase & {
    copiedText: string;
}

export type SaveEvent = DocumentEventBase & {

    // Require text, since it should always be recorded on save
    documentText: string;
}

export type FocusDocumentEvent = DocumentEventBase & {
    type: "FocusDocumentEvent"
}