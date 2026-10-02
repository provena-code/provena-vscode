import * as PS2 from "../api";
import { EventType } from "../api";

export abstract class EventLoggerBase {
    public abstract logEvent(eventType: EventType, eventSpecificColumns: Partial<PS2.MainTableEvent>): PS2.MainTableEvent;


    /**
     * Logs a "Session.Start" event to the server.
     * Marks the start of a work session.
     *
     * @param sessionID - SessionID: A session is generally defined as a distinct period of time during which a student is interacting with a tool/program. Sessions are somewhat ill-defined and may vary across datasets. Session IDs must be unique across subjects and across distinct sessions. This ID may be the EventID of the SessionStart event that initiated the session, or it may be derived independently.
     * @returns void
     */
    public logSessionStart(sessionID: string): PS2.MainTableEvent {
        return this.logEvent(EventType.SESSION_START, {
            SessionID: sessionID
        });
    }


    /**
     * Logs a "Session.End" event to the server.
     * Marks the end of a work session.
     *
     * @param sessionID - SessionID: A session is generally defined as a distinct period of time during which a student is interacting with a tool/program. Sessions are somewhat ill-defined and may vary across datasets. Session IDs must be unique across subjects and across distinct sessions. This ID may be the EventID of the SessionStart event that initiated the session, or it may be derived independently.
     * @returns void
     */
    public logSessionEnd(sessionID: string): PS2.MainTableEvent {
        return this.logEvent(EventType.SESSION_END, {
            SessionID: sessionID
        });
    }


    /**
     * Logs a "Project.Open" event to the server.
     * Indicates that a project was opened.
     *
     * @param projectID - ProjectID: A project is a collection of source files that can be opened and closed (in Project.* events). Note that a project may be distinct from an assignment or problem. For example, one assignment might extend another, in which case the student will load the same project and continue working on it.
     * Data producers should only generate Project.* events and ProjectID values if the underlying data source has an explicit concept of "project".
     * @returns void
     */
    public logProjectOpen(projectID: string): PS2.MainTableEvent {
        return this.logEvent(EventType.PROJECT_OPEN, {
            ProjectID: projectID
        });
    }


    /**
     * Logs a "Project.Close" event to the server.
     * Indicates that a project was closed due to an explicit user or system action. Data consumers should be prepared to handle cases where Project.Open is not terminated by an explicit Project.Close.
     *
     * @param projectID - ProjectID: A project is a collection of source files that can be opened and closed (in Project.* events). Note that a project may be distinct from an assignment or problem. For example, one assignment might extend another, in which case the student will load the same project and continue working on it.
     * Data producers should only generate Project.* events and ProjectID values if the underlying data source has an explicit concept of "project".
     * @returns void
     */
    public logProjectClose(projectID: string): PS2.MainTableEvent {
        return this.logEvent(EventType.PROJECT_CLOSE, {
            ProjectID: projectID
        });
    }


    /**
     * Logs a "File.Create" event to the server.
     * Indicates that a file was created.
     *
     * @param codeStateSection - CodeStateSection: A CodeStateSection value names a single file or resource within a CodeState which is specifically associated with the event.  Examples:
     * * In a File.Create event, the CodeStateSection identifies the file created
     * * In a Compile.Error event, the CodeStateSection identifies the source file in which the compilation error occurs
     * Note that for events where there is both a "source" file/resource and a "destination" file/resource, the CodeStateSection value indicates the "source".  For example, for File.Copy and File.Rename events, the CodeStateSection names the "original" file.  (Note that in the case of File.Rename events, the CodeStateSection value identifies a file or resource in the previous CodeState.)
     * Note that a CodeStateSection may only refer to a single file.  Cases where multiple resources are accessed or modified at the same time (such as using "Save All" to save all files) should be represented as multiple events, each with its own distinct CodeStateSection.
     * Also note that CodeStateSections should not be used for CodeStates in the Table format, as all table data is contained in the same file.
     * @param code - Code: The contents of the CodeStateSection **after** the given event has occurred.
     * @param eventInitiator - EventInitiator: Events are typically performed by either the user, the tool, or the instructor. When known, this column should specify which one instigated the event.
     * Note that user, instructor, and team members can initiate actions either directly or indirectly. A direct action is one the person purposefully makes (like typing or editing a program with mouse clicks); an indirect action is one that is caused by a user action, but not done directly by the user (like when a user accepts an autocomplete recommendation and the text is filled in).
     * Users are encouraged to apply the built-in enum values whenever possible, but if a new value is necessary, the coder may define a new custom enum value and document the new value in the README.md.
     * @returns void
     */
    public logFileCreate(codeStateSection: string, code?: string, eventInitiator?: PS2.EventInitiator): PS2.MainTableEvent {
        return this.logEvent(EventType.FILE_CREATE, {
            CodeStateSection: codeStateSection, Code: code, EventInitiator: eventInitiator
        });
    }


