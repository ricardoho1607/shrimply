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

test('real activity events advance independently of answer text and ignore old events', async () => {
  const activity: string[] = [], text: string[] = [];
  const callable = { stream: async () => ({
    stream: (async function* () {
      yield {type:'status_step' as const,requestId:'request-1',sequence:1,step:'pond_lookup',state:'running' as const};
      yield {type:'status_step' as const,requestId:'request-1',sequence:2,step:'sampling_lookup',state:'running' as const};
      yield {type:'status_step' as const,requestId:'request-1',sequence:1,step:'pond_lookup',state:'running' as const};
      yield {type:'text_delta' as const,text:'Answer'};
      yield {type:'status_step' as const,requestId:'request-1',sequence:3,step:'answer',state:'completed' as const};
    })(), data:Promise.resolve({text:'Answer',finishReason:'STOP'}),
  }) };
  const result=await consumeOrsonCallableStream({callable,request:{},timeoutMs:1000,onActivity:event=>activity.push(`${event.step}:${event.state}`),onPartialResponse:value=>text.push(value)});
  assert.deepEqual(activity,['pond_lookup:running','sampling_lookup:running','answer:completed']);assert.deepEqual(text,['Answer']);assert.equal(result.finishReason,'STOP');
});
