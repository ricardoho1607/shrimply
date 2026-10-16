'use strict';

/**
 * Orson decision benchmark runner (Tier 3 specification).
 * Serial execution of 75 measured answer trials + 3 warmup trials + 24 routing-only trials.
 * Full fidelity baseline pipeline, exact guards, cancellation propagation,
 * pre-run manifest freeze, transitive source hash integrity, and unredacted secret prevention.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { performance } = require('node:perf_hooks');

const {
  OFFICIAL_META_API_BASE_URL,
  META_FAST_THRESHOLD,
  JEV_FAST_THRESHOLD,
  routeWithMeta,
  routeWithJev,
  discoverJevModel,
} = require('./routing.cjs');

const {
  ANSWER_WORKLOADS,
  ROUTING_ONLY_CASES,
  resolveWorkloads,
  createRuntimeInput,
} = require('./fixtures.cjs');

const ARMS = ['baseline', 'meta_router', 'jev_router'];

const FAST_STANDALONE_INSTRUCTION = [
  'IDENTITY: You are Orson, Shrimply\'s aquaculture intelligence assistant.',
  'Answer the user question concisely and directly.',
  'Do not invent farm status, measurements, or unrequested pond diagnostics.',
].join('\n');

const REQUIRED_SOURCE_REL_PATHS = [
  'functions/shared/metaModelApi.js',
  'functions/orson.js',
  'functions/shared/orsonAnswerGrounding.js',
  'functions/shared/orsonDosingSafety.js',
  'functions/shared/orsonNitrogenSafety.js',
  'orson/pipeline.ts',
  'orson/promptBuilder.ts',
  'orson/fixtures/diagnosticEvaluation.cjs',
  'scripts/register-typescript.cjs',
];

const EXPERIMENT_FILES = [
  'experiments/orson-decision-bench/routing.cjs',
  'experiments/orson-decision-bench/fixtures.cjs',
  'experiments/orson-decision-bench/run.cjs',
  'experiments/orson-decision-bench/routing.test.cjs',
];

/**
 * Redacts known sensitive keys from any string or object.
 */
function redactSecrets(value, keys = []) {
  if (value === null || value === undefined) return value;
  let text = typeof value === 'string' ? value : JSON.stringify(value);
  for (const key of keys) {
    if (typeof key === 'string' && key.length > 4) {
      text = text.split(key).join('[REDACTED]');
    }
  }
  return typeof value === 'string' ? text : JSON.parse(text);
}

/**
 * Loads baseline modules from source root safely.
 * Sets NODE_ENV=test and registers TypeScript before requiring handler.
 * Fails closed if any required module or helper is missing.
 */
function loadBaselineModules(sourceRoot) {
  if (!sourceRoot || !fs.existsSync(sourceRoot)) {
    throw new Error(`ORSON_BENCH_SOURCE_ROOT directory does not exist: ${sourceRoot}`);
  }

  process.env.NODE_ENV = 'test';

  const tsRegister = path.join(sourceRoot, 'scripts/register-typescript.cjs');
  if (fs.existsSync(tsRegister)) {
    require(tsRegister);
  }

  for (const rel of REQUIRED_SOURCE_REL_PATHS) {
    const full = path.join(sourceRoot, rel);
    if (!fs.existsSync(full)) {
      throw new Error(`Required source file missing: ${rel} at ${full}`);
    }
  }

  const metaModelApiPath = path.join(sourceRoot, 'functions/shared/metaModelApi.js');
  const orsonPath = path.join(sourceRoot, 'functions/orson.js');
  const groundingPath = path.join(sourceRoot, 'functions/shared/orsonAnswerGrounding.js');
  const dosingPath = path.join(sourceRoot, 'functions/shared/orsonDosingSafety.js');
  const nitrogenPath = path.join(sourceRoot, 'functions/shared/orsonNitrogenSafety.js');
  const pipelinePath = path.join(sourceRoot, 'orson/pipeline.ts');
  const promptBuilderPath = path.join(sourceRoot, 'orson/promptBuilder.ts');

  const api = require(metaModelApiPath);
  const handler = require(orsonPath);
  const grounding = require(groundingPath);
  const dosingSafety = require(dosingPath);
  const nitrogenSafety = require(nitrogenPath);
  const pipeline = require(pipelinePath);
  const promptBuilder = require(promptBuilderPath);

  // Validate required exports strictly - no silent fallbacks
  if (api.META_MODEL_API_BASE_URL !== OFFICIAL_META_API_BASE_URL) {
    throw new Error(`Unapproved Meta Model API endpoint: expected "${OFFICIAL_META_API_BASE_URL}", got "${api.META_MODEL_API_BASE_URL}"`);
  }
  if (typeof api.generateMetaModelResponse !== 'function') {
    throw new Error('metaModelApi missing generateMetaModelResponse function');
  }
  if (typeof api.getOrsonGenerationSettings !== 'function') {
    throw new Error('metaModelApi missing getOrsonGenerationSettings function');
  }
  const buildInstruction = handler.__test?.buildServerOrsonSystemInstruction || handler.buildServerOrsonSystemInstruction;
  if (typeof buildInstruction !== 'function') {
    throw new Error('orson.js missing buildServerOrsonSystemInstruction helper');
  }
  if (typeof grounding.generateGroundedOrsonResponse !== 'function') {
    throw new Error('orsonAnswerGrounding missing generateGroundedOrsonResponse function');
  }
  if (typeof dosingSafety.guardModelDosingAnswer !== 'function') {
    throw new Error('orsonDosingSafety missing guardModelDosingAnswer function');
  }
  if (typeof nitrogenSafety.guardOrsonNitrogenAnswer !== 'function') {
    throw new Error('orsonNitrogenSafety missing guardOrsonNitrogenAnswer function');
  }
  if (typeof pipeline.buildOrsonAnalysis !== 'function') {
    throw new Error('pipeline.ts missing buildOrsonAnalysis function');
  }
  if (typeof promptBuilder.buildOrsonRequestPrompt !== 'function') {
    throw new Error('promptBuilder.ts missing buildOrsonRequestPrompt function');
  }

  return {
    api,
    handler: {
      ...handler,
      buildServerOrsonSystemInstruction: buildInstruction,
    },
    grounding,
    dosingSafety,
    nitrogenSafety,
    pipeline,
    promptBuilder,
  };
}

