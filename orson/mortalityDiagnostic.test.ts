import { buildOrsonAnalysis } from './pipeline';
import { isMortalityDiagnosticQuestion } from './mortalityDiagnostic';
import type { OrsonMortalityDiagnosticContext } from './types';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

export const runMortalityDiagnosticSelfTest = () => {
  assert(isMortalityDiagnosticQuestion('Mortality is high in A1. Can you pinpoint why?'), 'detects mortality investigation');
  assert(!isMortalityDiagnosticQuestion('What is the mortality in A1?'), 'does not activate for a factual mortality question');

  const pond = {
    id: 'a1',
    pondName: 'A1',
    initialPopulation: 100_000,
    initialWeight: 10,
    docStart: '2026-07-01',
    totalHarvestedPopulation: 40_000,
    totalHarvestedBiomass: 400,
    partialHarvestCount: 1,
    postHarvestBaselineDate: '2026-08-03',
    postHarvestRemainingPopulation: 59_950,
    postHarvestRemainingBiomass: 599.5,
    postHarvestReferenceSamplingId: 'feed-before',
    postHarvestReferenceSamplingDate: '2026-08-01',
    postHarvestReferenceMbw: 10,
    samplings: [
      { id: 'm1', date: '2026-07-29', mbw: 10, mortality: 10, feed: 48, doMorning: 5.2, doEvening: 5.8 },
      { id: 'm2', date: '2026-07-31', mbw: 10, mortality: 10, feed: 49, doMorning: 5.1, doEvening: 5.7 },
      { id: 'feed-before', date: '2026-08-01', mbw: 10, mortality: 0, feed: 50, doMorning: 5, doEvening: 5.6 },
      { id: 'm3', date: '2026-08-02', mbw: 10, mortality: 10, feed: 50, doMorning: 4.9, doEvening: 5.5 },
      { id: 'm4', date: '2026-08-04', mbw: 10, mortality: 10, feed: 30, doMorning: 4.8, doEvening: 5.4 },
      { id: 'm5', date: '2026-08-06', mbw: 10, mortality: 10, feed: 30, doMorning: 4.6, doEvening: 5.2 },
      { id: 'spike', date: '2026-08-09', mbw: 10, mortality: 100, feed: 30, doMorning: 3.4, doEvening: 4.8 },
    ],
  };
  const context: OrsonMortalityDiagnosticContext = {
    pondId: 'a1',
    labHistory: [],
    treatments: [],
    harvests: [{ id: 'h1', date: '2026-08-03', harvestType: 'partial', biomassKg: 400, population: 40_000 }],
    unavailableSources: [],
  };
  const analysis = buildOrsonAnalysis(
    [pond],
    'Mortality is high in A1. Can you trace back and tell me why?',
    new Date('2026-08-09T12:00:00Z'),
    null,
    context,
  );

  assert(analysis.diagnosticRequest.status === 'selected', 'selects the named pond');
  assert(analysis.promptPackage.questionFocus.analysisMode === 'mortality_diagnostic', 'uses diagnostic mode');
  assert(analysis.promptPackage.cacheKey === null, 'does not cache farm mortality diagnostics');
  assert(analysis.promptPackage.mortalityTrace?.timeline.length === 14, 'creates a 14-day timeline');
  assert(analysis.promptPackage.mortalityTrace?.baseline.isSpike, 'detects the mortality spike');
  assert(
    analysis.promptPackage.mortalityTrace?.appetiteProxy.status === 'explained_by_harvest',
    'does not label biomass-adjusted post-harvest feed reduction as appetite decline',
  );
  assert(
    analysis.promptPackage.mortalityTrace?.hypotheses[0]?.id === 'oxygen_stress',
    'ranks acute oxygen stress from the pre-event evidence',
  );
  assert(analysis.promptPackage.context.includes('ORSON MORTALITY TRACE'), 'adds the trace only to the diagnostic prompt');

  const standard = buildOrsonAnalysis([pond], 'What is the mortality in A1?', new Date('2026-08-09T12:00:00Z'));
  assert(standard.promptPackage.questionFocus.analysisMode === 'standard', 'keeps ordinary mortality questions standard');
  assert(!standard.promptPackage.context.includes('ORSON MORTALITY TRACE'), 'does not spend trace tokens on standard chat');
};