    /**
     * Logs a "File.Delete" event to the server.
     * Indicates that a file was deleted.
     *
     * @param codeStateSection - CodeStateSection: A CodeStateSection value names a single file or resource within a CodeState which is specifically associated with the event.  Examples:
     * * In a File.Create event, the CodeStateSection identifies the file created
     * * In a Compile.Error event, the CodeStateSection identifies the source file in which the compilation error occurs
     * Note that for events where there is both a "source" file/resource and a "destination" file/resource, the CodeStateSection value indicates the "source".  For example, for File.Copy and File.Rename events, the CodeStateSection names the "original" file.  (Note that in the case of File.Rename events, the CodeStateSection value identifies a file or resource in the previous CodeState.)
     * Note that a CodeStateSection may only refer to a single file.  Cases where multiple resources are accessed or modified at the same time (such as using "Save All" to save all files) should be represented as multiple events, each with its own distinct CodeStateSection.
     * Also note that CodeStateSections should not be used for CodeStates in the Table format, as all table data is contained in the same file.
     * @param eventInitiator - EventInitiator: Events are typically performed by either the user, the tool, or the instructor. When known, this column should specify which one instigated the event.
     * Note that user, instructor, and team members can initiate actions either directly or indirectly. A direct action is one the person purposefully makes (like typing or editing a program with mouse clicks); an indirect action is one that is caused by a user action, but not done directly by the user (like when a user accepts an autocomplete recommendation and the text is filled in).
     * Users are encouraged to apply the built-in enum values whenever possible, but if a new value is necessary, the coder may define a new custom enum value and document the new value in the README.md.
     * @returns void
     */
    public logFileDelete(codeStateSection: string, eventInitiator?: PS2.EventInitiator): PS2.MainTableEvent {
        return this.logEvent(EventType.FILE_DELETE, {
            CodeStateSection: codeStateSection, EventInitiator: eventInitiator
        });
    }


    /**
     * Logs a "File.Open" event to the server.
     * Indicates that a file was opened.
     *
     * @param codeStateSection - CodeStateSection: A CodeStateSection value names a single file or resource within a CodeState which is specifically associated with the event.  Examples:
     * * In a File.Create event, the CodeStateSection identifies the file created
     * * In a Compile.Error event, the CodeStateSection identifies the source file in which the compilation error occurs
     * Note that for events where there is both a "source" file/resource and a "destination" file/resource, the CodeStateSection value indicates the "source".  For example, for File.Copy and File.Rename events, the CodeStateSection names the "original" file.  (Note that in the case of File.Rename events, the CodeStateSection value identifies a file or resource in the previous CodeState.)
     * Note that a CodeStateSection may only refer to a single file.  Cases where multiple resources are accessed or modified at the same time (such as using "Save All" to save all files) should be represented as multiple events, each with its own distinct CodeStateSection.
     * Also note that CodeStateSections should not be used for CodeStates in the Table format, as all table data is contained in the same file.
     * @param code - Code: The contents of the CodeStateSection **after** the given event has occurred.
     * @param eventInitiator - EventInitiator: Events are typically performed by either the user, the tool, or the instructor. When known, this column should specify which one instigated the event.
     * Note that user, instructor, and team members can initiate actions either directly or indirectly. A direct action is one the person purposefully makes (like typing or editing a program with mouse clicks); an indirect action is one that is caused by a user action, but not done directly by the user (like when a user accepts an autocomplete recommendation and the text is filled in).
     * Users are encouraged to apply the built-in enum values whenever possible, but if a new value is necessary, the coder may define a new custom enum value and document the new value in the README.md.
     * @returns void
     */
    public logFileOpen(codeStateSection: string, code?: string, eventInitiator?: PS2.EventInitiator): PS2.MainTableEvent {
        return this.logEvent(EventType.FILE_OPEN, {
            CodeStateSection: codeStateSection, Code: code, EventInitiator: eventInitiator
        });
    }