/**
 * Computes SHA-256 hashes for all required source files, experiment files,
 * configuration, and transitive required modules under sourceRoot.
 */
function hashSourceFiles(sourceRoot, worktreeRoot = path.resolve(__dirname, '../..')) {
  const hashes = {};
  const hasher = crypto.createHash('sha256');

  // 1. Required source files
  for (const relPath of REQUIRED_SOURCE_REL_PATHS) {
    const fullPath = path.join(sourceRoot, relPath);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath);
      const fileHash = crypto.createHash('sha256').update(content).digest('hex');
      hashes[`source:${relPath}`] = fileHash;
      hasher.update(`source:${relPath}:${fileHash}`);
    } else {
      throw new Error(`Required source file missing: ${relPath}`);
    }
  }

  // 2. Experiment files
  for (const relPath of EXPERIMENT_FILES) {
    const fullPath = path.join(worktreeRoot, relPath);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath);
      const fileHash = crypto.createHash('sha256').update(content).digest('hex');
      hashes[`experiment:${relPath}`] = fileHash;
      hasher.update(`experiment:${relPath}:${fileHash}`);
    } else {
      throw new Error(`Required experiment file missing: ${relPath}`);
    }
  }

  // 3. Transitive non-node_modules in require.cache under sourceRoot
  const loadedKeys = Object.keys(require.cache)
    .filter(k => k.startsWith(sourceRoot) && !k.includes('node_modules'))
    .sort();

  for (const modPath of loadedKeys) {
    const rel = path.relative(sourceRoot, modPath);
    if (!hashes[`source:${rel}`]) {
      try {
        const content = fs.readFileSync(modPath);
        const fileHash = crypto.createHash('sha256').update(content).digest('hex');
        hashes[`transitive:${rel}`] = fileHash;
        hasher.update(`transitive:${rel}:${fileHash}`);
      } catch (_e) {
        throw new Error(`Consumed source is unreadable: ${rel}`);
      }
    }
  }

  for (const rel of ['package.json', 'package-lock.json', 'functions/package.json', 'functions/package-lock.json', 'tsconfig.json']) {
    const file = path.join(sourceRoot, rel);
    const digest = fs.existsSync(file) ? crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') : 'ABSENT';
    hashes[`config:${rel}`] = digest;
    hasher.update(`config:${rel}:${digest}`);
  }
  return {
    fileHashes: hashes,
    combinedHash: hasher.digest('hex'),
  };
}

/**
 * Builds the deterministic trial schedule: 75 measured + 3 warmup + 24 routing-only = 102.
 */
function buildSchedule({
  answerWorkloads = ANSWER_WORKLOADS,
  routingCases = ROUTING_ONLY_CASES,
  includeWarmup = true,
  answersOnly = false,
  routingOnly = false,
} = {}) {
  const schedule = [];
  let trialIndex = 0;

  // 1. Excluded warmup triplet (Hello workload)
  if (includeWarmup && !routingOnly) {
    const helloWorkload = answerWorkloads.find(w => w.id === 'hello') || answerWorkloads[0];
    const warmupOrder = ['baseline', 'meta_router', 'jev_router'];
    for (const arm of warmupOrder) {
      schedule.push({
        index: trialIndex++,
        pairingId: `warmup_hello_${arm}`,
        type: 'answer',
        workloadId: helloWorkload.id,
        arm,
        repeat: 0,
        warmup: true,
      });
    }
  }

  // 2. Measured answer workloads: 5 workloads * 5 repeats * 3 arms = 75 trials
  if (!routingOnly) {
    for (let repeat = 1; repeat <= 5; repeat++) {
      const rotationIndex = (repeat - 1) % 3;
      const order = rotationIndex === 0
        ? ['baseline', 'meta_router', 'jev_router']
        : rotationIndex === 1
        ? ['meta_router', 'jev_router', 'baseline']
        : ['jev_router', 'baseline', 'meta_router'];

      for (const workload of answerWorkloads) {
        for (const arm of order) {
          schedule.push({
            index: trialIndex++,
            pairingId: `ans_${workload.id}_rep${repeat}_${arm}`,
            type: 'answer',
            workloadId: workload.id,
            arm,
            repeat,
            warmup: false,
          });
        }
      }
    }
  }

  // 3. Routing-only cases: 12 cases * 2 routers = 24 decisions
  if (!answersOnly) {
    for (const routingCase of routingCases) {
      for (const arm of ['meta_router', 'jev_router']) {
        schedule.push({
          index: trialIndex++,
          pairingId: `route_${routingCase.id}_${arm}`,
          type: 'routing_only',
          caseId: routingCase.id,
          arm,
          repeat: 1,
          warmup: false,
        });
      }
    }
  }

  return schedule;
}

