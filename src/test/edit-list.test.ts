import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { EditList } from '../edit-list';
import { EventLog } from '../recorder';
import * as assert from 'assert';
import * as vscode from 'vscode';




function readTestFile(name: string): EventLog[] {
  const filePath = join(__dirname, '../..', 'test-data', name);
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
    assert.equal(editList.toPlainText(), event.documentText);
  });
}

const testFiles = [
  'test1.log',
];


suite('Test EditList', () => {
  vscode.window.showInformationMessage('Start all tests.');

    testFiles.forEach(file => {
      testFile(file);
    });
});