    /**
     * Logs a "File.Close" event to the server.
     * Indicates that a file was closed.
     *
     * @param codeStateSection - CodeStateSection: A CodeStateSection value names a single file or resource within a CodeState which is specifically associated with the event.  Examples:
     * * In a File.Create event, the CodeStateSection identifies the file created
     * * In a Compile.Error event, the CodeStateSection identifies the source file in which the compilation error occurs
     * Note that for events where there is both a "source" file/resource and a "destination" file/resource, the CodeStateSection value indicates the "source".  For example, for File.Copy and File.Rename events, the CodeStateSection names the "original" file.  (Note that in the case of File.Rename events, the CodeStateSection value identifies a file or resource in the previous CodeState.)
     * Note that a CodeStateSection may only refer to a single file.  Cases where multiple resources are accessed or modified at the same time (such as using "Save All" to save all files) should be represented as multiple events, each with its own distinct CodeStateSection.
     * Also note that CodeStateSections should not be used for CodeStates in the Table format, as all table data is contained in the same file.
     * @param eventInitiator - EventInitiator: Events are typically performed by either the user, the tool, or the instructor. When known, this column should specify which one instigated the event.
     * Note that user, instructor, and team members can initiate actions either directly or indirectly. A direct action is one the person purposefully makes (like typing or editing a program with mouse clicks); an indirect action is one that is caused by a user action, but not done directly by the user (like when a user accepts an autocomplete recommendation and the text is filled in).
     * Users are encouraged to apply the built-in enum values whenever possible, but if a new value is necessary, the coder may define a new custom enum value and document the new value in the README.md.
     * @returns void
     */
    public logFileClose(codeStateSection: string, eventInitiator?: PS2.EventInitiator): PS2.MainTableEvent {
        return this.logEvent(EventType.FILE_CLOSE, {
            CodeStateSection: codeStateSection, EventInitiator: eventInitiator
        });
    }


    /**
     * Logs a "File.Save" event to the server.
     * Indicates that a file was saved.
     *
     * @param codeStateSection - CodeStateSection: A CodeStateSection value names a single file or resource within a CodeState which is specifically associated with the event.  Examples:
     * * In a File.Create event, the CodeStateSection identifies the file created
     * * In a Compile.Error event, the CodeStateSection identifies the source file in which the compilation error occurs
     * Note that for events where there is both a "source" file/resource and a "destination" file/resource, the CodeStateSection value indicates the "source".  For example, for File.Copy and File.Rename events, the CodeStateSection names the "original" file.  (Note that in the case of File.Rename events, the CodeStateSection value identifies a file or resource in the previous CodeState.)
     * Note that a CodeStateSection may only refer to a single file.  Cases where multiple resources are accessed or modified at the same time (such as using "Save All" to save all files) should be represented as multiple events, each with its own distinct CodeStateSection.
     * Also note that CodeStateSections should not be used for CodeStates in the Table format, as all table data is contained in the same file.
     * @param code - Code: The contents of the CodeStateSection **after** the given event has occurred.
     * @param eventInitiator - EventInitiator: Events are typically performed by either the user, the tool, or the instructor. When known, this column should specify which one instigated the event.
     * Note that user, instructor, and team members can initiate actions either directly or indirectly. A direct action is one the person purposefully makes (like typing or editing a program with mouse clicks); an indirect action is one that is caused by a user action, but not done directly by the user (like when a user accepts an autocomplete recommendation and the text is filled in).
     * Users are encouraged to apply the built-in enum values whenever possible, but if a new value is necessary, the coder may define a new custom enum value and document the new value in the README.md.
     * @returns void
     */
    public logFileSave(codeStateSection: string, code: string, eventInitiator?: PS2.EventInitiator): PS2.MainTableEvent {
        return this.logEvent(EventType.FILE_SAVE, {
            CodeStateSection: codeStateSection, Code: code, EventInitiator: eventInitiator
        });
    }