/**
 * Pre-prepares all workload packages through pipeline/promptBuilder.
 */
function prepareWorkloads(workloads, baselineModules, now = () => performance.now()) {
  const prepared = {};
  for (const w of workloads) {
    const startPrep = now();
    const runtimeW = createRuntimeInput(w);
    let promptPackage = null;
    let groundedPrompt = `USER QUESTION:\n${runtimeW.question}`;
    let analysisMode = runtimeW.mode || 'standard';
    let questionRoute = 'farm_analysis';

    if (baselineModules.pipeline?.buildOrsonAnalysis) {
      const analysis = baselineModules.pipeline.buildOrsonAnalysis(
        runtimeW.ponds,
        runtimeW.question,
        new Date(runtimeW.asOf)
      );
      promptPackage = analysis.promptPackage;
      questionRoute = promptPackage.questionFocus?.route || 'farm_analysis';
      analysisMode = promptPackage.questionFocus?.analysisMode || runtimeW.mode || 'standard';

      if (baselineModules.promptBuilder?.buildOrsonRequestPrompt) {
        groundedPrompt = baselineModules.promptBuilder.buildOrsonRequestPrompt(
          promptPackage.context,
          promptPackage.userMessage || runtimeW.question
        );
      }
    }

    const baseInstruction = baselineModules.handler.buildServerOrsonSystemInstruction(
      analysisMode,
      'chat',
      questionRoute
    );
    const deepSystemInstruction = `${baseInstruction}\nWEB VERIFICATION: Unavailable for this response. Withhold numeric application doses; do not claim internet verification.`;

    const prepDurationMs = now() - startPrep;
    prepared[w.id] = {
      workload: runtimeW,
      prepDurationMs,
      promptPackage,
      questionRoute,
      analysisMode,
      groundedPrompt,
      deepSystemInstruction,
      fastPrompt: `USER QUESTION:\n${runtimeW.question}`,
      fastSystemInstruction: FAST_STANDALONE_INSTRUCTION,
    };
  }
  return prepared;
}

/**
 * Executes a single trial with cancellation propagation, accurate clocks, and exact guards.
 */
