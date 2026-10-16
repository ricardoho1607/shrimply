const test = require('node:test');
const assert = require('node:assert/strict');

const {
  META_MODEL_API_BASE_URL,
  META_MODEL_API_MODEL,
  generateMetaModelResponse,
  getOrsonGenerationSettings,
} = require('./metaModelApi');

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json' },
});

test('a prepared farm entry finishes immediately without repeated model tool rounds', async () => {
  const { farmActionToolReply } = require('../orsonAgentTools');
  let requests = 0, preparations = 0;
  const emitted = [];
  const result = await generateMetaModelResponse({
    apiKey: 'test-key', prompt: 'Bisa tolong bantu input pH Kolam sim a1 untuk hari ini pagi 7.8 dan sore 7.9',
    tools: [{ type: 'function', name: 'prepare_farm_actions' }],
    executeTool: async () => { preparations++; return { status: 'awaiting_user_confirmation', rows: [{ valid: true }] }; },
    completeToolResult: evidence => farmActionToolReply(evidence, 'Tolong input pH kolam'),
    onTextDelta: async text => emitted.push(text),
    fetchImpl: async () => {
      requests++;
      return new Response(`data: ${JSON.stringify({ type: 'response.completed', response: { status: 'completed', output: [{ type: 'function_call', name: 'prepare_farm_actions', arguments: '{}', call_id: 'draft' }] } })}\n\n`);
    },
  });
  assert.equal(requests, 1); assert.equal(preparations, 1);
  assert.equal(result.finishReason, 'STOP'); assert.match(result.text, /Belum ada data yang disimpan/);
  assert.deepEqual(emitted, [result.text]);
});

test('the final lookup round requests an answer without more tools', async () => {
  let requests = 0;
  const result = await generateMetaModelResponse({
    apiKey: 'test-key', prompt: 'read records',
    tools: [{ type: 'function', name: 'read_app_records' }], executeTool: async () => ({ records: [] }),
    fetchImpl: async (_, options) => {
      requests++;
      if (requests === 6) {
        assert.equal(JSON.parse(options.body).tools, undefined);
        return jsonResponse({ status: 'completed', output_text: 'No matching records.' });
      }
      return jsonResponse({ status: 'completed', output: [{ type: 'function_call', name: 'read_app_records', arguments: '{}', call_id: `lookup-${requests}` }] });
    },
  });
  assert.equal(result.text, 'No matching records.'); assert.equal(requests, 6);
});

test('diagnostic requests send high reasoning while routine requests stay low', async () => {
  assert.equal(getOrsonGenerationSettings('standard').timeoutMs, 60000);
  assert.equal(getOrsonGenerationSettings('pond_diagnostic').timeoutMs, 90000);

  for (const mode of ['standard', 'pond_diagnostic', 'mortality_diagnostic']) {
    await generateMetaModelResponse({
      apiKey: 'test-key', systemInstruction: 'test', prompt: 'test',
      ...getOrsonGenerationSettings(mode),
      fetchImpl: async (_url, options) => {
        const body = JSON.parse(options.body);
        assert.equal(body.reasoning.effort, mode === 'standard' ? 'low' : 'high');
        assert.ok(body.max_output_tokens >= (mode === 'standard' ? 1000 : 6000));
        return jsonResponse({ status: 'completed', output_text: 'Complete' });
      },
    });
  }
});

test('Meta Model API requests use Muse Spark 1.3 Contributor and preserve prompt roles', async () => {
  let captured;
  const result = await generateMetaModelResponse({
    apiKey: 'test-key',
    systemInstruction: 'system rules',
    prompt: 'farm context and question',
    maxOutputTokens: 1200,
    fetchImpl: async (url, options) => {
      captured = { url, options, body: JSON.parse(options.body) };
      return jsonResponse({
        status: 'completed',
        output_text: 'Measured DO declined.',
        usage: { output_tokens: 8 },
      });
    },
  });

  assert.equal(captured.url, `${META_MODEL_API_BASE_URL}/responses`);
  assert.equal(captured.body.model, META_MODEL_API_MODEL);
  assert.equal(captured.body.instructions, 'system rules');
  assert.equal(captured.body.input, 'farm context and question');
  assert.equal(captured.body.max_output_tokens, 1200);
  assert.equal(captured.body.store, false);
  assert.equal(captured.body.tools, undefined);
  assert.equal(captured.options.headers.Authorization, 'Bearer test-key');
  assert.equal(result.text, 'Measured DO declined.');
  assert.equal(result.finishReason, 'STOP');
  assert.equal(result.outputTokens, 8);
});

