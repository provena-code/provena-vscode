import * as vscode from 'vscode';
import { createHash } from 'crypto';

export function positionToString(position: vscode.Position): string {
    return `(${position.line},${position.character})`;
}

export function rangeToString(range: vscode.Range): string {
    return `[${positionToString(range.start)} - ${positionToString(range.end)}]`;
}

export function loggingHash(str: string, max_length: number = 16): string {
    // quick, deterministic hash of string
    const fullHash = createHash('sha256').update(str).digest('hex');
    return fullHash.substring(0, max_length);
}
