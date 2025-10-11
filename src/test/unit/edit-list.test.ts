import { assert, expect, test, } from 'vitest';
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { EditList } from '../../edit-list';
import { EventLog, IChangeEvent } from '../../recorder-util';
import { Range, Position } from './vs-code-mock';
import { EditNode, Span } from '../../shared/edit-data';

type PositionJson = {
    line: number;
    character: number;
}

type RangeJson = [ PositionJson, PositionJson ];

function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function readTestFile(name: string): EventLog[] {
  const filePath = join(__dirname, 'data', name);
  let content = readFileSync(filePath, 'utf-8').trim();
  if (content.endsWith(',')) {
    content = content.slice(0, -1) + ']';
  }
  return JSON.parse(content); // Validate JSON
}

function testFile(name: string, checkReproduction: boolean, checkHistorySearch: boolean) {
  const data = readTestFile(name);
  const editList = new EditList();
  editList.trace = (...args: any[]) => { console.log(...args); };
  editList.logError = (...args: any[]) => { 
    console.error(...args); 
    assert.fail('Error logged during test');
  };
  console.log(`Testing file ${name} with ${data.length} events`);
  let firstEvent = true;
  let textHistory = [];
  data.forEach(event => {
    if (firstEvent) {
      editList.setInitialText(event.documentText, {
        author: 'existing-text',
        startTime: event.time,
        endTime: event.time,
      });
      firstEvent = false;
      textHistory.push(event.documentText);
      return;
    }
    const isUndoRedo = event.reason !== undefined;
    event.contentChanges.forEach(change => {
      console.log('------------------------- Change -------------------------');
      console.log(change);
      // Range and Position output to JSON as simplified data
      // representations, so we need to convert them back.
      const realRange = change.range as any as RangeJson;
      const realChangeEvent = {
        range: new Range(
          new Position(realRange[0].line, realRange[0].character),
          new Position(realRange[1].line, realRange[1].character)
        ),
        rangeLength: change.rangeLength,
        rangeOffset: change.rangeOffset,
        text: change.text,
      } as IChangeEvent;
      editList.addEdit(realChangeEvent, {
        author: 'test',
        startTime: event.time,
        endTime: event.time,
      }, isUndoRedo);
    });
    const editText = normalizeLineEndings(editList.toPlainText());
    const documentText = normalizeLineEndings(event.documentText);
    if (checkReproduction) {
      expect(editText).toMatch(documentText);
    }
    textHistory.push(event.documentText);
    if (checkHistorySearch) {
      for (let i = 0; i < textHistory.length; i++) {
        const history = textHistory[i];
        console.log(`Searching for history item ${i}: ${history.replace(/\n/g, '\\n').replace(/\r/g, '\\r')}`);
        const match = editList.search(history);
        expect(match).not.toBeNull();
      }
    }
  });
  return editList;
}


/**
 * Extracts the edit information between two strings.
 * The strings must differ only by a single edit:
 * some (potentially empty) text replaced by other (potentially empty) text.
 * @param s0 The original string.
 * @param s1 The modified string.
 * @returns The edit information.
 */
function extractEdit(s0: string, s1: string): IChangeEvent {
  let replacedStart = 0;
  for (; replacedStart < s0.length && replacedStart < s1.length; replacedStart++) {
    if (s0[replacedStart] !== s1[replacedStart]) {
      break;
    }
  }
  let replacedEnd = s0.length - 1;
  for (; replacedEnd >= replacedStart; replacedEnd--) {
    let s1Index = replacedEnd + (s1.length - s0.length);
    if (s1Index < 0 || s1Index < replacedStart) {
      break;
    }
    if (s0[replacedEnd] !== s1[s1Index]) {
      break;
    }
  }
  const insertedText = s1.slice(replacedStart, s1.length - (s0.length - replacedEnd - 1));
  const rangeLength = replacedEnd - replacedStart + 1;
  if (replacedEnd < 0) {
    replacedEnd = 0;
  }
  return {
    range: new Range(
      new Position(replacedStart, 0),
      new Position(replacedEnd, 0)
    ),
    rangeLength,
    rangeOffset: replacedStart,
    text: insertedText,
  };
}

