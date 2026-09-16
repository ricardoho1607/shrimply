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

test('diagnostic requests send high reasoning while routine requests stay low', async () => {
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
