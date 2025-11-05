import { EventType } from "../api";
import * as PS2 from "../api";

export abstract class EventLoggerBase {
    public abstract logEvent(eventType: EventType, eventSpecificColumns: Partial<PS2.MainTableEvent>): void;

    /**
     * Logs a "Session.Start" event to the server.
     * Marks the start of a work session.
     *
     * @param sessionID - SessionID: A session is generally defined as a distinct period of time during which a student is interacting with a tool/program. Sessions are somewhat ill-defined and may vary across datasets. Session IDs must be unique across subjects and across distinct sessions. This ID may be the EventID of the SessionStart event that initiated the session, or it may be derived independently.
     * @returns void
     */
    public logSessionStart(sessionID: string) {
        this.logEvent(EventType.SESSION_START, {
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
    public logSessionEnd(sessionID: string) {
        this.logEvent(EventType.SESSION_END, {
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
    public logProjectOpen(projectID: string) {
        this.logEvent(EventType.PROJECT_OPEN, {
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
    public logProjectClose(projectID: string) {
        this.logEvent(EventType.PROJECT_CLOSE, {
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
     * @param eventInitiator - EventInitiator: Events are typically performed by either the user, the tool, or the instructor. When known, this column should specify which one instigated the event.
     * Note that user, instructor, and team members can initiate actions either directly or indirectly. A direct action is one the person purposefully makes (like typing or editing a program with mouse clicks); an indirect action is one that is caused by a user action, but not done directly by the user (like when a user accepts an autocomplete recommendation and the text is filled in).
     * Users are encouraged to apply the built-in enum values whenever possible, but if a new value is necessary, the coder may define a new custom enum value and document the new value in the README.md.
     * @returns void
     */
    public logFileCreate(codeStateSection: string, eventInitiator?: PS2.EventInitiator) {
        this.logEvent(EventType.FILE_CREATE, {
            CodeStateSection: codeStateSection, EventInitiator: eventInitiator
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
    public logFileDelete(codeStateSection: string, eventInitiator?: PS2.EventInitiator) {
        this.logEvent(EventType.FILE_DELETE, {
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
     * @param eventInitiator - EventInitiator: Events are typically performed by either the user, the tool, or the instructor. When known, this column should specify which one instigated the event.
     * Note that user, instructor, and team members can initiate actions either directly or indirectly. A direct action is one the person purposefully makes (like typing or editing a program with mouse clicks); an indirect action is one that is caused by a user action, but not done directly by the user (like when a user accepts an autocomplete recommendation and the text is filled in).
     * Users are encouraged to apply the built-in enum values whenever possible, but if a new value is necessary, the coder may define a new custom enum value and document the new value in the README.md.
     * @returns void
     */
    public logFileOpen(codeStateSection: string, eventInitiator?: PS2.EventInitiator) {
        this.logEvent(EventType.FILE_OPEN, {
            CodeStateSection: codeStateSection, EventInitiator: eventInitiator
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
    public logFileClose(codeStateSection: string, eventInitiator?: PS2.EventInitiator) {
        this.logEvent(EventType.FILE_CLOSE, {
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
     * @param eventInitiator - EventInitiator: Events are typically performed by either the user, the tool, or the instructor. When known, this column should specify which one instigated the event.
     * Note that user, instructor, and team members can initiate actions either directly or indirectly. A direct action is one the person purposefully makes (like typing or editing a program with mouse clicks); an indirect action is one that is caused by a user action, but not done directly by the user (like when a user accepts an autocomplete recommendation and the text is filled in).
     * Users are encouraged to apply the built-in enum values whenever possible, but if a new value is necessary, the coder may define a new custom enum value and document the new value in the README.md.
     * @returns void
     */
    public logFileSave(codeStateSection: string, eventInitiator?: PS2.EventInitiator) {
        this.logEvent(EventType.FILE_SAVE, {
            CodeStateSection: codeStateSection, EventInitiator: eventInitiator
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
     * @returns void
     */
    public logFileRename(codeStateSection: string, destinationCodeStateSection: string, eventInitiator?: PS2.EventInitiator) {
        this.logEvent(EventType.FILE_RENAME, {
            CodeStateSection: codeStateSection, DestinationCodeStateSection: destinationCodeStateSection, EventInitiator: eventInitiator
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
     * @returns void
     */
    public logFileCopy(codeStateSection: string, destinationCodeStateSection: string, eventInitiator?: PS2.EventInitiator) {
        this.logEvent(EventType.FILE_COPY, {
            CodeStateSection: codeStateSection, DestinationCodeStateSection: destinationCodeStateSection, EventInitiator: eventInitiator
        });
    }


    /**
     * Logs a "File.Edit" event to the server.
     * Indicates that the contents of a file were edited.
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
     * @param sourceLocation - SourceLocation: A SourceLocation value represents a location or region within a source file, associated with a compiler diagnostic, static analysis warning, or other message about program source. It can also describe the location of an edit in source code during File.Edit events. Note that due to the large number of ways file contents could change as a result of a File.Edit event, the SourceLocation value associated with a File.Edit event (if any) should be considered to be a “hint” regarding the location of the change(s) represented by the event. The true change corresponding to a File.Edit event is indicated by the changes to the event's CodeState relative to the previous CodeState.
     * @param insertedText - InsertedText: The text inserted by this File.Edit event, if any.
     * @param deletedText - DeletedText: The text deleted by this File.Delete event, if any.
     * @returns void
     */
    public logFileEdit(codeStateSection: string, editType: PS2.EditType, eventInitiator?: PS2.EventInitiator, sourceLocation?: string, insertedText?: string, deletedText?: string) {
        this.logEvent(EventType.FILE_EDIT, {
            CodeStateSection: codeStateSection, EditType: editType, EventInitiator: eventInitiator, SourceLocation: sourceLocation, InsertedText: insertedText, DeletedText: deletedText
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
     * @returns void
     */
    public logFileFocus(codeStateSection: string, eventInitiator?: PS2.EventInitiator) {
        this.logEvent(EventType.FILE_FOCUS, {
            CodeStateSection: codeStateSection, EventInitiator: eventInitiator
        });
    }


    /**
     * Logs a "Compile" event to the server.
     * Indicates an attempt to compile all or part of the code.
     *
     * @param codeStateSection - CodeStateSection: A CodeStateSection value names a single file or resource within a CodeState which is specifically associated with the event.  Examples:
     * * In a File.Create event, the CodeStateSection identifies the file created
     * * In a Compile.Error event, the CodeStateSection identifies the source file in which the compilation error occurs
     * Note that for events where there is both a "source" file/resource and a "destination" file/resource, the CodeStateSection value indicates the "source".  For example, for File.Copy and File.Rename events, the CodeStateSection names the "original" file.  (Note that in the case of File.Rename events, the CodeStateSection value identifies a file or resource in the previous CodeState.)
     * Note that a CodeStateSection may only refer to a single file.  Cases where multiple resources are accessed or modified at the same time (such as using "Save All" to save all files) should be represented as multiple events, each with its own distinct CodeStateSection.
     * Also note that CodeStateSections should not be used for CodeStates in the Table format, as all table data is contained in the same file.
     * @param compileResult - CompileResult: Compile events can either result in an error, a warning, or a general success.
     * @param eventInitiator - EventInitiator: Events are typically performed by either the user, the tool, or the instructor. When known, this column should specify which one instigated the event.
     * Note that user, instructor, and team members can initiate actions either directly or indirectly. A direct action is one the person purposefully makes (like typing or editing a program with mouse clicks); an indirect action is one that is caused by a user action, but not done directly by the user (like when a user accepts an autocomplete recommendation and the text is filled in).
     * Users are encouraged to apply the built-in enum values whenever possible, but if a new value is necessary, the coder may define a new custom enum value and document the new value in the README.md.
     * @returns void
     */
    public logCompile(codeStateSection: string, compileResult: PS2.CompileResult, eventInitiator?: PS2.EventInitiator) {
        this.logEvent(EventType.COMPILE, {
            CodeStateSection: codeStateSection, CompileResult: compileResult, EventInitiator: eventInitiator
        });
    }


    /**
     * Logs a "Compile.Error" event to the server.
     * Represents a compilation error and its associated diagnostic.
     *
     * @param parentEventID - ParentEventID: Certain events are hierarchical, where multiple child events might be associated with a single parent event. In these cases, the parent event should be referenced in this column by its EventID value.
     * @param codeStateSection - CodeStateSection: A CodeStateSection value names a single file or resource within a CodeState which is specifically associated with the event.  Examples:
     * * In a File.Create event, the CodeStateSection identifies the file created
     * * In a Compile.Error event, the CodeStateSection identifies the source file in which the compilation error occurs
     * Note that for events where there is both a "source" file/resource and a "destination" file/resource, the CodeStateSection value indicates the "source".  For example, for File.Copy and File.Rename events, the CodeStateSection names the "original" file.  (Note that in the case of File.Rename events, the CodeStateSection value identifies a file or resource in the previous CodeState.)
     * Note that a CodeStateSection may only refer to a single file.  Cases where multiple resources are accessed or modified at the same time (such as using "Save All" to save all files) should be represented as multiple events, each with its own distinct CodeStateSection.
     * Also note that CodeStateSections should not be used for CodeStates in the Table format, as all table data is contained in the same file.
     * @param compileMessageType - CompileMessageType: The type/ID of compile message provided. If no error or warning was given, the string “Success” should be used. The types of errors and warnings used will otherwise vary by language; for example, a Python compile message type might be a ‘SyntaxError' or an ‘IndentationError'.
     * @param compileMessageData - CompileMessageData: The specific compiler message shown to the student.
     * @param sourceLocation - SourceLocation: A SourceLocation value represents a location or region within a source file, associated with a compiler diagnostic, static analysis warning, or other message about program source. It can also describe the location of an edit in source code during File.Edit events. Note that due to the large number of ways file contents could change as a result of a File.Edit event, the SourceLocation value associated with a File.Edit event (if any) should be considered to be a “hint” regarding the location of the change(s) represented by the event. The true change corresponding to a File.Edit event is indicated by the changes to the event's CodeState relative to the previous CodeState.
     * @returns void
     */
    public logCompileError(parentEventID: string, codeStateSection: string, compileMessageType: string, compileMessageData: string, sourceLocation: string) {
        this.logEvent(EventType.COMPILE_ERROR, {
            ParentEventID: parentEventID, CodeStateSection: codeStateSection, CompileMessageType: compileMessageType, CompileMessageData: compileMessageData, SourceLocation: sourceLocation
        });
    }


    /**
     * Logs a "Compile.Warning" event to the server.
     * Represents a compilation warning and its associated diagnostic.
     *
     * @param parentEventID - ParentEventID: Certain events are hierarchical, where multiple child events might be associated with a single parent event. In these cases, the parent event should be referenced in this column by its EventID value.
     * @param codeStateSection - CodeStateSection: A CodeStateSection value names a single file or resource within a CodeState which is specifically associated with the event.  Examples:
     * * In a File.Create event, the CodeStateSection identifies the file created
     * * In a Compile.Error event, the CodeStateSection identifies the source file in which the compilation error occurs
     * Note that for events where there is both a "source" file/resource and a "destination" file/resource, the CodeStateSection value indicates the "source".  For example, for File.Copy and File.Rename events, the CodeStateSection names the "original" file.  (Note that in the case of File.Rename events, the CodeStateSection value identifies a file or resource in the previous CodeState.)
     * Note that a CodeStateSection may only refer to a single file.  Cases where multiple resources are accessed or modified at the same time (such as using "Save All" to save all files) should be represented as multiple events, each with its own distinct CodeStateSection.
     * Also note that CodeStateSections should not be used for CodeStates in the Table format, as all table data is contained in the same file.
     * @param compileMessageType - CompileMessageType: The type/ID of compile message provided. If no error or warning was given, the string “Success” should be used. The types of errors and warnings used will otherwise vary by language; for example, a Python compile message type might be a ‘SyntaxError' or an ‘IndentationError'.
     * @param compileMessageData - CompileMessageData: The specific compiler message shown to the student.
     * @param sourceLocation - SourceLocation: A SourceLocation value represents a location or region within a source file, associated with a compiler diagnostic, static analysis warning, or other message about program source. It can also describe the location of an edit in source code during File.Edit events. Note that due to the large number of ways file contents could change as a result of a File.Edit event, the SourceLocation value associated with a File.Edit event (if any) should be considered to be a “hint” regarding the location of the change(s) represented by the event. The true change corresponding to a File.Edit event is indicated by the changes to the event's CodeState relative to the previous CodeState.
     * @returns void
     */
    public logCompileWarning(parentEventID: string, codeStateSection: string, compileMessageType: string, compileMessageData: string, sourceLocation: string) {
        this.logEvent(EventType.COMPILE_WARNING, {
            ParentEventID: parentEventID, CodeStateSection: codeStateSection, CompileMessageType: compileMessageType, CompileMessageData: compileMessageData, SourceLocation: sourceLocation
        });
    }


    /**
     * Logs a "Submit" event to the server.
     * Indicates that code was submitted to the system.
     *
     * @param executionID - ExecutionID: This ID value is used to group Run.Test events that were part of the same overall test execution. For example, if multiple unit tests were executed, resulting in one Run.Test event for each unit test, all of the Run.Test events in the group should share a common ExecutionID value.
     * If the code execution is associated with a submission, then the Submit event should have an ExecutionID value, and the associated Run.Test, Debug.Test, and/or Run.Program events should share the same ExecutionID value.
     * For consistency, this ID value may also be specified for Run.Program events.
     * @param score - Score: A Score value ranges between 0.0 and 1.0, and indicates the normalized degree of correctness of the submitted code with respect to a specific test (in the case of a Run.Test event) or with respect to all tests and correctness criteria (in the case of a Submit event), excluding extra credit criteria.
     * A completely incorrect test result or submission should be assigned a score of 0.0, and a completely correct test result or submission should be assigned a score of 1.0. If a test result/submission is partially incorrect, it may either have a number in the range [0.0, 1.0) or may be set to 0.0 automatically; this should be specified in the README. In general, it is expected that:
     * A Run.Test event will have a Score of 1.0 if the ExecutionResult is Success, and 0.0 otherwise.
     * A Submit event will have a Score that is the average (possibly weighted) of the Score values of the Run.Test events associated with the Submit event (i.e., those having the same ExecutionID value).
     * In some sense Score values are redundant, because they could be inferred from analyzing Run.Test events. However, for many types of analysis, having a single Score value directly associated with a Submit event is highly valuable, and data providers are strongly encouraged to include Score values.
     * Note that while a Score could be the basis of an assigned grade, there is no implication that a Score is necessarily a grade. It is simply intended to capture the normalized degree of correctness of submitted code.
     * Note also that Run.Test events and potentially even Submit events could omit the Score value if they are intended exclusively as extra credit. Also, events can omit the Score value if it is not possible for a score to be calculated immediately (as is the case for creative or manually graded problems). When a manual grade is provided, an EarnedGrade Intervention should be used to log the grade.
     * @param extraCreditScore - ExtraCreditScore: An ExtraCreditScore value ranges between 0.0 and 1.0, and indicates the degree to which a single test (in the case of Run.Test events) or submission (in the case of Submit events) satisfies extra credit criteria. This column should not contain any value for Run.Test and Submit events that have no extra credit criteria.
     * @returns void
     */
    public logSubmit(executionID?: string, score?: number, extraCreditScore?: number) {
        this.logEvent(EventType.SUBMIT, {
            ExecutionID: executionID, Score: score, ExtraCreditScore: extraCreditScore
        });
    }


    /**
     * Logs a "Run.Program" event to the server.
     * Indicates a program execution and its associated input and/or output.
     *
     * @param executionResult - ExecutionResult: Run.Program events can result in Success (the program runs fully to completion), Timeout (the program's execution is interrupted by the user or the system), or Error (the program execution is terminated by a compiler or runtime error).
     * Run.Test events can result in Success (the test passes), Timeout (the test failed to complete in the allotted time), Error (the test failed due to a fatal runtime exception), or TestFailed (the test produces the incorrect output). Note that assertion errors should be classified as TestFailed, not Error.
     * @param executionID - ExecutionID: This ID value is used to group Run.Test events that were part of the same overall test execution. For example, if multiple unit tests were executed, resulting in one Run.Test event for each unit test, all of the Run.Test events in the group should share a common ExecutionID value.
     * If the code execution is associated with a submission, then the Submit event should have an ExecutionID value, and the associated Run.Test, Debug.Test, and/or Run.Program events should share the same ExecutionID value.
     * For consistency, this ID value may also be specified for Run.Program events.
     * @param score - Score: A Score value ranges between 0.0 and 1.0, and indicates the normalized degree of correctness of the submitted code with respect to a specific test (in the case of a Run.Test event) or with respect to all tests and correctness criteria (in the case of a Submit event), excluding extra credit criteria.
     * A completely incorrect test result or submission should be assigned a score of 0.0, and a completely correct test result or submission should be assigned a score of 1.0. If a test result/submission is partially incorrect, it may either have a number in the range [0.0, 1.0) or may be set to 0.0 automatically; this should be specified in the README. In general, it is expected that:
     * A Run.Test event will have a Score of 1.0 if the ExecutionResult is Success, and 0.0 otherwise.
     * A Submit event will have a Score that is the average (possibly weighted) of the Score values of the Run.Test events associated with the Submit event (i.e., those having the same ExecutionID value).
     * In some sense Score values are redundant, because they could be inferred from analyzing Run.Test events. However, for many types of analysis, having a single Score value directly associated with a Submit event is highly valuable, and data providers are strongly encouraged to include Score values.
     * Note that while a Score could be the basis of an assigned grade, there is no implication that a Score is necessarily a grade. It is simply intended to capture the normalized degree of correctness of submitted code.
     * Note also that Run.Test events and potentially even Submit events could omit the Score value if they are intended exclusively as extra credit. Also, events can omit the Score value if it is not possible for a score to be calculated immediately (as is the case for creative or manually graded problems). When a manual grade is provided, an EarnedGrade Intervention should be used to log the grade.
     * @param extraCreditScore - ExtraCreditScore: An ExtraCreditScore value ranges between 0.0 and 1.0, and indicates the degree to which a single test (in the case of Run.Test events) or submission (in the case of Submit events) satisfies extra credit criteria. This column should not contain any value for Run.Test and Submit events that have no extra credit criteria.
     * @param programInput - ProgramInput: Programs are often provided with input at the beginning of a run or test. The ProgramInput value specifies the URL which records the program input. There are two possibilities for the resource identified by the URL:
     * If the URL refers to a file, the file's contents are the program input. This possibility is intended to handle the case where the program is receiving input via its standard input channel (stdin in C, System.in in Java, etc.)
     * If the URL refers to a directory, the directory contains one or more files that constitute the program's input. This possibility is intended to handle the case where the program is receiving input from some combination of files and standard input. The naming and meaning of these files is unspecified; data producers are encouraged to use descriptive names.
     * ProgramInput and ProgramOutput are all listed as recommended, not required, for Run.* events. However, data collectors are strongly encouraged to provide information on the input/output whenever possible. These values should only be left blank when it is impossible to present the data directly (for example, if the output is an interactive animation that cannot be stored statically).
     * @param programOutput - ProgramOutput: Programs often produce output at the end of a run or test. The ProgramOutput value specifies the URL which records the program output. The URL will typically refer to an “internal” file within the dataset's Resources directory. Note that ProgramOutput is intended to capture the “standard” output channel of the program, i.e., stdout in C, cout in C++, System.out in Java, etc.
     * ProgramInput and ProgramOutput are all listed as recommended, not required, for Run.* events. However, data collectors are strongly encouraged to provide information on the input/output whenever possible. These values should only be left blank when it is impossible to present the data directly (for example, if the output is an interactive animation that cannot be stored statically).
     * @param programErrorOutput - ProgramErrorOutput: Programs often produce error output at the end of a run or test. The ProgramErrorOutput value specifies the URL which records the program's error channel output. The URL will typically refer to an “internal” file within the dataset's Resources directory. Note that ProgramErrorOutput is intended to capture the “error” output channel of the program, i.e., stderr in C, cerr in C++, System.err in Java, etc.
     * @returns void
     */
    public logRunProgram(executionResult: PS2.ExecutionResult, executionID?: string, score?: number, extraCreditScore?: number, programInput?: string, programOutput?: string, programErrorOutput?: string) {
        this.logEvent(EventType.RUN_PROGRAM, {
            ExecutionResult: executionResult, ExecutionID: executionID, Score: score, ExtraCreditScore: extraCreditScore, ProgramInput: programInput, ProgramOutput: programOutput, ProgramErrorOutput: programErrorOutput
        });
    }


    /**
     * Logs a "Run.Test" event to the server.
     * Indicates execution of a test and its associated input and/or output.
     *
     * @param executionID - ExecutionID: This ID value is used to group Run.Test events that were part of the same overall test execution. For example, if multiple unit tests were executed, resulting in one Run.Test event for each unit test, all of the Run.Test events in the group should share a common ExecutionID value.
     * If the code execution is associated with a submission, then the Submit event should have an ExecutionID value, and the associated Run.Test, Debug.Test, and/or Run.Program events should share the same ExecutionID value.
     * For consistency, this ID value may also be specified for Run.Program events.
     * @param testID - TestID: An ID indicating which test case is associated with the event. If desired, a link table may map IDs to further information about the individual test cases. Note that TestID values may be human-readable: for example, the names of JUnit tests could be used as TestID values, but they should still be globally unique (not reused across problems).
     * @param executionResult - ExecutionResult: Run.Program events can result in Success (the program runs fully to completion), Timeout (the program's execution is interrupted by the user or the system), or Error (the program execution is terminated by a compiler or runtime error).
     * Run.Test events can result in Success (the test passes), Timeout (the test failed to complete in the allotted time), Error (the test failed due to a fatal runtime exception), or TestFailed (the test produces the incorrect output). Note that assertion errors should be classified as TestFailed, not Error.
     * @param score - Score: A Score value ranges between 0.0 and 1.0, and indicates the normalized degree of correctness of the submitted code with respect to a specific test (in the case of a Run.Test event) or with respect to all tests and correctness criteria (in the case of a Submit event), excluding extra credit criteria.
     * A completely incorrect test result or submission should be assigned a score of 0.0, and a completely correct test result or submission should be assigned a score of 1.0. If a test result/submission is partially incorrect, it may either have a number in the range [0.0, 1.0) or may be set to 0.0 automatically; this should be specified in the README. In general, it is expected that:
     * A Run.Test event will have a Score of 1.0 if the ExecutionResult is Success, and 0.0 otherwise.
     * A Submit event will have a Score that is the average (possibly weighted) of the Score values of the Run.Test events associated with the Submit event (i.e., those having the same ExecutionID value).
     * In some sense Score values are redundant, because they could be inferred from analyzing Run.Test events. However, for many types of analysis, having a single Score value directly associated with a Submit event is highly valuable, and data providers are strongly encouraged to include Score values.
     * Note that while a Score could be the basis of an assigned grade, there is no implication that a Score is necessarily a grade. It is simply intended to capture the normalized degree of correctness of submitted code.
     * Note also that Run.Test events and potentially even Submit events could omit the Score value if they are intended exclusively as extra credit. Also, events can omit the Score value if it is not possible for a score to be calculated immediately (as is the case for creative or manually graded problems). When a manual grade is provided, an EarnedGrade Intervention should be used to log the grade.
     * @param extraCreditScore - ExtraCreditScore: An ExtraCreditScore value ranges between 0.0 and 1.0, and indicates the degree to which a single test (in the case of Run.Test events) or submission (in the case of Submit events) satisfies extra credit criteria. This column should not contain any value for Run.Test and Submit events that have no extra credit criteria.
     * @param programInput - ProgramInput: Programs are often provided with input at the beginning of a run or test. The ProgramInput value specifies the URL which records the program input. There are two possibilities for the resource identified by the URL:
     * If the URL refers to a file, the file's contents are the program input. This possibility is intended to handle the case where the program is receiving input via its standard input channel (stdin in C, System.in in Java, etc.)
     * If the URL refers to a directory, the directory contains one or more files that constitute the program's input. This possibility is intended to handle the case where the program is receiving input from some combination of files and standard input. The naming and meaning of these files is unspecified; data producers are encouraged to use descriptive names.
     * ProgramInput and ProgramOutput are all listed as recommended, not required, for Run.* events. However, data collectors are strongly encouraged to provide information on the input/output whenever possible. These values should only be left blank when it is impossible to present the data directly (for example, if the output is an interactive animation that cannot be stored statically).
     * @param programOutput - ProgramOutput: Programs often produce output at the end of a run or test. The ProgramOutput value specifies the URL which records the program output. The URL will typically refer to an “internal” file within the dataset's Resources directory. Note that ProgramOutput is intended to capture the “standard” output channel of the program, i.e., stdout in C, cout in C++, System.out in Java, etc.
     * ProgramInput and ProgramOutput are all listed as recommended, not required, for Run.* events. However, data collectors are strongly encouraged to provide information on the input/output whenever possible. These values should only be left blank when it is impossible to present the data directly (for example, if the output is an interactive animation that cannot be stored statically).
     * @param programErrorOutput - ProgramErrorOutput: Programs often produce error output at the end of a run or test. The ProgramErrorOutput value specifies the URL which records the program's error channel output. The URL will typically refer to an “internal” file within the dataset's Resources directory. Note that ProgramErrorOutput is intended to capture the “error” output channel of the program, i.e., stderr in C, cerr in C++, System.err in Java, etc.
     * @returns void
     */
    public logRunTest(executionID: string, testID: string, executionResult: PS2.ExecutionResult, score?: number, extraCreditScore?: number, programInput?: string, programOutput?: string, programErrorOutput?: string) {
        this.logEvent(EventType.RUN_TEST, {
            ExecutionID: executionID, TestID: testID, ExecutionResult: executionResult, Score: score, ExtraCreditScore: extraCreditScore, ProgramInput: programInput, ProgramOutput: programOutput, ProgramErrorOutput: programErrorOutput
        });
    }


    /**
     * Logs a "Debug.Program" event to the server.
     * Indicates a debug execution of the program and its associated input and/or output.
     *
     * @param executionResult - ExecutionResult: Run.Program events can result in Success (the program runs fully to completion), Timeout (the program's execution is interrupted by the user or the system), or Error (the program execution is terminated by a compiler or runtime error).
     * Run.Test events can result in Success (the test passes), Timeout (the test failed to complete in the allotted time), Error (the test failed due to a fatal runtime exception), or TestFailed (the test produces the incorrect output). Note that assertion errors should be classified as TestFailed, not Error.
     * @param executionID - ExecutionID: This ID value is used to group Run.Test events that were part of the same overall test execution. For example, if multiple unit tests were executed, resulting in one Run.Test event for each unit test, all of the Run.Test events in the group should share a common ExecutionID value.
     * If the code execution is associated with a submission, then the Submit event should have an ExecutionID value, and the associated Run.Test, Debug.Test, and/or Run.Program events should share the same ExecutionID value.
     * For consistency, this ID value may also be specified for Run.Program events.
     * @param score - Score: A Score value ranges between 0.0 and 1.0, and indicates the normalized degree of correctness of the submitted code with respect to a specific test (in the case of a Run.Test event) or with respect to all tests and correctness criteria (in the case of a Submit event), excluding extra credit criteria.
     * A completely incorrect test result or submission should be assigned a score of 0.0, and a completely correct test result or submission should be assigned a score of 1.0. If a test result/submission is partially incorrect, it may either have a number in the range [0.0, 1.0) or may be set to 0.0 automatically; this should be specified in the README. In general, it is expected that:
     * A Run.Test event will have a Score of 1.0 if the ExecutionResult is Success, and 0.0 otherwise.
     * A Submit event will have a Score that is the average (possibly weighted) of the Score values of the Run.Test events associated with the Submit event (i.e., those having the same ExecutionID value).
     * In some sense Score values are redundant, because they could be inferred from analyzing Run.Test events. However, for many types of analysis, having a single Score value directly associated with a Submit event is highly valuable, and data providers are strongly encouraged to include Score values.
     * Note that while a Score could be the basis of an assigned grade, there is no implication that a Score is necessarily a grade. It is simply intended to capture the normalized degree of correctness of submitted code.
     * Note also that Run.Test events and potentially even Submit events could omit the Score value if they are intended exclusively as extra credit. Also, events can omit the Score value if it is not possible for a score to be calculated immediately (as is the case for creative or manually graded problems). When a manual grade is provided, an EarnedGrade Intervention should be used to log the grade.
     * @param extraCreditScore - ExtraCreditScore: An ExtraCreditScore value ranges between 0.0 and 1.0, and indicates the degree to which a single test (in the case of Run.Test events) or submission (in the case of Submit events) satisfies extra credit criteria. This column should not contain any value for Run.Test and Submit events that have no extra credit criteria.
     * @param programInput - ProgramInput: Programs are often provided with input at the beginning of a run or test. The ProgramInput value specifies the URL which records the program input. There are two possibilities for the resource identified by the URL:
     * If the URL refers to a file, the file's contents are the program input. This possibility is intended to handle the case where the program is receiving input via its standard input channel (stdin in C, System.in in Java, etc.)
     * If the URL refers to a directory, the directory contains one or more files that constitute the program's input. This possibility is intended to handle the case where the program is receiving input from some combination of files and standard input. The naming and meaning of these files is unspecified; data producers are encouraged to use descriptive names.
     * ProgramInput and ProgramOutput are all listed as recommended, not required, for Run.* events. However, data collectors are strongly encouraged to provide information on the input/output whenever possible. These values should only be left blank when it is impossible to present the data directly (for example, if the output is an interactive animation that cannot be stored statically).
     * @param programOutput - ProgramOutput: Programs often produce output at the end of a run or test. The ProgramOutput value specifies the URL which records the program output. The URL will typically refer to an “internal” file within the dataset's Resources directory. Note that ProgramOutput is intended to capture the “standard” output channel of the program, i.e., stdout in C, cout in C++, System.out in Java, etc.
     * ProgramInput and ProgramOutput are all listed as recommended, not required, for Run.* events. However, data collectors are strongly encouraged to provide information on the input/output whenever possible. These values should only be left blank when it is impossible to present the data directly (for example, if the output is an interactive animation that cannot be stored statically).
     * @param programErrorOutput - ProgramErrorOutput: Programs often produce error output at the end of a run or test. The ProgramErrorOutput value specifies the URL which records the program's error channel output. The URL will typically refer to an “internal” file within the dataset's Resources directory. Note that ProgramErrorOutput is intended to capture the “error” output channel of the program, i.e., stderr in C, cerr in C++, System.err in Java, etc.
     * @returns void
     */
    public logDebugProgram(executionResult: PS2.ExecutionResult, executionID?: string, score?: number, extraCreditScore?: number, programInput?: string, programOutput?: string, programErrorOutput?: string) {
        this.logEvent(EventType.DEBUG_PROGRAM, {
            ExecutionResult: executionResult, ExecutionID: executionID, Score: score, ExtraCreditScore: extraCreditScore, ProgramInput: programInput, ProgramOutput: programOutput, ProgramErrorOutput: programErrorOutput
        });
    }


    /**
     * Logs a "Debug.Test" event to the server.
     * Indicates a debug execution of a test and its associated input and/or output.
     *
     * @param executionID - ExecutionID: This ID value is used to group Run.Test events that were part of the same overall test execution. For example, if multiple unit tests were executed, resulting in one Run.Test event for each unit test, all of the Run.Test events in the group should share a common ExecutionID value.
     * If the code execution is associated with a submission, then the Submit event should have an ExecutionID value, and the associated Run.Test, Debug.Test, and/or Run.Program events should share the same ExecutionID value.
     * For consistency, this ID value may also be specified for Run.Program events.
     * @param testID - TestID: An ID indicating which test case is associated with the event. If desired, a link table may map IDs to further information about the individual test cases. Note that TestID values may be human-readable: for example, the names of JUnit tests could be used as TestID values, but they should still be globally unique (not reused across problems).
     * @param executionResult - ExecutionResult: Run.Program events can result in Success (the program runs fully to completion), Timeout (the program's execution is interrupted by the user or the system), or Error (the program execution is terminated by a compiler or runtime error).
     * Run.Test events can result in Success (the test passes), Timeout (the test failed to complete in the allotted time), Error (the test failed due to a fatal runtime exception), or TestFailed (the test produces the incorrect output). Note that assertion errors should be classified as TestFailed, not Error.
     * @param score - Score: A Score value ranges between 0.0 and 1.0, and indicates the normalized degree of correctness of the submitted code with respect to a specific test (in the case of a Run.Test event) or with respect to all tests and correctness criteria (in the case of a Submit event), excluding extra credit criteria.
     * A completely incorrect test result or submission should be assigned a score of 0.0, and a completely correct test result or submission should be assigned a score of 1.0. If a test result/submission is partially incorrect, it may either have a number in the range [0.0, 1.0) or may be set to 0.0 automatically; this should be specified in the README. In general, it is expected that:
     * A Run.Test event will have a Score of 1.0 if the ExecutionResult is Success, and 0.0 otherwise.
     * A Submit event will have a Score that is the average (possibly weighted) of the Score values of the Run.Test events associated with the Submit event (i.e., those having the same ExecutionID value).
     * In some sense Score values are redundant, because they could be inferred from analyzing Run.Test events. However, for many types of analysis, having a single Score value directly associated with a Submit event is highly valuable, and data providers are strongly encouraged to include Score values.
     * Note that while a Score could be the basis of an assigned grade, there is no implication that a Score is necessarily a grade. It is simply intended to capture the normalized degree of correctness of submitted code.
     * Note also that Run.Test events and potentially even Submit events could omit the Score value if they are intended exclusively as extra credit. Also, events can omit the Score value if it is not possible for a score to be calculated immediately (as is the case for creative or manually graded problems). When a manual grade is provided, an EarnedGrade Intervention should be used to log the grade.
     * @param extraCreditScore - ExtraCreditScore: An ExtraCreditScore value ranges between 0.0 and 1.0, and indicates the degree to which a single test (in the case of Run.Test events) or submission (in the case of Submit events) satisfies extra credit criteria. This column should not contain any value for Run.Test and Submit events that have no extra credit criteria.
     * @param programInput - ProgramInput: Programs are often provided with input at the beginning of a run or test. The ProgramInput value specifies the URL which records the program input. There are two possibilities for the resource identified by the URL:
     * If the URL refers to a file, the file's contents are the program input. This possibility is intended to handle the case where the program is receiving input via its standard input channel (stdin in C, System.in in Java, etc.)
     * If the URL refers to a directory, the directory contains one or more files that constitute the program's input. This possibility is intended to handle the case where the program is receiving input from some combination of files and standard input. The naming and meaning of these files is unspecified; data producers are encouraged to use descriptive names.
     * ProgramInput and ProgramOutput are all listed as recommended, not required, for Run.* events. However, data collectors are strongly encouraged to provide information on the input/output whenever possible. These values should only be left blank when it is impossible to present the data directly (for example, if the output is an interactive animation that cannot be stored statically).
     * @param programOutput - ProgramOutput: Programs often produce output at the end of a run or test. The ProgramOutput value specifies the URL which records the program output. The URL will typically refer to an “internal” file within the dataset's Resources directory. Note that ProgramOutput is intended to capture the “standard” output channel of the program, i.e., stdout in C, cout in C++, System.out in Java, etc.
     * ProgramInput and ProgramOutput are all listed as recommended, not required, for Run.* events. However, data collectors are strongly encouraged to provide information on the input/output whenever possible. These values should only be left blank when it is impossible to present the data directly (for example, if the output is an interactive animation that cannot be stored statically).
     * @param programErrorOutput - ProgramErrorOutput: Programs often produce error output at the end of a run or test. The ProgramErrorOutput value specifies the URL which records the program's error channel output. The URL will typically refer to an “internal” file within the dataset's Resources directory. Note that ProgramErrorOutput is intended to capture the “error” output channel of the program, i.e., stderr in C, cerr in C++, System.err in Java, etc.
     * @returns void
     */
    public logDebugTest(executionID: string, testID: string, executionResult: PS2.ExecutionResult, score?: number, extraCreditScore?: number, programInput?: string, programOutput?: string, programErrorOutput?: string) {
        this.logEvent(EventType.DEBUG_TEST, {
            ExecutionID: executionID, TestID: testID, ExecutionResult: executionResult, Score: score, ExtraCreditScore: extraCreditScore, ProgramInput: programInput, ProgramOutput: programOutput, ProgramErrorOutput: programErrorOutput
        });
    }


    /**
     * Logs a "Resource.View" event to the server.
     * Indicates that a resource (typically a learning resource of some type) was viewed.
     *
     * @param resourceID - ResourceID: Often students access resources while working on problems. Example resources include API documentation, online textbooks, and demo videos. In a dataset which logs student access to resources, each resource must be assigned a distinct ID. If resources are not changed across terms, their IDs should be reused.
     * @returns void
     */
    public logResourceView(resourceID: string) {
        this.logEvent(EventType.RESOURCE_VIEW, {
            ResourceID: resourceID
        });
    }


    /**
     * Logs a "Intervention" event to the server.
     * Indicates that an intervention such as a hint was done.
     *
     * @param eventInitiator - EventInitiator: Events are typically performed by either the user, the tool, or the instructor. When known, this column should specify which one instigated the event.
     * Note that user, instructor, and team members can initiate actions either directly or indirectly. A direct action is one the person purposefully makes (like typing or editing a program with mouse clicks); an indirect action is one that is caused by a user action, but not done directly by the user (like when a user accepts an autocomplete recommendation and the text is filled in).
     * Users are encouraged to apply the built-in enum values whenever possible, but if a new value is necessary, the coder may define a new custom enum value and document the new value in the README.md.
     * @param interventionCategory - InterventionCategory: An Intervention event is an interaction with the subject initiated during the programming process; for example, showing the students a targeted feedback message when they fail a specific test case. We include common intervention categories here, but new ones with names starting with the prefix “X-” may be used. Common interventions should be recommended for inclusion in future versions of ProgSnap 2.
     * Note that Compile and Run events are not interventions; these events are ubiquitous enough that they have been given their own event types.
     * @param interventionType - InterventionType: System-level information about the type of intervention being performed. For feedback, this might be the type of error or code state that was detected; for CodeHighlight, this might be the starting and ending coordinates of the highlighted code. This can be organized freely by the logger, but the format should be consistent within datasets, and should state the information as succinctly as possible.
     * @param interventionMessage - InterventionMessage: The actual intervention message shown to the student, when applicable. If no message is shown but a visual effect occurs, the effect should be described (possibly using a dataset-specific coding scheme).
     * @returns void
     */
    public logIntervention(eventInitiator: PS2.EventInitiator, interventionCategory: PS2.InterventionCategory, interventionType: string, interventionMessage: string) {
        this.logEvent(EventType.INTERVENTION, {
            EventInitiator: eventInitiator, InterventionCategory: interventionCategory, InterventionType: interventionType, InterventionMessage: interventionMessage
        });
    }
}