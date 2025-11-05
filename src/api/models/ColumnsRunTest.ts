/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ExecutionResult } from './ExecutionResult';
export type ColumnsRunTest = {
    ExecutionID: string;
    TestID: string;
    ExecutionResult: ExecutionResult;
    Score?: (number | null);
    ExtraCreditScore?: (number | null);
    ProgramInput?: (string | null);
    ProgramOutput?: (string | null);
    ProgramErrorOutput?: (string | null);
};

