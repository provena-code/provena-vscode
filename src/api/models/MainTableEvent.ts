/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EditType } from './EditType';
import type { EventInitiator } from './EventInitiator';
import type { EventType } from './EventType';
export type MainTableEvent = {
    EventType: EventType;
    EventID: string;
    CodeStateID?: (string | null);
    SubjectID?: (string | null);
    ToolInstances: string;
    Order?: (number | null);
    ClientTimestamp?: (string | null);
    ServerTimestamp?: (string | null);
    CourseID?: (string | null);
    TermID?: (string | null);
    AssignmentID?: (string | null);
    LoggingErrorID?: (string | null);
    ParentEventID?: (string | null);
    SessionID?: (string | null);
    ProjectID?: (string | null);
    CodeStateSection?: (string | null);
    Code?: (string | null);
    CopiedText?: (string | null);
    DestinationCodeStateSection?: (string | null);
    EventInitiator?: (EventInitiator | null);
    EditType?: (EditType | null);
    SourceLocation?: (string | null);
    Score?: (number | null);
    ScoreDetails?: (string | null);
    ProgramInput?: (string | null);
    ProgramOutput?: (string | null);
    ProgramErrorOutput?: (string | null);
    InsertText?: (string | null);
    DeleteText?: (string | null);
    DeleteLength?: (number | null);
};

