
import * as vscode from 'vscode';

export interface IChangeEvent {
    range: vscode.Range;
    text: string;
    rangeLength: number;
}

export type EventLog = {
    contentChanges: readonly IChangeEvent[];
    reason: number | undefined;
    documentText: string;
    documentUri: string;
    time: number;
};