test('structured Responses output forwards its exact schema without changing normal chat requests', async () => {
  const responseFormat = { type: 'json_schema', name: 'fixture', strict: true, schema: { type: 'object', properties: {}, required: [], additionalProperties: false } };
  let body;
  await generateMetaModelResponse({
    apiKey: 'synthetic-key', prompt: 'Return JSON.', responseFormat,
    fetchImpl: async (_url, options) => {
      body = JSON.parse(options.body);
      return jsonResponse({ status: 'completed', output_text: '{}' });
    },
  });
  assert.deepEqual(body.text, { format: responseFormat });
  assert.equal(body.tools, undefined);
});

test('Meta response streaming emits text deltas and keeps web citations', async () => {
  const events = [
    { type: 'response.output_text.delta', delta: 'Check ' },
    { type: 'response.output_text.delta', delta: 'morning DO.' },
    {
      type: 'response.completed',
      response: {
        status: 'completed',
        usage: { output_tokens: 12 },
        output: [{
          type: 'message',
          content: [{
            type: 'output_text',
            text: 'Check morning DO.',
            annotations: [{ type: 'url_citation', title: 'Source', url: 'https://example.com/source' }],
          }],
        }],
      },
    },
  ];
  const stream = `${events.map((event) => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`).join('')}data: [DONE]\n\n`;
  const emitted = [];
  let requestBody;

  const result = await generateMetaModelResponse({
    apiKey: 'test-key',
    systemInstruction: 'system rules',
    prompt: 'current research question',
    maxOutputTokens: 1600,
    useWebLookup: true,
    onTextDelta: async (text) => emitted.push(text),
    fetchImpl: async (_url, options) => {
      requestBody = JSON.parse(options.body);
      return new Response(stream, {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
      });
    },
  });

  assert.deepEqual(requestBody.tools, [{ type: 'web_search' }]);
  assert.equal(requestBody.stream, true);
  assert.deepEqual(emitted, ['Check ', 'morning DO.']);
  assert.equal(result.text, 'Check morning DO.');
  assert.equal(result.outputTokens, 12);
  assert.deepEqual(result.sources, [{ title: 'Source', uri: 'https://example.com/source' }]);
});

test('Meta API errors do not expose credentials', async () => {
  await assert.rejects(
    generateMetaModelResponse({
      apiKey: 'private-test-key',
      systemInstruction: 'system rules',
      prompt: 'question',
      maxOutputTokens: 100,
      fetchImpl: async () => jsonResponse({ error: { message: 'model unavailable for private-test-key' } }, 503),
    }),
    (error) => {
      assert.match(error.message, /503.*model unavailable/);
      assert.doesNotMatch(error.message, /private-test-key/);
      return true;
    },
  );
});

test('missing status and truncated output never become completed replies', async () => {
  for (const [body, expected] of [
    [{ output_text: 'Partial reply' }, 'UNKNOWN'],
    [{ status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' }, output_text: 'Partial reply' }, 'MAX_TOKENS'],
    [{ status: 'failed', output_text: 'Partial reply' }, 'FAILED'],
  ]) {
    const result = await generateMetaModelResponse({
      apiKey: 'test-key', prompt: 'question', maxOutputTokens: 100,
      fetchImpl: async () => jsonResponse(body),
    });
    assert.equal(result.finishReason, expected);
    assert.equal(result.text, 'Partial reply');
  }
});

test('a disconnected stream retains its text and stays incomplete', async () => {
  const event = { type: 'response.output_text.delta', delta: 'Partial reply' };
  const result = await generateMetaModelResponse({
    apiKey: 'test-key', prompt: 'question', maxOutputTokens: 100,
    onTextDelta: async () => {},
    fetchImpl: async () => new Response(`data: ${JSON.stringify(event)}\n\n`),
  });
  assert.equal(result.text, 'Partial reply');
  assert.equal(result.finishReason, 'UNKNOWN');
});

test('incomplete streaming events preserve token-limit status across split UTF-8 chunks', async () => {
  const events = [
    { type: 'response.output_text.delta', delta: 'Évidence ' },
    { type: 'response.output_text.delta', delta: '缺少' },
    { type: 'response.incomplete', response: { status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' } } },
  ];
  const bytes = new TextEncoder().encode(events.map(event => `data: ${JSON.stringify(event)}\r\n\r\n`).join(''));
  const emitted = [];
  const result = await generateMetaModelResponse({
    apiKey: 'test-key', prompt: 'question', maxOutputTokens: 100,
    onTextDelta: async (delta) => emitted.push(delta),
    fetchImpl: async () => new Response(new ReadableStream({
      start(controller) {
        for (let i = 0; i < bytes.length; i += 7) controller.enqueue(bytes.slice(i, i + 7));
        controller.close();
      },
    })),
  });
  assert.equal(result.text, 'Évidence 缺少');
  assert.equal(result.finishReason, 'MAX_TOKENS');
  assert.deepEqual(emitted, ['Évidence ', '缺少']);
});

test('search commentary is excluded from final text and streamed chat chunks', async () => {
  const commentary = { id: 'progress', type: 'message', role: 'assistant', phase: 'commentary', content: [{ type: 'output_text', text: 'Searching now.' }] };
  const answer = { id: 'answer', type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'Final answer.' }] };
  const body = { status: 'completed', output: [commentary, answer], output_text: 'Searching now.Final answer.' };
  const options = { apiKey: 'test-key', prompt: 'question', maxOutputTokens: 100 };
  const nonstream = await generateMetaModelResponse({ ...options, fetchImpl: async () => jsonResponse(body) });
  assert.equal(nonstream.text, 'Final answer.');
  const events = [
    { type: 'response.output_item.added', output_index: 0, item: commentary },
    { type: 'response.output_text.delta', output_index: 0, item_id: 'progress', delta: 'Searching now.' },
    { type: 'response.output_item.added', output_index: 1, item: answer },
    { type: 'response.output_text.delta', output_index: 1, item_id: 'answer', delta: 'Final answer.' },
    { type: 'response.completed', response: body },
  ];
  const emitted = [];
  const streamed = await generateMetaModelResponse({
    ...options, onTextDelta: async (delta) => emitted.push(delta),
    fetchImpl: async () => new Response(events.map(event => `data: ${JSON.stringify(event)}\n\n`).join('')),
  });
  assert.equal(streamed.text, 'Final answer.');
  assert.deepEqual(emitted, ['Final answer.']);
});

test('app tool results are replayed to the model and retained as review evidence', async () => {
  let requests = 0;
  const result = await generateMetaModelResponse({
    apiKey: 'test-key', prompt: 'What feed is in stock?', maxOutputTokens: 2000,
    tools: [{ type: 'function', name: 'read_app_records' }],
    executeTool: async (name, args) => { assert.equal(name, 'read_app_records'); assert.equal(args.dataset, 'feeds'); return { stock: 123 }; },
    fetchImpl: async (_, options) => {
      const body = JSON.parse(options.body);
      if (++requests === 1) return jsonResponse({ status: 'completed', output: [{ type: 'function_call', name: 'read_app_records', arguments: '{"dataset":"feeds"}', call_id: 'call1' }] });
      assert.equal(body.input.at(-1).type, 'function_call_output');
      assert.equal(body.input.at(-1).call_id, 'call1');
      assert.equal(body.input.at(-1).output, '{"stock":123}');
      return jsonResponse({ status: 'completed', output_text: '123 kg saved.' });
    },
  });
  assert.equal(result.text, '123 kg saved.');
  assert.match(result.toolEvidence, /123/);
});

test('unadvertised tool names cannot execute and permission failures are unavailable, not empty records', async () => {
  let executed = false;
  let requests = 0;
  await generateMetaModelResponse({
    apiKey: 'test-key', prompt: 'read data', maxOutputTokens: 2000,
    tools: [{ type: 'function', name: 'read_app_records' }], executeTool: async () => { executed = true; },
    fetchImpl: async (_, options) => {
      if (++requests === 1) return jsonResponse({ status: 'completed', output: [{ type: 'function_call', name: 'delete_records', arguments: '{}', call_id: 'x' }] });
      assert.match(JSON.parse(options.body).input.at(-1).output, /unavailable or not permitted/);
      return jsonResponse({ status: 'completed', output_text: 'Unavailable' });
    },
  });
  assert.equal(executed, false);
});

test('passing tools with onTextDelta enables streaming and streams tokens', async () => {
  const events = [
    { type: 'response.output_text.delta', delta: 'Pond ' },
    { type: 'response.output_text.delta', delta: 'DO is 5.5 mg/L.' },
    {
      type: 'response.completed',
      response: {
        status: 'completed',
        usage: { input_tokens: 20, output_tokens: 10 },
        output: [{
          type: 'message',
          content: [{
            type: 'output_text',
            text: 'Pond DO is 5.5 mg/L.',
          }],
        }],
      },
    },
  ];
  const stream = `${events.map((event) => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`).join('')}data: [DONE]\n\n`;
  const emitted = [];
  let requestBody;

  const result = await generateMetaModelResponse({
    apiKey: 'test-key',
    systemInstruction: 'system rules',
    prompt: 'How is pond DO?',
    maxOutputTokens: 1200,
    tools: [{ type: 'function', name: 'read_app_records' }],
    onTextDelta: async (text) => emitted.push(text),
    fetchImpl: async (_url, options) => {
      requestBody = JSON.parse(options.body);
      return new Response(stream, {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
      });
    },
  });

  assert.equal(requestBody.stream, true);
  assert.equal(requestBody.tools.length, 1);
  assert.deepEqual(emitted, ['Pond ', 'DO is 5.5 mg/L.']);
  assert.equal(result.text, 'Pond DO is 5.5 mg/L.');
  assert.equal(result.outputTokens, 10);
});

