'use strict';

/**
 * Shared routing contract, strict parsers, confidence policies, and provider adapters
 * for the Orson decision benchmark (Tier 3 specification).
 */

const OFFICIAL_META_API_BASE_URL = 'https://api.meta.ai/v1';
const META_FAST_THRESHOLD = 0.85;
const JEV_FAST_THRESHOLD = 0.85;
const META_TIMEOUT_MS = 15000;
const JEV_TIMEOUT_MS = 5000;
const JEV_DISCOVERY_TIMEOUT_MS = 5000;
const META_MAX_OUTPUT_TOKENS = 1024;
const META_MAX_DIRECT_ANSWER_CHARS = 2000;
const PROBABILITY_SUM_TOLERANCE = 0.02;

/**
 * Bounded router payload extraction.
 * Strictly extracts only question, bounded recent turns, and farm data availability.
 * NEVER includes full pond payload, instructions, or expected labels.
 */
function buildRouterInput(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('Router input must be an object');
  }
  const { question, recentTurns = [], hasFarmData = false } = input;
  if (typeof question !== 'string' || !question.trim()) {
    throw new Error('Router input requires a non-empty question string');
  }

  const boundedTurns = Array.isArray(recentTurns)
    ? recentTurns.slice(-4).map(turn => ({
        role: turn.role === 'assistant' ? 'assistant' : 'user',
        content: String(turn.content || '').slice(0, 500),
      }))
    : [];

  return {
    question: question.trim(),
    recentTurns: boundedTurns,
    hasFarmData: Boolean(hasFarmData),
  };
}

/**
 * Strict JSON parser for Meta router output.
 * Whitelists ONLY { route, confidence, answer }.
 */
function parseMetaRouterOutput(rawText, finishReason) {
  if (finishReason !== 'STOP') {
    throw new Error(`Meta router incomplete finishReason: ${finishReason}`);
  }
  if (typeof rawText !== 'string' || !rawText.trim()) {
    throw new Error('Meta router returned empty text');
  }

  const trimmed = rawText.trim();
  let jsonString = trimmed;

  // Markdown fence extraction must anchor the ENTIRE trimmed string from start to finish.
  // Reject prefix text, suffix text, or multiple code blocks.
  if (trimmed.includes('```')) {
    const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
    if (!fenceMatch) {
      throw new Error('Meta router output contains ambiguous surrounding text or invalid markdown fencing');
    }
    jsonString = fenceMatch[1].trim();
    if (jsonString.includes('```')) {
      throw new Error('Meta router output contains multiple nested or contradictory markdown code blocks');
    }
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    throw new Error(`Meta router invalid JSON: ${err.message}`);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Meta router JSON must be a single plain object');
  }

  const allowedKeys = new Set(['route', 'confidence', 'answer']);
  const keys = Object.keys(parsed);
  for (const key of keys) {
    if (!allowedKeys.has(key)) {
      throw new Error(`Meta router output contains disallowed key: ${key}`);
    }
  }

  for (const requiredKey of ['route', 'confidence', 'answer']) {
    if (!(requiredKey in parsed)) {
      throw new Error(`Meta router output missing required key: ${requiredKey}`);
    }
  }

  const { route, confidence, answer } = parsed;
  if (route !== 'fast' && route !== 'deep') {
    throw new Error(`Meta router invalid route: ${route}`);
  }

  if (typeof confidence !== 'number' || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    throw new Error(`Meta router invalid confidence: ${confidence}`);
  }

  if (answer !== null && typeof answer !== 'string') {
    throw new Error('Meta router answer must be string or null');
  }

  if (typeof answer === 'string' && answer.length > META_MAX_DIRECT_ANSWER_CHARS) {
    throw new Error(`Meta router direct answer exceeds ${META_MAX_DIRECT_ANSWER_CHARS} characters`);
  }

  return {
    route,
    confidence,
    answer: typeof answer === 'string' && answer.trim() ? answer.trim() : null,
  };
}

/**
 * Strict parser for Jev SystemOne Choice response.
 * Validates exact options, probability ranges/sum, argmax choice consistency, and confidence.
 */
