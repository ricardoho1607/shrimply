import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDailyOperationsReport, generateDailyOperationsReportHTML } from './dailyOperationsReport.ts';

test('builds shift totals, cumulative Sipon, population, and water-quality rows', () => {
  const report = buildDailyOperationsReport({
    companyName: 'Test Farm',
    reportDate: '2026-09-02',
    generatedBy: 'Operator',
    ponds: [{
      id: 'pond-1',
      pondName: 'C1',
      blockName: 'Block C',
      docStart: '2026-08-06',
      pondArea: 2500,
      initialPopulation: 500000,
      totalHarvestedPopulation: 10,
      pondCycleId: 'cycle-1',
      mortalityRecords: [
        { date: '2026-09-01', count: 3, siponShift: 'morning', siphonedCount: 1, mortalCount: 2, pondCycleId: 'cycle-1' },
        { date: '2026-09-02', count: 9, siponShift: 'morning', siphonedCount: 4, mortalCount: 5, pondCycleId: 'cycle-1' },
        { date: '2026-09-02', count: 2, siponShift: 'evening', siphonedCount: 2, mortalCount: 0, pondCycleId: 'cycle-1' },
        { date: '2026-09-02', count: 99, siponShift: 'morning', siphonedCount: 99, mortalCount: 0, pondCycleId: 'old-cycle' },
      ],
      samplings: [{
        date: '2026-09-02',
        phMorning: '7.56',
        temperature: '26.4',
        waterAppearance: 'CH',
        waterDepthCm: '150',
        transparency: '40',
        salinity: '30.4',
        alkalinity: '204',
        waterQualityRecordedByName: 'Akmal',
        pondCycleId: 'cycle-1',
      }],
    }],
  });

  assert.equal(report.siponRows.length, 1);
  assert.deepEqual(report.siponRows[0], {
    pondName: 'C1',
    blockName: 'Block C',
    doc: 27,
    morningSiphoned: 4,
    morningMortal: 5,
    morningTotal: 9,
    eveningSiphoned: 2,
    eveningMortal: 0,
    eveningTotal: 2,
    dailyTotal: 11,
    cumulativeTotal: 14,
    estimatedPopulation: 499976,
    density: 199.9904,
    hasUnclassifiedData: false,
  });
  assert.equal(report.waterQualityRows[0].recordedBy, 'Akmal');
  assert.equal(report.waterQualityRows[0].alkalinity, '204');
});

test('keeps legacy mortality in totals without inventing a shift', () => {
  const report = buildDailyOperationsReport({
    companyName: 'Test Farm',
    reportDate: '2026-09-02',
    generatedBy: 'Operator',
    ponds: [{
      id: 'pond-1',
      pondName: 'K1',
      initialPopulation: 1000,
      mortalityRecords: [{ date: '2026-09-02', count: 5 }],
    }],
  });

  assert.equal(report.siponRows[0].morningTotal, 0);
  assert.equal(report.siponRows[0].eveningTotal, 0);
  assert.equal(report.siponRows[0].dailyTotal, 5);
  assert.equal(report.siponRows[0].hasUnclassifiedData, true);
});

test('renders the exported report in the selected language', () => {
  const report = buildDailyOperationsReport({
    companyName: 'Tambak Uji',
    reportDate: '2026-09-02',
    generatedBy: 'Operator',
    ponds: [],
  });
  const html = generateDailyOperationsReportHTML(report, { backgroundBase64: '', logoBase64: '' }, 'id');

  assert.match(html, /Laporan Sipon Harian/);
  assert.match(html, /Laporan Kualitas Air Harian/);
  assert.match(html, /Tidak ada kolam yang tersedia/);
});

test('uses the standard Shrimply landscape PDF shell', () => {
  const report = buildDailyOperationsReport({
    companyName: 'Test Farm',
    reportDate: '2026-09-02',
    generatedBy: 'Operator',
    ponds: [],
  });
  const html = generateDailyOperationsReportHTML(report, { backgroundBase64: 'background', logoBase64: 'logo' });

  assert.match(html, /class="page-bg"/);
  assert.match(html, /class="report-shell"/);
  assert.match(html, /class="header-logo"/);
  assert.match(html, /class="divider"/);
  assert.match(html, /Page 1 of 2/);
  assert.match(html, /Page 2 of 2/);
});
