import { buildOrsonAnalysis } from './pipeline';
import { createDefaultOrsonCalibration } from './learning';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

export const runPipelineSelfTest = () => {
  const analysis = buildOrsonAnalysis([
    {
      id: 'pond-pipeline',
      pondName: 'Pipeline Pond',
      pondArea: 1000,
      density: 100,
      initialPopulation: 100000,
      initialWeight: 0.5,
      docStart: '2026-01-01',
      samplings: [
        {
          id: 's1',
          date: '2026-01-10',
          mbw: 1.5,
          mortality: 50,
          feed: 10,
          doMorning: 4.8,
          doEvening: 4.4,
          feedData: { totalDailyFeed: 10 },
        },
        {
          id: 's2',
          date: '2026-01-15',
          mbw: 2,
          mortality: 100,
          feed: 30,
          doMorning: 4.1,
          doEvening: 3.6,
          feedData: { totalDailyFeed: 30 },
        },
      ],
    },
  ], 'Analyze my feed risk', new Date('2026-01-16T00:00:00Z'));

  assert(analysis.normalizedPonds.length === 1, 'normalizes ponds');
  assert(analysis.metrics.length === 1, 'calculates metrics');
  assert(analysis.reports[0].findings.length > 0, 'creates risk report');
  assert(analysis.outlooks[0].direction === 'deteriorating', 'creates outlook');
  assert(analysis.promptPackage.context.includes('ORSON RISK PAYLOAD'), 'creates prompt package');
  assert(analysis.promptPackage.questionFocus.intent === 'feed', 'detects feed intent');

  const focused = buildOrsonAnalysis([
    {
      id: 'a1',
      pondName: 'A1',
      pondArea: 1000,
      density: 100,
      initialPopulation: 100000,
      initialWeight: 0.5,
      docStart: '2026-01-01',
      samplings: [
        { id: 'a1-s1', date: '2026-01-10', mbw: 2, mortality: 10, feed: 12, doMorning: 5, doEvening: 4.8 },
      ],
    },
    {
      id: 'b2',
      pondName: 'B2',
      pondArea: 1000,
      density: 100,
      initialPopulation: 100000,
      initialWeight: 0.5,
      docStart: '2026-01-01',
      samplings: [
        { id: 'b2-s1', date: '2026-01-10', mbw: 2, mortality: 10, feed: 12, doMorning: 3.4, doEvening: 3.2 },
      ],
    },
  ], 'Why is feed high in A1?', new Date('2026-01-16T00:00:00Z'));

  assert(focused.promptPackage.questionFocus.focusedPondName === 'A1', 'detects focused pond');
  assert(focused.promptPackage.questionFocus.shouldSummarize === false, 'narrow question does not request summary');
  const focusedPayload = JSON.parse(focused.promptPackage.context.split('ORSON RISK PAYLOAD:\n')[1]);
  assert(focusedPayload[0].pond === 'A1', 'includes the focused pond');
  assert(focusedPayload.every((item: { pond: string }) => item.pond !== 'B2'), 'excludes unselected ponds from focused prompts');

  const exactHistory = buildOrsonAnalysis([
    {
      id: 'sim-e1',
      pondName: 'SIM-E1',
      pondArea: 1000,
      density: 100,
      initialPopulation: 100000,
      initialWeight: 0.5,
      docStart: '2026-08-01',
      samplings: [
        { id: 'sim-27-water', date: '2026-08-27', doMorning: 5.2, doEvening: 6, ammonia: 0.06 },
        { id: 'sim-27-feed', date: '2026-08-27', feedData: { totalDailyFeed: 7.2, feedingResponse: 'weak' } },
        { id: 'sim-29-water', date: '2026-08-29', doMorning: 6, doEvening: 6.6, ammonia: 0.03 },
        { id: 'sim-29-feed', date: '2026-08-29', feedData: { totalDailyFeed: 8.2, feedingResponse: 'normal' } },
      ],
    },
    {
      id: 'sim-e2',
      pondName: 'SIM-E2',
      pondArea: 1000,
      density: 100,
      initialPopulation: 100000,
      initialWeight: 0.5,
      docStart: '2026-08-01',
      samplings: [
        { id: 'other', date: '2026-08-29', doMorning: 3.1, doEvening: 3.8, ammonia: 0.8, feedData: { totalDailyFeed: 99, feedingResponse: 'weak' } },
      ],
    },
  ], 'For SIM-E1 only, compare the synced water quality and feed response on 2026-08-27 and 2026-08-29. State the recorded DO, ammonia and feed response. Do not include other ponds or give treatment advice.', new Date('2026-08-30T00:00:00Z'));
  const exactContext = exactHistory.promptPackage.context;
  const exactRecords = JSON.parse(exactContext.split('ORSON EXACT RECORDS:\n')[1]);

  assert(exactHistory.promptPackage.questionFocus.focusedPondName === 'SIM-E1', 'keeps an exact-date comparison on the single named pond');
  assert(exactHistory.promptPackage.questionFocus.requestedDates?.join(',') === '2026-08-27,2026-08-29', 'extracts exact requested dates');
  assert(exactHistory.promptPackage.questionFocus.suppressAdvice === true, 'detects the no-advice instruction');
  assert(!exactContext.includes('SIM-E2'), 'does not include other ponds in a single-pond date comparison');
  assert(exactRecords.records.length === 2, 'includes only the requested dates');
  assert(exactRecords.records[0].do_morning_mg_l === 5.2 && exactRecords.records[0].do_evening_mg_l === 6, 'keeps both recorded DO values for August 27');
  assert(exactRecords.records[0].ammonia_mg_l === 0.06, 'keeps recorded ammonia for August 27');
  assert(exactRecords.records[0].feed_kg === 7.2 && exactRecords.records[0].feeding_response === 'weak', 'keeps recorded feed and response for August 27');
  assert(exactRecords.records[1].do_morning_mg_l === 6 && exactRecords.records[1].do_evening_mg_l === 6.6, 'keeps both recorded DO values for August 29');
  assert(exactRecords.records[1].ammonia_mg_l === 0.03, 'keeps recorded ammonia for August 29');
  assert(exactRecords.records[1].feed_kg === 8.2 && exactRecords.records[1].feeding_response === 'normal', 'keeps recorded feed and response for August 29');
  assert(Object.keys(exactRecords.records[0]).every((key) => ['date', 'do_morning_mg_l', 'do_evening_mg_l', 'ammonia_mg_l', 'feed_kg', 'feeding_response'].includes(key)), 'exposes only the requested record fields');

  const exactOperationalHistory = buildOrsonAnalysis([
    {
      id: 'sim-b1',
      pondName: 'SIM-B1',
      pondArea: 1000,
      density: 100,
      initialPopulation: 100000,
      initialWeight: 0.5,
      docStart: '2026-08-01',
      samplings: [
        {
          id: 'sim-b1-water',
          date: '2026-09-01',
          doMorning: 4.7,
          doEvening: 5.8,
          ammonia: 0.06,
          weatherEvent: 'heavy_rain',
          waterExchangePercent: 8,
          sludgeLoad: 'moderate',
          surfaceScum: false,
          shrimpBehaviour: 'abnormal',
        },
        { id: 'sim-b1-feed', date: '2026-09-01', feedData: { totalDailyFeed: 6.6, feedingResponse: 'normal' } },
      ],
    },
  ], 'For SIM-B1 on 2026-09-01, state the DO, ammonia, feed, weather, water exchange, sludge, scum, and shrimp behavior.', new Date('2026-09-02T00:00:00Z'));
  const exactOperationalRecords = JSON.parse(exactOperationalHistory.promptPackage.context.split('ORSON EXACT RECORDS:\n')[1]);
  const simB1 = exactOperationalRecords.records[0];

  assert(simB1.feed_kg === 6.6, 'keeps the exact daily feed total');
  assert(simB1.weather_event === 'Heavy Rain', 'formats the exact weather event for display');
  assert(simB1.water_exchange_pct === 8, 'keeps the exact water exchange');
  assert(simB1.sludge_load === 'moderate', 'keeps the exact sludge observation');
  assert(simB1.surface_scum === false, 'keeps an explicit no-scum observation');
  assert(simB1.shrimp_behaviour === 'abnormal', 'keeps the exact shrimp behaviour');

  const decimalFeedHistory = buildOrsonAnalysis([
    {
      id: 'sim-c1',
      pondName: 'SIM-C1',
      pondArea: 1000,
      density: 100,
      initialPopulation: 100000,
      initialWeight: 0.5,
      docStart: '2026-08-01',
      samplings: [7.2, 7.4, 7.6, 7.8, 8].map((totalDailyFeed, index) => ({
        id: `sim-c1-feed-${index}`,
        date: `2026-08-${String(25 + index).padStart(2, '0')}`,
        feedData: { totalDailyFeed: totalDailyFeed.toFixed(2) },
      })),
    },
  ], "What were SIM-C1's last five daily feed totals?", new Date('2026-08-30T00:00:00Z'));

  assert(decimalFeedHistory.promptPackage.questionFocus.requestedRecordCount === 5, 'detects a relative five-record lookup');
  assert(decimalFeedHistory.promptPackage.exactRecordAnswer === [
    'SIM-C1 daily feed totals:',
    '- 2026-08-25: 7.2 kg',
    '- 2026-08-26: 7.4 kg',
    '- 2026-08-27: 7.6 kg',
    '- 2026-08-28: 7.8 kg',
    '- 2026-08-29: 8.0 kg',
  ].join('\n'), 'preserves decimal feed totals in the exact Orson answer');
  assert(decimalFeedHistory.promptPackage.context.includes('"feed_kg_display": "8.0"'), 'preserves feed precision in prompt context');

  const parameterControl = buildOrsonAnalysis([
    {
      id: 'a1',
      pondName: 'A1',
      pondArea: 1000,
      density: 100,
      initialPopulation: 100000,
      initialWeight: 0.5,
      docStart: '2026-01-01',
      latestLabStatus: {
        reportType: 'water_quality',
        sampleDate: '2026-01-15',
        status: 'warning',
        mainIssue: 'Ammonia elevated',
        keyRisks: ['High ammonia pressure'],
        recommendations: ['Reduce feed pressure and improve aeration while rechecking pH and temperature.'],
      },
      samplings: [
        { id: 'a1-s1', date: '2026-01-15', mbw: 2, mortality: 10, feed: 18, phMorning: 8.1, phEvening: 8.8, doMorning: 4.2, doEvening: 5.2 },
      ],
    },
  ], 'How do I lower ammonia in A1?', new Date('2026-01-16T00:00:00Z'));

  assert(parameterControl.promptPackage.questionFocus.intent === 'parameter_control', 'detects parameter-control intent');
  assert(parameterControl.promptPackage.questionFocus.requestedParameter === 'ammonia', 'detects ammonia parameter');
  assert(parameterControl.promptPackage.questionFocus.requestedDirection === 'decrease', 'detects decrease direction');
  assert(parameterControl.promptPackage.context.includes('ORSON SELECTED KNOWLEDGE'), 'adds selected knowledge');
  assert(parameterControl.promptPackage.context.includes('Toxic NH3 risk rises with higher pH and temperature'), 'adds ammonia guidance');

  const calibrated = buildOrsonAnalysis([
    {
      id: 'a1',
      pondName: 'A1',
      pondArea: 1000,
      density: 100,
      initialPopulation: 100000,
      initialWeight: 0.5,
      docStart: '2026-01-01',
      samplings: [
        { id: 'a1-s1', date: '2026-01-15', mbw: 2, mortality: 10, feed: 18 },
      ],
    },
  ], 'What is the biomass range in A1?', new Date('2026-01-16T00:00:00Z'), {
    ...createDefaultOrsonCalibration(),
    versionNumber: 2,
    versionId: 'v2-company',
    status: 'active',
    companyAdjustment: {
      adgMultiplier: 0.95,
      survivalOffsetPercentagePoints: -2,
      biomassMultiplier: 0.96,
      sampleSize: 25,
    },
  });
  assert(calibrated.metrics[0].calibration.scope === 'company', 'applies company memory to shared Orson analysis');
  assert(calibrated.promptPackage.context.includes('v2-company'), 'passes calibration evidence to AI recommendations');

  const largeFarm = buildOrsonAnalysis(
    Array.from({ length: 100 }, (_, index) => ({
      id: `large-${index}`,
      pondName: `Large ${index}`,
      pondArea: 1000,
      density: 100,
      initialPopulation: 100000,
      initialWeight: 0.5,
      docStart: '2026-01-01',
      samplings: [{ id: `s-${index}`, date: '2026-01-15', mbw: 2, mortality: index, feed: 18 }],
    })),
    'Summarize my farm risk',
    new Date('2026-01-16T00:00:00Z'),
  );
  assert(largeFarm.promptPackage.context.includes('"active_pond_count": 100'), 'preserves the full large-farm pond count');
  assert(largeFarm.promptPackage.context.includes('"included_pond_count": 5'), 'bounds large-farm AI context to five highest-risk ponds');

  return analysis;
};