    /**
     * Logs a "File.Rename" event to the server.
     * Indicates that a file was renamed.
     *
     * @param codeStateSection - CodeStateSection: A CodeStateSection value names a single file or resource within a CodeState which is specifically associated with the event.  Examples:
     * * In a File.Create event, the CodeStateSection identifies the file created
     * * In a Compile.Error event, the CodeStateSection identifies the source file in which the compilation error occurs
     * Note that for events where there is both a "source" file/resource and a "destination" file/resource, the CodeStateSection value indicates the "source".  For example, for File.Copy and File.Rename events, the CodeStateSection names the "original" file.  (Note that in the case of File.Rename events, the CodeStateSection value identifies a file or resource in the previous CodeState.)
     * Note that a CodeStateSection may only refer to a single file.  Cases where multiple resources are accessed or modified at the same time (such as using "Save All" to save all files) should be represented as multiple events, each with its own distinct CodeStateSection.
     * Also note that CodeStateSections should not be used for CodeStates in the Table format, as all table data is contained in the same file.
     * @param destinationCodeStateSection - DestinationCodeStateSection: For events associated with two files or resources — a "source" and a "destination" — the DestinationCodeStateSection value specifies the destination resource.  For example, for File.Copy and File.Rename events, the DestinationCodeStateSection value specifies the "new" file or resource.
     * Note that this column should only contain a nonempty value if the CodeStateSection column contains a nonempty value.
     * @param eventInitiator - EventInitiator: Events are typically performed by either the user, the tool, or the instructor. When known, this column should specify which one instigated the event.
     * Note that user, instructor, and team members can initiate actions either directly or indirectly. A direct action is one the person purposefully makes (like typing or editing a program with mouse clicks); an indirect action is one that is caused by a user action, but not done directly by the user (like when a user accepts an autocomplete recommendation and the text is filled in).
     * Users are encouraged to apply the built-in enum values whenever possible, but if a new value is necessary, the coder may define a new custom enum value and document the new value in the README.md.
     * @param code - Code: The contents of the CodeStateSection **after** the given event has occurred.
     * @returns void
     */
    public logFileRename(codeStateSection: string, destinationCodeStateSection: string, eventInitiator?: PS2.EventInitiator, code?: string): PS2.MainTableEvent {
        return this.logEvent(EventType.FILE_RENAME, {
            CodeStateSection: codeStateSection, DestinationCodeStateSection: destinationCodeStateSection, EventInitiator: eventInitiator, Code: code
        });
    }


    /**
     * Logs a "File.Copy" event to the server.
     * Indicates that a file was copied.
     *
     * @param codeStateSection - CodeStateSection: A CodeStateSection value names a single file or resource within a CodeState which is specifically associated with the event.  Examples:
     * * In a File.Create event, the CodeStateSection identifies the file created
     * * In a Compile.Error event, the CodeStateSection identifies the source file in which the compilation error occurs
     * Note that for events where there is both a "source" file/resource and a "destination" file/resource, the CodeStateSection value indicates the "source".  For example, for File.Copy and File.Rename events, the CodeStateSection names the "original" file.  (Note that in the case of File.Rename events, the CodeStateSection value identifies a file or resource in the previous CodeState.)
     * Note that a CodeStateSection may only refer to a single file.  Cases where multiple resources are accessed or modified at the same time (such as using "Save All" to save all files) should be represented as multiple events, each with its own distinct CodeStateSection.
     * Also note that CodeStateSections should not be used for CodeStates in the Table format, as all table data is contained in the same file.
     * @param destinationCodeStateSection - DestinationCodeStateSection: For events associated with two files or resources — a "source" and a "destination" — the DestinationCodeStateSection value specifies the destination resource.  For example, for File.Copy and File.Rename events, the DestinationCodeStateSection value specifies the "new" file or resource.
     * Note that this column should only contain a nonempty value if the CodeStateSection column contains a nonempty value.
     * @param eventInitiator - EventInitiator: Events are typically performed by either the user, the tool, or the instructor. When known, this column should specify which one instigated the event.
     * Note that user, instructor, and team members can initiate actions either directly or indirectly. A direct action is one the person purposefully makes (like typing or editing a program with mouse clicks); an indirect action is one that is caused by a user action, but not done directly by the user (like when a user accepts an autocomplete recommendation and the text is filled in).
     * Users are encouraged to apply the built-in enum values whenever possible, but if a new value is necessary, the coder may define a new custom enum value and document the new value in the README.md.
     * @param code - Code: The contents of the CodeStateSection **after** the given event has occurred.
     * @returns void
     */
    public logFileCopy(codeStateSection: string, destinationCodeStateSection: string, eventInitiator?: PS2.EventInitiator, code?: string): PS2.MainTableEvent {
        return this.logEvent(EventType.FILE_COPY, {
            CodeStateSection: codeStateSection, DestinationCodeStateSection: destinationCodeStateSection, EventInitiator: eventInitiator, Code: code
        });
    }


