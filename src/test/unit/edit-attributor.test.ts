import { assert, expect, test, } from 'vitest';
import { EditListBuilder } from '../../edits/EditListBuilder';
import { EditList } from '../../edits/EditList';
import { createCopyEvent, createEditList, createEditListWithEvents, EditDefInput, extractEdits } from './edit-utils';
import { Span } from '../../shared/edit-data';

describe('EditAttributor', () => {
    it('should correctly attribute copied text', () => {
        // TODO: The author annotation isn't used here; need another way to think about it.
        // TODO: Need to split text edits up into smaller pieces
        const events = [
            { text: 'Hello', author: 'u1' },
            { text: 'Hello World ', author: 'u2' },
            createCopyEvent('Hello World'),
            { text: 'Hello World Hello World', author: 'u3' },
        ] as EditDefInput[];

        const editList = createEditListWithEvents(events, true);

        expect(editList.getAuthors(new Span(0, 11), false)).toEqual(new Set(['u1']));
        expect(editList.getAuthors(new Span(12, 23), false)).toEqual(new Set(['u2']));

    });

    // Additional tests can be added here
});