function parseJevChoiceOutput(body) {
  if (!body || typeof body !== 'object') {
    throw new Error('Jev response body must be an object');
  }

  const answer = body.answers?.route_decision;
  if (!answer || typeof answer !== 'object') {
    throw new Error('Jev response missing route_decision answer');
  }

  if (answer.type !== 'choice') {
    throw new Error(`Jev answer type expected "choice", received "${answer.type}"`);
  }

  const probabilities = answer.probabilities;
  if (!probabilities || typeof probabilities !== 'object' || Array.isArray(probabilities)) {
    throw new Error('Jev answer missing probabilities object');
  }

  const probKeys = Object.keys(probabilities).sort();
  if (probKeys.length !== 2 || probKeys[0] !== 'deep' || probKeys[1] !== 'fast') {
    throw new Error(`Jev probabilities must contain exactly "fast" and "deep" keys, found: ${probKeys.join(', ')}`);
  }

  const fastProb = probabilities.fast;
  const deepProb = probabilities.deep;

  if (typeof fastProb !== 'number' || !Number.isFinite(fastProb) || fastProb < 0 || fastProb > 1) {
    throw new Error(`Jev fast probability must be a finite number in [0, 1], got: ${fastProb}`);
  }
  if (typeof deepProb !== 'number' || !Number.isFinite(deepProb) || deepProb < 0 || deepProb > 1) {
    throw new Error(`Jev deep probability must be a finite number in [0, 1], got: ${deepProb}`);
  }

  const sum = fastProb + deepProb;
  if (Math.abs(sum - 1.0) > PROBABILITY_SUM_TOLERANCE) {
    throw new Error(`Jev probabilities do not sum to 1.0 (sum=${sum}, tolerance=${PROBABILITY_SUM_TOLERANCE})`);
  }

  // Tied probabilities are ambiguous/uncertain
  if (Math.abs(fastProb - deepProb) < 1e-6) {
    throw new Error('Jev probabilities resulted in an exact tie between fast and deep');
  }

  // Choice must match argmax
  const expectedChoice = fastProb > deepProb ? 'fast' : 'deep';
  if (answer.choice !== expectedChoice) {
    throw new Error(`Jev choice "${answer.choice}" is inconsistent with argmax probability (${expectedChoice})`);
  }

  const confidence = answer.confidence;
  if (typeof confidence !== 'number' || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    throw new Error(`Jev confidence must be a finite number in [0, 1], got: ${confidence}`);
  }

  const inputTokens = typeof body.usage?.input_tokens === 'number' ? body.usage.input_tokens : null;
  const outputTokens = typeof body.usage?.output_tokens === 'number' ? body.usage.output_tokens : null;

  return {
    choice: answer.choice,
    confidence,
    probabilities: { fast: fastProb, deep: deepProb },
    model: typeof body.model === 'string' && body.model.trim() ? body.model.trim() : 'unknown',
    usage: { inputTokens, outputTokens },
  };
}

const META_ROUTER_SYSTEM_INSTRUCTION = [
  'IDENTITY: You are the Orson routing decision component.',
  'TASK: Classify the user query into "fast" or "deep".',
  '- "fast": Simple greeting, standard aquaculture concept definition, basic math, or standalone short explanation needing NO farm data or diagnostic reasoning.',
  '- "deep": Requires pond data, diagnostic history, dosage, safety constraints, multi-step analysis, or ambiguous follow-up context.',
  'DIRECT ANSWER: If route is "fast" and the question is standalone and easy, you may provide a concise direct answer (<= 2000 chars) in the "answer" field. Otherwise "answer" MUST be null.',
  'OUTPUT FORMAT: Strict JSON only with exact keys: {"route":"fast"|"deep","confidence":0.0-1.0,"answer":string|null}. No markdown, no reasoning, no extra fields.',
].join('\n');

/**
 * Discover Jev model via GET /v1/models outside timed trials.
 */
