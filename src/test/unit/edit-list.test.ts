import { assert, expect, test } from 'vitest'
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { EditList } from '../../edit-list';
import { EventLog } from '../../recorder';


function readTestFile(name: string): EventLog[] {
  const filePath = join(__dirname, 'test-files', name);
  let content = readFileSync(filePath, 'utf-8');
  if (!content.endsWith(']')) {
    content += ']'; // Ensure it ends with a newline
  }
  return JSON.parse(content); // Validate JSON
}

function testFile(name: string) {
  const data = readTestFile(name);
  const editList = new EditList();
  data.forEach(event => {
    event.contentChanges.forEach(change => {
      editList.addEdit(change, {
        author: 'test',
        startTime: event.time,
        endTime: event.time,
      });
    });
    expect(editList.toPlainText()).toMatch(event.documentText);
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