test('streaming with tool calls executes tool exactly once without duplicate calls and streams final response', async () => {
  let calls = 0;
  let toolExecuted = 0;
  const emitted = [];

  const toolCallStream = [
    `data: ${JSON.stringify({ type: 'response.output_item.added', output_index: 0, item: { id: 'call_1', type: 'function_call', name: 'read_app_records', arguments: '{"dataset":"feeds"}' } })}\n\n`,
    `data: ${JSON.stringify({ type: 'response.output_item.done', output_index: 0, item: { id: 'call_1', type: 'function_call', name: 'read_app_records', arguments: '{"dataset":"feeds"}' } })}\n\n`,
    `data: [DONE]\n\n`,
  ].join('');

  const answerStream = [
    `data: ${JSON.stringify({ type: 'response.output_item.added', output_index: 0, item: { id: 'msg_1', type: 'message' } })}\n\n`,
    `data: ${JSON.stringify({ type: 'response.output_text.delta', output_index: 0, item_id: 'msg_1', delta: '123 kg ' })}\n\n`,
    `data: ${JSON.stringify({ type: 'response.output_text.delta', output_index: 0, item_id: 'msg_1', delta: 'available.' })}\n\n`,
    `data: ${JSON.stringify({ type: 'response.completed', response: { status: 'completed', output_text: '123 kg available.' } })}\n\n`,
    `data: [DONE]\n\n`,
  ].join('');

  const result = await generateMetaModelResponse({
    apiKey: 'test-key',
    systemInstruction: 'system rules',
    prompt: 'Check stock',
    maxOutputTokens: 1200,
    tools: [{ type: 'function', name: 'read_app_records' }],
    executeTool: async (name, args) => {
      toolExecuted++;
      assert.equal(name, 'read_app_records');
      return { stock: 123 };
    },
    onTextDelta: async (delta) => emitted.push(delta),
    fetchImpl: async () => {
      calls++;
      if (calls === 1) {
        return new Response(toolCallStream, { status: 200, headers: { 'content-type': 'text/event-stream' } });
      }
      return new Response(answerStream, { status: 200, headers: { 'content-type': 'text/event-stream' } });
    },
  });

  assert.equal(toolExecuted, 1, 'Tool must be executed exactly once without duplicates');
  assert.equal(calls, 2);
  assert.deepEqual(emitted, ['123 kg ', 'available.']);
  assert.equal(result.text, '123 kg available.');
});