type EditDef = {
  text: string;
  isUndoRedo?: boolean;
  author?: string;
}
type EditDefInput = string | EditDef;

function createEditList(textDefs: EditDefInput[], silently: boolean): EditList {

  // Remove undo/redo markers from texts
  const texts = textDefs.map(t => t instanceof Object ? t.text : t);
  const editDefs = textDefs.map(t => t instanceof Object ? t : { text: t });

  var edits = extractEdits(texts);

  const editList = new EditList();
  if (!silently) {
    editList.trace = (...args: any[]) => { console.log(...args); };
  }

  const initialMetadata = createGenericMetadata();
  if (editDefs[0].author) {
    initialMetadata.author = editDefs[0].author;
  }
  editList.setInitialText(texts[0], initialMetadata);

  edits.forEach((edit, i) => {
    const editDef = editDefs[i + 1];
    const metadata = createGenericMetadata();
    if (editDef.author) {
      metadata.author = editDef.author;
    }
    console.log('------------------------- Adding Edit -------------------------');
    console.log(edit);
    editList.addEdit(edit, metadata, editDef.isUndoRedo);
  });
  return editList;
}

function extractEdits(texts: string[]) {
  const edits: IChangeEvent[] = [];
  for (let i = 0; i < texts.length - 1; i++) {
    const edit = extractEdit(texts[i], texts[i + 1]);
    edits.push(edit);
  }
  return edits;
}

function createGenericMetadata() {
  return {
    author: 'test',
    startTime: Date.now(),
    endTime: Date.now(),
  };
}

function getEdges(editList: EditList, from: string, to: string) {
  const headChildren = editList.getHeadChildren();
  let edges = [] as [EditNode, EditNode][];
  for (const headChild of headChildren) {
    getEdgesRecursive(headChild, from, to, edges);
  }
  return edges;
}

function getEdgesRecursive(node: EditNode, from: string, to: string, edges: [EditNode, EditNode][]) {
  for (const child of node.getChildren()) {
    if (node.text === from && child.text === to) {
      edges.push([node, child]);
    }
    getEdgesRecursive(child, from, to, edges);
  }
  return edges;
}

describe('Extract Edits', () => {
   it('extract edits correctly', () => {
    const texts = [
      'Hello World',
      'Hello',
      'Hell is o',
      'Hell is others',
      'Hello world, others',
    ];
    const edits = extractEdits(texts);
    edits.forEach(e => console.log(e));
    const editList = createEditList(texts, false);

    assert.equal(editList.toPlainText(), texts[texts.length - 1]);
  });

  it('handles internal deletions', () => {
    const texts = [
      'Hello World',
      'Hello ld',
    ];
    const edits = extractEdits(texts);
    assert.equal(edits.length, 1);
    const edit = edits[0];
    assert.equal(edit.rangeOffset, 6);
    assert.equal(edit.rangeLength, 3);
    assert.equal(edit.text, '');
    const editList = createEditList(texts, false);
    assert.equal(editList.toPlainText(), texts[texts.length - 1]);
  });

  it('handles internal deletions surrounded by the same character', () => {
    const texts = [
      'baba',
      'ba',
    ];
    const edits = extractEdits(texts);
    edits.forEach(e => console.log(e));

    const edit = edits[0];
    assert.equal(edit.rangeOffset, 2);
    assert.equal(edit.rangeLength, 2);
    assert.equal(edit.text, '');

    const editList = createEditList(texts, false);

    assert.equal(editList.toPlainText(), texts[texts.length - 1]);
  });

  it('handles internal deletions surrounded by the same character', () => {
    const texts = [
      'Hello this World',
      'Hello World',
    ];
    const edits = extractEdits(texts);
    edits.forEach(e => console.log(e));

    const edit = edits[0];
    assert.equal(edit.rangeOffset, 6);
    assert.equal(edit.rangeLength, 5);
    assert.equal(edit.text, '');

    const editList = createEditList(texts, false);

    assert.equal(editList.toPlainText(), texts[texts.length - 1]);
  });

    it('handles deletions at the start', () => {
    const texts = [
      'Hello World',
      'World',
    ];
    const edits = extractEdits(texts);
    assert.equal(edits.length, 1);
    const edit = edits[0];
    assert.equal(edit.rangeOffset, 0);
    assert.equal(edit.rangeLength, 6);
    assert.equal(edit.text, '');
    const editList = createEditList(texts, false);
    assert.equal(editList.toPlainText(), texts[texts.length - 1]);
  });

  it('handles insertions at the start', () => {
    const texts = [
      'World',
      'Hello World',
    ];
    const edits = extractEdits(texts);
    assert.equal(edits.length, 1);
    const edit = edits[0];
    assert.equal(edit.rangeOffset, 0);
    assert.equal(edit.rangeLength, 0);
    assert.equal(edit.text, 'Hello ');
    const editList = createEditList(texts, false);
    assert.equal(editList.toPlainText(), texts[texts.length - 1]);
  });
});

