'use strict';

require('../scripts/register-typescript.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { createRequire } = require('node:module');

const { OrsonIncompleteResponseError } = require('./responseCompletion.ts');
const { OrsonSessionChangedError } = require('./session.ts');

const mockPond = {
  id: 'pond-test-1',
  pondName: 'Test Pond 1',
  cycleId: 'cycle-1',
  pondCycleId: 'pond-cycle-1',
  initialPopulation: 100000,
  initialWeight: 0.5,
  docStart: '2026-01-01',
  samplings: [
    { id: 's1', date: '2026-01-20', mbw: 5, mortality: 50, feed: 20 },
    { id: 's2', date: '2026-01-30', mbw: 8, mortality: 80, feed: 30 },
  ],
};

const mockProjection = {
  pondId: 'pond-test-1',
  pondName: 'Test Pond 1',
  currentDoc: 31,
  futureDoc: 45,
  generatedAt: '2026-02-01T00:00:00Z',
  targetDate: '2026-02-15',
  daysToHarvest: 14,
  currentMbwG: 8,
  historicalAdgGPerDay: 0.3,
  assumedAdgGPerDay: 0.3,
  projectedMbwG: 12,
  currentPopulation: 98000,
  assumedSurvivalPercent: 95,
  survivalConfidence: 'moderate',
  projectedBiomassKg: 1100,
  expectedPricePerKg: 5,
  projectedRevenue: 5500,
  futureFeedCost: 700,
  projectedProfit: 4800,
  projectedFcr: 1.2,
  feedCostRiskRatio: 0.15,
  marketSizeRisk: 'target',
  confidenceScore: 0.85,
  confidenceReasons: ['Regular samplings'],
  risks: [
    { id: 'risk-1', severity: 'low', confidence: 0.8, summary: 'DO good', evidence: [], recommendation: 'Continue' },
  ],
  calibrationVersionId: 'v1',
  calibrationScope: 'company',
  calibrationSampleSize: 10,
  learningContext: {
    currentMbwG: 8,
    baseAssumedAdgGPerDay: 0.3,
    baseProjectedMbwG: 12,
    baseAssumedSurvivalPercent: 95,
    baseProjectedBiomassKg: 1100,
    initialPopulation: 100000,
    mortalityCountAtPrediction: 130,
    harvestedPopulationAtPrediction: 0,
    manualAdgOverride: false,
    manualSurvivalOverride: false,
  },
};

function createHookHarness(hookPath, options = {}) {
  const fullPath = path.resolve(__dirname, hookPath);
  const localRequire = createRequire(fullPath);
  const source = fs.readFileSync(fullPath, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;

  let authState = {
    user: { uid: 'user-1', companyId: 'company-1' },
    company: { id: 'company-1' },
    currentUser: { uid: 'user-1' },
    loading: false,
  };

  const recordPredictionCalls = [];
  let recordPredictionHandler = () => Promise.resolve({ data: { success: true } });

  const generateResponseCalls = [];
  let generateResponseHandler = () => Promise.resolve({
    data: { text: 'Default response text', finishReason: 'STOP' },
  });
  let supportsStreaming = options.supportsStreaming !== undefined ? options.supportsStreaming : true;

  const storage = new Map();

  const reactState = {
    states: [],
    effects: [],
    cursor: 0,
    reset() { this.cursor = 0; },
    useState(initial) {
      const idx = this.cursor++;
      if (!(idx in this.states)) {
        this.states[idx] = typeof initial === 'function' ? initial() : initial;
      }
      const setter = (val) => {
        this.states[idx] = typeof val === 'function' ? val(this.states[idx]) : val;
      };
      return [this.states[idx], setter];
    },
    useRef(initial) {
      const idx = this.cursor++;
      if (!(idx in this.states)) {
        this.states[idx] = { current: initial };
      }
      return this.states[idx];
    },
    useEffect(effect, deps) {
      const idx = this.cursor++;
      const prev = this.effects[idx];
      const hasChanged = !prev || !deps || deps.some((d, i) => d !== prev.deps[i]);
      if (hasChanged) {
        if (prev && typeof prev.cleanup === 'function') {
          prev.cleanup();
        }
        const cleanup = effect();
        this.effects[idx] = { deps, cleanup: typeof cleanup === 'function' ? cleanup : null };
      }
    },
  };

  const mockedRequire = (name) => {
    if (name === 'react') {
      return {
        useState: (init) => reactState.useState(init),
        useRef: (init) => reactState.useRef(init),
        useEffect: (fn, deps) => reactState.useEffect(fn, deps),
      };
    }
    if (name === 'firebase/auth') {
      return {
        getAuth: () => ({ currentUser: authState.currentUser }),
      };
    }
    if (name === '@/contexts/AuthContext' || name === '../../context/AuthContext') {
      return {
        useAuth: () => ({ user: authState.user, company: authState.company, loading: Boolean(authState.loading) }),
      };
    }
    if (name === 'firebase/functions') {
      return {
        getFunctions: () => ({}),
        httpsCallable: (functions, callableName) => {
          if (callableName === 'recordOrsonPrediction') {
            return (payload) => {
              recordPredictionCalls.push(payload);
              return recordPredictionHandler(payload);
            };
          }
          if (callableName === 'generateOrsonResponse') {
            const callable = (payload) => {
              generateResponseCalls.push(payload);
              return generateResponseHandler(payload);
            };
            if (supportsStreaming) {
              callable.stream = async (req) => {
                const dataPromise = generateResponseHandler(req);
                return {
                  stream: (async function* () {
                    const resp = await dataPromise;
                    if (resp && resp.data && typeof resp.data.text === 'string') {
                      yield { type: 'text_delta', text: resp.data.text };
                    }
                  })(),
                  data: dataPromise.then(r => r.data),
                };
              };
            }
            return callable;
          }
          return () => Promise.resolve({ data: {} });
        },
      };
    }
    if (name === 'firebase/firestore') {
      return {
        doc: () => ({}),
        getDoc: async () => ({ exists: () => false, data: () => ({}) }),
      };
    }
    if (name === '@/lib/firebase' || name === '@/config/firebase') {
      return { app: {}, db: {} };
    }
    if (name === '@/lib/asyncUtils') {
      return {
        getErrorMessage: (err) => err?.message || String(err),
        withTimeout: (promise) => promise,
      };
    }
    if (name === '@react-native-async-storage/async-storage') {
      return {
        getItem: async (key) => storage.get(key) || null,
        setItem: async (key, val) => { storage.set(key, val); },
      };
    }
    if (name === '@/lib/orsonAiUsage' || name === '../../orson/aiUsage') {
      return {
        isOrsonDailyLimitError: () => false,
      };
    }
    return localRequire(name);
  };

  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', compiled)(mockedRequire, loaded, loaded.exports);
  const useGemini = loaded.exports.useGemini;

  return {
    getHook: () => {
      reactState.reset();
      return useGemini();
    },
    setAuthState: (next) => { authState = { ...authState, ...next }; },
    getAuthState: () => authState,
    setRecordPredictionHandler: (fn) => { recordPredictionHandler = fn; },
    getRecordPredictionCalls: () => recordPredictionCalls,
    setGenerateResponseHandler: (fn) => { generateResponseHandler = fn; },
    getGenerateResponseCalls: () => generateResponseCalls,
    setSupportsStreaming: (val) => { supportsStreaming = val; },
    cleanup: () => {
      for (const item of reactState.effects) {
        if (item && typeof item.cleanup === 'function') {
          item.cleanup();
        }
      }
    },
    storage,
  };
}

test('pending prediction record does not block response generation in web and mobile hooks', async () => {
  for (const hookPath of ['../web/src/hooks/useGemini.ts', '../app/hooks/useGemini.ts']) {
    const harness = createHookHarness(hookPath);

    let predictionResolved = false;
    harness.setRecordPredictionHandler(() => new Promise((resolve) => {
      setTimeout(() => {
        predictionResolved = true;
        resolve({ data: { recorded: true } });
      }, 5000);
    }));

    harness.setGenerateResponseHandler(() => Promise.resolve({
      data: { text: 'Harvest projection details.', finishReason: 'STOP' },
    }));

    const hook = harness.getHook();
    const start = Date.now();
    const result = await hook.sendMessage('How is pond 1 growing?', [mockPond], {
      companyId: 'company-1',
      projectionSnapshot: {
        pond: mockPond,
        projection: mockProjection,
      },
    });
    const elapsed = Date.now() - start;

    assert.equal(result, 'Harvest projection details.');
    assert.ok(elapsed < 2000, `Generation finished quickly (${elapsed}ms) without waiting for prediction recording`);
    assert.equal(harness.getRecordPredictionCalls().length, 1);
    assert.equal(predictionResolved, false, 'Prediction promise was non-blocking and still pending when generation completed');
  }
});

test('rejected prediction record does not block generation, set UI error, or retry', async () => {
  for (const hookPath of ['../web/src/hooks/useGemini.ts', '../app/hooks/useGemini.ts']) {
    const harness = createHookHarness(hookPath);

    let predictionAttempts = 0;
    harness.setRecordPredictionHandler(() => {
      predictionAttempts++;
      return Promise.reject(new Error('Firestore permission-denied'));
    });

    harness.setGenerateResponseHandler(() => Promise.resolve({
      data: { text: 'Response despite prediction failure.', finishReason: 'STOP' },
    }));

    const hook = harness.getHook();
    const result = await hook.sendMessage('How is pond 1 growing?', [mockPond], {
      companyId: 'company-1',
      projectionSnapshot: {
        pond: mockPond,
        projection: mockProjection,
      },
    });

    // Let rejection settle on next microtask
    await new Promise((r) => setImmediate(r));

    assert.equal(result, 'Response despite prediction failure.');
    assert.equal(predictionAttempts, 1, 'Prediction was attempted exactly once with immediate rejection handler, no retry');
    const stateHook = harness.getHook();
    assert.equal(stateHook.error, null, 'Prediction error must not leak into user UI error state');
  }
});

test('post-dispatch payload mutation is isolated from recorded prediction snapshot', async () => {
  for (const hookPath of ['../web/src/hooks/useGemini.ts', '../app/hooks/useGemini.ts']) {
    const harness = createHookHarness(hookPath);

    let recordedPayload = null;
    let resolveDispatched;
    const recordDispatched = new Promise((resolve) => {
      resolveDispatched = resolve;
    });
    harness.setRecordPredictionHandler((payload) => {
      recordedPayload = payload;
      if (typeof resolveDispatched === 'function') resolveDispatched();
      return Promise.resolve({ data: {} });
    });

    harness.setGenerateResponseHandler(() => Promise.resolve({
      data: { text: 'Snapshot analysis.', finishReason: 'STOP' },
    }));

    const mutableProjection = JSON.parse(JSON.stringify(mockProjection));
    const mutablePond = JSON.parse(JSON.stringify(mockPond));
    const hook = harness.getHook();

    const promise = hook.sendMessage('Inquiry with mutable snapshot', [mutablePond], {
      companyId: 'company-1',
      projectionSnapshot: {
        pond: mutablePond,
        projection: mutableProjection,
      },
    });

    await recordDispatched;

    // Mutate the caller object immediately post-dispatch!
    mutableProjection.learningContext.baseAssumedAdgGPerDay = 999.9;
    mutableProjection.learningContext.baseProjectedBiomassKg = 88888;
    mutableProjection.projectedBiomassKg = 77777;
    mutableProjection.risks.push({ id: 'injected-risk-post-dispatch' });
    mutablePond.name = 'Pond Mutated';

    await promise;

    assert.ok(recordedPayload, 'Snapshot must have been captured');
    assert.equal(recordedPayload.learningContext.baseAssumedAdgGPerDay, 0.3, 'learningContext was deeply isolated from post-dispatch mutation');
    assert.equal(recordedPayload.learningContext.baseProjectedBiomassKg, 1100, 'baseProjectedBiomassKg was deeply isolated');
    assert.equal(recordedPayload.projected.biomassKg, 1100, 'projected values were deeply isolated');
    assert.equal(recordedPayload.riskIds.includes('injected-risk-post-dispatch'), false, 'riskIds were deeply isolated');
  }
});

test('stale company or account immediately before dispatch aborts prediction and suppresses UI', async () => {
  for (const hookPath of ['../web/src/hooks/useGemini.ts', '../app/hooks/useGemini.ts']) {
    const harness = createHookHarness(hookPath);

    let predictionDispatched = false;
    harness.setRecordPredictionHandler(() => {
      predictionDispatched = true;
      return Promise.resolve({ data: {} });
    });

    // Company changes right before invocation: currentUser has user-1, but active company is company-2
    harness.setAuthState({
      user: { uid: 'user-1', companyId: 'company-2' },
      company: { id: 'company-2' },
      currentUser: { uid: 'user-1' },
      loading: false,
    });

    const hook = harness.getHook();
    await assert.rejects(
      hook.sendMessage('Check growth', [mockPond], {
        companyId: 'company-1', // Doesn't match active company-2
        projectionSnapshot: { pond: mockPond, projection: mockProjection },
      }),
      (err) => err instanceof OrsonSessionChangedError,
    );

    assert.equal(predictionDispatched, false, 'assertCurrent before dispatch must prevent prediction dispatch on stale company');
    const stateHook = harness.getHook();
    assert.equal(stateHook.chatHistory.length, 0, 'Old UI chat history must not be updated');
  }
});

test('stale session mid-flight suppresses old UI updates', async () => {
  for (const hookPath of ['../web/src/hooks/useGemini.ts', '../app/hooks/useGemini.ts']) {
    const harness = createHookHarness(hookPath);

    let resolveModelCall;
    harness.setGenerateResponseHandler(() => new Promise((resolve) => {
      resolveModelCall = resolve;
    }));

    const hook = harness.getHook();
    const sendPromise = hook.sendMessage('Mid-flight question', [mockPond], { companyId: 'company-1' });

    // Await callback dispatch before calling resolveModelCall
    for (let i = 0; i < 50 && !resolveModelCall; i++) {
      await new Promise((r) => setTimeout(r, 5));
    }
    assert.equal(typeof resolveModelCall, 'function', 'generateOrsonResponse must have been called');

    // Mid-flight company switch
    harness.setAuthState({
      user: { uid: 'user-1', companyId: 'company-2' },
      company: { id: 'company-2' },
    });
    // Trigger re-render to run useEffect cleanup which cancels requestSessionRef
    harness.getHook();

    // Model returns afterwards
    resolveModelCall({ data: { text: 'Stale response should be dropped.', finishReason: 'STOP' } });

    await assert.rejects(sendPromise, (err) => err instanceof OrsonSessionChangedError);

    const stateHook = harness.getHook();
    assert.equal(stateHook.chatHistory.length, 0, 'Stale response must not update chat history');
  }
});

test('non-stream callable response: complete STOP succeeds and incomplete fails', async () => {
  const harness = createHookHarness('../app/hooks/useGemini.ts', { supportsStreaming: false });

  // 1. Incomplete MAX_TOKENS must fail
  harness.setGenerateResponseHandler(() => Promise.resolve({
    data: { text: 'Incomplete cut off...', finishReason: 'MAX_TOKENS' },
  }));

  const hook1 = harness.getHook();
  await assert.rejects(
    hook1.sendMessage('Explain', [mockPond], { companyId: 'company-1' }),
    (err) => err instanceof OrsonIncompleteResponseError && err.finishReason === 'MAX_TOKENS',
  );

  // 2. Complete STOP succeeds
  harness.setGenerateResponseHandler(() => Promise.resolve({
    data: { text: 'Complete non-stream text.', finishReason: 'STOP' },
  }));

  const hook2 = harness.getHook();
  const text = await hook2.sendMessage('Explain', [mockPond], { companyId: 'company-1' });
  assert.equal(text, 'Complete non-stream text.');
});

test('mobile emitProgressiveText emits completed text immediately without fake 80x24ms delay loop', async () => {
  const harness = createHookHarness('../app/hooks/useGemini.ts', { supportsStreaming: false });

  const longText = 'word '.repeat(400);
  harness.setGenerateResponseHandler(() => Promise.resolve({
    data: { text: longText, finishReason: 'STOP' },
  }));

  const partials = [];
  const hook = harness.getHook();
  const start = Date.now();
  const text = await hook.sendMessage('Long query', [mockPond], {
    companyId: 'company-1',
    onPartialResponse: (p) => partials.push(p),
  });
  const elapsed = Date.now() - start;

  assert.equal(text, longText.trim());
  assert.ok(elapsed < 200, `Completed text was emitted immediately (${elapsed}ms) without fake progressive delays (previously ~1920ms)`);
  assert.equal(partials.length, 1, 'onPartialResponse called exactly once with complete text, no duplicate final callback');
  assert.equal(partials[0], longText.trim());
});
