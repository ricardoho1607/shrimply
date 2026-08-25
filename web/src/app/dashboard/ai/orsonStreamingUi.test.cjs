const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const webSource = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
const mobileSource = fs.readFileSync(path.join(__dirname, '../../../../../app/AIChat.tsx'), 'utf8');

test('web and mobile render Orson partial responses without duplicate reply bubbles', () => {
  for (const source of [webSource, mobileSource]) {
    assert.match(source, /onPartialResponse:\s*\(partialResponse\)/);
    assert.match(source, /upsertReply\(partialResponse\)/);
    assert.match(source, /loading\s*&&\s*!streamingReplyId/);
    assert.match(source, /upsertReply\(aiResponse\)/);
  }
});
