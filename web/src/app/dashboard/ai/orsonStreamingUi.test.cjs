/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const webSource = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
const mobileSource = fs.readFileSync(path.join(__dirname, '../../../../../app/AIChat.tsx'), 'utf8');
const webHookSource = fs.readFileSync(path.join(__dirname, '../../../hooks/useGemini.ts'), 'utf8');
const mobileHookSource = fs.readFileSync(path.join(__dirname, '../../../../../app/hooks/useGemini.ts'), 'utf8');
const promptBuilderSource = fs.readFileSync(path.join(__dirname, '../../../../../orson/promptBuilder.ts'), 'utf8');

test('web and mobile render Orson replies without duplicate reply bubbles', () => {
  for (const source of [webSource, mobileSource]) {
    assert.match(source, /onPartialResponse:\s*\(partialResponse\)/);
    assert.match(source, /upsertReply\(partialResponse\);/);
    assert.doesNotMatch(source, /upsertReply\(partialResponse,\s*[^)]/);
    assert.match(source, /loading\s*&&\s*!agent\.activityFinished\s*&&\s*\(!streamingReplyId\s*\|\|/);
    assert.match(source, /upsertReply\(aiResponse\)/);
  }
});

test('web and React Native stream Orson replies with a progressive fallback', () => {
  assert.match(webHookSource, /consumeOrsonCallableStream\(/);
  assert.match(mobileHookSource, /consumeOrsonCallableStream\(/);
  assert.match(mobileHookSource, /emitProgressiveText/);
  assert.match(mobileHookSource, /withOrsonTimeout\([\s\S]*generateOrsonResponse\(requestPayload\)/);
});

test('both Firebase clients allow time for the server claim review', () => {
  for (const source of [webHookSource, mobileHookSource]) {
    assert.match(source, /functions, 'generateOrsonResponse', \{ timeout: ORSON_MODEL_TIMEOUT_MS \}/);
  }
});

test('client deadline allows the backend to complete and retains retry recovery', () => {
  const timeoutMatch = promptBuilderSource.match(/ORSON_CLIENT_TIMEOUT_MS\s*=\s*([\d_]+)/);
  assert.ok(timeoutMatch, 'Orson must define a client response timeout');
  assert.ok(Number(timeoutMatch[1].replaceAll('_', '')) > 155_000);
  assert.ok(Number(timeoutMatch[1].replaceAll('_', '')) <= 165_000);
  assert.match(webHookSource, /timeoutMs:\s*ORSON_CLIENT_TIMEOUT_MS/);
  assert.match(webSource, /retryPrompt/);
  assert.match(webSource, />\{copy\('Retry'\)\}<\/button>/);
});