    /**
     * Logs a "File.Edit" event to the server.
     * Indicates that the contents of a file were edited. If a ParentEventID is provided, this indicates that multiple edits took place in the same action.
     *
     * @param codeStateSection - CodeStateSection: A CodeStateSection value names a single file or resource within a CodeState which is specifically associated with the event.  Examples:
     * * In a File.Create event, the CodeStateSection identifies the file created
     * * In a Compile.Error event, the CodeStateSection identifies the source file in which the compilation error occurs
     * Note that for events where there is both a "source" file/resource and a "destination" file/resource, the CodeStateSection value indicates the "source".  For example, for File.Copy and File.Rename events, the CodeStateSection names the "original" file.  (Note that in the case of File.Rename events, the CodeStateSection value identifies a file or resource in the previous CodeState.)
     * Note that a CodeStateSection may only refer to a single file.  Cases where multiple resources are accessed or modified at the same time (such as using "Save All" to save all files) should be represented as multiple events, each with its own distinct CodeStateSection.
     * Also note that CodeStateSections should not be used for CodeStates in the Table format, as all table data is contained in the same file.
     * @param editType - EditType: This value indicates the type of edit which caused the file to change. Specific values are described in the table below. Additional custom values should be documented in the README.md
     * @param eventInitiator - EventInitiator: Events are typically performed by either the user, the tool, or the instructor. When known, this column should specify which one instigated the event.
     * Note that user, instructor, and team members can initiate actions either directly or indirectly. A direct action is one the person purposefully makes (like typing or editing a program with mouse clicks); an indirect action is one that is caused by a user action, but not done directly by the user (like when a user accepts an autocomplete recommendation and the text is filled in).
     * Users are encouraged to apply the built-in enum values whenever possible, but if a new value is necessary, the coder may define a new custom enum value and document the new value in the README.md.
     * @param code - Code: The contents of the CodeStateSection **after** the given event has occurred.
     * @param sourceLocation - SourceLocation: A SourceLocation value represents a location or region within a source file, associated with a compiler diagnostic, static analysis warning, or other message about program source. It can also describe the location of an edit in source code during File.Edit events. Note that due to the large number of ways file contents could change as a result of a File.Edit event, the SourceLocation value associated with a File.Edit event (if any) should be considered to be a “hint” regarding the location of the change(s) represented by the event. The true change corresponding to a File.Edit event is indicated by the changes to the event's CodeState relative to the previous CodeState.
     * @param insertText - InsertText: The text inserted by this File.Edit event, if any.
     * @param deleteText - DeleteText: The text deleted by this File.Delete event, if any.
     * @param deleteLength - DeleteLength: The length of the text deleted by this File.Delete event, if any. Can be used in place of DeleteText.
     * @param parentEventID - ParentEventID: Certain events are hierarchical, where multiple child events might be associated with a single parent event. In these cases, the parent event should be referenced in this column by its EventID value.
     * @returns void
     */
    public logFileEdit(codeStateSection: string, editType: PS2.EditType, eventInitiator?: PS2.EventInitiator, code?: string, sourceLocation?: string, insertText?: string, deleteText?: string, deleteLength?: number, parentEventID?: string): PS2.MainTableEvent {
        return this.logEvent(EventType.FILE_EDIT, {
            CodeStateSection: codeStateSection, EditType: editType, EventInitiator: eventInitiator, Code: code, SourceLocation: sourceLocation, InsertText: insertText, DeleteText: deleteText, DeleteLength: deleteLength, ParentEventID: parentEventID
        });
    }