function testHistorySearch(changes: string[], additionalSearchTexts: string[] = []) {
  const editList = createEditList(changes, false);
  for (let i = 0; i < changes.length; i++) {
    const searchText = changes[i];
    const match = editList.search(searchText);
    if (!match) {
      console.log(`Failed to find match for history item ${i}: \n${searchText.replace(/\n/g, '\\n').replace(/\r/g, '\\r')}`);
    }
    expect(match).not.toBeNull();
  }
  for (const searchText of additionalSearchTexts) {
    const match = editList.search(searchText);
    expect(match).not.toBeNull();
  }
}


describe('Edit List', () => {
  it('should reproduce test1', () => {
    testFile('test1.log', true, false);
  });
  it('should reproduce test2', () => {
    testFile('test2.log', true, false);
  });
  it('should reproduce test3', () => {
    testFile('test3.log', true, false);
  });
  it('should match history for test1', () => {
    testFile('test1.log', false, true);
  });
  it('should match history for test2', () => {
    testFile('test2.log', false, true);
  });

  it('should handle deletions in history search', () => {
    const texts = [
      'Hello World',
      'Hello ld',
    ];
    testHistorySearch(texts);
  });

  it('should handle insertions in history search', () => {
    const texts = [
      'Hello World',
      'Hello cruel World',
    ];
    testHistorySearch(texts);
  });

    it('should handle appends in history search', () => {
    const texts = [
      'Hello World',
      'Hello cWorld',
      'Hello crWorld',
      'Hello cruWorld',
      'Hello crueWorld',
      'Hello cruelWorld',
      'Hello cruel World',
    ];
    testHistorySearch(texts);
  });

  it('should handle deletions', () => {
    const texts = [
      'Hello World',
      'Hello ld',
    ];
    const editList = createEditList(texts, false);
    console.dir((editList.getEdits()[0] as EditNode).toPrintable(), { depth: 5 });

    let e1, e2, e3;
    assert.equal((e1 = getEdges(editList, 'Hello ', 'ld')).length, 1);
    assert.equal((e2 = getEdges(editList, 'Hello ', 'Wor')).length, 1);
    assert.equal((e3 = getEdges(editList, 'Wor', 'ld')).length, 1);

    assert.strictEqual(e1[0][1], e3[0][1]);
    assert.strictEqual(e1[0][0], e2[0][0]);
    assert.strictEqual(e2[0][1], e3[0][0]);
  });

  it('should handle insertions', () => {
    const texts = [
      'Hello World',
      'Hello cruel World',
    ];
    const editList = createEditList(texts, false);
    console.dir((editList.getEdits()[0] as EditNode).toPrintable(), { depth: 5 });

    let e1, e2, e3;
    assert.equal((e1 = getEdges(editList, 'Hello ', 'World')).length, 1);
    assert.equal((e2 = getEdges(editList, 'Hello ', 'cruel ')).length, 1);
    assert.equal((e3 = getEdges(editList, 'cruel ', 'World')).length, 1);

    assert.strictEqual(e1[0][1], e3[0][1]);
    assert.strictEqual(e1[0][0], e2[0][0]);
    assert.strictEqual(e2[0][1], e3[0][0]);
  });

  it('should handle very simple undo/redo', () => {
    const texts = [
      { text: 'abc', isUndoRedo: false, author: 'a1' },
      { text: 'ac', isUndoRedo: false, author: 'a2' },
      { text: 'abc', isUndoRedo: true, author: 'a2' },
    ] as EditDef[];
    const editList = createEditList(texts, false);
    expect(editList.toPlainText()).toEqual(texts[texts.length - 1].text);
    expect(editList.getAuthors(new Span(0, 2), false)).toEqual(new Set(['a1']));
  });

  it('should handle more complex undo/redo', () => {
    const texts = [
      { text: 'Hello World', isUndoRedo: false, author: 'a1' },
      { text: 'Hello this cruel World', isUndoRedo: false, author: 'a2' },
      { text: 'Hello this silly World', isUndoRedo: false, author: 'a3' },
      { text: 'Hello this cruel World', isUndoRedo: true, author: 'a1' },
      { text: 'Hello World', isUndoRedo: true, author: 'a1' },
      { text: 'Hello this silly World', isUndoRedo: true, author: 'a1' },
    ] as EditDef[];
    const editList = createEditList(texts, false);
    expect(editList.toPlainText()).toEqual(texts[texts.length - 1].text);
    expect(editList.getAuthors(new Span(0, 5), false)).toEqual(new Set(['a1']));
    expect(editList.getAuthors(new Span(7, 10), false)).toEqual(new Set(['a2']));
    expect(editList.getAuthors(new Span(11, 15), false)).toEqual(new Set(['a3']));
    expect(editList.getAuthors(new Span(17, 21), false)).toEqual(new Set(['a1']));
  });

  it('should handle undoing a deletion with multiple authors', () => {
    const texts = [
      { text: 'One Two Four Five', isUndoRedo: false, author: 'a1' },
      { text: 'One Two Three Four Five', isUndoRedo: false, author: 'a2' },
      { text: 'One Five', isUndoRedo: false, author: 'a3' },
      { text: 'One Two Three Four Five', isUndoRedo: true, author: 'a4' },
    ] as EditDef[];
    const editList = createEditList(texts, false);
    expect(editList.toPlainText()).toEqual(texts[texts.length - 1].text);
    const wordRanges = [];
    let length = 0;
    for (const word of texts[texts.length - 1].text.split(' ')) {
      wordRanges.push(new Span(length, length + word.length));
      length += word.length + 1;
    }
    console.log(editList.toString());

    expect(editList.getAuthors(wordRanges[0], false)).toEqual(new Set(['a1']));
    expect(editList.getAuthors(wordRanges[1], false)).toEqual(new Set(['a1']));
    expect(editList.getAuthors(wordRanges[2], false)).toEqual(new Set(['a2']));
    expect(editList.getAuthors(wordRanges[3], false)).toEqual(new Set(['a1']));
    expect(editList.getAuthors(wordRanges[4], false)).toEqual(new Set(['a1']));
  });

  it('should handle undoing a deletion of text that exists in multiple locations', () => {
    const texts = [
      { text: 'One Two Four Two', isUndoRedo: false, author: 'a1' },
      { text: 'One  Four Two', isUndoRedo: false, author: 'a2' },
      { text: 'One Two Four Two', isUndoRedo: true, author: 'a3' },
    ] as EditDef[];
    const editList = createEditList(texts, false);
    expect(editList.toPlainText()).toEqual(texts[texts.length - 1].text);
    console.log(editList.toString());

    expect(editList.getAuthors(new Span(0, texts[texts.length - 1].text.length), false)).toEqual(new Set(['a1']));
  });

  it('should correctly attribute testUndo.log', () => {
    const editList = testFile('testUndo.log', true, false);
    expect(editList.getAuthors(new Span(0, 6), false)).toEqual(new Set(['existing-text']));
  });

  it('should handle undo/redo of the first character', () => {
    const texts = [
      { text: 'Two Four Two', isUndoRedo: false, author: 'a1' },
      { text: ' Four Two', isUndoRedo: false, author: 'a2' },
      { text: 'Two Four Two', isUndoRedo: true, author: 'a3' },
    ] as EditDef[];
    const editList = createEditList(texts, false);
    expect(editList.toPlainText()).toEqual(texts[texts.length - 1].text);
    console.log(editList.toString());

    expect(editList.getAuthors(new Span(0, texts[texts.length - 1].text.length), false)).toEqual(new Set(['a1']));
  });

});