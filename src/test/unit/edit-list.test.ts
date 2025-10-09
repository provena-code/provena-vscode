import { assert, expect, test, } from 'vitest';
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { EditList } from '../../edit-list';
import { EventLog, IChangeEvent } from '../../recorder-util';
import { Range, Position } from './vs-code-mock';
import { EditNode } from '../../shared/edit-data';

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
      });
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
        const match = editList.query(history);
        expect(match).not.toBeNull();
      }
    }
  });
}

const testFiles = [
  'test1.log',
  'test2.log',
];

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
    if (s1Index === 0) {
      break;
    }
    if (s0[replacedEnd] !== s1[s1Index]) {
      break;
    }
  }
  const insertedText = s1.slice(replacedStart, s1.length - (s0.length - replacedEnd - 1));
  return {
    range: new Range(
      new Position(replacedStart, 0),
      new Position(replacedEnd, 0)
    ),
    rangeLength: replacedEnd - replacedStart + 1,
    rangeOffset: replacedStart,
    text: insertedText,
  };
}

function extractEdits(texts: string[]): IChangeEvent[] {
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

function createEditList(startText: string, edits: IChangeEvent[], silently: boolean): EditList {
  const editList = new EditList();
  if (!silently) {
    editList.trace = (...args: any[]) => { console.log(...args); };
  }
  const metadata = createGenericMetadata();
  editList.setInitialText(startText, metadata);
  edits.forEach(edit => {
    editList.addEdit(edit, metadata);
  });
  return editList;
}

function countEdges(editList: EditList, from: string, to: string) {
  const edges = getEdges(editList, from, to);
  return edges.length;
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
    const editList = createEditList(texts[0], edits, false);

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
    const editList = createEditList(texts[0], edits, false);
    assert.equal(editList.toPlainText(), texts[texts.length - 1]);
  });
});

function testHistorySearch(changes: string[], additionalSearchTexts: string[] = []) {
  const edits = extractEdits(changes);
  const editList = createEditList(changes[0], edits, false);
  for (let i = 0; i < changes.length; i++) {
    const searchText = changes[i];
    const match = editList.query(searchText);
    if (!match) {
      console.log(`Failed to find match for history item ${i}: \n${searchText.replace(/\n/g, '\\n').replace(/\r/g, '\\r')}`);
    }
    expect(match).not.toBeNull();
  }
  for (const searchText of additionalSearchTexts) {
    const match = editList.query(searchText);
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
    const edits = extractEdits(texts);
    const editList = createEditList(texts[0], edits, false);
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
    const edits = extractEdits(texts);
    const editList = createEditList(texts[0], edits, false);
    console.dir((editList.getEdits()[0] as EditNode).toPrintable(), { depth: 5 });

    let e1, e2, e3;
    assert.equal((e1 = getEdges(editList, 'Hello ', 'World')).length, 1);
    assert.equal((e2 = getEdges(editList, 'Hello ', 'cruel ')).length, 1);
    assert.equal((e3 = getEdges(editList, 'cruel ', 'World')).length, 1);

    assert.strictEqual(e1[0][1], e3[0][1]);
    assert.strictEqual(e1[0][0], e2[0][0]);
    assert.strictEqual(e2[0][1], e3[0][0]);
  });
});