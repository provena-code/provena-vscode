import { assert, expect, test, } from 'vitest';
import { EditListBuilder } from '../../edits/EditListBuilder';
import { EditList } from '../../edits/EditList';
import { createCopyEvent, createEditList, createEditListWithEvents, EditDefInput, extractEdits, createEditEvent } from './edit-utils';
import { Span } from '../../shared/edit-data';

describe('EditListBuilder', () => {
  describe('createEditListWithEvents', () => {
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
  });

  describe('removeRedundantTextChanges', () => {
    it('should handle insertions with redundant text', () => {
      const builder = new EditListBuilder(new EditList());
      const originalText = 'This is my original text';
      builder.addEditEvent(createEditEvent({ text: originalText, rangeOffset: 0, rangeLength: originalText.length }));
      const originalEdit = { text: 'This is my new original text', rangeOffset: 0, rangeLength: originalText.length };
      const modifiedEdit = builder.removeRedundantTextChanges(originalEdit);

      expect(modifiedEdit).toEqual({ text: 'new ', rangeOffset: 11, rangeLength: 0 });
    });

    it('should handle replacements with redundant text', () => {
      const builder = new EditListBuilder(new EditList());
      const originalText = 'This is my original text';
      builder.addEditEvent(createEditEvent({ text: originalText, rangeOffset: 0, rangeLength: originalText.length }));
      const originalEdit = { text: 'This is my new text', rangeOffset: 0, rangeLength: originalText.length };
      const modifiedEdit = builder.removeRedundantTextChanges(originalEdit);

      expect(modifiedEdit).toEqual({ text: 'new', rangeOffset: 11, rangeLength: 'original'.length });
    });
  });
});