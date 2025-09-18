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
  let content = readFileSync(filePath, 'utf-8');
  if (content.trim().endsWith(',')) {
    content = content.trim().slice(0, -1) + ']';
  }
  return JSON.parse(content); // Validate JSON
}

function testFile(name: string) {
  const data = readTestFile(name);
  const editList = new EditList();
  data.forEach(event => {
    if (!event.contentChanges) {
      editList.setInitialText(event.documentText, {
        author: 'existing-text',
        startTime: event.time,
        endTime: event.time,
      });
      return;
    }
    event.contentChanges.forEach(change => {
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
];

describe('Edit List Tests', () => {
  it('should correctly apply edits from the log', () => {
    testFiles.forEach(file => {
      testFile(file);
    });
  });
});