test('SSE streaming with split deltas and completed event records allowlisted spans with separate headers and body duration', async () => {
  const events = [
    { type: 'response.output_text.delta', delta: 'Water ' },
    { type: 'response.output_text.delta', delta: 'quality is ' },
    { type: 'response.output_text.delta', delta: 'optimal.' },
    {
      type: 'response.completed',
      response: {
        status: 'completed',
        usage: { input_tokens: 30, output_tokens: 15 },
        output: [{
          type: 'message',
          content: [{
            type: 'output_text',
            text: 'Water quality is optimal.',
          }],
        }],
      },
    },
  ];
  const streamPayload = events.map(e => `data: ${JSON.stringify(e)}\n\n`).join('') + 'data: [DONE]\n\n';
  const bytes = new TextEncoder().encode(streamPayload);
  const emitted = [];
  const capturedSpans = [];

  const result = await generateMetaModelResponse({
    apiKey: 'test-key',
    prompt: 'Check water',
    maxOutputTokens: 1000,
    onTextDelta: async (delta) => emitted.push(delta),
    onSpan: (span) => capturedSpans.push(span),
    fetchImpl: async () => {
      return new Response(new ReadableStream({
        start(controller) {
          for (let i = 0; i < bytes.length; i += 12) {
            controller.enqueue(bytes.slice(i, i + 12));
          }
          controller.close();
        },
      }), {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
      });
    },
  });

  assert.equal(result.text, 'Water quality is optimal.');
  assert.equal(result.finishReason, 'STOP');
  assert.equal(result.rounds, 1);
  assert.equal(result.modelRounds, 1);
  assert.equal(result.toolCallsCount, 0);
  assert.deepEqual(emitted, ['Water ', 'quality is ', 'optimal.']);

  assert.equal(capturedSpans.length, 1);
  const span = capturedSpans[0];
  assert.equal(span.name, 'round_0_model_request');
  assert.equal(span.round, 0);
  assert.equal(span.status, 200);
  assert.equal(span.finishReason, 'STOP');
  assert.equal(typeof span.headersDurationMs, 'number');
  assert.equal(typeof span.durationMs, 'number');
  assert.ok(span.durationMs >= span.headersDurationMs);
  assert.equal(typeof span.firstTextMs, 'number');
  assert.equal(span.inputTokens, 30);
  assert.equal(span.outputTokens, 15);
  assert.equal(span.toolCalls, 0);
  assert.ok(span.bytes > 0);
});