async function executeTrial({
  scheduledItem,
  workloads = ANSWER_WORKLOADS,
  routingCases = ROUTING_ONLY_CASES,
  preparedWorkloads = null,
  baselineModules,
  metaApiKey,
  jevApiKey,
  fetchImpl = fetch,
  signal,
  now = () => performance.now(),
}) {
  if (signal?.aborted) {
    const err = new Error('The operation was aborted.');
    err.name = 'AbortError';
    throw err;
  }

  const { arm, type, warmup, repeat, pairingId } = scheduledItem;
  const trialRecord = {
    index: scheduledItem.index,
    pairingId,
    type,
    arm,
    repeat,
    warmup,
    workloadId: scheduledItem.workloadId || scheduledItem.caseId,
    rawRoute: null,
    rawConfidence: null,
    rawProbabilities: null,
    effectiveRoute: null,
    fallbackReason: null,
    confidenceType: null,
    directAnswer: false,
    prepMs: 0,
    routerMs: 0,
    generationMs: 0,
    guardsMs: 0,
    firstAnswerMs: null,
    totalMs: 0,
    finishReason: null,
    inputTokens: 0,
    outputTokens: 0,
    doseSafety: undefined,
    nitrogenSafety: undefined,
    groundingStatus: undefined,
    text: null,
    error: null,
  };

  const startTotal = now();

  // ROUTING-ONLY CASE
  if (type === 'routing_only') {
    const c = routingCases.find(item => item.id === scheduledItem.caseId);
    if (!c) {
      trialRecord.error = `Routing case not found: ${scheduledItem.caseId}`;
      trialRecord.totalMs = now() - startTotal;
      return trialRecord;
    }

    const routerInput = {
      question: c.question,
      recentTurns: c.recentTurns || [],
      hasFarmData: Boolean(c.hasFarmData),
    };

    if (arm === 'meta_router') {
      const decision = await routeWithMeta({
        input: routerInput,
        generateMeta: params => baselineModules.api.generateMetaModelResponse({ ...params, apiKey: metaApiKey, fetchImpl }),
        signal,
        now,
      });
      trialRecord.rawRoute = decision.rawRoute;
      trialRecord.routerModel = decision.model;
      trialRecord.rawConfidence = decision.rawConfidence;
      trialRecord.rawProbabilities = decision.rawProbabilities;
      trialRecord.effectiveRoute = decision.effectiveRoute;
      trialRecord.fallbackReason = decision.fallbackReason;
      trialRecord.confidenceType = decision.confidenceType;
      trialRecord.routerMs = decision.durationMs;
      trialRecord.inputTokens = decision.usage?.inputTokens || 0;
      trialRecord.outputTokens = decision.usage?.outputTokens || 0;
      trialRecord.totalMs = now() - startTotal;
      if (!decision.rawRoute || (decision.fallbackReason && decision.fallbackReason !== 'low_confidence')) {
        trialRecord.error = `Router decision failure: ${decision.fallbackReason || 'missing_prediction'}`;
      }
      return trialRecord;
    }

    if (arm === 'jev_router') {
      const decision = await routeWithJev({
        input: routerInput,
        apiKey: jevApiKey,
        fetchImpl,
        signal,
        now,
      });
      trialRecord.rawRoute = decision.rawRoute;
      trialRecord.routerModel = decision.model;
      trialRecord.rawConfidence = decision.rawConfidence;
      trialRecord.rawProbabilities = decision.rawProbabilities;
      trialRecord.effectiveRoute = decision.effectiveRoute;
      trialRecord.fallbackReason = decision.fallbackReason;
      trialRecord.confidenceType = decision.confidenceType;
      trialRecord.routerMs = decision.durationMs;
      trialRecord.inputTokens = decision.usage?.inputTokens || 0;
      trialRecord.outputTokens = decision.usage?.outputTokens || 0;
      trialRecord.totalMs = now() - startTotal;
      if (!decision.rawRoute || (decision.fallbackReason && decision.fallbackReason !== 'low_confidence')) {
        trialRecord.error = `Router decision failure: ${decision.fallbackReason || 'missing_prediction'}`;
      }
      return trialRecord;
    }

    trialRecord.error = `Invalid arm for routing-only trial: ${arm}`;
    trialRecord.totalMs = now() - startTotal;
    return trialRecord;
  }

  // ANSWER WORKLOAD
  const prep = preparedWorkloads?.[scheduledItem.workloadId] || (
    prepareWorkloads(workloads.filter(w => w.id === scheduledItem.workloadId), baselineModules, now)[scheduledItem.workloadId]
  );

  if (!prep) {
    trialRecord.error = `Answer workload not found: ${scheduledItem.workloadId}`;
    trialRecord.totalMs = now() - startTotal;
    return trialRecord;
  }

  trialRecord.prepMs = prep.prepDurationMs;

  let effectiveRoute = 'deep';
  let decision = null;
  let directAnswerCandidate = null;

  // Step 1: Router decision if meta_router or jev_router
  if (arm === 'meta_router') {
    decision = await routeWithMeta({
      input: {
        question: prep.workload.question,
        recentTurns: [],
        hasFarmData: prep.workload.hasFarmData,
      },
      generateMeta: params => baselineModules.api.generateMetaModelResponse({ ...params, apiKey: metaApiKey, fetchImpl }),
      signal,
      now,
    });
    trialRecord.routerMs = decision.durationMs;
    trialRecord.rawRoute = decision.rawRoute;
      trialRecord.routerModel = decision.model;
    trialRecord.rawConfidence = decision.rawConfidence;
    trialRecord.rawProbabilities = decision.rawProbabilities;
    trialRecord.effectiveRoute = decision.effectiveRoute;
    trialRecord.fallbackReason = decision.fallbackReason;
    trialRecord.confidenceType = decision.confidenceType;
    trialRecord.inputTokens += decision.usage?.inputTokens || 0;
    trialRecord.outputTokens += decision.usage?.outputTokens || 0;
    effectiveRoute = decision.effectiveRoute;

    if (decision.directAnswer && decision.effectiveRoute === 'fast') {
      directAnswerCandidate = decision.directAnswer;
    }
  } else if (arm === 'jev_router') {
    decision = await routeWithJev({
      input: {
        question: prep.workload.question,
        recentTurns: [],
        hasFarmData: prep.workload.hasFarmData,
      },
      apiKey: jevApiKey,
      fetchImpl,
      signal,
      now,
    });
    trialRecord.routerMs = decision.durationMs;
    trialRecord.rawRoute = decision.rawRoute;
      trialRecord.routerModel = decision.model;
    trialRecord.rawConfidence = decision.rawConfidence;
    trialRecord.rawProbabilities = decision.rawProbabilities;
    trialRecord.effectiveRoute = decision.effectiveRoute;
    trialRecord.fallbackReason = decision.fallbackReason;
    trialRecord.confidenceType = decision.confidenceType;
    trialRecord.inputTokens += decision.usage?.inputTokens || 0;
    trialRecord.outputTokens += decision.usage?.outputTokens || 0;
    effectiveRoute = decision.effectiveRoute;
  } else {
    // baseline
    trialRecord.effectiveRoute = 'deep';
    effectiveRoute = 'deep';
  }

  // Step 2: Generation or direct answer
  try {
    // DIRECT ANSWER PATH (Meta only)
    if (directAnswerCandidate && arm === 'meta_router') {
      const guardStart = now();
      let answerObj = { text: directAnswerCandidate, finishReason: 'STOP', sources: [] };

      // Pass through exact final dosing and nitrogen safety guards
      answerObj = await baselineModules.dosingSafety.guardModelDosingAnswer({
        answer: answerObj,
        question: prep.workload.question,
      });
      answerObj = await baselineModules.nitrogenSafety.guardOrsonNitrogenAnswer({
        answer: answerObj,
        question: prep.workload.question,
        prompt: prep.fastPrompt,
      });

      const guardDuration = now() - guardStart;
      trialRecord.guardsMs = guardDuration;
      signal?.throwIfAborted();

      // Direct answer becomes visible ONLY after final guards confirm safe STOP text
      if (answerObj.finishReason === 'STOP' && answerObj.text?.trim() && answerObj.doseSafety !== 'withheld') {
        trialRecord.directAnswer = true;
        trialRecord.firstAnswerMs = now() - startTotal;
        trialRecord.totalMs = now() - startTotal;
        trialRecord.finishReason = answerObj.finishReason;
        trialRecord.doseSafety = answerObj.doseSafety;
        trialRecord.nitrogenSafety = answerObj.nitrogenSafety;
        trialRecord.groundingStatus = answerObj.groundingStatus || 'passed';
        trialRecord.text = answerObj.text;
        return trialRecord;
      }

      // If direct answer failed safety validation, fall back to deep downstream generation
      effectiveRoute = 'deep';
      trialRecord.effectiveRoute = 'deep';
      trialRecord.fallbackReason = trialRecord.fallbackReason
        ? `${trialRecord.fallbackReason};direct_safety_withheld`
        : 'direct_safety_withheld';
    }

    // DOWNSTREAM GENERATION PATH
    let prompt;
    let systemInstruction;
    let settings;
    let groundingMode;

    if (effectiveRoute === 'fast') {
      prompt = prep.fastPrompt;
      systemInstruction = prep.fastSystemInstruction;
      groundingMode = 'standard';
      settings = { reasoningEffort: 'low', maxOutputTokens: 2500, timeoutMs: 60000 };
    } else {
      // Deep: identical prompt, settings, and instructions across baseline and both routers
      prompt = prep.groundedPrompt;
      systemInstruction = prep.deepSystemInstruction;
      groundingMode = prep.analysisMode;
      settings = baselineModules.api.getOrsonGenerationSettings(prep.analysisMode);
    }

    let firstChunkMs = null;
    const genStart = now();

    const generateFn = async overrides => {
      if (signal?.aborted) {
        const err = new Error('The operation was aborted.');
        err.name = 'AbortError';
        throw err;
      }
      return baselineModules.api.generateMetaModelResponse({
        apiKey: metaApiKey,
        prompt,
        systemInstruction,
        ...settings,
        ...overrides,
        signal,
        fetchImpl,
        onTextDelta: async delta => {
          if (signal?.aborted) {
            const err = new Error('The operation was aborted.');
            err.name = 'AbortError';
            throw err;
          }
          if (delta && delta.trim() && firstChunkMs === null) {
            firstChunkMs = now() - startTotal;
            trialRecord.firstAnswerMs = firstChunkMs;
          }
        },
      });
    };

    // Step 2a: Grounding generation with dosing safety review callback
    let generated = await baselineModules.grounding.generateGroundedOrsonResponse({
      prompt,
      mode: groundingMode,
      questionRoute: prep.questionRoute,
      reviewSafety: answer => baselineModules.dosingSafety.guardModelDosingAnswer({
        answer,
        question: prep.workload.question,
      }),
      generate: generateFn,
    });

    // Step 2b: Final dosing guard (replaces text if application amount detected)
    const guardStart = now();
    generated = await baselineModules.dosingSafety.guardModelDosingAnswer({
      answer: generated,
      question: prep.workload.question,
    });

    // Step 2c: Final nitrogen guard (replaces text if nitrogen guidance fails)
    generated = await baselineModules.nitrogenSafety.guardOrsonNitrogenAnswer({
      answer: generated,
      question: prep.workload.question,
      prompt,
    });

    trialRecord.guardsMs = now() - guardStart;
    signal?.throwIfAborted();
    trialRecord.generationMs = now() - genStart - trialRecord.guardsMs;
    trialRecord.firstAnswerMs = firstChunkMs ?? (generated.text?.trim() ? now() - startTotal : null);
    trialRecord.totalMs = now() - startTotal;
    trialRecord.finishReason = generated.finishReason;
    trialRecord.inputTokens += generated.inputTokens || 0;
    trialRecord.outputTokens += generated.outputTokens || 0;
    trialRecord.doseSafety = generated.doseSafety;
    trialRecord.nitrogenSafety = generated.nitrogenSafety;
    trialRecord.groundingStatus = generated.groundingStatus;
    trialRecord.text = generated.text;

    const hasGroundingFallback = generated.groundingStatus === 'fallback' ||
      (Array.isArray(generated.groundingIssues) && generated.groundingIssues.includes('incomplete_draft'));

    if (generated.finishReason !== 'STOP' || !generated.text?.trim() || hasGroundingFallback) {
      trialRecord.error = hasGroundingFallback
        ? 'Incomplete downstream draft with fallback grounding'
        : 'Incomplete downstream response or non-STOP finishReason';
    }
  } catch (err) {
    trialRecord.error = err.message || String(err);
    trialRecord.totalMs = now() - startTotal;
    if (signal?.aborted) {
      const abortErr = new Error('The operation was aborted.');
      abortErr.name = 'AbortError';
      throw abortErr;
    }
  }

  return trialRecord;
}

