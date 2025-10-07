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

function testFile(name: string) {
  const data = readTestFile(name);
  const editList = new EditList();
  editList.trace = (...args: any[]) => { console.log(...args); };
  console.log(`Testing file ${name} with ${data.length} events`);
  let firstEvent = true;
  data.forEach(event => {
    if (firstEvent) {
      editList.setInitialText(event.documentText, {
        author: 'existing-text',
        startTime: event.time,
        endTime: event.time,
      });
      firstEvent = false;
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
    expect(editText).toMatch(documentText);
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
  for (; replacedEnd >= replacedStart && replacedEnd >= 0 && replacedEnd < s1.length; replacedEnd--) {
    if (s0[replacedEnd] !== s1[replacedEnd + (s1.length - s0.length)]) {
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

function countEdges(editList: EditList, from: string, to: string): number {
  const headChildren = editList.getHeadChildren();
  let count = 0;
  for (const headChild of headChildren) {
    count += countEdgesRecursive(headChild, from, to);
  }
  return count;
}

function countEdgesRecursive(node: EditNode, from: string, to: string): number {
  let count = 0;
  if (node.text === from) {
    for (const child of node.children) {
      if (child.text === to) {
        count++;
      }
      count += countEdgesRecursive(child, from, to);
    }
  }
  return count;
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
});


describe('Edit List', () => {
  it('should reproduce test1', () => {
    testFile('test1.log');
  });
  it('should reproduce test2', () => {
    console.log("!!!")
    testFile('test2.log');
  });

  it('should handle deletions', () => {
    const texts = [
      'Hello World',
      'Hello ld',
    ];
    const edits = extractEdits(texts);
    const editList = createEditList(texts[0], edits, true);
    console.log((editList.getEdits()[0] as EditNode).toPrintable());

    assert.equal(countEdges(editList, 'Hello ', 'ld'), 1);
    assert.equal(countEdges(editList, 'Hello ', 'World'), 1);

  });
});