test('initial commentary in SSE stream is ignored and not treated as first answer', async () => {
  const commentaryItem = { id: 'comm_1', type: 'message', phase: 'commentary' };
  const answerItem = { id: 'msg_1', type: 'message' };
  const events = [
    `data: ${JSON.stringify({ type: 'response.output_item.added', output_index: 0, item: commentaryItem })}\n\n`,
    `data: ${JSON.stringify({ type: 'response.output_text.delta', output_index: 0, item_id: 'comm_1', delta: 'Analyzing parameters...' })}\n\n`,
    `data: ${JSON.stringify({ type: 'response.output_item.added', output_index: 1, item: answerItem })}\n\n`,
    `data: ${JSON.stringify({ type: 'response.output_text.delta', output_index: 1, item_id: 'msg_1', delta: 'Pond DO is normal.' })}\n\n`,
    `data: ${JSON.stringify({ type: 'response.completed', response: { status: 'completed', output_text: 'Pond DO is normal.' } })}\n\n`,
    `data: [DONE]\n\n`,
  ].join('');

  const emitted = [];
  const capturedSpans = [];

  const result = await generateMetaModelResponse({
    apiKey: 'test-key',
    prompt: 'Check pond',
    maxOutputTokens: 1000,
    onTextDelta: async (delta) => emitted.push(delta),
    onSpan: (span) => capturedSpans.push(span),
    fetchImpl: async () => new Response(events, {
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
    }),
  });

  assert.equal(result.text, 'Pond DO is normal.');
  assert.equal(result.finishReason, 'STOP');
  assert.deepEqual(emitted, ['Pond DO is normal.'], 'Commentary delta must not be emitted to onTextDelta');
  assert.equal(capturedSpans.length, 1);
  assert.equal(typeof capturedSpans[0].firstTextMs, 'number');
});

