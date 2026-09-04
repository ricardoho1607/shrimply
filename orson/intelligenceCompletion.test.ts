import parityFixtures from './fixtures/riskParity.json';
import { buildOrsonAnalysis } from './pipeline';

const NOW = new Date('2026-08-20T00:00:00Z');

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const risk = (pond: Record<string, any>) => buildOrsonAnalysis([pond], 'Compare growth and current risk', NOW);

const finding = (pond: Record<string, any>, id: string) => {
  return risk(pond).reports[0]?.findings.find((item) => item.id === id) ?? null;
};

const basePond = (record: Record<string, any>, waterQuality?: Record<string, any>) => ({
  id: 'boundary-pond',
  pondName: 'Boundary Pond',
  pondArea: 1000,
  density: 100,
  initialPopulation: 100000,
  initialWeight: 0.5,
  docStart: '2026-08-01',
  cycleId: 'cycle-current',
  pondCycleId: 'pond-cycle-current',
  samplings: [{ id: 'boundary-record', date: '2026-08-19', mbw: 4, feed: 20, ...record }],
  ...(waterQuality ? {
    latestLabStatus: {
      labReportId: 'boundary-lab',
      reportType: 'water_quality',
      sampleDate: '2026-08-19',
      status: 'info',
      cycleId: 'cycle-current',
      pondCycleId: 'pond-cycle-current',
      metrics: {
        schemaVersion: 2,
        waterQuality: { date: '2026-08-19', ...waterQuality },
        microbiology: null,
        plankton: null,
      },
    },
  } : {}),
});

