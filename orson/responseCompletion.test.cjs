require('sucrase/register/ts');
const test = require('node:test');
const assert = require('node:assert/strict');
const { consumeOrsonCallableStream } = require('./callableStream.ts');
const { requireCompleteOrsonResponse, OrsonIncompleteResponseError } = require('./responseCompletion.ts');
const { OrsonRequestSession, orsonIdentityKey, OrsonSessionChangedError } = require('./session.ts');
const { generateMetaModelResponse } = require('../functions/shared/metaModelApi');
const { generateGroundedOrsonResponse } = require('../functions/shared/orsonAnswerGrounding');

test('a completed Meta reply satisfies the existing web and mobile response contract', async () => {
  const response = await generateMetaModelResponse({
    apiKey: 'test-key', prompt: 'question', maxOutputTokens: 100,
    fetchImpl: async () => new Response(JSON.stringify({ status: 'completed', output_text: 'Complete.' })),
  });
  assert.equal(requireCompleteOrsonResponse(response), 'Complete.');
});

test('reviewed farm answers cross the web stream and mobile completion boundary unchanged', async () => {
  const chunks = [];
  const corrected = 'The cause is not established; no earlier biomass estimate is supplied.';
  let calls = 0;
  const result = await generateGroundedOrsonResponse({
    prompt: 'USER QUESTION:\nWhy did ADG fall?', mode: 'pond_diagnostic', questionRoute: 'farm_analysis',
    onTextDelta: async text => chunks.push({ type: 'text_delta', text }),
    generate: async options => {
      if (++calls === 1) {
        await options.onTextDelta('Growing biomass caused the problem.');
        return { text: 'Growing biomass caused the problem.', finishReason: 'STOP', sources: [] };
      }
      return { text: JSON.stringify({ status: 'rewrite', issues: ['unsupported_biomass_trend'], answer: corrected }), finishReason: 'STOP' };
    },
  });
  const partials = [];
  const received = await consumeOrsonCallableStream({
    callable: { stream: async () => ({ stream: (async function* () { yield* chunks; })(), data: Promise.resolve(result) }) },
    request: {}, timeoutMs: 1000, onPartialResponse: text => partials.push(text),
  });
  assert.deepEqual(partials, [corrected]);
  assert.equal(requireCompleteOrsonResponse(received), corrected);
  assert.equal(requireCompleteOrsonResponse(result), corrected);
  assert.equal(result.groundingStatus, 'revised');
});

test('only a nonempty STOP response is treated as complete', () => {
  assert.equal(requireCompleteOrsonResponse({ text: 'Complete.', finishReason: 'STOP' }), 'Complete.');
  for (const finishReason of ['MAX_TOKENS', 'SAFETY', 'UNKNOWN', undefined]) {
    assert.throws(() => requireCompleteOrsonResponse({ text: 'until the', finishReason }), error => error instanceof OrsonIncompleteResponseError && error.partialText === 'until the');
  }
  assert.throws(() => requireCompleteOrsonResponse({ text: '', finishReason: 'STOP' }), OrsonIncompleteResponseError);
});

test('an interrupted stream preserves partial text for retry without appending a second answer', async () => {
  const partials = [];
  await assert.rejects(consumeOrsonCallableStream({
    callable: { stream: async () => ({
      stream: (async function* () { yield { type: 'text_delta', text: 'until the' }; throw new Error('disconnected'); })(),
      data: Promise.resolve({ text: '' }),
    }) }, request: {}, timeoutMs: 1000, onPartialResponse: text => partials.push(text),
  }), error => error instanceof OrsonIncompleteResponseError && error.partialText === 'until the');
  assert.deepEqual(partials, ['until the']);
});

test('logout cancels stream callbacks and session storage access', async () => {
  const session = new OrsonRequestSession(orsonIdentityKey('A', 'company-A'));
  const partials = [];
  await assert.rejects(consumeOrsonCallableStream({
    callable: { stream: async () => ({
      stream: (async function* () { session.cancel(); yield { type: 'text_delta', text: 'private' }; })(),
      data: Promise.resolve({ text: 'private' }),
    }) }, request: {}, timeoutMs: 1000, signal: session.signal, onPartialResponse: text => partials.push(text),
  }), OrsonSessionChangedError);
  assert.deepEqual(partials, []);
  assert.throws(() => session.storageKey('cache', 'same-question'), OrsonSessionChangedError);
  const other = new OrsonRequestSession(orsonIdentityKey('B', 'company-B'));
  assert.ok(!other.storageKey('cache', 'same-question').includes('company-A'));
});