/**
 * Computes paired latency differences between router arms and baseline.
 */
function calculatePairDifferences(results, answerWorkloads = ANSWER_WORKLOADS) {
  const answerResults = results.filter(r => !r.warmup && r.type === 'answer');
  const byWorkloadRepeat = new Map();

  for (const r of answerResults) {
    const key = `${r.workloadId}:${r.repeat}`;
    if (!byWorkloadRepeat.has(key)) {
      byWorkloadRepeat.set(key, {});
    }
    byWorkloadRepeat.get(key)[r.arm] = r;
  }

  const pairs = {
    meta_vs_baseline: [],
    jev_vs_baseline: [],
    completeTripletsCount: 0,
    scheduledPairsPerWorkload: 5,
  };

  for (const [key, arms] of byWorkloadRepeat.entries()) {
    const [workloadId, repeatStr] = key.split(':');
    const repeat = Number(repeatStr);

    if (arms.baseline && !arms.baseline.error) {
      if (arms.meta_router && !arms.meta_router.error) {
        pairs.meta_vs_baseline.push({
          key,
          workloadId,
          repeat,
          deltaFirstTextMs: (arms.meta_router.firstAnswerMs ?? arms.meta_router.totalMs) - (arms.baseline.firstAnswerMs ?? arms.baseline.totalMs),
          deltaTotalMs: arms.meta_router.totalMs - arms.baseline.totalMs,
        });
      }
      if (arms.jev_router && !arms.jev_router.error) {
        pairs.jev_vs_baseline.push({
          key,
          workloadId,
          repeat,
          deltaFirstTextMs: (arms.jev_router.firstAnswerMs ?? arms.jev_router.totalMs) - (arms.baseline.firstAnswerMs ?? arms.baseline.totalMs),
          deltaTotalMs: arms.jev_router.totalMs - arms.baseline.totalMs,
        });
      }
    }

    if (arms.baseline && !arms.baseline.error &&
        arms.meta_router && !arms.meta_router.error &&
        arms.jev_router && !arms.jev_router.error) {
      pairs.completeTripletsCount++;
    }
  }

  return pairs;
}

