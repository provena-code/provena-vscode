/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Possible values for the EventType columns of the MainTable.
 */
export enum EventType {
    SESSION_START = 'Session.Start',
    SESSION_END = 'Session.End',
    PROJECT_OPEN = 'Project.Open',
    PROJECT_CLOSE = 'Project.Close',
    FILE_CREATE = 'File.Create',
    FILE_DELETE = 'File.Delete',
    FILE_OPEN = 'File.Open',
    FILE_CLOSE = 'File.Close',
    FILE_SAVE = 'File.Save',
    FILE_RENAME = 'File.Rename',
    FILE_COPY = 'File.Copy',
    FILE_EDIT = 'File.Edit',
    FILE_FOCUS = 'File.Focus',
    COMPILE = 'Compile',
    COMPILE_ERROR = 'Compile.Error',
    COMPILE_WARNING = 'Compile.Warning',
    SUBMIT = 'Submit',
    RUN_PROGRAM = 'Run.Program',
    RUN_TEST = 'Run.Test',
    DEBUG_PROGRAM = 'Debug.Program',
    DEBUG_TEST = 'Debug.Test',
    RESOURCE_VIEW = 'Resource.View',
    INTERVENTION = 'Intervention',
}
