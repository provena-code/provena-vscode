/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EditType } from './EditType';
import type { EventInitiator } from './EventInitiator';
export type ColumnsFileEdit = {
    ParentEventID?: (string | null);
    CodeStateSection: string;
    Code?: (string | null);
    EventInitiator?: (EventInitiator | null);
    EditType: EditType;
    SourceLocation?: (string | null);
    InsertText?: (string | null);
    DeleteText?: (string | null);
    DeleteLength?: (string | null);
};