/**
 * Computes aggregate summary metrics with explicit failure coverage and false-easy tracking.
 */
function computeAggregateMetrics(results, schedule = [], workloads = ANSWER_WORKLOADS, routingCases = ROUTING_ONLY_CASES) {
  const measured = results.filter(r => !r.warmup);
  const scheduledMeasuredCount = schedule.filter(s => !s.warmup).length || measured.length;
  const total = measured.length;
  const successful = measured.filter(r => !r.error);
  const failed = measured.filter(r => r.error);
  const unstarted = Math.max(0, scheduledMeasuredCount - total);

  const getMedian = numbers => {
    if (!numbers.length) return null;
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  // Workload medians strictly for answer trials
  const byWorkload = {};
  for (const w of workloads) {
    byWorkload[w.id] = {};
    for (const arm of ARMS) {
      const armTrials = measured.filter(r => r.type === 'answer' && r.workloadId === w.id && r.arm === arm);
      const armSuccess = armTrials.filter(r => !r.error);
      byWorkload[w.id][arm] = {
        totalTrials: armTrials.length,
        successfulTrials: armSuccess.length,
        failedTrials: armTrials.length - armSuccess.length,
        medianFirstAnswerMs: getMedian(armSuccess.map(r => r.firstAnswerMs).filter(n => typeof n === 'number')),
        medianTotalMs: getMedian(armSuccess.map(r => r.totalMs).filter(n => typeof n === 'number')),
      };
    }
  }

  // Router confusion and false-easy analysis
  const expectedMap = {};
  for (const w of workloads) expectedMap[w.id] = w.expectedRoute;
  for (const c of routingCases) expectedMap[c.id] = c.expectedRoute;

  const PLANNED_DECISION_DENOMINATOR = 37; // 25 answer workload trials + 12 routing-only cases

  const routerStats = {};
  for (const routerArm of ['meta_router', 'jev_router']) {
    const trials = measured.filter(r => r.arm === routerArm);
    const rawConfusion = { trueFast_predFast: 0, trueFast_predDeep: 0, trueDeep_predFast: 0, trueDeep_predDeep: 0, missing_or_error: 0 };
    const effectiveConfusion = { trueFast_predFast: 0, trueFast_predDeep: 0, trueDeep_predFast: 0, trueDeep_predDeep: 0 };
    let rawFalseEasy = 0;
    let effectiveFalseEasy = 0;
    let decisionFailures = 0;
    let lowConfidenceFallbacks = 0;
    let totalFallbacks = 0;

    for (const r of trials) {
      const expected = expectedMap[r.workloadId];
      if (!expected) continue;

      if (!r.rawRoute || (r.fallbackReason && r.fallbackReason !== 'low_confidence')) {
        decisionFailures++;
      }

      if (r.fallbackReason === 'low_confidence') {
        lowConfidenceFallbacks++;
      }

      if (r.fallbackReason) {
        totalFallbacks++;
      }

      // Raw evaluation
      if (r.rawRoute == null) {
        rawConfusion.missing_or_error++;
      } else {
        if (expected === 'fast' && r.rawRoute === 'fast') rawConfusion.trueFast_predFast++;
        if (expected === 'fast' && r.rawRoute === 'deep') rawConfusion.trueFast_predDeep++;
        if (expected === 'deep' && r.rawRoute === 'fast') {
          rawConfusion.trueDeep_predFast++;
          rawFalseEasy++;
        }
        if (expected === 'deep' && r.rawRoute === 'deep') rawConfusion.trueDeep_predDeep++;
      }

      // Effective evaluation
      if (expected === 'fast' && r.effectiveRoute === 'fast') effectiveConfusion.trueFast_predFast++;
      if (expected === 'fast' && r.effectiveRoute === 'deep') effectiveConfusion.trueFast_predDeep++;
      if (expected === 'deep' && r.effectiveRoute === 'fast') {
        effectiveConfusion.trueDeep_predFast++;
        effectiveFalseEasy++;
      }
      if (expected === 'deep' && r.effectiveRoute === 'deep') effectiveConfusion.trueDeep_predDeep++;
    }

    routerStats[routerArm] = {
      plannedDenominator: PLANNED_DECISION_DENOMINATOR,
      executedDecisions: trials.length,
      decisionFailures,
      lowConfidenceFallbacks,
      totalFallbacks,
      fallbackRate: PLANNED_DECISION_DENOMINATOR > 0 ? totalFallbacks / PLANNED_DECISION_DENOMINATOR : 0,
      rawFalseEasy,
      effectiveFalseEasy,
      rawConfusion,
      effectiveConfusion,
    };
  }

  return {
    scheduledTrials: scheduledMeasuredCount,
    executedTrials: total,
    successfulTrials: successful.length,
    failedTrials: failed.length,
    cancelledTrials: measured.filter(r => r.cancelled).length,
    unstartedTrials: unstarted,
    coveragePercent: scheduledMeasuredCount > 0 ? (successful.length / scheduledMeasuredCount) * 100 : 0,
    byWorkload,
    routerStats,
    falseEasy: { meta_router: routerStats.meta_router.effectiveFalseEasy, jev_router: routerStats.jev_router.effectiveFalseEasy },
    rawFalseEasy: { meta_router: routerStats.meta_router.rawFalseEasy, jev_router: routerStats.jev_router.rawFalseEasy },
    decisionFailures: { meta_router: routerStats.meta_router.decisionFailures, jev_router: routerStats.jev_router.decisionFailures },
    fallbackCounts: { meta_router: routerStats.meta_router.totalFallbacks, jev_router: routerStats.jev_router.totalFallbacks },
    fallbackRates: { meta_router: routerStats.meta_router.fallbackRate, jev_router: routerStats.jev_router.fallbackRate },
    confusion: { meta_router: routerStats.meta_router.effectiveConfusion, jev_router: routerStats.jev_router.effectiveConfusion },
  };
}

/**
 * Main execution entry point.
 */
async function main(options = {}) {
  const {
    signal,
    sourceRoot = process.env.ORSON_BENCH_SOURCE_ROOT,
    metaApiKey = process.env.MODEL_API_KEY,
    jevApiKey = process.env.TYPESAFE_API_KEY,
    outputDir = process.env.ORSON_BENCH_OUTPUT || path.join(__dirname, 'output'),
    fetchImpl = fetch,
    now = () => performance.now(),
  } = options;

  if (!sourceRoot) {
    throw new Error('ORSON_BENCH_SOURCE_ROOT env variable is required');
  }

  if (!metaApiKey || !metaApiKey.trim()) {
    throw new Error('MODEL_API_KEY env variable is required for Meta model calls');
  }
  if (!jevApiKey || !jevApiKey.trim()) {
    throw new Error('TYPESAFE_API_KEY env variable is required for Jev model calls');
  }

  if (signal?.aborted) {
    const abortErr = new Error('The operation was aborted.');
    abortErr.name = 'AbortError';
    throw abortErr;
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const secretKeys = [metaApiKey, jevApiKey];
  console.log('Loading baseline source modules from:', sourceRoot);
  const baselineModules = loadBaselineModules(sourceRoot);

  // Pre-trial Jev discovery (outside timed trials)
  console.log('Discovering Jev model endpoint...');
  const jevDiscovery = await discoverJevModel({ apiKey: jevApiKey, fetchImpl, signal });
  console.log('Jev discovery result:', jevDiscovery);

  const workloads = resolveWorkloads(sourceRoot);
  const schedule = buildSchedule({ answerWorkloads: workloads });
  const preparedWorkloads = prepareWorkloads(workloads, baselineModules, now);
  const initialHashes = hashSourceFiles(sourceRoot);

  const manifestPath = path.join(outputDir, 'manifest.json');
  const resultsPath = path.join(outputDir, 'results.json');
  const summaryPath = path.join(outputDir, 'summary.json');

  const manifest = {
    createdAt: new Date().toISOString(),
    sourceRoot,
    sourceHashes: initialHashes.fileHashes,
    combinedSourceHash: initialHashes.combinedHash,
    thresholds: {
      metaFast: META_FAST_THRESHOLD,
      jevFast: JEV_FAST_THRESHOLD,
    },
    jevDiscovery,
    model: baselineModules.api.META_MODEL_API_MODEL,
    endpoint: baselineModules.api.META_MODEL_API_BASE_URL,
    routingConfiguration: Object.fromEntries(Object.entries(require('./routing.cjs')).filter(([, value]) => typeof value !== 'function')),
    preparedRequests: Object.fromEntries(Object.entries(preparedWorkloads).map(([id, prep]) => [id, {
      questionRoute: prep.questionRoute, analysisMode: prep.analysisMode,
      prompt: prep.groundedPrompt, systemInstruction: prep.deepSystemInstruction,
      fastPrompt: prep.fastPrompt, fastSystemInstruction: prep.fastSystemInstruction,
      settings: baselineModules.api.getOrsonGenerationSettings(prep.analysisMode),
    }])),
    workloads: workloads.map(w => ({
      id: w.id,
      title: w.title,
      question: w.question,
      expectedRoute: w.expectedRoute,
      mode: w.mode,
      hasFarmData: w.hasFarmData,
      asOf: w.asOf,
      rubric: w.rubric,
      ponds: w.ponds,
      recentTurns: w.recentTurns || [],
    })),
    routingCases: ROUTING_ONLY_CASES.map(c => ({
      id: c.id,
      category: c.category,
      question: c.question,
      expectedRoute: c.expectedRoute,
      hasFarmData: c.hasFarmData,
      reason: c.reason,
      recentTurns: c.recentTurns || [],
    })),
    totalScheduledTrials: schedule.length,
    schedule,
  };

  fs.writeFileSync(manifestPath, JSON.stringify(redactSecrets(manifest, secretKeys), null, 2), 'utf8');
  const manifestHash = crypto.createHash('sha256').update(fs.readFileSync(manifestPath)).digest('hex');
  console.log(`Manifest frozen and written to ${manifestPath} (${schedule.length} trials).`);

  const results = [];
  let abortError = null;

  for (const item of schedule) {
    if (signal?.aborted) {
      abortError = new Error('The operation was aborted.');
      abortError.name = 'AbortError';
      break;
    }

    // Continuous source drift check
    const currentHashes = hashSourceFiles(sourceRoot);
    if (currentHashes.combinedHash !== initialHashes.combinedHash) {
      throw new Error('FATAL: Source files modified during benchmark execution!');
    }

    let trialRecord;
    const attemptStartedAt = now();
    try {
      trialRecord = await executeTrial({
        scheduledItem: item,
        workloads,
        routingCases: ROUTING_ONLY_CASES,
        baselineModules,
        metaApiKey,
        jevApiKey,
        fetchImpl,
        signal,
        now,
      });
    } catch (err) {
      if (signal?.aborted || err?.name === 'AbortError') {
        trialRecord = {
          index: item.index,
          pairingId: item.pairingId,
          type: item.type,
          arm: item.arm,
          repeat: item.repeat,
          warmup: item.warmup,
          workloadId: item.workloadId || item.caseId,
          error: 'The operation was aborted.',
          cancelled: true,
          totalMs: now() - attemptStartedAt,
        };
        results.push(trialRecord);
        fs.writeFileSync(resultsPath, JSON.stringify(redactSecrets(results, secretKeys), null, 2), 'utf8');
        abortError = err;
        break;
      }
      throw err;
    }

    results.push(trialRecord);
    fs.writeFileSync(resultsPath, JSON.stringify(redactSecrets(results, secretKeys), null, 2), 'utf8');

    const statusStr = trialRecord.error ? `ERROR (${trialRecord.error})` : `SUCCESS (${trialRecord.finishReason})`;
    const cleanLog = redactSecrets(
      `Trial ${item.index + 1}/${schedule.length} [${item.arm}] ${item.workloadId || item.caseId}: ${Math.round(trialRecord.totalMs)}ms ${statusStr}`,
      secretKeys
    );
    console.log(cleanLog);
  }

  if (!abortError) {
    // Final drift check after last trial
    const finalHashes = hashSourceFiles(sourceRoot);
    if (finalHashes.combinedHash !== initialHashes.combinedHash) {
      throw new Error('FATAL: Source files modified between final trial and report generation!');
    }
  }

  const aggregate = computeAggregateMetrics(results, schedule, workloads, ROUTING_ONLY_CASES);
  const pairs = calculatePairDifferences(results, workloads);
  const finalSummary = {
    completedAt: new Date().toISOString(),
    manifestHash,
    sourceHash: initialHashes.combinedHash,
    aborted: Boolean(abortError),
    aggregate,
    pairs,
  };

  fs.writeFileSync(summaryPath, JSON.stringify(redactSecrets(finalSummary, secretKeys), null, 2), 'utf8');

  if (abortError) {
    console.warn('Benchmark execution stopped due to caller cancellation.');
    throw abortError;
  }

  console.log('Benchmark run finished successfully.');
  return finalSummary;
}

if (require.main === module) {
  main().catch(err => {
    console.error('Benchmark fatal error:', redactSecrets(err.message || String(err), [process.env.MODEL_API_KEY, process.env.TYPESAFE_API_KEY]));
    process.exit(1);
  });
}

module.exports = {
  FAST_STANDALONE_INSTRUCTION,
  REQUIRED_SOURCE_REL_PATHS,
  EXPERIMENT_FILES,
  redactSecrets,
  loadBaselineModules,
  hashSourceFiles,
  buildSchedule,
  prepareWorkloads,
  calculatePairDifferences,
  computeAggregateMetrics,
  executeTrial,
  main,
};
