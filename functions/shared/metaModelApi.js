const META_MODEL_API_BASE_URL = process.env.META_MODEL_API_BASE_URL || 'https://api.meta.ai/v1';
const META_MODEL_API_MODEL = 'muse-spark-1.3-contributor';
const getOrsonGenerationSettings = (mode) => {
  if (mode === 'standard') {
    return { reasoningEffort: 'low', maxOutputTokens: 2500, timeoutMs: 60000 };
  }
  return {
    reasoningEffort: 'high',
    maxOutputTokens: 10000,
    timeoutMs: 90000,
  };
};

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
  let totalBytes = 0;
  const outputById = new Map();
  const outputByIndex = new Map();

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
      if (event.item.id) outputById.set(event.item.id, event.item);
      if (event.output_index !== undefined) outputByIndex.set(event.output_index, event.item);
    } else if (event.type === 'response.output_text.delta' && typeof event.delta === 'string') {
      const item = (event.item_id ? outputById.get(event.item_id) : null) || (event.output_index !== undefined ? outputByIndex.get(event.output_index) : null);
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
      if (value) totalBytes += value.byteLength;
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

  const fallbackOutput = outputByIndex.size
    ? Array.from(outputByIndex.entries()).sort(([a], [b]) => a - b).map(([, item]) => item)
    : Array.from(outputById.values());
  const output = Array.isArray(finalResponse?.output) && finalResponse.output.length
    ? finalResponse.output
    : fallbackOutput;
  const calls = output.filter(item => item?.type === 'function_call');

  const finalText = getResponseText(finalResponse);
  if (!streamedText && finalText) await onTextDelta(finalText);
  return {
    text: finalText || streamedText,
    finishReason: getFinishReason(finalResponse),
    inputTokens: finalResponse?.usage?.input_tokens ?? null,
    outputTokens: finalResponse?.usage?.output_tokens ?? null,
    sources: getResponseSources(finalResponse),
    calls,
    output,
    bytes: totalBytes,
  };
};

const composeSignalWithTimeout = (adapterSignal, timeoutMs) => {
  const timeoutSignal = Number.isFinite(timeoutMs) && timeoutMs > 0 ? AbortSignal.timeout(timeoutMs) : null;
  if (!adapterSignal) return timeoutSignal || AbortSignal.timeout(45000);
  if (!timeoutSignal) return adapterSignal;
  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any([adapterSignal, timeoutSignal]);
  }
  const controller = new AbortController();
  const onAbort = () => {
    controller.abort(adapterSignal.reason || timeoutSignal.reason);
  };
  if (adapterSignal.aborted) {
    controller.abort(adapterSignal.reason);
    return controller.signal;
  }
  if (timeoutSignal.aborted) {
    controller.abort(timeoutSignal.reason);
    return controller.signal;
  }
  adapterSignal.addEventListener('abort', onAbort, { once: true });
  timeoutSignal.addEventListener('abort', onAbort, { once: true });
  return controller.signal;
};