export const runIntelligenceCompletionSelfTest = () => {
  for (const fixture of parityFixtures) {
    const analysis = risk(fixture.pond);
    const ids = new Set<string>(analysis.reports[0]?.findings.map((item) => item.id) ?? []);
    fixture.expectedRiskIds.forEach((id) => assert(ids.has(id), `${fixture.id}: expected ${id}`));
    fixture.excludedRiskIds.forEach((id) => assert(!ids.has(id), `${fixture.id}: excluded ${id}`));
  }

  const phCases = [
    [7, 'warning'],
    [7.4, 'warning'],
    [7.41, null],
    [8.59, null],
    [8.6, 'warning'],
    [9, 'warning'],
    [6.99, 'critical'],
    [9.01, 'critical'],
  ] as const;
  phCases.forEach(([ph, severity]) => {
    const result = finding(basePond({ phMorning: ph }), 'unsafe_ph');
    assert(result?.severity === severity || (result === null && severity === null), `pH ${ph}: expected ${severity}`);
  });

  assert(finding(basePond({ doMorning: 4.99, temperature: 30.01 }), 'low_do_high_temperature') !== null, 'DO/temperature crosses rule');
  assert(finding(basePond({ doMorning: 5, temperature: 31 }), 'low_do_high_temperature') === null, 'DO 5 is outside rule');
  assert(finding(basePond({ doMorning: 4.9, temperature: 30 }), 'low_do_high_temperature') === null, 'temperature 30 is outside rule');

  assert(finding(basePond({ ammonia: 0.04 }), 'ammonia_elevated') === null, 'healthy field TAN does not trigger');
  assert(finding(basePond({ ammonia: 0.99 }), 'ammonia_elevated') === null, 'field TAN below 1 mg/L does not trigger');
  assert(finding(basePond({ ammonia: 1 }), 'ammonia_elevated')?.severity === 'warning', 'field TAN at 1 mg/L is warning');
  assert(finding(basePond({ ammonia: 2 }), 'ammonia_elevated')?.severity === 'warning', 'field TAN at 2 mg/L is warning');
  assert(finding(basePond({ ammonia: 2.01 }), 'ammonia_elevated')?.severity === 'critical', 'field TAN above 2 mg/L is critical');

  assert(finding(basePond({ doMorning: 3.99 }, { tanMgL: 1.01 }), 'low_do_high_tan') !== null, 'TAN/DO crosses rule');
  assert(finding(basePond({ doMorning: 3.99 }, { tanMgL: 1 }), 'low_do_high_tan') === null, 'TAN 1 is outside rule');
  assert(finding(basePond({ doMorning: 4 }, { tanMgL: 1.01 }), 'low_do_high_tan') === null, 'DO 4 is outside TAN rule');
  assert(finding(basePond({ phEvening: 8.51 }, { tanMgL: 1.01 }), 'high_ph_high_tan') !== null, 'TAN/pH crosses rule');
  assert(finding(basePond({ phEvening: 8.5 }, { tanMgL: 1.01 }), 'high_ph_high_tan') === null, 'pH 8.5 is outside TAN rule');

  assert(finding(basePond({}, { nh3MgL: 0.009 }), 'nh3_elevated') === null, 'NH3 below 0.01 is safe');
  assert(finding(basePond({}, { nh3MgL: 0.01 }), 'nh3_elevated')?.severity === 'warning', 'NH3 0.01 is warning');
  assert(finding(basePond({}, { nh3MgL: 0.05 }), 'nh3_elevated')?.severity === 'warning', 'NH3 0.05 is warning');
  assert(finding(basePond({}, { nh3MgL: 0.051 }), 'nh3_elevated')?.severity === 'critical', 'NH3 above 0.05 is critical');

  assert(finding(basePond({ doMorning: 4.99 }, { nitriteMgL: 0.301 }), 'high_nitrite_low_do') !== null, 'NO2/DO crosses rule');
  assert(finding(basePond({ doMorning: 4.99 }, { nitriteMgL: 0.3 }), 'high_nitrite_low_do') === null, 'NO2 0.3 is outside rule');
  assert(finding(basePond({ doMorning: 5 }, { nitriteMgL: 0.301 }), 'high_nitrite_low_do') === null, 'DO 5 is outside NO2 rule');

  assert(finding(basePond({ phMorning: 7.8, phEvening: 8.31 }, { alkalinityMgL: 79.9 }), 'low_alkalinity_high_ph_swing') !== null, 'alkalinity/pH swing crosses rule');
  assert(finding(basePond({ phMorning: 7.8, phEvening: 8.3 }, { alkalinityMgL: 79.9 }), 'low_alkalinity_high_ph_swing') === null, 'pH swing 0.5 is outside rule');
  assert(finding(basePond({ phMorning: 7.8, phEvening: 8.31 }, { alkalinityMgL: 80 }), 'low_alkalinity_high_ph_swing') === null, 'alkalinity 80 is outside rule');

  assert(finding(basePond({ transparency: 24.9, doMorning: 4.99 }), 'plankton_transparency_instability') !== null, 'low transparency with unstable water crosses rule');
  assert(finding(basePond({ transparency: 45.1, doMorning: 4.99 }), 'plankton_transparency_instability') !== null, 'high transparency with unstable water crosses rule');
  assert(finding(basePond({ transparency: 25, doMorning: 4.99 }), 'plankton_transparency_instability') === null, 'transparency 25 is in range');
  assert(finding(basePond({ transparency: 45, doMorning: 4.99 }), 'plankton_transparency_instability') === null, 'transparency 45 is in range');
  assert(finding(basePond({ transparency: 45.1, doMorning: 5 }), 'plankton_transparency_instability') === null, 'stable water does not trigger transparency rule');

  const mortalityAtFloor = { ...basePond({ mortality: 100 }), initialPopulation: 10000 };
  const mortalityAboveFloor = { ...basePond({ mortality: 101 }), initialPopulation: 10000 };
  assert(finding(mortalityAtFloor, 'mortality_spike') === null, 'mortality at the 100-shrimp floor does not trigger');
  assert(finding(mortalityAboveFloor, 'mortality_spike')?.severity === 'warning', 'mortality above the floor is warning only');

  const missing = new Set<string>(risk(basePond({})).reports[0]?.findings.map((item) => item.id) ?? []);
  ['low_do_high_temperature', 'low_do_high_tan', 'high_ph_high_tan', 'high_nitrite_low_do', 'low_alkalinity_high_ph_swing', 'plankton_transparency_instability']
    .forEach((id) => assert(!missing.has(id), `missing inputs must not trigger ${id}`));

  const outlierAnalysis = risk(parityFixtures.find((fixture) => fixture.id === 'mbw-outlier')!.pond);
  const outlierMetrics = outlierAnalysis.metrics[0];
  assert(outlierMetrics.latestMbwG === 4, 'raw latest MBW remains unchanged');
  assert(outlierMetrics.smoothedAdgGPerDay === 0.2, 'outlier is excluded from smoothed ADG');
  assert(outlierMetrics.growthConfidence === 'medium', 'outlier lowers growth confidence');
  assert(outlierMetrics.mbwOutlierDates.join(',') === '2026-08-10', 'outlier date is preserved');
  assert(outlierAnalysis.promptPackage.context.includes('2026-08-10'), 'prompt contains the outlier date');
  assert(risk(basePond({})).metrics[0].growthConfidence === 'low', 'fewer than two clean MBW samples have low growth confidence');

  const promptAnalysis = risk(parityFixtures[0].pond);
  const promptMetrics = promptAnalysis.metrics[0];
  const context = promptAnalysis.promptPackage.context;
  const promptPayload = JSON.parse(context.split('ORSON RISK PAYLOAD:\n')[1])[0];
  assert(promptPayload.adg_g_per_day === promptMetrics.adgGPerDay, 'prompt contains exact ADG');
  assert(promptPayload.smoothed_adg_g_per_day === promptMetrics.smoothedAdgGPerDay, 'prompt contains exact smoothed ADG');
  assert(promptPayload.growth_confidence === promptMetrics.growthConfidence, 'prompt contains growth confidence');
  assert(promptPayload.fcr === promptMetrics.fcr, 'prompt contains exact FCR');
  assert(promptPayload.mortality_metrics.latest_percent === promptMetrics.latestMortalityPercent, 'prompt contains exact mortality rate');
  assert(promptPayload.lab_context.latest_metrics, 'prompt contains current lab metrics');
  assert(promptPayload.lab_context.latest_metrics.waterQuality.tanMgL === 1.2, 'prompt contains exact TAN');
  assert(promptPayload.lab_context.latest_metrics.waterQuality.nh3MgL === 0.02, 'prompt contains exact NH3');
  assert(promptPayload.lab_context.latest_metrics.waterQuality.nh4MgL === 0.7, 'prompt contains exact NH4');

  const mortalityPromptAnalysis = risk(parityFixtures.find((fixture) => fixture.id === 'population-scaled-mortality')!.pond);
  const mortalityPromptPayload = JSON.parse(mortalityPromptAnalysis.promptPackage.context.split('ORSON RISK PAYLOAD:\n')[1])[0];
  assert(
    mortalityPromptPayload.mortality_metrics.latest_percent === mortalityPromptAnalysis.metrics[0].latestMortalityPercent,
    'prompt contains exact non-zero mortality rate',
  );

  const comparison = buildOrsonAnalysis(
    [parityFixtures[0].pond, parityFixtures.find((fixture) => fixture.id === 'population-scaled-mortality')!.pond],
    'Compare all ponds',
    NOW,
  ).promptPackage.context;
  assert(comparison.includes('ORSON COMPARATIVE MATRIX:'), 'comparison prompt contains a comparison matrix');
  ['adg_g_per_day', 'smoothed_adg_g_per_day', 'growth_confidence', 'fcr', 'mortality_pct']
    .forEach((key) => assert(comparison.includes(`\"${key}\"`), `comparison prompt contains ${key}`));

  return true;
};
