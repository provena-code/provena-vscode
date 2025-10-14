import { assert, expect, test, } from 'vitest';
import { EditAttributor } from '../../edits/EditAttributor';
import { EditList } from '../../edits/EditList';
import { createEditList, EditDefInput, extractEdits } from './edit-utils';

describe('EditAttributor', () => {
    it('should correctly attribute copied text', () => {

        // TODO: Need a new method for extracting edits for testing the attributor
        // Need keystroke-level on request and to add copyEvents
        const texts = [
            { text: 'Hello', author: 'u1' },
            { text: 'Hello World ', author: 'u2' },
            { text: 'Hello World', isCopyEvent: true },
            { text: 'Hello World Hello World', author: 'u3' },
        ] as EditDefInput[];

        const editList = createEditList(texts, true);
    });

    // Additional tests can be added here
});