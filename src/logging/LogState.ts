export type LogState = {
    SubjectID: string;
    ToolInstances: string;
    Order?: number;  // Changes frequently
    CourseID?: string;
    CourseSectionID?: string;
    TermID?: string;
    AssignmentID?: string;
    ProblemID?: string;
    Attempt?: number; // Changes frequently
    ExperimentalCondition?: string;
    TeamID?: string;
}