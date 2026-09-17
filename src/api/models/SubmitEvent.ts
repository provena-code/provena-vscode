/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CodeStateSection } from './CodeStateSection';
export type SubmitEvent = {
    SubjectIDs: Array<string>;
    CodeState: Array<CodeStateSection>;
    AssignmentID: string;
    ToolInstances: string;
    Score: (number | null);
    ScoreDetails: (string | null);
    TermID: (string | null);
    CourseID: (string | null);
};