const checkAbort = (signal) => {
  if (signal?.aborted) {
    if (typeof signal.throwIfAborted === 'function') {
      signal.throwIfAborted();
    }
    const error = new Error('The operation was aborted.');
    error.name = 'AbortError';
    throw error;
  }
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
  completeToolResult,
  responseFormat,
  timeoutMs = 45000,
  signal: adapterSignal,
  fetchImpl = fetch,
  spans: customSpans,
  onSpan,
}) => {
  const effectiveSignal = composeSignalWithTimeout(adapterSignal, timeoutMs);
  checkAbort(effectiveSignal);

  const streaming = typeof onTextDelta === 'function';
  let input = prompt;
  const evidence = [];
  let inputTokens = 0;
  let outputTokens = 0;
  let toolCallsCount = 0;
  const spans = Array.isArray(customSpans) ? customSpans : [];
  const recordSpan = (name, details) => {
    const span = { name, timestamp: Date.now(), ...details };
    spans.push(span);
    if (typeof onSpan === 'function') {
      try {
        const res = onSpan(span);
        if (res && typeof res.catch === 'function') {
          res.catch(() => {});
        }
      } catch (_err) {
        // Telemetry callbacks cannot affect response or reject unhandled
      }
    }
    return span;
  };

  for (let round = 0; round < 6; round++) {
    checkAbort(effectiveSignal);
    const requestStart = Date.now();
    let response;
    try {
      response = await fetchImpl(`${META_MODEL_API_BASE_URL}/responses`, {
        method: 'POST',
        signal: effectiveSignal,
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
          ...(responseFormat ? { text: { format: responseFormat } } : {}),
          ...((tools.length || useWebLookup) && round < 5 ? { tools: [...tools, ...(useWebLookup ? [{ type: 'web_search' }] : [])] } : {}),
          ...(streaming ? { stream: true } : {}),
        }),
      });
    } catch (fetchError) {
      if (effectiveSignal.aborted || fetchError?.name === 'AbortError' || /aborted/i.test(fetchError?.message)) {
        recordSpan(`round_${round}_cancelled`, { round, durationMs: Date.now() - requestStart, status: 'cancelled' });
      } else {
        recordSpan(`round_${round}_error`, { round, durationMs: Date.now() - requestStart, status: 'error' });
      }
      throw fetchError;
    }

    const headersDurationMs = Date.now() - requestStart;

    if (!response.ok) {
      const failedDurationMs = Date.now() - requestStart;
      recordSpan(`round_${round}_failed`, { round, status: response.status, durationMs: failedDurationMs });
      const message = await readErrorMessage(response, apiKey);
      const error = new Error(`Meta Model API request failed (${response.status}): ${message}`);
      error.webLookupUnsupported = useWebLookup && [400, 422].includes(response.status) && /web_search|web search|tool/i.test(message);
      throw error;
    }

    let calls = [];
    let outputList = [];
    let text = '';
    let finishReason = 'STOP';
    let sources = [];

    try {
      if (streaming) {
        let firstTextMs = null;
        const wrappedOnTextDelta = async (delta) => {
          effectiveSignal.throwIfAborted();
          if (delta && delta.trim() && firstTextMs === null) {
            firstTextMs = Date.now() - requestStart;
          }
          await onTextDelta(delta);
          effectiveSignal.throwIfAborted();
        };
        const streamResult = await readMetaEventStream(response, wrappedOnTextDelta);
        const roundDurationMs = Date.now() - requestStart;
        const streamInputTokens = streamResult.inputTokens || 0;
        const streamOutputTokens = streamResult.outputTokens || 0;
        inputTokens += streamInputTokens;
        outputTokens += streamOutputTokens;
        calls = streamResult.calls || [];
        outputList = streamResult.output || [];
        text = streamResult.text;
        finishReason = streamResult.finishReason;
        sources = streamResult.sources || [];
        recordSpan(`round_${round}_model_request`, {
          round,
          status: response.status,
          headersDurationMs,
          durationMs: roundDurationMs,
          firstTextMs,
          inputTokens: streamInputTokens,
          outputTokens: streamOutputTokens,
          toolCalls: calls.length,
          bytes: streamResult.bytes || 0,
          finishReason,
        });
      } else {
        const rawText = await response.text();
        const roundDurationMs = Date.now() - requestStart;
        const bytes = Buffer.byteLength(rawText, 'utf8');
        let body;
        try {
          body = JSON.parse(rawText);
        } catch (_e) {
          throw new Error('Meta Model API returned invalid JSON.');
        }
        const bodyInputTokens = body.usage?.input_tokens || 0;
        const bodyOutputTokens = body.usage?.output_tokens || 0;
        inputTokens += bodyInputTokens;
        outputTokens += bodyOutputTokens;
        calls = (body.output || []).filter((item) => item.type === 'function_call');
        outputList = body.output || [];
        text = getResponseText(body);
        finishReason = getFinishReason(body);
        sources = getResponseSources(body);
        recordSpan(`round_${round}_model_request`, {
          round,
          status: response.status,
          headersDurationMs,
          durationMs: roundDurationMs,
          firstTextMs: text && text.trim() ? roundDurationMs : null,
          inputTokens: bodyInputTokens,
          outputTokens: bodyOutputTokens,
          toolCalls: calls.length,
          bytes,
          finishReason,
        });
      }
    } catch (bodyError) {
      if (effectiveSignal.aborted || bodyError?.name === 'AbortError' || /aborted/i.test(bodyError?.message)) {
        recordSpan(`round_${round}_cancelled`, { round, durationMs: Date.now() - requestStart, status: 'cancelled' });
      } else {
        recordSpan(`round_${round}_error`, { round, durationMs: Date.now() - requestStart, status: 'error' });
      }
      throw bodyError;
    }

    checkAbort(effectiveSignal);

    if (calls.length) {
      checkAbort(effectiveSignal);
      if (!executeTool || !tools.length) throw new Error('Unexpected model tool request.');
      if (round === 5) throw new Error('Orson data lookup needs a more focused question.');
      toolCallsCount += calls.length;
      const outputs = await Promise.all(calls.map(async call => {
        checkAbort(effectiveSignal);
        const toolStart = Date.now();
        const isAllowedTool = tools.some(tool => tool.name === call.name);
        const safeToolName = isAllowedTool ? call.name : 'unknown';
        let result;
        try {
          if (!isAllowedTool) throw new Error('Unknown data tool');
          result = await executeTool(call.name, JSON.parse(call.arguments));
        } catch (error) {
          if (effectiveSignal.aborted || error?.name === 'AbortError' || /aborted/i.test(error?.message)) {
            throw error;
          }
          result = { error: 'This record lookup is unavailable or not permitted. Do not invent its contents.' };
          if (call.name === 'prepare_farm_actions' && ['invalid-argument', 'failed-precondition', 'permission-denied'].includes(error?.code)) {
            result.status = 'needs_clarification';
            result.message = error.message;
          }
        }
        checkAbort(effectiveSignal);
        const toolDurationMs = Date.now() - toolStart;
        const output = JSON.stringify(result);
        const resultBytes = Buffer.byteLength(output, 'utf8');
        recordSpan(`tool_${safeToolName}`, {
          round,
          tool: safeToolName,
          durationMs: toolDurationMs,
          bytes: resultBytes,
        });
        evidence.push({ tool: call.name, arguments: call.arguments, result });
        return { type: 'function_call_output', call_id: call.call_id || call.id, output };
      }));
      checkAbort(effectiveSignal);
      // A prepared draft is the result of an entry request, not another lookup.
      // Finish from the server's validated result without asking the model to
      // repeat preparation or turn a clarification into a lookup loop.
      const completedText = completeToolResult?.(evidence.slice(-calls.length));
      if (completedText) {
        checkAbort(effectiveSignal);
        if (streaming) await onTextDelta(completedText);
        checkAbort(effectiveSignal);
        return {
          text: completedText,
          finishReason: 'STOP',
          inputTokens,
          outputTokens,
          toolEvidence: JSON.stringify(evidence),
          sources: [],
          rounds: round + 1,
          modelRounds: round + 1,
          toolCallsCount,
          spans,
        };
      }
      checkAbort(effectiveSignal);
      input = [...(Array.isArray(input) ? input : [{ role: 'user', content: input }]), ...outputList, ...outputs];
      continue;
    }
    checkAbort(effectiveSignal);
    return {
      text,
      finishReason,
      inputTokens,
      outputTokens,
      toolEvidence: evidence.length ? JSON.stringify(evidence) : undefined,
      sources,
      rounds: round + 1,
      modelRounds: round + 1,
      toolCallsCount,
      spans,
    };
  }
};

module.exports = {
  META_MODEL_API_BASE_URL,
  META_MODEL_API_MODEL,
  getOrsonGenerationSettings,
  generateMetaModelResponse,
};
