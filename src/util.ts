import * as vscode from 'vscode';

export function positionToString(position: vscode.Position): string {
    return `(${position.line},${position.character})`;
}

export function rangeToString(range: vscode.Range): string {
    return `[${positionToString(range.start)} - ${positionToString(range.end)}]`;
}
