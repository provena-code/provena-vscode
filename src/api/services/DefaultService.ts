/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AssignmentSubjectsResponseItem } from '../models/AssignmentSubjectsResponseItem';
import type { LogResult } from '../models/LogResult';
import type { MainTableEvent } from '../models/MainTableEvent';
import type { SubmissionInfo } from '../models/SubmissionInfo';
import type { SubmitEvent } from '../models/SubmitEvent';
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
     * Log Submit
     * Submit an event to the database.
     * @param requestBody
     * @returns LogResult Successful Response
     * @throws ApiError
     */
    public static submit(
        requestBody: SubmitEvent,
    ): CancelablePromise<LogResult> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/submit',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Event Count
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getEventCount(
        requestBody: SubmissionInfo,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/get_event_count',
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
    public static getAssignmentIDs(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/read/assignments',
        });
    }
    /**
     * Get Subject Stats For Assignment
     * @param assignmentId
     * @returns AssignmentSubjectsResponseItem Successful Response
     * @throws ApiError
     */
    public static getSubjectStatsForAssignment(
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
     * Get Code State Sections For Assignment Subject
     * @param assignmentId
     * @param subjectId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getCodeStateSectionsForAssignmentSubject(
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
     * Update Mapping Table Endpoint
     * @returns any Successful Response
     * @throws ApiError
     */
    public static updateMappingTable(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/read/update_mapping_table',
        });
    }
    /**
     * Get Student Edits
     * @param subjectId SubjectID
     * @param startClientTimestamp Start Client Timestamp
     * @param endClientTimestamp End Client Timestamp
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getEditsInRange(
        subjectId: string,
        startClientTimestamp: string,
        endClientTimestamp: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/read/edits_in_range',
            query: {
                'subject_id': subjectId,
                'start_client_timestamp': startClientTimestamp,
                'end_client_timestamp': endClientTimestamp,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Student Edits
     * @param subjectId SubjectID
     * @param codestateSection CodeStateSection
     * @param lastCodestateId Last CodeStateID
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getFileEdits(
        subjectId: string,
        codestateSection: string,
        lastCodestateId?: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/read/edits',
            query: {
                'subject_id': subjectId,
                'codestate_section': codestateSection,
                'last_codestate_id': lastCodestateId,
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
    /**
     * Get Subjects
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getSubjectIDs(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/read/subjects',
        });
    }
    /**
     * Get Client Timestamp Range For Subject
     * @param subjectId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getClientTimestampRangeForSubject(
        subjectId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/read/subjects/{subject_id}/time_range',
            path: {
                'subject_id': subjectId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Codestates For Subject
     * @param subjectId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getCodeStateSectionsForSubject(
        subjectId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/read/subjects/{subject_id}/codestate_sections',
            path: {
                'subject_id': subjectId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
