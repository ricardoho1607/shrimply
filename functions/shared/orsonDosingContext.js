'use strict';
const value = raw => raw == null || String(raw).trim() === '' ? null : Number.isFinite(Number(raw)) ? Number(raw) : null;
const validId = id => typeof id === 'string' && id.length > 0 && id.length <= 160 && !id.includes('/');
const recent = (date, today) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !/^\d{4}-\d{2}-\d{2}$/.test(today || '')) return false;
  const days = (Date.parse(today) - Date.parse(date)) / 86400000;
  return Number.isFinite(days) && days >= 0 && days <= 1;
};
const buildDosingContext = ({ pondId, pond, report, analyte, today }) => {
  if (!pond || pond.cycleStatus === 'ended' || report?.status !== 'confirmed'
    || !recent(report.sampleDate, today) || !['calcium', 'magnesium'].includes(analyte)) return null;
  const result = report.pondResults?.find(row => row.pondId === pondId);
  const key = analyte === 'calcium' ? 'hardnessCa' : 'hardnessMg';
  const expectedBasis = analyte === 'calcium' ? 'Ca' : 'Mg';
  if (result?.measurementUnits?.[key]?.unit !== 'mg/L' || result.measurementUnits[key].basis !== expectedBasis) return null;
  const current = value(result.waterQuality?.[key]);
  const area = value(pond.pondArea);
  const records = (Array.isArray(pond.samplings) ? pond.samplings : []).filter(row => recent(row.date, today))
    .sort((a, b) => b.date.localeCompare(a.date));
  let water = null;
  let depth = null;
  let session = null;
  for (const row of records) {
    const evening = value(row.waterDepthCmEvening);
    const morning = value(row.waterDepthCmMorning);
    const legacy = value(row.waterDepthCm);
    if (evening !== null && evening > 0) {
      water = row;
      depth = evening;
      session = 'evening';
      break;
    }
    if (morning !== null && morning > 0) {
      water = row;
      depth = morning;
      session = 'morning';
      break;
    }
    if (legacy !== null && legacy > 0) {
      water = row;
      depth = legacy;
      session = null;
      break;
    }
  }
  if (current === null || current < 0 || !(area > 0) || !(depth > 0) || !water) return null;
  // Saved depth is a spot measurement, not an invented standard or pond-average depth.
  // Its suitability as representative depth is explicitly reviewed before release;
  // a spot reading never silently authorizes dosing or represents average depth.
  return { pond_id: pondId, pond: pond.pondName || pondId, analyte, basis: 'elemental_mg_L',
    current_mg_L: current, measurement_date: report.sampleDate, volume_m3: area * depth / 100,
    volume_basis: {
      area_m2: area,
      measured_depth_cm: depth,
      date: water.date,
      session: session || null,
      is_spot_reading: true,
      represents_average_depth: false,
      requires_representative_depth_confirmation: true,
    },
    water_records: records.slice(0, 5), lab_result: result, stocking_date: pond.docStart || null,
    species: pond.species || null, source: 'server_firestore' };
};
const loadDosingContext = async ({ db, companyId, pondId, analyte, today }) => {
  if (!validId(companyId) || !validId(pondId)) return null;
  const company = db.collection('companies').doc(companyId);
  const pondRef = company.collection('ponds').doc(pondId);
  const pond = await pondRef.get();
  if (!pond.exists) return null;
  const summaries = await pondRef.collection('labSummaries').orderBy('sampleDate', 'desc').limit(5).get();
  const summary = summaries.docs.find(doc => doc.data().reportType === 'water_quality');
  if (!summary || !validId(summary.id)) return null;
  const report = await company.collection('labReports').doc(summary.id).get();
  if (!report.exists) return null;
  return buildDosingContext({ pondId, pond: pond.data(), report: report.data(), analyte, today });
};
module.exports = { buildDosingContext, loadDosingContext };
