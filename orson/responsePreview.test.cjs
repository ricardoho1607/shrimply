require('../scripts/register-typescript.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildOrsonResponsePreview } = require('./responsePreview.ts');

const createMockPond = (overrides = {}) => ({
  id: 'pond-1',
  pondName: 'Pond 1',
  species: 'vaname',
  asOfDate: '2026-09-05',
  timeZone: 'Asia/Jakarta',
  docStartDate: '2026-08-01',
  docStartTimestampMs: 1785542400000,
  currentDoc: 35,
  pondAreaM2: 1000,
  densityPerM2: 100,
  initialPopulation: 100000,
  initialWeightG: 0.5,
  totalHarvestedBiomassKg: null,
  totalHarvestedPopulation: null,
  totalHarvestedFeedKg: null,
  partialHarvestCount: null,
  postHarvestBaselineDate: null,
  postHarvestRemainingBiomassKg: null,
  postHarvestRemainingPopulation: null,
  postHarvestReferenceSamplingId: null,
  postHarvestReferenceSamplingDate: null,
  postHarvestReferenceMbwG: null,
  cycleStartMode: 'new',
  baselineDate: null,
  baselineDoc: null,
  baselineMbwG: null,
  baselineEstimatedPopulation: null,
  baselineSurvivalRate: null,
  baselineCumulativeFeedKg: null,
  baselineSource: null,
  supplier: null,
  cycleId: 'cycle-1',
  pondCycleId: 'pond-cycle-1',
  cycleStatus: 'active',
  labContext: { latest: null, byType: [], unresolvedRisks: [], recommendations: [], worstStatus: null },
  planktonOverwatch: null,
  treatments: [],
  historicalBenchmark: null,
  missingFields: [],
  records: [
    {
      id: 'rec-1',
      cycleId: 'cycle-1',
      pondCycleId: 'pond-cycle-1',
      source: 'web',
      date: '2026-09-02',
      observedAt: '2026-09-02T06:00:00Z',
      timestampMs: 1788328800000,
      doc: 32,
      kinds: ['water_quality', 'feed'],
      mbwG: null,
      mortalityCount: 0,
      mortalityObservedCount: 0,
      mortalityObservationType: null,
      mortalityNotes: null,
      feedKg: 120,
      phMorning: 7.8,
      phEvening: 8.2,
      doMorning: 5.2,
      doEvening: 6.5,
      salinityPpt: 25,
      transparencyCm: 35,
      temperatureC: 28.5,
      ammoniaMgL: 0.1,
      surfaceScum: false,
      weatherEvent: null,
      waterExchangePercent: 0,
      sludgeLoad: 'low',
      shrimpBehaviour: 'normal',
      harvestType: null,
      harvestBiomassKg: null,
      harvestPopulation: null,
      feedData: null,
      isBaselineEstimate: false,
      missingFields: [],
    },
  ],
  ...overrides,
});

const createMockFocus = (overrides = {}) => ({
  analysisMode: 'standard',
  route: 'farm_analysis',
  intent: 'water_quality',
  focusedPondName: 'Pond 1',
  focusedPondId: 'pond-1',
  requestedParameter: 'dissolved_oxygen',
  requestedDirection: null,
  requestedDates: ['2026-09-02'],
  requestedFields: ['do_morning_mg_l', 'do_evening_mg_l'],
  requestedRecordCount: null,
  suppressAdvice: false,
  suppressTreatmentAdvice: false,
  suppressPondAnalysis: false,
  isPondSpecific: true,
  isComparison: false,
  comparedPondNames: [],
  requiresDetailedHistory: false,
  usesConversationHistory: false,
  shouldSummarize: false,
  containsUserReportedMeasurements: false,
  answerContract: {
    primaryTopic: 'water_quality',
    routeConfidence: 'high',
    responseGoal: 'answer_topic_directly',
    requiredAspects: ['direct_answer'],
    needsFarmData: true,
    excludedWorkflows: [],
  },
  ...overrides,
});

test('selected focused pond returns preview with raw readings, correct unit and checking details footer', () => {
  const pond = createMockPond();
  const focus = createMockFocus();
  const analysis = {
    normalizedPonds: [pond],
    promptPackage: {
      userMessage: 'What was the dissolved oxygen in Pond 1 on 2026-09-02?',
      questionFocus: focus,
      exactRecordAnswer: null,
    },
  };

  const preview = buildOrsonResponsePreview(analysis);
  assert.ok(preview);
  assert.equal(preview.title, 'Saved-record preview');
  assert.ok(preview.text.includes('Pond 1'));
  assert.ok(preview.text.includes('2026-09-02'));
  assert.ok(preview.text.includes('Morning DO 5.2 mg/L'));
  assert.ok(preview.text.includes('Evening DO 6.5 mg/L'));
  assert.ok(preview.text.includes('Orson is still checking details for your answer.'));
});

test('sole pond without explicit focus selects the only pond', () => {
  const pond = createMockPond({ id: 'only-pond', pondName: 'Single Pond' });
  const focus = createMockFocus({
    focusedPondId: null,
    focusedPondName: null,
    isPondSpecific: false,
  });
  const analysis = {
    normalizedPonds: [pond],
    promptPackage: {
      userMessage: 'What is the DO level on 2026-09-02?',
      questionFocus: focus,
      exactRecordAnswer: null,
    },
  };

  const preview = buildOrsonResponsePreview(analysis);
  assert.ok(preview);
  assert.ok(preview.text.includes('Single Pond'));
  assert.ok(preview.text.includes('Morning DO 5.2 mg/L'));
});

test('multiple ponds without focus fails closed and returns null', () => {
  const pond1 = createMockPond({ id: 'p1', pondName: 'Pond 1' });
  const pond2 = createMockPond({ id: 'p2', pondName: 'Pond 2' });
  const focus = createMockFocus({
    focusedPondId: null,
    focusedPondName: null,
    isPondSpecific: false,
  });
  const analysis = {
    normalizedPonds: [pond1, pond2],
    promptPackage: {
      userMessage: 'What is the DO level?',
      questionFocus: focus,
      exactRecordAnswer: null,
    },
  };

  const preview = buildOrsonResponsePreview(analysis);
  assert.equal(preview, null);
});

test('focused pond ID mismatch fails closed without fallback', () => {
  const pond = createMockPond({ id: 'pond-1', pondName: 'Pond 1' });
  const focus = createMockFocus({
    focusedPondId: 'pond-999',
    focusedPondName: 'Nonexistent Pond',
  });
  const analysis = {
    normalizedPonds: [pond],
    promptPackage: {
      userMessage: 'What is the DO in Nonexistent Pond?',
      questionFocus: focus,
      exactRecordAnswer: null,
    },
  };

  const preview = buildOrsonResponsePreview(analysis);
  assert.equal(preview, null);
});

test('conflicting explicit pond mention in query fails closed', () => {
  const pond = createMockPond({ id: 'pond-1', pondName: 'Pond 1' });
  const focus = createMockFocus({
    focusedPondId: null,
    focusedPondName: null,
  });
  const analysis = {
    normalizedPonds: [pond],
    promptPackage: {
      userMessage: 'What is the DO in Pond 2?',
      questionFocus: focus,
      exactRecordAnswer: null,
    },
  };

  const preview = buildOrsonResponsePreview(analysis);
  assert.equal(preview, null);
});

test('comparison intent or compared ponds returns null', () => {
  const pond1 = createMockPond({ id: 'p1', pondName: 'Pond 1' });
  const pond2 = createMockPond({ id: 'p2', pondName: 'Pond 2' });
  const focus = createMockFocus({
    intent: 'comparison',
    isComparison: true,
    comparedPondNames: ['Pond 1', 'Pond 2'],
  });
  const analysis = {
    normalizedPonds: [pond1, pond2],
    promptPackage: {
      userMessage: 'Compare DO between Pond 1 and Pond 2',
      questionFocus: focus,
      exactRecordAnswer: null,
    },
  };

  assert.equal(buildOrsonResponsePreview(analysis), null);
});

test('non-farm routes and general queries return null', () => {
  const pond = createMockPond();
  for (const route of ['aquaculture_knowledge', 'inventory_product', 'out_of_scope']) {
    const focus = createMockFocus({ route });
    const analysis = {
      normalizedPonds: [pond],
      promptPackage: {
        userMessage: 'What is DO?',
        questionFocus: focus,
        exactRecordAnswer: null,
      },
    };
    assert.equal(buildOrsonResponsePreview(analysis), null);
  }

  const generalFocus = createMockFocus({ intent: 'general' });
  assert.equal(buildOrsonResponsePreview({
    normalizedPonds: [pond],
    promptPackage: { userMessage: 'Tell me general advice', questionFocus: generalFocus, exactRecordAnswer: null },
  }), null);
});

test('suppressed analysis, user reported measurements, fallback confidence and explicit actions return null', () => {
  const pond = createMockPond();

  // Suppressed
  assert.equal(buildOrsonResponsePreview({
    normalizedPonds: [pond],
    promptPackage: {
      userMessage: 'Check DO',
      questionFocus: createMockFocus({ suppressPondAnalysis: true }),
      exactRecordAnswer: null,
    },
  }), null);

  // User-reported measurements
  assert.equal(buildOrsonResponsePreview({
    normalizedPonds: [pond],
    promptPackage: {
      userMessage: 'My DO is 4.5 today',
      questionFocus: createMockFocus({ containsUserReportedMeasurements: true }),
      exactRecordAnswer: null,
    },
  }), null);

  // Fallback confidence
  assert.equal(buildOrsonResponsePreview({
    normalizedPonds: [pond],
    promptPackage: {
      userMessage: 'Check DO',
      questionFocus: createMockFocus({
        answerContract: {
          primaryTopic: 'water_quality',
          routeConfidence: 'fallback',
          responseGoal: 'answer_topic_directly',
          requiredAspects: ['direct_answer'],
          needsFarmData: true,
          excludedWorkflows: [],
        },
      }),
      exactRecordAnswer: null,
    },
  }), null);

  // Caller explicitAction flag
  assert.equal(buildOrsonResponsePreview({
    normalizedPonds: [pond],
    promptPackage: {
      userMessage: 'Record feed 50kg for Pond 1',
      questionFocus: createMockFocus(),
      exactRecordAnswer: null,
    },
  }, true), null);

  // Exact record answer already exists
  assert.equal(buildOrsonResponsePreview({
    normalizedPonds: [pond],
    promptPackage: {
      userMessage: 'What was the feed?',
      questionFocus: createMockFocus(),
      exactRecordAnswer: 'Pond 1 daily feed totals: - 2026-09-02: 120 kg',
    },
  }), null);
});

test('unsupported topics return null', () => {
  const pond = createMockPond();

  for (const query of [
    'What is the ammonia level in Pond 1?',
    'What is the nitrite in Pond 1?',
    'What is the alkalinity in Pond 1?',
    'What is the mortality in Pond 1?',
    'What is the FCR for Pond 1?',
    'What is the ADG for Pond 1?',
    'What is the biomass in Pond 1?',
    'What is the survival rate in Pond 1?',
    'What dose of lime should I add to Pond 1?',
  ]) {
    const analysis = {
      normalizedPonds: [pond],
      promptPackage: {
        userMessage: query,
        questionFocus: createMockFocus({ requestedParameter: null }),
        exactRecordAnswer: null,
      },
    };
    assert.equal(buildOrsonResponsePreview(analysis), null, `Should decline unsupported query: ${query}`);
  }
});

test('legitimate zero is preserved and formatted correctly', () => {
  const pond = createMockPond({
    records: [
      {
        id: 'rec-zero',
        date: '2026-09-02',
        kinds: ['feed', 'water_quality'],
        feedKg: 0,
        doMorning: 0,
        doEvening: null,
        phMorning: null,
        phEvening: null,
        salinityPpt: null,
        temperatureC: null,
        transparencyCm: null,
        mbwG: null,
        isBaselineEstimate: false,
      },
    ],
  });

  // Feed previews are withheld because sampling feed can be an estimate.
  const feedAnalysis = {
    normalizedPonds: [pond],
    promptPackage: {
      userMessage: 'How much feed was given to Pond 1 on 2026-09-02?',
      questionFocus: createMockFocus({
        intent: 'feed',
        requestedParameter: 'feed',
        requestedFields: ['feed_kg'],
      }),
      exactRecordAnswer: null,
    },
  };
  const feedPreview = buildOrsonResponsePreview(feedAnalysis);
  assert.equal(feedPreview, null);

  // Zero DO
  const doAnalysis = {
    normalizedPonds: [pond],
    promptPackage: {
      userMessage: 'What was morning DO in Pond 1 on 2026-09-02?',
      questionFocus: createMockFocus({
        intent: 'water_quality',
        requestedParameter: 'dissolved_oxygen',
        requestedFields: ['do_morning_mg_l'],
      }),
      exactRecordAnswer: null,
    },
  };
  const doPreview = buildOrsonResponsePreview(doAnalysis);
  assert.ok(doPreview);
  assert.ok(doPreview.text.includes('Morning DO 0 mg/L'));
});

test('null and missing values are excluded, returning null if no finite data exists', () => {
  const pond = createMockPond({
    records: [
      {
        id: 'rec-empty',
        date: '2026-09-02',
        kinds: ['water_quality'],
        feedKg: null,
        doMorning: null,
        doEvening: null,
        phMorning: null,
        phEvening: null,
        salinityPpt: null,
        temperatureC: null,
        transparencyCm: null,
        mbwG: null,
        isBaselineEstimate: false,
      },
    ],
  });

  const analysis = {
    normalizedPonds: [pond],
    promptPackage: {
      userMessage: 'What was the DO in Pond 1 on 2026-09-02?',
      questionFocus: createMockFocus(),
      exactRecordAnswer: null,
    },
  };

  assert.equal(buildOrsonResponsePreview(analysis), null);
});

test('baseline estimates and midcycle onboarding records are excluded', () => {
  const pond = createMockPond({
    records: [
      {
        id: 'rec-baseline',
        date: '2026-09-02',
        kinds: ['water_quality'],
        doMorning: 5.5,
        doEvening: 6.0,
        isBaselineEstimate: true,
      },
      {
        id: 'rec-onboarding',
        source: 'midcycle_onboarding',
        date: '2026-09-02',
        kinds: ['water_quality'],
        doMorning: 5.8,
        doEvening: 6.2,
        isBaselineEstimate: false,
      },
    ],
  });

  const analysis = {
    normalizedPonds: [pond],
    promptPackage: {
      userMessage: 'What was the DO in Pond 1 on 2026-09-02?',
      questionFocus: createMockFocus(),
      exactRecordAnswer: null,
    },
  };

  assert.equal(buildOrsonResponsePreview(analysis), null);
});

test('unresolved relative date wording fails closed when requestedDates is empty', () => {
  const pond = createMockPond();

  for (const relativeQuery of [
    'What was the DO in Pond 1 yesterday?',
    'Berapa DO di Pond 1 kemarin?',
    'What was the DO in Pond 1 for the past 3 days?',
    'What was the DO in Pond 1 last week?',
  ]) {
    const analysis = {
      normalizedPonds: [pond],
      promptPackage: {
        userMessage: relativeQuery,
        questionFocus: createMockFocus({ requestedDates: [] }),
        exactRecordAnswer: null,
      },
    };
    assert.equal(buildOrsonResponsePreview(analysis), null, `Should fail closed for: ${relativeQuery}`);
  }
});

test('future dates after pond asOfDate return null', () => {
  const pond = createMockPond({ asOfDate: '2026-09-05' });
  const analysis = {
    normalizedPonds: [pond],
    promptPackage: {
      userMessage: 'What is the DO in Pond 1 on 2026-09-10?',
      questionFocus: createMockFocus({ requestedDates: ['2026-09-10'] }),
      exactRecordAnswer: null,
    },
  };

  assert.equal(buildOrsonResponsePreview(analysis), null);
});

test('invalid ISO date returns null', () => {
  const pond = createMockPond();
  const analysis = {
    normalizedPonds: [pond],
    promptPackage: {
      userMessage: 'What is the DO in Pond 1 on 2026-02-31?',
      questionFocus: createMockFocus({ requestedDates: ['2026-02-31'] }),
      exactRecordAnswer: null,
    },
  };

  assert.equal(buildOrsonResponsePreview(analysis), null);
});

test('morning and evening query scopes narrow readings accordingly', () => {
  const pond = createMockPond();

  // Morning only
  const morningAnalysis = {
    normalizedPonds: [pond],
    promptPackage: {
      userMessage: 'What was the morning DO in Pond 1 on 2026-09-02?',
      questionFocus: createMockFocus({ requestedFields: ['do_morning_mg_l'] }),
      exactRecordAnswer: null,
    },
  };
  const morningPreview = buildOrsonResponsePreview(morningAnalysis);
  assert.ok(morningPreview);
  assert.ok(morningPreview.text.includes('Morning DO 5.2 mg/L'));
  assert.ok(!morningPreview.text.includes('Evening DO'));

  // Evening only
  const eveningAnalysis = {
    normalizedPonds: [pond],
    promptPackage: {
      userMessage: 'What was the evening DO in Pond 1 on 2026-09-02?',
      questionFocus: createMockFocus({ requestedFields: ['do_evening_mg_l'] }),
      exactRecordAnswer: null,
    },
  };
  const eveningPreview = buildOrsonResponsePreview(eveningAnalysis);
  assert.ok(eveningPreview);
  assert.ok(eveningPreview.text.includes('Evening DO 6.5 mg/L'));
  assert.ok(!eveningPreview.text.includes('Morning DO'));
});

test('sampling records are required for MBW growth preview', () => {
  const pond = createMockPond({
    records: [
      {
        id: 'rec-water',
        date: '2026-09-02',
        kinds: ['water_quality'],
        mbwG: 16.5,
        isBaselineEstimate: false,
      },
      {
        id: 'rec-sample',
        date: '2026-09-03',
        kinds: ['sampling'],
        mbwG: 18.2,
        isBaselineEstimate: false,
      },
    ],
  });

  const analysis = {
    normalizedPonds: [pond],
    promptPackage: {
      userMessage: 'What is the MBW in Pond 1?',
      questionFocus: createMockFocus({
        intent: 'growth',
        requestedParameter: 'mbw',
        requestedFields: ['mbw_g'],
        requestedDates: [],
      }),
      exactRecordAnswer: null,
    },
  };

  const preview = buildOrsonResponsePreview(analysis);
  assert.ok(preview);
  assert.ok(preview.text.includes('MBW 18.2 g'));
  assert.ok(!preview.text.includes('16.5'));
});

test('Indonesian question produces Indonesian copy without dependencies', () => {
  const pond = createMockPond();
  const analysis = {
    normalizedPonds: [pond],
    promptPackage: {
      userMessage: 'Berapa oksigen terlarut pagi di Pond 1 pada 2026-09-02?',
      questionFocus: createMockFocus(),
      exactRecordAnswer: null,
    },
  };

  const preview = buildOrsonResponsePreview(analysis);
  assert.ok(preview);
  assert.equal(preview.title, 'Pratinjau data tersimpan');
  assert.ok(preview.text.includes('Rekaman tersimpan untuk Pond 1:'));
  assert.ok(preview.text.includes('DO Pagi 5.2 mg/L'));
  assert.ok(preview.text.includes('Orson masih memeriksa detail untuk jawaban lengkap.'));
});

test('pH mapping has no unit and transparency has cm unit', () => {
  const pond = createMockPond();

  // pH
  const phAnalysis = {
    normalizedPonds: [pond],
    promptPackage: {
      userMessage: 'What was the morning pH in Pond 1 on 2026-09-02?',
      questionFocus: createMockFocus({
        requestedParameter: 'ph',
        requestedFields: ['ph_morning'],
      }),
      exactRecordAnswer: null,
    },
  };
  const phPreview = buildOrsonResponsePreview(phAnalysis);
  assert.ok(phPreview);
  assert.ok(phPreview.text.includes('Morning pH 7.8'));
  assert.ok(!phPreview.text.includes('7.8 ')); // No unit appended

  // Transparency
  const secchiAnalysis = {
    normalizedPonds: [pond],
    promptPackage: {
      userMessage: 'What was the transparency in Pond 1 on 2026-09-02?',
      questionFocus: createMockFocus({
        requestedParameter: 'plankton_transparency',
        requestedFields: ['transparency_cm'],
      }),
      exactRecordAnswer: null,
    },
  };
  const secchiPreview = buildOrsonResponsePreview(secchiAnalysis);
  assert.ok(secchiPreview);
  assert.ok(secchiPreview.text.includes('Transparency 35 cm'));
});

test('builder does not mutate analysis input', () => {
  const pond = createMockPond();
  const focus = createMockFocus();
  const analysis = {
    normalizedPonds: [pond],
    promptPackage: {
      userMessage: 'What was the DO in Pond 1 on 2026-09-02?',
      questionFocus: focus,
      exactRecordAnswer: null,
    },
  };

  const originalAnalysisJson = JSON.stringify(analysis);
  const preview = buildOrsonResponsePreview(analysis);
  assert.ok(preview);
  assert.equal(JSON.stringify(analysis), originalAnalysisJson);
});

test('limits output to at most two readings', () => {
  const pond = createMockPond({
    records: [
      {
        id: 'r1',
        date: '2026-09-01',
        kinds: ['water_quality'],
        doMorning: 4.8,
        doEvening: 5.5,
        isBaselineEstimate: false,
      },
      {
        id: 'r2',
        date: '2026-09-02',
        kinds: ['water_quality'],
        doMorning: 5.0,
        doEvening: 6.0,
        isBaselineEstimate: false,
      },
    ],
  });

  const analysis = {
    normalizedPonds: [pond],
    promptPackage: {
      userMessage: 'What is the DO in Pond 1?',
      questionFocus: createMockFocus({ requestedDates: [] }),
      exactRecordAnswer: null,
    },
  };

  const preview = buildOrsonResponsePreview(analysis);
  assert.ok(preview);
  const lines = preview.text.split('\n').filter((l) => l.startsWith('- '));
  assert.equal(lines.length, 2);
});

test('precision, inherited session scope and contradictory pond identities fail safely', () => {
  const pond = createMockPond(); pond.records[0].doMorning = 0.004;
  const analysis = { normalizedPonds: [pond], promptPackage: {
    userMessage: 'Check it again', exactRecordAnswer: null,
    questionFocus: createMockFocus({ requestedFields: ['do_morning_mg_l'] }),
  } };
  const preview = buildOrsonResponsePreview(analysis);
  assert.match(preview.text, /Morning DO 0\.004 mg\/L/);
  assert.doesNotMatch(preview.text, /Evening/);
  analysis.promptPackage.questionFocus.focusedPondId = 'wrong-id';
  assert.equal(buildOrsonResponsePreview(analysis), null);
});

test('generic measurements cannot acquire a morning label or become feed observations', () => {
  const pond = createMockPond();
  for (const [parameter, field] of [['temperature', 'temperature_c'], ['plankton_transparency', 'transparency_cm']]) {
    const analysis = { normalizedPonds: [pond], promptPackage: {
      userMessage: 'Check the morning reading', exactRecordAnswer: null,
      questionFocus: createMockFocus({ requestedParameter: parameter, requestedFields: [field] }),
    } };
    assert.equal(buildOrsonResponsePreview(analysis), null);
  }
  pond.records[0].kinds = ['sampling'];
  assert.equal(buildOrsonResponsePreview({ normalizedPonds: [pond], promptPackage: {
    userMessage: 'Check feed', exactRecordAnswer: null,
    questionFocus: createMockFocus({ intent: 'feed', requestedParameter: 'feed', requestedFields: ['feed_kg'] }),
  } }), null);
});

test('real analysis yields a useful oxygen preview from saved records without changing the analysis', () => {
  const { buildOrsonAnalysis } = require('./pipeline.ts');
  const ponds = [{ id: 'p1', pondName: 'A1', cycleStatus: 'active', docStartDate: '2026-09-01', records: [
    { id: 'w1', type: 'water_quality', date: '2026-09-02', doMorning: 3.2, doEvening: 5.7 },
  ] }];
  const analysis = buildOrsonAnalysis(ponds, 'Why is oxygen low in A1?', new Date('2026-09-05T00:00:00Z'), null, undefined, 'Asia/Jakarta');
  const before = JSON.stringify(analysis);
  const preview = buildOrsonResponsePreview(analysis);
  assert.ok(preview);
  assert.match(preview.text, /A1/); assert.match(preview.text, /2026-09-02: Morning DO 3\.2 mg\/L/);
  assert.equal(JSON.stringify(analysis), before);
});
