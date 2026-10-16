'use strict';

/**
 * Pure mock unit tests for Orson decision benchmark (Tier 3 specification).
 * No external network, credentials, or source root required.
 * Executable via: node --test experiments/orson-decision-bench/routing.test.cjs
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const {
  META_FAST_THRESHOLD,
  JEV_FAST_THRESHOLD,
  buildRouterInput,
  parseMetaRouterOutput,
  parseJevChoiceOutput,
  discoverJevModel,
  routeWithMeta,
  routeWithJev,
} = require('./routing.cjs');

const {
  ANSWER_WORKLOADS,
  ROUTING_ONLY_CASES,
  createRuntimeInput,
} = require('./fixtures.cjs');

const {
  buildSchedule,
  prepareWorkloads,
  hashSourceFiles,
  REQUIRED_SOURCE_REL_PATHS,
  redactSecrets,
  calculatePairDifferences,
  computeAggregateMetrics,
  executeTrial,
} = require('./run.cjs');

test('buildRouterInput: bounds inputs and strictly excludes expected labels or full payloads', () => {
  const dirtyInput = {
    question: '  What is pH in shrimp farming?  ',
    recentTurns: [
      { role: 'user', content: 'Turn 1' },
      { role: 'assistant', content: 'Turn 2' },
      { role: 'user', content: 'Turn 3' },
      { role: 'assistant', content: 'Turn 4' },
      { role: 'user', content: 'Turn 5' },
    ],
    hasFarmData: true,
    expectedRoute: 'fast',
    pondPayload: { ponds: [{ id: 'secret' }] },
    instruction: 'System instruction text',
  };

  const clean = buildRouterInput(dirtyInput);
  assert.equal(clean.question, 'What is pH in shrimp farming?');
  assert.equal(clean.hasFarmData, true);
  assert.equal(clean.expectedRoute, undefined);
  assert.equal(clean.pondPayload, undefined);
  assert.equal(clean.instruction, undefined);
  assert.equal(clean.recentTurns.length, 4);
  assert.equal(clean.recentTurns[0].content, 'Turn 2');
});

test('createRuntimeInput: accessing expectedRoute during trial execution throws error', () => {
  const fixture = {
    id: 'hello',
    question: 'Hello',
    expectedRoute: 'fast',
    mode: 'standard',
    hasFarmData: true,
  };

  const safe = createRuntimeInput(fixture);
  assert.equal(safe.question, 'Hello');
  assert.equal(safe.hasFarmData, true);

  assert.throws(() => {
    const _route = safe.expectedRoute;
  }, /SECURITY VIOLATION.*expectedRoute/);

  assert.throws(() => {
    const _route = safe.expected;
  }, /SECURITY VIOLATION.*expected/);
});

test('truthful availability: all answer workloads, adversarial_01, and multilingual_01 have hasFarmData = true', () => {
  for (const w of ANSWER_WORKLOADS) {
    assert.equal(w.hasFarmData, true, `Workload ${w.id} must have hasFarmData: true`);
  }
  const adv1 = ROUTING_ONLY_CASES.find(c => c.id === 'adversarial_01');
  const multi1 = ROUTING_ONLY_CASES.find(c => c.id === 'multilingual_01');
  assert.equal(adv1.hasFarmData, true);
  assert.equal(multi1.hasFarmData, true);
});

test('parseMetaRouterOutput: validates strict schema, whitelist, ambiguous wrappers, and bounds', () => {
  // Valid output
  const valid = parseMetaRouterOutput('{"route":"fast","confidence":0.95,"answer":"45"}', 'STOP');
  assert.deepEqual(valid, { route: 'fast', confidence: 0.95, answer: '45' });

  // Valid output with single markdown fence
  const fenced = parseMetaRouterOutput('```json\n{"route":"deep","confidence":0.8,"answer":null}\n```', 'STOP');
  assert.deepEqual(fenced, { route: 'deep', confidence: 0.8, answer: null });

  // Rejects multiple ambiguous code blocks
  assert.throws(() => {
    parseMetaRouterOutput('```json\n{"route":"fast","confidence":0.9,"answer":null}\n```\n```json\n{"route":"deep","confidence":0.1,"answer":null}\n```', 'STOP');
  }, /multiple.*code blocks/);

  // Rejects incomplete finishReason
  assert.throws(() => {
    parseMetaRouterOutput('{"route":"fast","confidence":0.9,"answer":null}', 'MAX_TOKENS');
  }, /incomplete finishReason/);

  // Rejects extra disallowed key
  assert.throws(() => {
    parseMetaRouterOutput('{"route":"fast","confidence":0.9,"answer":null,"extra":"bad"}', 'STOP');
  }, /disallowed key: extra/);

  // Rejects invalid route
  assert.throws(() => {
    parseMetaRouterOutput('{"route":"medium","confidence":0.9,"answer":null}', 'STOP');
  }, /invalid route/);

  // Rejects invalid confidence range
  assert.throws(() => {
    parseMetaRouterOutput('{"route":"fast","confidence":1.5,"answer":null}', 'STOP');
  }, /invalid confidence/);

  // Rejects answer exceeding 2000 chars
  const longAnswer = 'a'.repeat(2001);
  assert.throws(() => {
    parseMetaRouterOutput(JSON.stringify({ route: 'fast', confidence: 0.9, answer: longAnswer }), 'STOP');
  }, /exceeds 2000 characters/);
});

test('routeWithMeta: confidence boundary 0.85, raw prediction preservation, and usage retention', async () => {
  // Test 1: Confidence below 0.85 threshold (e.g. 0.80) -> raw route fast, effective deep, low_confidence fallback
  const mockLowConf = async () => ({
    text: JSON.stringify({ route: 'fast', confidence: 0.80, answer: '45' }),
    finishReason: 'STOP',
    inputTokens: 120,
    outputTokens: 25,
  });
  const resLow = await routeWithMeta({
    input: { question: '18 + 27' },
    generateMeta: mockLowConf,
  });
  assert.equal(resLow.rawRoute, 'fast');
  assert.equal(resLow.rawConfidence, 0.80);
  assert.equal(resLow.effectiveRoute, 'deep');
  assert.equal(resLow.fallbackReason, 'low_confidence');
  assert.equal(resLow.directAnswer, null);
  assert.equal(resLow.usage.inputTokens, 120);

  // Test 2: Confidence >= 0.85 -> direct answer accepted
  const mockHighConf = async () => ({
    text: JSON.stringify({ route: 'fast', confidence: 0.92, answer: '45' }),
    finishReason: 'STOP',
    inputTokens: 120,
    outputTokens: 25,
  });
  const resHigh = await routeWithMeta({
    input: { question: '18 + 27' },
    generateMeta: mockHighConf,
  });
  assert.equal(resHigh.rawRoute, 'fast');
  assert.equal(resHigh.effectiveRoute, 'fast');
  assert.equal(resHigh.directAnswer, '45');
  assert.equal(resHigh.fallbackReason, null);

  // Test 3: Malformed JSON preserves raw error and falls back to deep
  const mockBadJson = async () => ({
    text: 'not-json',
    finishReason: 'STOP',
  });
  const resBad = await routeWithMeta({
    input: { question: 'Hello' },
    generateMeta: mockBadJson,
  });
  assert.equal(resBad.rawRoute, null);
  assert.equal(resBad.effectiveRoute, 'deep');
  assert.match(resBad.fallbackReason, /Meta router invalid JSON/);
});

test('discoverJevModel: discovers model alias outside timed trials or fails discovery', async () => {
  // Successful discovery
  const mockFetchOk = async () => ({
    ok: true,
    json: async () => ({
      data: [{ id: 'jev-1.13.0', name: 'jev-1.13.0' }, { id: 'jev-latest', name: 'jev-latest' }],
    }),
  });
  const discovery = await discoverJevModel({ apiKey: 'jev-key', fetchImpl: mockFetchOk });
  assert.equal(discovery.discovered, true);
  assert.equal(discovery.resolvedModel, 'jev-latest');

  // Failed discovery throws
  const mockFetchFail = async () => ({
    ok: false,
    status: 404,
  });
  await assert.rejects(async () => {
    await discoverJevModel({ apiKey: 'jev-key', fetchImpl: mockFetchFail });
  }, /Jev model discovery HTTP error 404/);
});

test('parseJevChoiceOutput: probability keys, sum tolerance, argmax consistency, and ties', () => {
  const baseValid = {
    model: 'jev-1.13.0',
    answers: {
      route_decision: {
        type: 'choice',
        choice: 'fast',
        probabilities: { fast: 0.88, deep: 0.12 },
        confidence: 0.81, // Distinct from probability!
      },
    },
    usage: { input_tokens: 200, output_tokens: 30 },
  };

  const parsed = parseJevChoiceOutput(baseValid);
  assert.equal(parsed.choice, 'fast');
  assert.equal(parsed.confidence, 0.81);
  assert.equal(parsed.probabilities.fast, 0.88);
  assert.equal(parsed.usage.inputTokens, 200);

  // Rejects missing/extra keys in probabilities
  assert.throws(() => {
    parseJevChoiceOutput({
      ...baseValid,
      answers: {
        route_decision: {
          ...baseValid.answers.route_decision,
          probabilities: { fast: 0.88, deep: 0.12, extra: 0.0 },
        },
      },
    });
  }, /must contain exactly "fast" and "deep"/);

  // Rejects out-of-range probabilities
  assert.throws(() => {
    parseJevChoiceOutput({
      ...baseValid,
      answers: {
        route_decision: {
          ...baseValid.answers.route_decision,
          probabilities: { fast: 1.2, deep: -0.2 },
        },
      },
    });
  }, /must be a finite number in \[0, 1\]/);

  // Rejects bad sum (tolerance is 0.02)
  assert.throws(() => {
    parseJevChoiceOutput({
      ...baseValid,
      answers: {
        route_decision: {
          ...baseValid.answers.route_decision,
          probabilities: { fast: 0.60, deep: 0.30 }, // sum 0.90
        },
      },
    });
  }, /do not sum to 1.0/);

  // Rejects argmax inconsistency (choice deep when fast > deep)
  assert.throws(() => {
    parseJevChoiceOutput({
      ...baseValid,
      answers: {
        route_decision: {
          ...baseValid.answers.route_decision,
          choice: 'deep',
          probabilities: { fast: 0.70, deep: 0.30 },
        },
      },
    });
  }, /is inconsistent with argmax probability/);

  // Rejects exact tie
  assert.throws(() => {
    parseJevChoiceOutput({
      ...baseValid,
      answers: {
        route_decision: {
          ...baseValid.answers.route_decision,
          choice: 'fast',
          probabilities: { fast: 0.50, deep: 0.50 },
        },
      },
    });
  }, /resulted in an exact tie/);
});

test('routeWithJev: active body deadline and 0.85 confidence threshold', async () => {
  // Test 1: Confidence below 0.85 -> falls back to deep, preserves raw prediction
  const mockLowConf = async () => ({
    ok: true,
    json: async () => ({
      model: 'jev-1.13.0',
      answers: {
        route_decision: {
          type: 'choice',
          choice: 'fast',
          probabilities: { fast: 0.86, deep: 0.14 },
          confidence: 0.75, // Below 0.85 threshold
        },
      },
    }),
  });

  const resLow = await routeWithJev({
    input: { question: 'Hello' },
    apiKey: 'jev-key',
    fetchImpl: mockLowConf,
  });
  assert.equal(resLow.rawRoute, 'fast');
  assert.equal(resLow.rawConfidence, 0.75);
  assert.equal(resLow.effectiveRoute, 'deep');
  assert.equal(resLow.fallbackReason, 'low_confidence');

  // Test 2: Timeout active through body parsing
  const mockHangingBody = async () => ({
    ok: true,
    json: () => new Promise(resolve => setTimeout(resolve, 6000)), // exceeds 5s timeout
  });

  const resTimeout = await routeWithJev({
    input: { question: 'Hello' },
    apiKey: 'jev-key',
    fetchImpl: mockHangingBody,
  });
  assert.equal(resTimeout.effectiveRoute, 'deep');
  assert.match(resTimeout.fallbackReason, /timeout|abort/i);
});

test('cancellation propagation: caller signal stops work and does not start subsequent trials', async () => {
  const controller = new AbortController();
  controller.abort();

  // routeWithMeta throws AbortError
  await assert.rejects(async () => {
    await routeWithMeta({
      input: { question: 'Hello' },
      generateMeta: async () => ({ text: '{}', finishReason: 'STOP' }),
      signal: controller.signal,
    });
  }, { name: 'AbortError' });

  // executeTrial throws AbortError
  await assert.rejects(async () => {
    await executeTrial({
      scheduledItem: { index: 0, arm: 'baseline', type: 'answer', repeat: 1, warmup: false, workloadId: 'hello' },
      signal: controller.signal,
      now: () => Date.now(),
    });
  }, { name: 'AbortError' });
});

test('downstream execution: identical full inputs/settings across all 3 arms on deep, and LOW on fast', async () => {
  const capturedCalls = [];
  const mockBaselineModules = {
    api: {
      getOrsonGenerationSettings: mode => ({
        reasoningEffort: mode === 'pond_diagnostic' ? 'high' : 'low',
        maxOutputTokens: mode === 'pond_diagnostic' ? 10000 : 2500,
        timeoutMs: mode === 'pond_diagnostic' ? 90000 : 60000,
      }),
      generateMetaModelResponse: async params => {
        capturedCalls.push(params);
        return { text: 'Diagnostic response text', finishReason: 'STOP', inputTokens: 500, outputTokens: 100 };
      },
    },
    handler: {
      buildServerOrsonSystemInstruction: (mode, fn, route) => `INSTRUCTION: mode=${mode} fn=${fn} route=${route}`,
    },
    pipeline: {
      buildOrsonAnalysis: (_ponds, question) => ({
        promptPackage: {
          context: 'MOCK_CONTEXT',
          userMessage: question,
          questionFocus: { analysisMode: 'pond_diagnostic', route: 'farm_analysis' },
        },
      }),
    },
    promptBuilder: {
      buildOrsonRequestPrompt: (ctx, msg) => `${ctx}\n\nUSER:${msg}`,
    },
    grounding: {
      generateGroundedOrsonResponse: async ({ generate, mode }) => {
        // Must receive mode passed to it
        return generate({ modeReceived: mode });
      },
    },
    dosingSafety: {
      guardModelDosingAnswer: async ({ answer }) => answer,
    },
    nitrogenSafety: {
      guardOrsonNitrogenAnswer: async ({ answer }) => answer,
    },
  };

  const workload = {
    id: 'fixture01',
    question: 'Analyze Test Pond',
    mode: 'pond_diagnostic',
    hasFarmData: true,
    ponds: [],
    asOf: '2026-09-04T02:00:00Z',
  };

  // Run baseline arm
  await executeTrial({
    scheduledItem: { index: 0, arm: 'baseline', type: 'answer', repeat: 1, warmup: false, workloadId: 'fixture01' },
    workloads: [workload],
    baselineModules: mockBaselineModules,
    metaApiKey: 'k',
    jevApiKey: 'k',
  });

  const baselineCall = capturedCalls[0];
  assert.equal(baselineCall.reasoningEffort, 'high');
  assert.equal(baselineCall.maxOutputTokens, 10000);
  assert.match(baselineCall.systemInstruction, /WEB VERIFICATION: Unavailable/);
  for (const arm of ['meta_router', 'jev_router']) {
    await executeTrial({
      scheduledItem: { index: 2, arm, type: 'answer', repeat: 1, warmup: false, workloadId: workload.id },
      workloads: [workload], metaApiKey: 'meta-mock', jevApiKey: 'jev-mock',
      baselineModules: {
        ...mockBaselineModules,
        api: { ...mockBaselineModules.api, generateMetaModelResponse: async params => {
          if (params.responseFormat) return { text: JSON.stringify({ route: 'deep', confidence: 0.99, answer: null }), finishReason: 'STOP' };
          capturedCalls.push(params);
          return { text: 'Same diagnostic facts', finishReason: 'STOP' };
        } },
      },
      fetchImpl: async () => ({ ok: true, json: async () => ({ model: 'jev-mock', answers: {
        route_decision: { type: 'choice', choice: 'deep', probabilities: { fast: 0.01, deep: 0.99 }, confidence: 0.98 },
      } }) }),
    });
    const actual = capturedCalls.at(-1);
    for (const key of ['prompt', 'systemInstruction', 'reasoningEffort', 'maxOutputTokens', 'timeoutMs']) {
      assert.deepEqual(actual[key], baselineCall[key], arm + ' preserves full ' + key);
    }
  }

  // If routed fast, grounding must enforce mode: 'standard' and LOW/2500
  let fastGenerateCall = null;
  const mockFastBaseline = {
    ...mockBaselineModules,
    api: {
      ...mockBaselineModules.api,
      generateMetaModelResponse: async params => {
        fastGenerateCall = params;
        return { text: 'Fast response', finishReason: 'STOP' };
      },
    },
  };

  const fastWorkload = {
    id: 'concept',
    question: 'What is pH?',
    mode: 'standard',
    hasFarmData: true,
    ponds: [],
    asOf: '2026-09-04T02:00:00Z',
  };

  await executeTrial({
    scheduledItem: { index: 1, arm: 'meta_router', type: 'answer', repeat: 1, warmup: false, workloadId: 'concept' },
    workloads: [fastWorkload],
    baselineModules: {
      ...mockFastBaseline,
      api: {
        ...mockFastBaseline.api,
        generateMetaModelResponse: async params => {
          // Router returns fast without direct answer
          if (params.responseFormat) {
            return { text: JSON.stringify({ route: 'fast', confidence: 0.95, answer: null }), finishReason: 'STOP' };
          }
          fastGenerateCall = params;
          return { text: 'Fast concept answer', finishReason: 'STOP' };
        },
      },
    },
    metaApiKey: 'k',
    jevApiKey: 'k',
  });

  assert.equal(fastGenerateCall.reasoningEffort, 'low');
  assert.equal(fastGenerateCall.maxOutputTokens, 2500);
});

test('guards and direct answers: withheld direct answer falls back to deep and deep generation completes with timing', async () => {
  let guardRan = false;
  let deepGenerationRan = false;
  const mockBaseline = {
    api: {
      getOrsonGenerationSettings: () => ({ reasoningEffort: 'high', maxOutputTokens: 10000, timeoutMs: 90000 }),
      generateMetaModelResponse: async params => {
        if (params.responseFormat) {
          return {
            text: JSON.stringify({ route: 'fast', confidence: 0.99, answer: 'Take 5 kg lime.' }),
            finishReason: 'STOP',
          };
        }
        deepGenerationRan = true;
        return {
          text: 'Deep safe diagnostic explanation',
          finishReason: 'STOP',
        };
      },
    },
    dosingSafety: {
      guardModelDosingAnswer: async ({ answer }) => {
        guardRan = true;
        if (answer.text?.includes('5 kg lime')) {
          return {
            ...answer,
            text: 'I could not clear this answer for chemical dosing.',
            finishReason: 'STOP',
            doseSafety: 'withheld',
          };
        }
        return answer;
      },
    },
    nitrogenSafety: {
      guardOrsonNitrogenAnswer: async ({ answer }) => answer,
    },
    handler: { buildServerOrsonSystemInstruction: () => 'INSTRUCTION' },
    pipeline: { buildOrsonAnalysis: () => ({ promptPackage: { context: '', userMessage: 'test', questionFocus: { analysisMode: 'standard', route: 'farm_analysis' } } }) },
    promptBuilder: { buildOrsonRequestPrompt: () => 'PROMPT' },
    grounding: { generateGroundedOrsonResponse: async ({ generate }) => generate() },
  };

  let clock = 100;
  const trial = await executeTrial({
    scheduledItem: { index: 0, arm: 'meta_router', type: 'answer', repeat: 1, warmup: false, workloadId: 'hello' },
    workloads: [{ id: 'hello', question: 'Dose', hasFarmData: true, mode: 'standard' }],
    baselineModules: mockBaseline,
    metaApiKey: 'k',
    jevApiKey: 'k',
    now: () => {
      clock += 50;
      return clock;
    },
  });

  assert.equal(guardRan, true);
  assert.equal(deepGenerationRan, true);
  assert.equal(trial.effectiveRoute, 'deep');
  assert.match(trial.fallbackReason, /direct_safety_withheld/);
  assert.equal(trial.error, null);
  assert.equal(trial.text, 'Deep safe diagnostic explanation');
  assert.ok(trial.guardsMs > 0, 'guardsMs must be measured');
  assert.ok(trial.firstAnswerMs > 0, 'firstAnswerMs must be captured');
});

test('guards and direct answers: successful direct answer timing includes guard duration', async () => {
  let guardRan = false;
  const mockBaseline = {
    api: {
      getOrsonGenerationSettings: () => ({ reasoningEffort: 'low', maxOutputTokens: 2500 }),
      generateMetaModelResponse: async () => ({
        text: JSON.stringify({ route: 'fast', confidence: 0.99, answer: '45' }),
        finishReason: 'STOP',
      }),
    },
    dosingSafety: {
      guardModelDosingAnswer: async ({ answer }) => {
        guardRan = true;
        return answer;
      },
    },
    nitrogenSafety: {
      guardOrsonNitrogenAnswer: async ({ answer }) => answer,
    },
    handler: { buildServerOrsonSystemInstruction: () => 'INSTRUCTION' },
    pipeline: { buildOrsonAnalysis: () => ({ promptPackage: { context: '', userMessage: 'test' } }) },
    promptBuilder: { buildOrsonRequestPrompt: () => 'PROMPT' },
    grounding: { generateGroundedOrsonResponse: async ({ generate }) => generate() },
  };

  let clock = 100;
  const trial = await executeTrial({
    scheduledItem: { index: 0, arm: 'meta_router', type: 'answer', repeat: 1, warmup: false, workloadId: 'math' },
    workloads: [{ id: 'math', question: '18 + 27', hasFarmData: true, mode: 'standard' }],
    baselineModules: mockBaseline,
    metaApiKey: 'k',
    jevApiKey: 'k',
    now: () => {
      clock += 40;
      return clock;
    },
  });

  assert.equal(guardRan, true);
  assert.equal(trial.directAnswer, true);
  assert.equal(trial.effectiveRoute, 'fast');
  assert.equal(trial.text, '45');
  assert.equal(trial.error, null);
  assert.ok(trial.firstAnswerMs >= trial.prepMs + trial.routerMs + trial.guardsMs);
  assert.ok(trial.firstAnswerMs <= trial.totalMs);
  assert.ok(trial.guardsMs > 0);
});

test('real grounding fallback: empty draft turns into fallback text with incomplete_draft issue and marks trial FAILED', async () => {
  const mockBaseline = {
    api: {
      getOrsonGenerationSettings: () => ({ reasoningEffort: 'high', maxOutputTokens: 10000 }),
      generateMetaModelResponse: async () => ({
        text: '',
        finishReason: 'STOP',
      }),
    },
    grounding: {
      generateGroundedOrsonResponse: async () => ({
        text: 'Fallback biological guidance based on limits.',
        finishReason: 'STOP',
        groundingStatus: 'fallback',
        groundingIssues: ['incomplete_draft'],
      }),
    },
    dosingSafety: { guardModelDosingAnswer: async ({ answer }) => answer },
    nitrogenSafety: { guardOrsonNitrogenAnswer: async ({ answer }) => answer },
    handler: { buildServerOrsonSystemInstruction: () => 'INSTRUCTION' },
    pipeline: { buildOrsonAnalysis: () => ({ promptPackage: { context: '', userMessage: 'test' } }) },
    promptBuilder: { buildOrsonRequestPrompt: () => 'PROMPT' },
  };

  const trial = await executeTrial({
    scheduledItem: { index: 0, arm: 'baseline', type: 'answer', repeat: 1, warmup: false, workloadId: 'fixture01' },
    workloads: [{ id: 'fixture01', question: 'Analyze Test Pond', hasFarmData: true, mode: 'pond_diagnostic' }],
    baselineModules: mockBaseline,
    metaApiKey: 'k',
    jevApiKey: 'k',
  });

  assert.match(trial.error, /Incomplete downstream draft with fallback grounding/);
  assert.equal(trial.groundingStatus, 'fallback');

  const metrics = computeAggregateMetrics([trial], [{ warmup: false, workloadId: 'fixture01', arm: 'baseline' }]);
  assert.equal(metrics.failedTrials, 1);
  assert.equal(metrics.successfulTrials, 0);
  assert.equal(metrics.byWorkload.fixture01.baseline.successfulTrials, 0);
  assert.equal(metrics.byWorkload.fixture01.baseline.medianTotalMs, null);
});

test('parseMetaRouterOutput: rejects prefix/suffix text and ambiguous contradictory JSON around markdown fences', () => {
  assert.throws(() => {
    parseMetaRouterOutput('Here is decision:\n```json\n{"route":"fast","confidence":0.95,"answer":null}\n```', 'STOP');
  }, /ambiguous surrounding text/);

  assert.throws(() => {
    parseMetaRouterOutput('```json\n{"route":"fast","confidence":0.95,"answer":null}\n```\nExtra trailing content', 'STOP');
  }, /ambiguous surrounding text/);

  assert.throws(() => {
    parseMetaRouterOutput('```json\n{"route":"fast","confidence":0.95,"answer":null}\n```\n```json\n{"route":"deep","confidence":0.99,"answer":null}\n```', 'STOP');
  }, /ambiguous surrounding text|contradictory/);
});

test('partial stream failure: captures first visible token then marks trial failed on stream abort', async () => {
  const mockBaseline = {
    api: {
      getOrsonGenerationSettings: () => ({ reasoningEffort: 'low', maxOutputTokens: 2500 }),
      generateMetaModelResponse: async ({ onTextDelta }) => {
        if (onTextDelta) await onTextDelta('Partial token');
        throw new Error('Connection reset by peer');
      },
    },
    grounding: {
      generateGroundedOrsonResponse: async ({ generate }) => generate(),
    },
    dosingSafety: { guardModelDosingAnswer: async ({ answer }) => answer },
    nitrogenSafety: { guardOrsonNitrogenAnswer: async ({ answer }) => answer },
    handler: { buildServerOrsonSystemInstruction: () => 'INSTRUCTION' },
    pipeline: { buildOrsonAnalysis: () => ({ promptPackage: { context: '', userMessage: 'test' } }) },
    promptBuilder: { buildOrsonRequestPrompt: () => 'PROMPT' },
  };

  const trial = await executeTrial({
    scheduledItem: { index: 0, arm: 'baseline', type: 'answer', repeat: 1, warmup: false, workloadId: 'hello' },
    workloads: [{ id: 'hello', question: 'Hello', hasFarmData: true, mode: 'standard' }],
    baselineModules: mockBaseline,
    metaApiKey: 'k',
    jevApiKey: 'k',
  });

  assert.ok(trial.firstAnswerMs !== null, 'firstAnswerMs should have captured the partial token');
  assert.equal(trial.error, 'Connection reset by peer');
});

test('main: in-flight cancellation stops subsequent calls and saves partial results without lost rows or secrets', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orson-main-cancel-'));
  const tempSource = fs.mkdtempSync(path.join(os.tmpdir(), 'orson-source-'));

  try {
    for (const rel of REQUIRED_SOURCE_REL_PATHS) {
      const p = path.join(tempSource, rel);
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, 'module.exports = {};');
    }
    fs.writeFileSync(path.join(tempSource, 'functions/shared/metaModelApi.js'),
      'module.exports = { META_MODEL_API_BASE_URL: "https://api.meta.ai/v1", META_MODEL_API_MODEL: "muse-spark-1.3-contributor", generateMetaModelResponse: async () => ({ text: "ok", finishReason: "STOP" }), getOrsonGenerationSettings: () => ({ reasoningEffort: "low", maxOutputTokens: 2500 }) };');
    fs.writeFileSync(path.join(tempSource, 'functions/orson.js'),
      'module.exports = { buildServerOrsonSystemInstruction: () => "INSTRUCTION" };');
    fs.writeFileSync(path.join(tempSource, 'functions/shared/orsonAnswerGrounding.js'),
      'module.exports = { generateGroundedOrsonResponse: async ({ generate }) => generate() };');
    fs.writeFileSync(path.join(tempSource, 'functions/shared/orsonDosingSafety.js'),
      'module.exports = { guardModelDosingAnswer: async ({ answer }) => answer };');
    fs.writeFileSync(path.join(tempSource, 'functions/shared/orsonNitrogenSafety.js'),
      'module.exports = { guardOrsonNitrogenAnswer: async ({ answer }) => answer };');
    fs.writeFileSync(path.join(tempSource, 'orson/pipeline.ts'),
      'module.exports = { buildOrsonAnalysis: () => ({ promptPackage: { context: "", userMessage: "q" } }) };');
    fs.writeFileSync(path.join(tempSource, 'orson/promptBuilder.ts'),
      'module.exports = { buildOrsonRequestPrompt: () => "p" };');
    fs.writeFileSync(path.join(tempSource, 'orson/fixtures/diagnosticEvaluation.cjs'),
      'module.exports = [{ id: "01", question: "q1", ponds: [], asOf: "2026-09-04T02:00:00Z" }, { id: "17", question: "q17", ponds: [], asOf: "2026-09-04T02:00:00Z" }];');

    const controller = new AbortController();
    let callCount = 0;

    const mockFetch = async (url) => {
      if (url.includes('/models')) {
        return { ok: true, json: async () => ({ data: [{ id: 'jev-latest' }] }) };
      }
      callCount++;
      if (callCount === 2) {
        controller.abort();
      }
      return { ok: true, json: async () => ({ output_text: 'hello', finishReason: 'STOP' }) };
    };

    await assert.rejects(async () => {
      const { main: runMain } = require('./run.cjs');
      await runMain({
        signal: controller.signal,
        sourceRoot: tempSource,
        metaApiKey: 'sk-meta-secret-12345',
        jevApiKey: 'sk-jev-secret-67890',
        outputDir: tempDir,
        fetchImpl: mockFetch,
      });
    }, { name: 'AbortError' });

    assert.equal(fs.existsSync(path.join(tempDir, 'manifest.json')), true);
    assert.equal(fs.existsSync(path.join(tempDir, 'results.json')), true);
    assert.equal(fs.existsSync(path.join(tempDir, 'summary.json')), true);

    const savedResults = JSON.parse(fs.readFileSync(path.join(tempDir, 'results.json'), 'utf8'));
    assert.ok(savedResults.length >= 2, 'Must have saved attempted results before stop');
    assert.ok(savedResults.some(r => r.error === 'The operation was aborted.'));

    const summary = JSON.parse(fs.readFileSync(path.join(tempDir, 'summary.json'), 'utf8'));
    assert.equal(summary.aborted, true);
    assert.ok(summary.aggregate.unstartedTrials > 0);

    const rawResultsText = fs.readFileSync(path.join(tempDir, 'results.json'), 'utf8');
    assert.equal(rawResultsText.includes('sk-meta-secret'), false);
    assert.equal(rawResultsText.includes('sk-jev-secret'), false);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
    fs.rmSync(tempSource, { recursive: true, force: true });
  }
});

test('endpoint enforcement: rejects unapproved Meta API endpoint', () => {
  const tempSource = fs.mkdtempSync(path.join(os.tmpdir(), 'orson-endpoint-test-'));
  try {
    for (const rel of REQUIRED_SOURCE_REL_PATHS) {
      const p = path.join(tempSource, rel);
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, 'module.exports = {};');
    }
    fs.writeFileSync(path.join(tempSource, 'functions/shared/metaModelApi.js'),
      'module.exports = { META_MODEL_API_BASE_URL: "https://evil-proxy.com/v1", META_MODEL_API_MODEL: "muse-spark-1.3-contributor", generateMetaModelResponse: async () => {}, getOrsonGenerationSettings: () => ({}) };');
    fs.writeFileSync(path.join(tempSource, 'functions/orson.js'),
      'module.exports = { buildServerOrsonSystemInstruction: () => "INSTRUCTION" };');
    fs.writeFileSync(path.join(tempSource, 'functions/shared/orsonAnswerGrounding.js'),
      'module.exports = { generateGroundedOrsonResponse: async () => {} };');
    fs.writeFileSync(path.join(tempSource, 'functions/shared/orsonDosingSafety.js'),
      'module.exports = { guardModelDosingAnswer: async () => {} };');
    fs.writeFileSync(path.join(tempSource, 'functions/shared/orsonNitrogenSafety.js'),
      'module.exports = { guardOrsonNitrogenAnswer: async () => {} };');
    fs.writeFileSync(path.join(tempSource, 'orson/pipeline.ts'),
      'module.exports = { buildOrsonAnalysis: () => ({ promptPackage: { context: "", userMessage: "q" } }) };');
    fs.writeFileSync(path.join(tempSource, 'orson/promptBuilder.ts'),
      'module.exports = { buildOrsonRequestPrompt: () => "p" };');
    fs.writeFileSync(path.join(tempSource, 'orson/fixtures/diagnosticEvaluation.cjs'),
      'module.exports = [];');

    const { loadBaselineModules } = require('./run.cjs');
    assert.throws(() => {
      loadBaselineModules(tempSource);
    }, /Unapproved Meta Model API endpoint/);
  } finally {
    fs.rmSync(tempSource, { recursive: true, force: true });
  }
});

test('loadBaselineModules: strict missing required file fail-closed', () => {
  const tempSource = fs.mkdtempSync(path.join(os.tmpdir(), 'orson-missing-file-'));
  try {
    // Only create 7 of 8 required files
    const partialFiles = REQUIRED_SOURCE_REL_PATHS.slice(0, 7);
    for (const rel of partialFiles) {
      const p = path.join(tempSource, rel);
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, 'module.exports = {};');
    }
    const { loadBaselineModules } = require('./run.cjs');
    assert.throws(() => {
      loadBaselineModules(tempSource);
    }, /Required source file missing/);
  } finally {
    fs.rmSync(tempSource, { recursive: true, force: true });
  }
});

test('full input/settings equality across all 5 workloads and 3 deep paths', async () => {
  const mockSettings = {
    standard: { reasoningEffort: 'low', maxOutputTokens: 2500, timeoutMs: 60000 },
    pond_diagnostic: { reasoningEffort: 'high', maxOutputTokens: 10000, timeoutMs: 90000 },
  };

  for (const workload of ANSWER_WORKLOADS) {
    const captured = {};
    for (const arm of ['baseline', 'meta_router', 'jev_router']) {
      const mockBaselineModules = {
        api: {
          getOrsonGenerationSettings: mode => mockSettings[mode] || mockSettings.standard,
          generateMetaModelResponse: async params => {
            if (params.responseFormat) {
              return { text: JSON.stringify({ route: 'deep', confidence: 0.99, answer: null }), finishReason: 'STOP' };
            }
            captured[arm] = params;
            return { text: 'Downstream response', finishReason: 'STOP' };
          },
        },
        handler: {
          buildServerOrsonSystemInstruction: (mode, fn, route) => `INSTRUCTION: mode=${mode} fn=${fn} route=${route}`,
        },
        pipeline: {
          buildOrsonAnalysis: (_ponds, question) => ({
            promptPackage: {
              context: `CONTEXT_${workload.id}`,
              userMessage: question,
              questionFocus: { analysisMode: workload.mode, route: 'farm_analysis' },
            },
          }),
        },
        promptBuilder: {
          buildOrsonRequestPrompt: (ctx, msg) => `${ctx}\n\nUSER:${msg}`,
        },
        grounding: {
          generateGroundedOrsonResponse: async ({ generate, mode }) => generate({ modeReceived: mode }),
        },
        dosingSafety: { guardModelDosingAnswer: async ({ answer }) => answer },
        nitrogenSafety: { guardOrsonNitrogenAnswer: async ({ answer }) => answer },
      };

      const mockFetch = async () => ({
        ok: true,
        json: async () => ({
          model: 'jev-mock',
          answers: {
            route_decision: { type: 'choice', choice: 'deep', probabilities: { fast: 0.05, deep: 0.95 }, confidence: 0.95 },
          },
        }),
      });

      await executeTrial({
        scheduledItem: { index: 0, arm, type: 'answer', repeat: 1, warmup: false, workloadId: workload.id },
        workloads: [workload],
        baselineModules: mockBaselineModules,
        metaApiKey: 'meta-k',
        jevApiKey: 'jev-k',
        fetchImpl: mockFetch,
      });
    }

    assert.deepEqual(captured.meta_router.prompt, captured.baseline.prompt, `${workload.id} prompt equality`);
    assert.deepEqual(captured.jev_router.prompt, captured.baseline.prompt, `${workload.id} prompt equality`);
    assert.deepEqual(captured.meta_router.systemInstruction, captured.baseline.systemInstruction, `${workload.id} systemInstruction equality`);
    assert.deepEqual(captured.jev_router.systemInstruction, captured.baseline.systemInstruction, `${workload.id} systemInstruction equality`);
    assert.equal(captured.meta_router.reasoningEffort, captured.baseline.reasoningEffort, `${workload.id} reasoningEffort equality`);
    assert.equal(captured.jev_router.reasoningEffort, captured.baseline.reasoningEffort, `${workload.id} reasoningEffort equality`);
    assert.equal(captured.meta_router.maxOutputTokens, captured.baseline.maxOutputTokens, `${workload.id} maxOutputTokens equality`);
    assert.equal(captured.jev_router.maxOutputTokens, captured.baseline.maxOutputTokens, `${workload.id} maxOutputTokens equality`);
  }
});

test('schedule and paired differences: 102 trials, 37 decision denominator, and false-easy tracking', () => {
  const schedule = buildSchedule();
  assert.equal(schedule.length, 102);

  const mockResults = [
    { type: 'answer', arm: 'baseline', workloadId: 'hello', repeat: 1, warmup: false, totalMs: 2000, firstAnswerMs: 1000 },
    { type: 'answer', arm: 'meta_router', workloadId: 'hello', repeat: 1, warmup: false, totalMs: 800, firstAnswerMs: 800, directAnswer: true, rawRoute: 'fast', effectiveRoute: 'fast' },
    { type: 'answer', arm: 'jev_router', workloadId: 'hello', repeat: 1, warmup: false, totalMs: 1500, firstAnswerMs: 900, directAnswer: false, rawRoute: 'fast', effectiveRoute: 'fast' },
    { type: 'answer', arm: 'meta_router', workloadId: 'fixture01', repeat: 1, warmup: false, totalMs: 1200, firstAnswerMs: 600, rawRoute: 'fast', effectiveRoute: 'fast' },
    { type: 'routing_only', arm: 'meta_router', workloadId: 'mixed_01', repeat: 1, warmup: false, totalMs: 300, rawRoute: null, fallbackReason: 'parse_error', error: 'Router decision failure: parse_error' },
  ];

  const pairs = calculatePairDifferences(mockResults);
  assert.equal(pairs.completeTripletsCount, 1);
  assert.equal(pairs.meta_vs_baseline.length, 1);
  assert.equal(pairs.meta_vs_baseline[0].deltaTotalMs, 800 - 2000);

  const metrics = computeAggregateMetrics(mockResults, schedule);
  assert.equal(metrics.falseEasy.meta_router, 1);
  assert.equal(metrics.rawFalseEasy.meta_router, 1);
  assert.equal(metrics.routerStats.meta_router.plannedDenominator, 37);
  assert.equal(metrics.routerStats.meta_router.decisionFailures, 1);
  assert.ok(metrics.routerStats.meta_router.fallbackRate > 0);
});

test('hashSourceFiles & redactSecrets: detects source drift and redacts keys', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orson-drift-test-'));
  try {
    for (const rel of REQUIRED_SOURCE_REL_PATHS) {
      const file = path.join(tempDir, rel);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, '');
    }
    fs.mkdirSync(path.join(tempDir, 'functions/shared'), { recursive: true });
    const testFile = path.join(tempDir, 'functions/shared/metaModelApi.js');
    fs.writeFileSync(testFile, 'initial code');

    const h1 = hashSourceFiles(tempDir);
    assert.equal(typeof h1.combinedHash, 'string');

    // Modifying file changes hash
    fs.writeFileSync(testFile, 'modified code');
    const h2 = hashSourceFiles(tempDir);
    assert.notEqual(h1.combinedHash, h2.combinedHash);
    fs.unlinkSync(testFile);
    assert.throws(() => hashSourceFiles(tempDir), /Required source file missing/);

    // Secret redaction
    const textWithSecret = 'Error: request failed with key sk-secret-12345678 and token tok-typesafe-9999';
    const redacted = redactSecrets(textWithSecret, ['sk-secret-12345678', 'tok-typesafe-9999']);
    assert.equal(redacted, 'Error: request failed with key [REDACTED] and token [REDACTED]');
    assert.equal(redacted.includes('sk-secret'), false);
    assert.equal(redacted.includes('tok-typesafe'), false);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
