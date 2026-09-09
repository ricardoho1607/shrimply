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
  const water = records.find(row => value(row.waterDepthCm) > 0);
  const depth = value(water?.waterDepthCm);
  if (current === null || current < 0 || !(area > 0) || !(depth > 0)) return null;
  // Saved depth is a measurement, not an invented standard pond depth.
  // Its suitability as representative depth is explicitly reviewed before release.
  return { pond_id: pondId, pond: pond.pondName || pondId, analyte, basis: 'elemental_mg_L',
    current_mg_L: current, measurement_date: report.sampleDate, volume_m3: area * depth / 100,
    volume_basis: { area_m2: area, measured_depth_cm: depth, date: water.date, requires_representative_depth_confirmation: true },
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