test('deterministic draft completion terminates immediately with STOP and records tool span', async () => {
  const { farmActionToolReply } = require('../orsonAgentTools');
  let preparations = 0;
  const capturedSpans = [];

  const result = await generateMetaModelResponse({
    apiKey: 'test-key',
    prompt: 'Input pH 7.8',
    tools: [{ type: 'function', name: 'prepare_farm_actions' }],
    executeTool: async () => {
      preparations++;
      return { status: 'awaiting_user_confirmation', rows: [{ valid: true }] };
    },
    completeToolResult: evidence => farmActionToolReply(evidence, 'Input pH 7.8'),
    onSpan: (span) => capturedSpans.push(span),
    fetchImpl: async () => {
      return jsonResponse({
        status: 'completed',
        output: [{
          type: 'function_call',
          name: 'prepare_farm_actions',
          arguments: '{"pondId":"pond-1"}',
          call_id: 'call_prep',
        }],
      });
    },
  });

  assert.equal(preparations, 1);
  assert.equal(result.finishReason, 'STOP');
  assert.equal(result.rounds, 1);
  assert.equal(result.modelRounds, 1);
  assert.equal(result.toolCallsCount, 1);
  assert.match(result.text, /Belum ada data yang disimpan/);

  assert.equal(capturedSpans.length, 2);
  assert.equal(capturedSpans[0].name, 'round_0_model_request');
  assert.equal(capturedSpans[1].name, 'tool_prepare_farm_actions');
  assert.equal(capturedSpans[1].tool, 'prepare_farm_actions');
  assert.equal(capturedSpans[1].round, 0);
  assert.equal(typeof capturedSpans[1].durationMs, 'number');
});

test('telemetry isolation: throwing or returning rejected promise in onSpan does not break execution', async () => {
  // Sync throw
  const resSync = await generateMetaModelResponse({
    apiKey: 'test-key',
    prompt: 'Hello',
    onSpan: () => {
      throw new Error('telemetry_sync_explosion');
    },
    fetchImpl: async () => jsonResponse({ status: 'completed', output_text: 'Sync ok' }),
  });
  assert.equal(resSync.text, 'Sync ok');
  assert.equal(resSync.finishReason, 'STOP');

  // Async reject
  const resAsync = await generateMetaModelResponse({
    apiKey: 'test-key',
    prompt: 'Hello',
    onSpan: async () => {
      throw new Error('telemetry_async_explosion');
    },
    fetchImpl: async () => jsonResponse({ status: 'completed', output_text: 'Async ok' }),
  });
  assert.equal(resAsync.text, 'Async ok');
  assert.equal(resAsync.finishReason, 'STOP');
});

