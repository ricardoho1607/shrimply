import assert from 'node:assert/strict';
import test from 'node:test';
import { localizePdfText } from './pdfReportI18n.ts';

const noOverwatchResult = 'No Plankton Overwatch result was available for the selected ponds. Missing observations were not treated as stable.';
const oneHighRiskPond = '1 pond shows high-risk indicators such as low survival, elevated FCR, flat growth, or high mortality.';
const savedOverwatchResult = 'Plankton Overwatch: A1 HIGH; A2 STABLE. No high or critical plankton state is currently saved for the selected ponds.';

test('sampling risk text is fully localized without mixed English pond wording', () => {
  const expected = {
    en: {
      noOverwatchResult,
      oneHighRiskPond,
    },
    id: {
      noOverwatchResult: 'Tidak tersedia hasil Pengawasan Plankton untuk kolam yang dipilih. Pengamatan yang tidak tersedia tidak dianggap stabil.',
      oneHighRiskPond: '1 kolam menunjukkan indikator risiko tinggi seperti kelangsungan hidup rendah, FCR tinggi, pertumbuhan datar, atau mortalitas tinggi.',
    },
    th: {
      noOverwatchResult: 'ไม่มีผลการเฝ้าระวังแพลงก์ตอนสำหรับบ่อที่เลือก ข้อมูลสังเกตการณ์ที่ขาดหายไม่ได้ถือว่ามีเสถียรภาพ',
      oneHighRiskPond: '1 บ่อแสดงตัวชี้วัดความเสี่ยงสูง เช่น อัตรารอดต่ำ FCR สูง การเติบโตคงที่ หรือการตายสูง',
    },
    vi: {
      noOverwatchResult: 'Không có kết quả Giám sát Sinh vật phù du cho các ao đã chọn. Các quan sát còn thiếu không được xem là ổn định.',
      oneHighRiskPond: '1 ao có chỉ báo rủi ro cao như tỷ lệ sống thấp, FCR cao, tăng trưởng chậm hoặc tỷ lệ chết cao.',
    },
    zh: {
      noOverwatchResult: '所选池塘没有浮游生物监测结果。缺失的观测不会被视为稳定。',
      oneHighRiskPond: '1 个池塘显示高风险指标，例如成活率低、FCR 偏高、生长停滞或死亡率高。',
    },
  } as const;

  for (const [language, copy] of Object.entries(expected)) {
    assert.equal(localizePdfText(noOverwatchResult, language), copy.noOverwatchResult, language);
    assert.equal(localizePdfText(oneHighRiskPond, language), copy.oneHighRiskPond, language);
  }
});

test('Indonesian PDF terminology distinguishes ponds from farms', () => {
  assert.equal(localizePdfText('Pond', 'id'), 'Kolam');
  assert.equal(localizePdfText('Pond Name', 'id'), 'Nama Kolam');
  assert.equal(localizePdfText('Pond Performance Summary', 'id'), 'Ringkasan Kinerja Kolam');
  assert.equal(localizePdfText('Farm', 'id'), 'Tambak');
});

test('cycle report average MBW copy is localized', () => {
  assert.equal(localizePdfText('Average MBW', 'id'), 'MBW Rata-rata');
  assert.equal(
    localizePdfText('Biomass-weighted average across all Partial and Final Harvest records.', 'id'),
    'Rata-rata tertimbang biomassa dari seluruh catatan Panen Parsial dan Final.',
  );
  for (const language of ['th', 'vi', 'zh']) {
    assert.notEqual(localizePdfText('Average MBW', language), 'Average MBW');
    assert.doesNotMatch(
      localizePdfText('Biomass-weighted average across all Partial and Final Harvest records.', language),
      /Biomass-weighted|Partial|Final Harvest/,
    );
  }
});

test('cycle report executive dashboard headings are localized', () => {
  const phrases = [
    'Executive performance snapshot',
    'Previous cycle comparison',
    'Priority review and next action',
    'Recent MBW movement',
    'Data quality and assumptions',
  ];
  for (const language of ['id', 'th', 'vi', 'zh'] as const) {
    phrases.forEach((phrase) => assert.notEqual(localizePdfText(phrase, language), phrase));
  }
});

test('cycle report comparison and action copy has no English leaks', () => {
  const cases = [
    ['Metric', /\bMetric\b/],
    ['Current', /\bCurrent\b/],
    ['Previous', /\bPrevious\b/],
    ['Change', /\bChange\b/],
    ['Yield', /\bYield\b/],
    ['Current vs Cycle 2', /\bCurrent vs\b/],
    ['Closure review', /\bClosure review\b/],
    ['1 non-harvest closure recorded.', /\bnon-harvest closure\b/],
    ['2 non-harvest closures recorded.', /\bnon-harvest closures\b/],
    ['Review the recorded cause and prevention steps before the next stocking.', /\brecorded cause|prevention steps|next stocking\b/],
    ['Feed efficiency', /\bFeed efficiency\b/],
    ['2 ponds exceeded the 1.80 FCR review level.', /\bponds exceeded|review level\b/],
    ['Check feed logs, biomass estimates, and harvest linkage.', /\bfeed logs|biomass estimates|harvest linkage\b/],
    ['Survival review', /\bSurvival review\b/],
    ['1 pond finished below 75% actual survival.', /\bpond finished below|actual survival\b/],
    ['85% of ponds have valid MBW sampling.', /\bof ponds have valid\b/],
    ['Complete missing MBW records before comparing growth performance.', /\bmissing MBW records|growth performance\b/],
    ['Profitability review', /\bProfitability review\b/],
    ['Recorded cycle costs exceeded recorded harvest revenue.', /\bcycle costs exceeded|harvest revenue\b/],
    ['Reconcile selling prices and every cycle-linked expense.', /\bReconcile selling prices|cycle-linked expense\b/],
    ['No major review flags', /\bNo major review flags\b/],
    ['The available records did not trigger the cycle screening checks.', /\bavailable records|cycle screening checks\b/],
    ['Confirm results against farm targets before the next stocking decision.', /\bConfirm results|farm targets|stocking decision\b/],
    ['21.00 g to 24.00 g', /\bg to\b/],
    ['40.54 t/ha yield', /\byield\b/],
    ['No valid MBW trend', /\bNo valid MBW trend\b/],
    ['Pond Performance - Continued', /\bPond Performance|Continued\b/],
  ] as const;

  for (const language of ['id', 'th', 'vi', 'zh'] as const) {
    cases.forEach(([text, englishLeak]) => {
      assert.doesNotMatch(localizePdfText(text, language), englishLeak, `${language}: ${text}`);
    });
  }
});

test('saved Overwatch statuses and summary are localized together', () => {
  assert.equal(
    localizePdfText(savedOverwatchResult, 'id'),
    'Pengawasan Plankton: A1 TINGGI; A2 STABIL. Saat ini tidak ada status plankton tinggi atau kritis yang tersimpan untuk kolam yang dipilih.',
  );
  for (const language of ['th', 'vi', 'zh']) {
    const localized = localizePdfText(savedOverwatchResult, language);
    assert.doesNotMatch(localized, /Plankton Overwatch|\bHIGH\b|\bSTABLE\b|No high or critical/);
  }
});
