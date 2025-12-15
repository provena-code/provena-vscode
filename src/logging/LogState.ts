

export type LogState = {
    SubjectID?: string;
    readonly ToolInstances: string;
    Order: number;  // Changes frequently
    readonly SessionID: string;
    // CourseID?: string;
    // CourseSectionID?: string;
    // TermID?: string;
    // AssignmentID?: string;
    // ProblemID?: string;
    // Attempt?: number; // Changes frequently
    // ExperimentalCondition?: string;
    // TeamID?: string;
}

// export const LogFields = [
//     "SubjectID",
//     // "ToolInstances",
//     "Order",
//     // "CourseID",
//     // "CourseSectionID",
//     // "TermID",
//     // "AssignmentID",
//     // "ProblemID",
//     // "Attempt",
//     // "ExperimentalCondition",
//     // "TeamID"
// ] as const satisfies (keyof LogState)[];