test('composed signal cancellation aborts before tool execution and future rounds', async () => {
  const controller = new AbortController();
  let toolRan = false;

  const promise = generateMetaModelResponse({
    apiKey: 'test-key',
    prompt: 'Abort test',
    signal: controller.signal,
    timeoutMs: 30000,
    tools: [{ type: 'function', name: 'read_app_records' }],
    executeTool: async () => {
      toolRan = true;
      return { ok: true };
    },
    fetchImpl: async () => {
      controller.abort();
      return jsonResponse({
        status: 'completed',
        output: [{
          type: 'function_call',
          name: 'read_app_records',
          arguments: '{}',
          call_id: 'c1',
        }],
      });
    },
  });

  await assert.rejects(promise, (err) => {
    assert.ok(err.name === 'AbortError' || /aborted/i.test(err.message));
    return true;
  });
  assert.equal(toolRan, false, 'Tool must not execute after abort');
});

test('tools: [] with unexpected model call correctly throws Unexpected model tool request', async () => {
  await assert.rejects(
    generateMetaModelResponse({
      apiKey: 'test-key',
      prompt: 'test prompt',
      tools: [],
      fetchImpl: async () => jsonResponse({
        status: 'completed',
        output: [{
          type: 'function_call',
          name: 'unadvertised_tool',
          arguments: '{}',
          call_id: 'c1',
        }],
      }),
    }),
    /Unexpected model tool request/
  );
});

test('sensitive data sentinel: spans do not leak prompt, arguments, URLs, error bodies, or unadvertised tool names', async () => {
  const capturedSpans = [];
  const sensitivePrompt = 'SENTINEL_SECRET_PROMPT_DATA_XYZ';
  const sensitiveArg = 'SENTINEL_SECRET_TOOL_ARG_999';

  let roundCall = 0;
  await generateMetaModelResponse({
    apiKey: 'test-key',
    prompt: sensitivePrompt,
    tools: [{ type: 'function', name: 'read_app_records' }],
    executeTool: async () => ({ ok: true }),
    onSpan: (span) => capturedSpans.push(span),
    fetchImpl: async () => {
      roundCall++;
      if (roundCall === 1) {
        return jsonResponse({
          status: 'completed',
          output: [{
            type: 'function_call',
            name: 'secret_backdoor_unadvertised_tool',
            arguments: JSON.stringify({ secret: sensitiveArg }),
            call_id: 'call_leak',
          }],
        });
      }
      return jsonResponse({
        status: 'completed',
        output: [{
          type: 'message',
          content: [{ type: 'text', text: 'Safe terminal answer.' }],
        }],
      });
    },
  });

  assert.ok(capturedSpans.length >= 2);
  const toolSpan = capturedSpans.find(s => s.name.startsWith('tool_'));
  assert.ok(toolSpan);
  assert.equal(toolSpan.name, 'tool_unknown', 'Unadvertised tool name must be masked to tool_unknown');
  assert.equal(toolSpan.tool, 'unknown');

  const serialized = JSON.stringify(capturedSpans);
  assert.ok(!serialized.includes(sensitivePrompt), 'Spans must not contain prompt text');
  assert.ok(!serialized.includes(sensitiveArg), 'Spans must not contain tool arguments');
  assert.ok(!serialized.includes('secret_backdoor_unadvertised_tool'), 'Spans must not contain unadvertised tool name');
  assert.ok(!serialized.includes('https://api.meta.ai'), 'Spans must not contain URLs');
  assert.ok(!serialized.includes('call_leak'), 'Spans must not contain call IDs');

  const allowedKeys = new Set([
    'name', 'timestamp', 'round', 'status', 'headersDurationMs',
    'durationMs', 'firstTextMs', 'inputTokens', 'outputTokens',
    'toolCalls', 'bytes', 'finishReason', 'tool'
  ]);
  for (const span of capturedSpans) {
    for (const key of Object.keys(span)) {
      assert.ok(allowedKeys.has(key), `Key ${key} is not in the allowlist`);
    }
  }
});
