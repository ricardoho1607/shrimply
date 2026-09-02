import test from 'node:test';
import assert from 'node:assert/strict';
import { getEnterprisePondStatus, type EnterprisePond } from './enterpriseBlocks.ts';

const basePond = (overrides: Partial<EnterprisePond> = {}): EnterprisePond => ({
  id: 'pond-enterprise',
  pondName: 'Enterprise Pond',
  pondArea: 1000,
  density: 100,
  initialPopulation: 100000,
  initialWeight: 0.5,
  docStart: '2026-08-01',
  cycleId: 'cycle-current',
  pondCycleId: 'pond-cycle-current',
  samplings: [{
    id: 'sample-1',
    date: '2026-08-19',
    mbw: 4,
    feed: 20,
    mortality: 0,
    doMorning: 5.2,
    phMorning: 7.8,
    phEvening: 8.2,
    salinity: 20,
  }],
  ...overrides,
});

test('shows Orson warning findings as orange Enterprise status', () => {
  const pond = basePond({
    samplings: [{
      id: 'warning-sample',
      date: '2026-08-19',
      mbw: 4,
      feed: 20,
      mortality: 0,
      doMorning: 4.8,
      temperature: 31,
      phMorning: 7.8,
      phEvening: 8.2,
      salinity: 20,
    }],
  });
  const status = getEnterprisePondStatus(pond);
  const warning = status.warnings.find((item) => item.code === 'low_do_high_temperature');
  assert.equal(status.risk, 'warning');
  assert.equal(warning?.severity, 'warning');
});

test('shows the SIM-B1 water-quality record as a warning', () => {
  const pond = basePond({
    id: 'sim-b1',
    pondName: 'SIM-B1',
    samplings: [{
      id: 'sim-b1-water',
      date: '2026-09-01',
      mbw: 4,
      feed: 0,
      mortality: 0,
      doMorning: 4.7,
      doEvening: 5.8,
      ammonia: 0.06,
      weatherEvent: 'heavy_rain',
      waterExchangePercent: 8,
      sludgeLoad: 'moderate',
      surfaceScum: false,
      shrimpBehaviour: 'abnormal',
    }],
  });
  const status = getEnterprisePondStatus(pond);

  assert.equal(status.risk, 'warning');
  assert.equal(status.warnings.some((item) => item.code === 'low_do'), true);
  assert.equal(status.warnings.some((item) => item.code === 'ammonia_elevated'), false);
  assert.equal(status.warnings.some((item) => item.code === 'abnormal_shrimp_behaviour'), true);
});

test('keeps healthy September 2 TAN readings normal', () => {
  for (const ammonia of [0.03, 0.04]) {
    const pond = basePond({
      samplings: [{
        id: `healthy-tan-${ammonia}`,
        date: '2026-09-02',
        mbw: 4,
        feed: 20,
        mortality: 0,
        doMorning: 5.2,
        doEvening: 6,
        phMorning: 7.8,
        phEvening: 8.2,
        salinity: 20,
        ammonia,
      }],
    });
    const status = getEnterprisePondStatus(pond);

    assert.equal(status.risk, 'stable');
    assert.equal(status.warnings.some((item) => item.code === 'ammonia_elevated'), false);
  }
});

test('uses actionable field TAN warning and critical thresholds', () => {
  const statusForTan = (ammonia: number) => getEnterprisePondStatus(basePond({
    samplings: [{
      id: `elevated-tan-${ammonia}`,
      date: '2026-09-02',
      mbw: 4,
      feed: 20,
      mortality: 0,
      doMorning: 5.2,
      doEvening: 6,
      phMorning: 7.8,
      phEvening: 8.2,
      salinity: 20,
      ammonia,
    }],
  }));

  assert.equal(statusForTan(1).risk, 'warning');
  assert.equal(statusForTan(2).risk, 'warning');
  assert.equal(statusForTan(2.01).risk, 'high-risk');
});

test('shows Orson critical findings as red Enterprise status', () => {
  const pond = basePond({
    samplings: [{
      id: 'critical-sample',
      date: '2026-08-19',
      mbw: 4,
      feed: 20,
      mortality: 0,
      doMorning: 3.8,
      phMorning: 7.8,
      phEvening: 8.7,
      salinity: 20,
    }],
    latestLabStatus: {
      labReportId: 'lab-current',
      reportType: 'water_quality',
      sampleDate: '2026-08-19',
      status: 'warning',
      cycleId: 'cycle-current',
      pondCycleId: 'pond-cycle-current',
      metrics: {
        schemaVersion: 2,
        waterQuality: { date: '2026-08-19', tanMgL: 1.2 },
        microbiology: null,
        plankton: null,
      },
    } as EnterprisePond['latestLabStatus'],
  });
  const status = getEnterprisePondStatus(pond);
  const critical = status.warnings.find((item) => item.code === 'low_do_high_tan');
  assert.equal(status.risk, 'high-risk');
  assert.equal(critical?.severity, 'critical');
});

test('does not promote Orson watch findings to orange or red', () => {
  const pond = basePond({
    samplings: [{
      id: 'watch-sample',
      date: '2026-08-19',
      mbw: 4,
      feed: 20,
      mortality: 0,
      doMorning: 5.2,
      phMorning: 7.8,
      phEvening: 8.4,
      transparency: 20,
      salinity: 20,
    }],
  });
  const status = getEnterprisePondStatus(pond);
  assert.equal(status.risk, 'stable');
  assert.equal(status.warnings.some((item) => item.code === 'plankton_transparency_instability'), false);
});

test('keeps the existing one-percent mortality critical status', () => {
  const pond = basePond({
    mortalityRecords: [{
      id: 'mortality-1',
      date: '2026-08-19',
      observationType: 'estimated_total',
      count: 1100,
      pondCycleId: 'pond-cycle-current',
    }],
  });
  const status = getEnterprisePondStatus(pond);
  const mortality = status.warnings.find((item) => item.code === 'mortality');
  assert.equal(status.risk, 'high-risk');
  assert.equal(mortality?.severity, 'critical');
});