    /**
     * Logs a "File.Focus" event to the server.
     * Indicates that a file was selected by the user within the user interface.
     *
     * @param codeStateSection - CodeStateSection: A CodeStateSection value names a single file or resource within a CodeState which is specifically associated with the event.  Examples:
     * * In a File.Create event, the CodeStateSection identifies the file created
     * * In a Compile.Error event, the CodeStateSection identifies the source file in which the compilation error occurs
     * Note that for events where there is both a "source" file/resource and a "destination" file/resource, the CodeStateSection value indicates the "source".  For example, for File.Copy and File.Rename events, the CodeStateSection names the "original" file.  (Note that in the case of File.Rename events, the CodeStateSection value identifies a file or resource in the previous CodeState.)
     * Note that a CodeStateSection may only refer to a single file.  Cases where multiple resources are accessed or modified at the same time (such as using "Save All" to save all files) should be represented as multiple events, each with its own distinct CodeStateSection.
     * Also note that CodeStateSections should not be used for CodeStates in the Table format, as all table data is contained in the same file.
     * @param eventInitiator - EventInitiator: Events are typically performed by either the user, the tool, or the instructor. When known, this column should specify which one instigated the event.
     * Note that user, instructor, and team members can initiate actions either directly or indirectly. A direct action is one the person purposefully makes (like typing or editing a program with mouse clicks); an indirect action is one that is caused by a user action, but not done directly by the user (like when a user accepts an autocomplete recommendation and the text is filled in).
     * Users are encouraged to apply the built-in enum values whenever possible, but if a new value is necessary, the coder may define a new custom enum value and document the new value in the README.md.
     * @param code - Code: The contents of the CodeStateSection **after** the given event has occurred.
     * @returns void
     */
    public logFileFocus(codeStateSection: string, eventInitiator?: PS2.EventInitiator, code?: string): PS2.MainTableEvent {
        return this.logEvent(EventType.FILE_FOCUS, {
            CodeStateSection: codeStateSection, EventInitiator: eventInitiator, Code: code
        });
    }


    /**
     * Logs a "File.CopyText" event to the server.
     * Indicates that the user has copied the CopiedText from an open code document to the clipboard. Optionally includes the document (CodeStateSection) and file location (SourceLocation) from which the text was copied.
    Note that for privacy reasons this even should **not** fire when a user copies text outside of the code editor, as this could contain personal information. However, if extern text is pasted into an editor, this can be indicated by setting EditType attribute to Paste.

     *
     * @param copiedText - CopiedText: The text copied to the clipboard from a code editor.
     * @param codeStateSection - CodeStateSection: A CodeStateSection value names a single file or resource within a CodeState which is specifically associated with the event.  Examples:
     * * In a File.Create event, the CodeStateSection identifies the file created
     * * In a Compile.Error event, the CodeStateSection identifies the source file in which the compilation error occurs
     * Note that for events where there is both a "source" file/resource and a "destination" file/resource, the CodeStateSection value indicates the "source".  For example, for File.Copy and File.Rename events, the CodeStateSection names the "original" file.  (Note that in the case of File.Rename events, the CodeStateSection value identifies a file or resource in the previous CodeState.)
     * Note that a CodeStateSection may only refer to a single file.  Cases where multiple resources are accessed or modified at the same time (such as using "Save All" to save all files) should be represented as multiple events, each with its own distinct CodeStateSection.
     * Also note that CodeStateSections should not be used for CodeStates in the Table format, as all table data is contained in the same file.
     * @param sourceLocation - SourceLocation: A SourceLocation value represents a location or region within a source file, associated with a compiler diagnostic, static analysis warning, or other message about program source. It can also describe the location of an edit in source code during File.Edit events. Note that due to the large number of ways file contents could change as a result of a File.Edit event, the SourceLocation value associated with a File.Edit event (if any) should be considered to be a “hint” regarding the location of the change(s) represented by the event. The true change corresponding to a File.Edit event is indicated by the changes to the event's CodeState relative to the previous CodeState.
     * @returns void
     */
    public logFileCopytext(copiedText: string, codeStateSection?: string, sourceLocation?: string): PS2.MainTableEvent {
        return this.logEvent(EventType.FILE_COPY_TEXT, {
            CopiedText: copiedText, CodeStateSection: codeStateSection, SourceLocation: sourceLocation
        });
    }


