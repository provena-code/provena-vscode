
import { randomUUID } from 'node:crypto';

export function generateID(): string {
    return randomUUID();
}