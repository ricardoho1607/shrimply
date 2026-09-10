const META_MODEL_API_BASE_URL = process.env.META_MODEL_API_BASE_URL || 'https://api.ai.meta.com/v1';
const META_MODEL_API_MODEL = 'muse-spark-1.3-contributor';
const getOrsonGenerationSettings = (mode) => mode === 'standard'
  ? { reasoningEffort: 'low', maxOutputTokens: 6000, timeoutMs: 60000 }
  : { reasoningEffort: 'high', maxOutputTokens: 10000, timeoutMs: 90000 };

const getFinishReason = (response) => {
  if (response?.status === 'completed') return 'STOP';
  if (response?.incomplete_details?.reason === 'max_output_tokens') return 'MAX_TOKENS';
  return typeof response?.status === 'string' ? response.status.toUpperCase() : 'UNKNOWN';
};

const getResponseText = (response) => {
  const messages = (Array.isArray(response?.output) ? response.output : []).filter((item) => item?.type === 'message');
  if (!messages.length && typeof response?.output_text === 'string') return response.output_text;
  return messages
    .filter((item) => item.phase !== 'commentary')
    .flatMap((item) => Array.isArray(item.content) ? item.content : [])
    .filter((block) => block?.type === 'output_text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('');
};

const getResponseSources = (response) => {
  const sources = (Array.isArray(response?.output) ? response.output : [])
    .filter((item) => item?.type === 'message' && item.phase !== 'commentary')
    .flatMap((item) => Array.isArray(item.content) ? item.content : [])
    .filter((block) => block?.type === 'output_text')
    .flatMap((block) => Array.isArray(block.annotations) ? block.annotations : [])
    .filter((annotation) => annotation?.type === 'url_citation' && typeof annotation.url === 'string' && /^https?:\/\//i.test(annotation.url))
    .map((annotation) => ({
      title: typeof annotation.title === 'string' && annotation.title.trim() ? annotation.title.trim() : 'Official source',
      uri: annotation.url,
    }));
  return sources
    .filter((source, index) => sources.findIndex((item) => item.uri === source.uri) === index)
    .slice(0, 5);
};

const readErrorMessage = async (response, apiKey) => {
  try {
    const body = await response.json();
    const message = body?.error?.message;
    return typeof message === 'string' && message.trim()
      ? message.split(apiKey).join('[redacted]').trim().slice(0, 300)
      : 'request failed';
  } catch (_error) {
    return 'request failed';
  }
};

const readMetaEventStream = async (response, onTextDelta) => {
  if (!response.body) throw new Error('Meta Model API returned an empty stream.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let streamedText = '';
  let finalResponse = null;
  let finishedReading = false;
  const outputItems = new Map();

  const processBlock = async (block) => {
    const data = block
      .split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n');
    if (!data || data === '[DONE]') return;
    let event;
    try {
      event = JSON.parse(data);
    } catch (_error) {
      throw new Error('Meta Model API returned an invalid stream event.');
    }
    if (['response.output_item.added', 'response.output_item.done'].includes(event.type) && event.item) {
      if (event.item.id) outputItems.set(event.item.id, event.item);
      if (event.output_index !== undefined) outputItems.set(event.output_index, event.item);
    } else if (event.type === 'response.output_text.delta' && typeof event.delta === 'string') {
      const item = outputItems.get(event.item_id) || outputItems.get(event.output_index);
      if (item?.phase === 'commentary') return;
      streamedText += event.delta;
      await onTextDelta(event.delta);
    } else if (['response.completed', 'response.incomplete', 'response.failed'].includes(event.type) && event.response) {
      finalResponse = event.response;
    } else if (event.type === 'error' || event.type === 'response.failed') {
      throw new Error('Meta Model API stream failed.');
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      finishedReading = done;
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop() || '';
      for (const block of blocks) await processBlock(block);
      if (done) break;
    }
    if (buffer.trim()) await processBlock(buffer);
  } finally {
    if (!finishedReading) await reader.cancel().catch(() => {});
    reader.releaseLock();
  }

  const finalText = getResponseText(finalResponse);
  if (!streamedText && finalText) await onTextDelta(finalText);
  return {
    text: finalText || streamedText,
    finishReason: getFinishReason(finalResponse),
    inputTokens: finalResponse?.usage?.input_tokens ?? null,
    outputTokens: finalResponse?.usage?.output_tokens ?? null,
    sources: getResponseSources(finalResponse),
  };
};

const generateMetaModelResponse = async ({
  apiKey,
  systemInstruction,
  prompt,
  maxOutputTokens,
  reasoningEffort = 'low',
  useWebLookup = false,
  onTextDelta,
  tools = [],
  executeTool,
  timeoutMs = 45000,
  signal = AbortSignal.timeout(timeoutMs),
  fetchImpl = fetch,
}) => {
  const streaming = typeof onTextDelta === 'function' && tools.length === 0;
  let input = prompt;
  const evidence = [];
  let inputTokens = 0;
  let outputTokens = 0;
  for (let round = 0; round < 6; round++) {
  const response = await fetchImpl(`${META_MODEL_API_BASE_URL}/responses`, {
    method: 'POST',
    signal,
    redirect: 'error',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: META_MODEL_API_MODEL,
      instructions: systemInstruction,
      input,
      max_output_tokens: maxOutputTokens,
      reasoning: { effort: reasoningEffort },
      store: false,
      ...((tools.length || useWebLookup) ? { tools: [...tools, ...(useWebLookup ? [{ type: 'web_search' }] : [])] } : {}),
      ...(streaming ? { stream: true } : {}),
    }),
  });

  if (!response.ok) {
    const message = await readErrorMessage(response, apiKey);
    const error = new Error(`Meta Model API request failed (${response.status}): ${message}`);
    error.webLookupUnsupported = useWebLookup && [400, 422].includes(response.status) && /web_search|web search|tool/i.test(message);
    throw error;
  }
  if (streaming) return readMetaEventStream(response, onTextDelta);

  const body = await response.json();
  inputTokens += body.usage?.input_tokens || 0;
  outputTokens += body.usage?.output_tokens || 0;
  const calls = (body.output || []).filter(item => item.type === 'function_call');
  if (calls.length) {
    if (!executeTool || !tools.length) throw new Error('Unexpected model tool request.');
    if (round === 5) throw new Error('Orson data lookup needs a more focused question.');
    const outputs = await Promise.all(calls.map(async call => {
      let result;
      try {
        if (!tools.some(tool => tool.name === call.name)) throw new Error('Unknown data tool');
        result = await executeTool(call.name, JSON.parse(call.arguments));
      } catch (_) { result = { error: 'This record lookup is unavailable or not permitted. Do not invent its contents.' }; }
      const output = JSON.stringify(result);
      evidence.push({ tool: call.name, arguments: call.arguments, result });
      return { type: 'function_call_output', call_id: call.call_id, output };
    }));
    input = [...(Array.isArray(input) ? input : [{ role: 'user', content: input }]), ...body.output, ...outputs];
    continue;
  }
  return {
    text: getResponseText(body),
    finishReason: getFinishReason(body),
    inputTokens,
    outputTokens,
    toolEvidence: evidence.length ? JSON.stringify(evidence) : undefined,
    sources: getResponseSources(body),
  };
  }
};

module.exports = {
  META_MODEL_API_BASE_URL,
  META_MODEL_API_MODEL,
  getOrsonGenerationSettings,
  generateMetaModelResponse,
};