    /**
     * Logs a "Submit" event to the server.
     * Indicates that code was submitted to the system.
     *
     * @param score - Score: A Score value ranges between 0.0 and 1.0, and indicates the normalized degree of correctness of the submitted code with respect to a specific test (in the case of a Run.Test event) or with respect to all tests and correctness criteria (in the case of a Submit event), excluding extra credit criteria.
     * A completely incorrect test result or submission should be assigned a score of 0.0, and a completely correct test result or submission should be assigned a score of 1.0. If a test result/submission is partially incorrect, it may either have a number in the range [0.0, 1.0) or may be set to 0.0 automatically; this should be specified in the README. In general, it is expected that:
     * A Run.Test event will have a Score of 1.0 if the ExecutionResult is Success, and 0.0 otherwise.
     * A Submit event will have a Score that is the average (possibly weighted) of the Score values of the Run.Test events associated with the Submit event (i.e., those having the same ExecutionID value).
     * In some sense Score values are redundant, because they could be inferred from analyzing Run.Test events. However, for many types of analysis, having a single Score value directly associated with a Submit event is highly valuable, and data providers are strongly encouraged to include Score values.
     * Note that while a Score could be the basis of an assigned grade, there is no implication that a Score is necessarily a grade. It is simply intended to capture the normalized degree of correctness of submitted code.
     * Note also that Run.Test events and potentially even Submit events could omit the Score value if they are intended exclusively as extra credit. Also, events can omit the Score value if it is not possible for a score to be calculated immediately (as is the case for creative or manually graded problems). When a manual grade is provided, an EarnedGrade Intervention should be used to log the grade.
     * @param scoreDetails - ScoreDetails: Details about how the score was calculated, if not present in a LinkTable.
     * @param codeStateSection - CodeStateSection: A CodeStateSection value names a single file or resource within a CodeState which is specifically associated with the event.  Examples:
     * * In a File.Create event, the CodeStateSection identifies the file created
     * * In a Compile.Error event, the CodeStateSection identifies the source file in which the compilation error occurs
     * Note that for events where there is both a "source" file/resource and a "destination" file/resource, the CodeStateSection value indicates the "source".  For example, for File.Copy and File.Rename events, the CodeStateSection names the "original" file.  (Note that in the case of File.Rename events, the CodeStateSection value identifies a file or resource in the previous CodeState.)
     * Note that a CodeStateSection may only refer to a single file.  Cases where multiple resources are accessed or modified at the same time (such as using "Save All" to save all files) should be represented as multiple events, each with its own distinct CodeStateSection.
     * Also note that CodeStateSections should not be used for CodeStates in the Table format, as all table data is contained in the same file.
     * @param code - Code: The contents of the CodeStateSection **after** the given event has occurred.
     * @param parentEventID - ParentEventID: Certain events are hierarchical, where multiple child events might be associated with a single parent event. In these cases, the parent event should be referenced in this column by its EventID value.
     * @returns void
     */
    public logSubmit(score?: number, scoreDetails?: string, codeStateSection?: string, code?: string, parentEventID?: string): PS2.MainTableEvent {
        return this.logEvent(EventType.SUBMIT, {
            Score: score, ScoreDetails: scoreDetails, CodeStateSection: codeStateSection, Code: code, ParentEventID: parentEventID
        });
    }


    /**
     * Logs a "LoggingError" event to the server.
     * Indicates that an error occurred when logging.
     *
     * @param loggingErrorID - LoggingErrorID: Logging errors are an inevitable part of the data collection process. If a data collector finds that an error occurred during the logging process, they should leave the data in its original state, but annotate all erroneous data with IDs, where each ID corresponds to a specific logging error event. Further information about the error can then be provided in a link table (which should include the ID, error type, and an explanation).
     * Note that logging errors can come in many forms, including corrupted/lost data, server downtime, and tool errors that result in incorrect feedback. We define a logging error to be anything that results in the log not accurately representing the true state of the world.
     * @returns void
     */
    public logLoggingerror(loggingErrorID: string): PS2.MainTableEvent {
        return this.logEvent(EventType.LOGGING_ERROR, {
            LoggingErrorID: loggingErrorID
        });
    }
}