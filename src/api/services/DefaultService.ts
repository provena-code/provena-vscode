/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AssignmentSubjectsResponseItem } from '../models/AssignmentSubjectsResponseItem';
import type { Body_addEventsWithCodeStates } from '../models/Body_addEventsWithCodeStates';
import type { ColumnsCompile } from '../models/ColumnsCompile';
import type { ColumnsCompileError } from '../models/ColumnsCompileError';
import type { ColumnsCompileWarning } from '../models/ColumnsCompileWarning';
import type { ColumnsDebugProgram } from '../models/ColumnsDebugProgram';
import type { ColumnsDebugTest } from '../models/ColumnsDebugTest';
import type { ColumnsFileClose } from '../models/ColumnsFileClose';
import type { ColumnsFileCopy } from '../models/ColumnsFileCopy';
import type { ColumnsFileCreate } from '../models/ColumnsFileCreate';
import type { ColumnsFileDelete } from '../models/ColumnsFileDelete';
import type { ColumnsFileEdit } from '../models/ColumnsFileEdit';
import type { ColumnsFileFocus } from '../models/ColumnsFileFocus';
import type { ColumnsFileOpen } from '../models/ColumnsFileOpen';
import type { ColumnsFileRename } from '../models/ColumnsFileRename';
import type { ColumnsFileSave } from '../models/ColumnsFileSave';
import type { ColumnsIntervention } from '../models/ColumnsIntervention';
import type { ColumnsProjectClose } from '../models/ColumnsProjectClose';
import type { ColumnsProjectOpen } from '../models/ColumnsProjectOpen';
import type { ColumnsResourceView } from '../models/ColumnsResourceView';
import type { ColumnsRunProgram } from '../models/ColumnsRunProgram';
import type { ColumnsRunTest } from '../models/ColumnsRunTest';
import type { ColumnsSessionEnd } from '../models/ColumnsSessionEnd';
import type { ColumnsSessionStart } from '../models/ColumnsSessionStart';
import type { ColumnsSubmit } from '../models/ColumnsSubmit';
import type { LogResult } from '../models/LogResult';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DefaultService {
    /**
     * Add Events With Code States
     * Add events and code states to the database at the same time to ensure consistency.
     *
     * Note: TempCodeState.code_state_id is a temporary ID that will be remapped when logging
     * the events. It is used to map multiple events to the same code state in this request.
     * @param requestBody
     * @returns LogResult Successful Response
     * @throws ApiError
     */
    public static addEventsWithCodeStates(
        requestBody: Body_addEventsWithCodeStates,
    ): CancelablePromise<LogResult> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/events_with_code_states',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Generate Api Helper
     * @returns string Successful Response
     * @throws ApiError
     */
    public static generateApiHelper(): CancelablePromise<string> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/generate_api_helper',
        });
    }
    /**
     * Get Additional Column Types
     * Placeholder endpoint to get the additional column types.
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getAdditionalColumnTypesPlaceholderGet(
        requestBody: (ColumnsSessionStart | ColumnsSessionEnd | ColumnsProjectOpen | ColumnsProjectClose | ColumnsFileCreate | ColumnsFileDelete | ColumnsFileOpen | ColumnsFileClose | ColumnsFileSave | ColumnsFileRename | ColumnsFileCopy | ColumnsFileEdit | ColumnsFileFocus | ColumnsCompile | ColumnsCompileError | ColumnsCompileWarning | ColumnsSubmit | ColumnsRunProgram | ColumnsRunTest | ColumnsDebugProgram | ColumnsDebugTest | ColumnsResourceView | ColumnsIntervention),
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/placeholder',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Assignments
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getAssignmentsReadAssignmentsGet(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/read/assignments',
        });
    }
    /**
     * Get Assignments
     * @param assignmentId
     * @returns AssignmentSubjectsResponseItem Successful Response
     * @throws ApiError
     */
    public static getAssignmentsReadAssignmentsAssignmentIdSubjectsGet(
        assignmentId: string,
    ): CancelablePromise<Array<AssignmentSubjectsResponseItem>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/read/assignments/{assignment_id}/subjects',
            path: {
                'assignment_id': assignmentId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Assignments
     * @param assignmentId
     * @param subjectId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getAssignmentsReadAssignmentsAssignmentIdSubjectIdCodeStateSectionsGet(
        assignmentId: string,
        subjectId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/read/assignments/{assignment_id}/{subject_id}/code_state_sections',
            path: {
                'assignment_id': assignmentId,
                'subject_id': subjectId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get All Edits
     * @param assignmentId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getAllEditsReadAssignmentIdEditsGet(
        assignmentId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/read/{assignment_id}/edits',
            path: {
                'assignment_id': assignmentId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Student Edits
     * @param subjectId
     * @param assignmentId
     * @param codestateSection
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getStudentEditsReadSubjectIdAssignmentIdCodestateSectionEditsGet(
        subjectId: string,
        assignmentId: string,
        codestateSection: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/read/{subject_id}/{assignment_id}/{codestate_section}/edits',
            path: {
                'subject_id': subjectId,
                'assignment_id': assignmentId,
                'codestate_section': codestateSection,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
