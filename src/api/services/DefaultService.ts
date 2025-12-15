/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AssignmentSubjectsResponseItem } from '../models/AssignmentSubjectsResponseItem';
import type { LogResult } from '../models/LogResult';
import type { MainTableEvent } from '../models/MainTableEvent';
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
    public static addEvents(
        requestBody: Array<MainTableEvent>,
    ): CancelablePromise<LogResult> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/events',
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
    /**
     * Get Last Synced Log Index
     * Get the last synced log index for a given session from the database.
     * @param sessionId
     * @returns number Successful Response
     * @throws ApiError
     */
    public static getLastSyncedOrder(
        sessionId: string,
    ): CancelablePromise<number> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/read/sessions/{session_id}/last_synced_order',
            path: {
                'session_id': sessionId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
