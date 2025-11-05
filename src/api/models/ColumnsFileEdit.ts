/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EditType } from './EditType';
import type { EventInitiator } from './EventInitiator';
export type ColumnsFileEdit = {
    CodeStateSection: string;
    EventInitiator?: (EventInitiator | null);
    EditType: EditType;
    SourceLocation?: (string | null);
    InsertedText?: (string | null);
    DeletedText?: (string | null);
};

