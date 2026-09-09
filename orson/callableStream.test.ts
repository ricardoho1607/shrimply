import assert from 'node:assert/strict';
import test from 'node:test';
import { consumeOrsonCallableStream } from './callableStream.ts';
import { OrsonIncompleteResponseError } from './responseCompletion.ts';

test('a stalled callable rejects at the client timeout even when it ignores abort', async () => {
  const callable = {
    stream: async () => new Promise<never>(() => {}),
  };

  await assert.rejects(
    consumeOrsonCallableStream({
      callable,
      request: {},
      timeoutMs: 10,
    }),
    (error: unknown) => error instanceof OrsonIncompleteResponseError && error.finishReason === 'TIMEOUT',
  );
});
