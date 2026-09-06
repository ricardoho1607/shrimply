/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const webSource = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
const mobileSource = fs.readFileSync(path.join(__dirname, '../../../../../app/AIChat.tsx'), 'utf8');
const webHookSource = fs.readFileSync(path.join(__dirname, '../../../hooks/useGemini.ts'), 'utf8');
const mobileHookSource = fs.readFileSync(path.join(__dirname, '../../../../../app/hooks/useGemini.ts'), 'utf8');

test('web and mobile render Orson replies without duplicate reply bubbles', () => {
  for (const source of [webSource, mobileSource]) {
    assert.match(source, /onPartialResponse:\s*\(partialResponse\)/);
    assert.match(source, /upsertReply\(partialResponse\);/);
    assert.doesNotMatch(source, /upsertReply\(partialResponse,\s*[^)]/);
    assert.match(source, /loading\s*&&\s*!streamingReplyId/);
    assert.match(source, /upsertReply\(aiResponse\)/);
  }
});

test('web streams Orson replies while React Native uses the compatible non-streaming callable', () => {
  assert.match(webHookSource, /consumeOrsonCallableStream\(/);
  assert.doesNotMatch(mobileHookSource, /consumeOrsonCallableStream\(/);
  assert.match(mobileHookSource, /withOrsonTimeout\([\s\S]*generateOrsonResponse\(requestPayload\)/);
});

test('both Firebase clients allow time for the server claim review', () => {
  for (const source of [webHookSource, mobileHookSource]) {
    assert.match(source, /functions, 'generateOrsonResponse', \{ timeout: ORSON_MODEL_TIMEOUT_MS \}/);
  }
});
