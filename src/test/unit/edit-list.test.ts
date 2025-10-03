import { assert, expect, test, } from 'vitest';
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { EditList } from '../../edit-list';
import { EventLog, IChangeEvent } from '../../recorder-util';
import { Range, Position } from './vs-code-mock';

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

describe('Edit List Tests', () => {
  it('should reproduce test1', () => {
    testFile('test1.log');
  });
  it('should reproduce test2', () => {
    console.log("!!!")
    testFile('test2.log');
  });
});