async function discoverJevModel({
  apiKey,
  baseUrl = 'https://api.typesafe.ai/v1/models',
  fetchImpl = fetch,
  signal,
  timeoutMs = JEV_DISCOVERY_TIMEOUT_MS,
}) {
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
    throw new Error('Jev model discovery requires TYPESAFE_API_KEY');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(new Error('Jev discovery timeout')), timeoutMs);
  const effectiveSignal = signal
    ? (signal.aborted ? signal : AbortSignal.any ? AbortSignal.any([signal, controller.signal]) : controller.signal)
    : controller.signal;

  try {
    const response = await fetchImpl(baseUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: effectiveSignal,
      redirect: 'error',
    });

    if (!response.ok) {
      throw new Error(`Jev model discovery HTTP error ${response.status}`);
    }

    const body = await response.json();
    effectiveSignal.throwIfAborted();
    const modelsList = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : Array.isArray(body?.models) ? body.models : [];
    const foundAlias = modelsList.find(m => m.id === 'jev-latest' || m.name === 'jev-latest');
    if (!foundAlias) throw new Error('Jev discovery did not advertise the requested jev-latest alias');
    const resolvedModel = foundAlias.id || foundAlias.name;

    return {
      requestedAlias: 'jev-latest',
      discovered: true,
      resolvedModel,
      availableModels: modelsList.map(m => m.id || m.name).filter(Boolean),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Route via Meta model (muse-spark-1.3-contributor).
 */
async function routeWithMeta({
  input,
  generateMeta,
  signal,
  endpoint = OFFICIAL_META_API_BASE_URL,
  now = () => Date.now(),
}) {
  if (endpoint !== OFFICIAL_META_API_BASE_URL) {
    throw new Error(`Unapproved Meta Model API endpoint: expected "${OFFICIAL_META_API_BASE_URL}", got "${endpoint}"`);
  }

  if (signal?.aborted) {
    const err = new Error('The operation was aborted.');
    err.name = 'AbortError';
    throw err;
  }

  const bounded = buildRouterInput(input);
  const startTime = now();
  let rawPrediction = null;
  let rawConfidence = null;
  let directAnswer = null;
  let rawError = null;
  let usage = { inputTokens: null, outputTokens: null };

  try {
    const prompt = JSON.stringify({
      question: bounded.question,
      recentTurns: bounded.recentTurns,
      hasFarmData: bounded.hasFarmData,
    });

    const response = await generateMeta({
      prompt,
      systemInstruction: META_ROUTER_SYSTEM_INSTRUCTION,
      reasoningEffort: 'low',
      maxOutputTokens: META_MAX_OUTPUT_TOKENS,
      timeoutMs: META_TIMEOUT_MS,
      signal,
      responseFormat: {
        type: 'json_schema',
        name: 'route_decision',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            route: { type: 'string', enum: ['fast', 'deep'] },
            confidence: { type: 'number' },
            answer: { type: ['string', 'null'] },
          },
          required: ['route', 'confidence', 'answer'],
          additionalProperties: false,
        },
      },
    });

    usage = {
      inputTokens: typeof response.inputTokens === 'number' ? response.inputTokens : null,
      outputTokens: typeof response.outputTokens === 'number' ? response.outputTokens : null,
    };

    signal?.throwIfAborted();
    try {
      const raw = JSON.parse(response.text);
      rawPrediction = ['fast', 'deep'].includes(raw.route) ? raw.route : null;
      rawConfidence = raw.confidence ?? null;
    } catch {}
    const parsed = parseMetaRouterOutput(response.text, response.finishReason);
    rawPrediction = parsed.route;
    rawConfidence = parsed.confidence;
    directAnswer = parsed.answer;
  } catch (err) {
    rawError = err;
    if (signal?.aborted) {
      const abortErr = new Error('The operation was aborted.');
      abortErr.name = 'AbortError';
      throw abortErr;
    }
  }

  const durationMs = now() - startTime;

  // Decision policy: if error, missing prediction, or malformed
  if (rawError || !rawPrediction) {
    return {
      arm: 'meta_router',
      rawRoute: rawPrediction,
      rawConfidence,
      rawProbabilities: null,
      effectiveRoute: 'deep',
      fallbackReason: rawError ? rawError.message : 'missing_prediction',
      directAnswer: null,
      confidenceType: 'self_reported',
      durationMs,
      model: 'muse-spark-1.3-contributor',
      usage,
    };
  }

  // Meta confidence threshold: fast requires confidence >= META_FAST_THRESHOLD (0.85)
  if (rawPrediction === 'fast' && rawConfidence < META_FAST_THRESHOLD) {
    return {
      arm: 'meta_router',
      rawRoute: rawPrediction,
      rawConfidence,
      rawProbabilities: null,
      effectiveRoute: 'deep',
      fallbackReason: 'low_confidence',
      directAnswer: null,
      confidenceType: 'self_reported',
      durationMs,
      model: 'muse-spark-1.3-contributor',
      usage,
    };
  }

  return {
    arm: 'meta_router',
    rawRoute: rawPrediction,
    rawConfidence,
    rawProbabilities: null,
    effectiveRoute: rawPrediction,
    fallbackReason: null,
    directAnswer,
    confidenceType: 'self_reported',
    durationMs,
    model: 'muse-spark-1.3-contributor',
    usage,
  };
}

/**
 * Route via Jev SystemOne Choice API.
 * Keeps timeout active through body parsing and validates Choice contract strictly.
 */
