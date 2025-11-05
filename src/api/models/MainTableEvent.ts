/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CompileResult } from './CompileResult';
import type { EditType } from './EditType';
import type { EventInitiator } from './EventInitiator';
import type { EventType } from './EventType';
import type { ExecutionResult } from './ExecutionResult';
import type { InterventionCategory } from './InterventionCategory';
export type MainTableEvent = {
    EventType: EventType;
    EventID: string;
    CodeStateID: string;
    SubjectID: string;
    ToolInstances: string;
    Order?: (number | null);
    ClientTimestamp?: (string | null);
    ServerTimestamp?: (string | null);
    CourseID?: (string | null);
    CourseSectionID?: (string | null);
    TermID?: (string | null);
    AssignmentID?: (string | null);
    AssignmentIsGraded?: (boolean | null);
    ProblemID?: (string | null);
    ProblemIsGraded?: (boolean | null);
    Attempt?: (number | null);
    ExperimentalCondition?: (string | null);
    TeamID?: (string | null);
    LoggingErrorID?: (string | null);
    IsFabricatedEvent?: (boolean | null);
    ParentEventID?: (string | null);
    SessionID?: (string | null);
    ProjectID?: (string | null);
    ResourceID?: (string | null);
    CodeStateSection?: (string | null);
    DestinationCodeStateSection?: (string | null);
    EventInitiator?: (EventInitiator | null);
    EditType?: (EditType | null);
    CompileResult?: (CompileResult | null);
    CompileMessageType?: (string | null);
    CompileMessageData?: (string | null);
    SourceLocation?: (string | null);
    ExecutionID?: (string | null);
    TestID?: (string | null);
    ExecutionResult?: (ExecutionResult | null);
    Score?: (number | null);
    ExtraCreditScore?: (number | null);
    ProgramInput?: (string | null);
    ProgramOutput?: (string | null);
    ProgramErrorOutput?: (string | null);
    InterventionCategory?: (InterventionCategory | null);
    InterventionType?: (string | null);
    InterventionMessage?: (string | null);
    InsertedText?: (string | null);
    DeletedText?: (string | null);
};

