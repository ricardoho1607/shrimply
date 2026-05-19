import { calculatePondMetrics } from './metrics';
import { normalizePondData } from './normalizePondData';
import { build72HourOutlook } from './outlook';
import { cleanOrsonResponse, ORSON_FALLBACK_RESPONSE, withOrsonTimeout, buildOrsonPromptPackage, isFarmSpecificQuestion } from './promptBuilder';
import { analyzePondRisks } from './riskEngine';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

export const runPromptBuilderSelfTest = () => {
  const pond = normalizePondData(
    {
      id: 'pond-prompt',
      pondName: 'Prompt Pond',
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
          phMorning: 7.8,
          phEvening: 8.1,
          doMorning: 4.8,
          doEvening: 4.4,
          salinity: 18,
          feedData: { totalDailyFeed: 10, anco1: 90, anco2: 85 },
        },
        {
          id: 's2',
          date: '2026-01-15',
          mbw: 2,
          mortality: 100,
          feed: 30,
          phMorning: 7.5,
          phEvening: 8.5,
          doMorning: 4.1,
          doEvening: 3.6,
          salinity: 25,
          feedData: { totalDailyFeed: 30, anco1: 65, anco2: 55 },
        },
      ],
    },
    { now: new Date('2026-01-16T00:00:00Z') },
  );

  const metrics = calculatePondMetrics(pond);
  const report = analyzePondRisks(metrics, new Date('2026-01-16T00:00:00Z'));
  const outlook = build72HourOutlook(report, new Date('2026-01-16T00:00:00Z'));
  const farmPackage = buildOrsonPromptPackage({
    userMessage: 'Analyze my feed risk today',
    metrics: [metrics],
    reports: [report],
    outlooks: [outlook],
  });
  const generalPackage = buildOrsonPromptPackage({
    userMessage: 'What is FCR?',
    metrics: [metrics],
    reports: [report],
    outlooks: [outlook],
  });

  assert(isFarmSpecificQuestion('Analyze my pond') === true, 'detects farm-specific questions');
  assert(isFarmSpecificQuestion('What is FCR?') === false, 'detects general questions');
  assert(farmPackage.cacheKey === null, 'does not cache farm-specific answers by default');
  assert(generalPackage.cacheKey !== null, 'allows general answers to be cached');
  assert(farmPackage.systemInstruction.includes('Do not invent measurements'), 'guards against invented measurements');
  assert(farmPackage.context.includes('ORSON RISK PAYLOAD'), 'builds payload context');
  assert(farmPackage.context.includes('feed_pressure_ratio'), 'includes feed pressure');
  assert(farmPackage.context.includes('biomass_range_kg'), 'includes biomass range');
  assert(farmPackage.context.length < 8000, 'keeps prompt context compact');
  assert(cleanOrsonResponse('## **Risk**  \nUse aeration.') === 'Risk\nUse aeration.', 'cleans markdown-heavy responses');

  return {
    farmPackage,
    generalPackage,
  };
};

export const runPromptTimeoutSelfTest = async () => {
  const fast = await withOrsonTimeout(Promise.resolve('ok'), 100);
  assert(fast === 'ok', 'returns fast promise result');

  try {
    await withOrsonTimeout(new Promise((resolve) => setTimeout(resolve, 20)), 1);
    throw new Error('timeout should have thrown');
  } catch (error) {
    assert(error instanceof Error, 'throws timeout error');
    assert(error.message === ORSON_FALLBACK_RESPONSE, 'uses fallback timeout message');
  }
};