async function routeWithJev({
  input,
  apiKey,
  fetchImpl = fetch,
  signal,
  baseUrl = 'https://api.typesafe.ai/v1/systemone',
  now = () => Date.now(),
}) {
  if (signal?.aborted) {
    const err = new Error('The operation was aborted.');
    err.name = 'AbortError';
    throw err;
  }

  const bounded = buildRouterInput(input);
  const startTime = now();
  let rawPrediction = null;
  let rawConfidence = null;
  let rawProbabilities = null;
  let rawError = null;
  let responseModel = 'jev-latest';
  let usage = { inputTokens: null, outputTokens: null };

  const requestBody = {
    model: 'jev-latest',
    state: {
      question: bounded.question,
      recentTurns: bounded.recentTurns,
      hasFarmData: bounded.hasFarmData,
    },
    questions: {
      route_decision: {
        type: 'choice',
        instructions: 'Decide whether this query can be handled with a fast standalone response or requires deep farm/diagnostic analysis.',
        criteria: {
          fast: 'Simple greeting, general concept definition, basic math, or standalone short query requiring no farm data.',
          deep: 'Requires pond measurements, feed or water history, dosing safety, diagnostics, or ambiguous follow-up context.',
        },
      },
    },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(new Error('Jev router timeout')), JEV_TIMEOUT_MS);
  const effectiveSignal = signal
    ? (signal.aborted ? signal : AbortSignal.any ? AbortSignal.any([signal, controller.signal]) : controller.signal)
    : controller.signal;

  try {
    const response = await fetchImpl(baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: effectiveSignal,
      redirect: 'error',
    });

    if (!response.ok) {
      throw new Error(`Jev API HTTP error ${response.status}`);
    }

    // Keep timeout active through body parsing!
    const json = await new Promise((resolve, reject) => {
      const abort = () => reject(effectiveSignal.reason || new DOMException('Aborted', 'AbortError'));
      effectiveSignal.addEventListener('abort', abort, { once: true });
      if (effectiveSignal.aborted) abort();
      Promise.resolve().then(() => response.json()).then(resolve, reject)
        .finally(() => effectiveSignal.removeEventListener('abort', abort));
    });
    effectiveSignal.throwIfAborted();
    const raw = json?.answers?.route_decision;
    rawPrediction = ['fast', 'deep'].includes(raw?.choice) ? raw.choice : null;
    rawConfidence = raw?.confidence ?? null;
    rawProbabilities = raw?.probabilities ?? null;
    responseModel = json?.model || 'unknown';
    usage = { inputTokens: json?.usage?.input_tokens ?? null, outputTokens: json?.usage?.output_tokens ?? null };
    const parsed = parseJevChoiceOutput(json);
    rawPrediction = parsed.choice;
    rawConfidence = parsed.confidence;
    rawProbabilities = parsed.probabilities;
    responseModel = parsed.model;
    usage = parsed.usage;
  } catch (err) {
    rawError = err;
    if (signal?.aborted || (signal && err?.name === 'AbortError' && signal.aborted)) {
      clearTimeout(timeoutId);
      const abortErr = new Error('The operation was aborted.');
      abortErr.name = 'AbortError';
      throw abortErr;
    }
  } finally {
    clearTimeout(timeoutId);
  }

  const durationMs = now() - startTime;

  if (rawError || !rawPrediction) {
    return {
      arm: 'jev_router',
      rawRoute: rawPrediction,
      rawConfidence,
      rawProbabilities,
      effectiveRoute: 'deep',
      fallbackReason: rawError ? rawError.message : 'missing_prediction',
      directAnswer: null,
      confidenceType: 'distribution_derived',
      durationMs,
      model: responseModel,
      usage,
    };
  }

  // Jev confidence threshold check
  const isConfidentFast = rawPrediction === 'fast' && rawConfidence >= JEV_FAST_THRESHOLD;
  const effectiveRoute = rawPrediction === 'fast' ? (isConfidentFast ? 'fast' : 'deep') : 'deep';
  const fallbackReason = rawPrediction === 'fast' && !isConfidentFast ? 'low_confidence' : null;

  return {
    arm: 'jev_router',
    rawRoute: rawPrediction,
    rawConfidence,
    rawProbabilities,
    effectiveRoute,
    fallbackReason,
    directAnswer: null,
    confidenceType: 'distribution_derived',
    durationMs,
    model: responseModel,
    usage,
  };
}

module.exports = {
  OFFICIAL_META_API_BASE_URL,
  META_FAST_THRESHOLD,
  JEV_FAST_THRESHOLD,
  META_TIMEOUT_MS,
  JEV_TIMEOUT_MS,
  JEV_DISCOVERY_TIMEOUT_MS,
  META_MAX_OUTPUT_TOKENS,
  META_MAX_DIRECT_ANSWER_CHARS,
  PROBABILITY_SUM_TOLERANCE,
  META_ROUTER_SYSTEM_INSTRUCTION,
  buildRouterInput,
  parseMetaRouterOutput,
  parseJevChoiceOutput,
  discoverJevModel,
  routeWithMeta,
  routeWithJev,
};
