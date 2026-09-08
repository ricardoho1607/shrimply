const { canonicalLabValue, labMeasurementWarnings } = require('./shared/labMeasurementContract');
const { STATE_RANK, evaluatePlanktonOverwatch } = require("./planktonOverwatch");

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toTimestamp = (value) => {
  const parsed = new Date(value || 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const hasAnyValue = (record, fields) => fields.some((field) => (
  record[field] !== null && record[field] !== undefined && record[field] !== ""
));

const extractLabMetrics = (result = {}, sampleDate = null) => {
  const plankton = result.plankton && typeof result.plankton === "object" ? result.plankton : {};
  const microbiology = result.microbiology && typeof result.microbiology === "object" ? result.microbiology : {};
  const planktonMetrics = {
    date: sampleDate,
    totalCellPerMl: toNumber(plankton.totalCellPerMl),
    beneficialCellPerMl: toNumber(plankton.beneficialCellPerMl),
    harmfulCellPerMl: toNumber(plankton.harmfulCellPerMl),
    greenAlgaeCellPerMl: toNumber(plankton.chlorophytaCellPerMl),
    greenAlgaePercent: toNumber(plankton.chlorophytaPercent),
    cyanobacteriaCellPerMl: toNumber(plankton.cyanophytaCellPerMl),
    cyanobacteriaPercent: toNumber(plankton.cyanophytaPercent),
    diatomCellPerMl: toNumber(plankton.diatomCellPerMl),
    diatomPercent: toNumber(plankton.diatomPercent),
    dinoflagellataCellPerMl: toNumber(plankton.dinoflagellataCellPerMl),
    dinoflagellataPercent: toNumber(plankton.dinoflagellataPercent),
  };
  const waterQualityMetrics = {
    date: sampleDate,
    salinityPpt: canonicalLabValue(result, 'salinityLab') ?? canonicalLabValue(result, 'salinityCustomer'),
    alkalinityMgL: canonicalLabValue(result, 'alkalinityTotal'),
    tanMgL: canonicalLabValue(result, 'tan'),
    nh3MgL: canonicalLabValue(result, 'nh3'),
    nh4MgL: canonicalLabValue(result, 'nh4'),
    nitriteMgL: canonicalLabValue(result, 'no2'),
    phosphateMgL: result.measurementUnits?.phosphate?.unit === 'mg/L' ? toNumber(result.waterQuality?.phosphate) : null,
    tomMgL: canonicalLabValue(result, 'tom'),
    calciumHardnessMgLCaCO3: canonicalLabValue(result, 'hardnessCa'),
    magnesiumHardnessMgLCaCO3: canonicalLabValue(result, 'hardnessMg'),
    totalHardnessMgLCaCO3: canonicalLabValue(result, 'hardnessTotal'),
  };
  const microbiologyMetrics = {
    date: sampleDate,
    vibrioYellow: toNumber(microbiology.vibrioYellow),
    vibrioGreen: toNumber(microbiology.vibrioGreen),
    vibrioTotal: toNumber(microbiology.vibrioTotal),
    tbc: toNumber(microbiology.tbc),
  };

  return {
    schemaVersion: 2,
    measurementSchemaVersion: 1,
    measurementWarnings: labMeasurementWarnings(result),
    measurementUnits: result.measurementUnits || {},
    plankton: hasAnyValue(planktonMetrics, [
      "totalCellPerMl",
      "greenAlgaePercent",
      "cyanobacteriaPercent",
      "diatomPercent",
      "dinoflagellataPercent",
    ]) ? planktonMetrics : null,
    waterQuality: hasAnyValue(waterQualityMetrics, [
      "salinityPpt",
      "alkalinityMgL",
      "tanMgL",
      "nh3MgL",
      "nh4MgL",
      "nitriteMgL",
      "phosphateMgL",
      "tomMgL",
      "calciumHardnessMgLCaCO3",
      "magnesiumHardnessMgLCaCO3",
      "totalHardnessMgLCaCO3",
    ]) ? waterQualityMetrics : null,
    microbiology: hasAnyValue(microbiologyMetrics, [
      "vibrioYellow",
      "vibrioGreen",
      "vibrioTotal",
      "tbc",
    ]) ? microbiologyMetrics : null,
  };
};

const getPondCycleId = (pond = {}, pondId = null) => pond.pondCycleId || pondId || pond.id || null;

const belongsToCurrentCycle = (record = {}, pond = {}, pondId = null) => {
  const currentPondCycleId = getPondCycleId(pond, pondId);
  if (record.pondCycleId && currentPondCycleId) return record.pondCycleId === currentPondCycleId;
  if (record.cycleId && pond.cycleId) return record.cycleId === pond.cycleId;

  const cycleStart = toTimestamp(pond.cycleStartedAt || pond.docStart);
  const recordDate = toTimestamp(record.sampleDate || record.date);
  return cycleStart === 0 || recordDate === 0 || recordDate >= cycleStart;
};

const dedupeBySource = (records) => {
  const bySource = new Map();
  records.forEach((record, index) => {
    const key = record.sourceId || `${record.date || "undated"}:${index}`;
    bySource.set(key, record);
  });
  return [...bySource.values()];
};

const buildPlanktonOverwatchInput = ({ pond = {}, pondId = null, labSummaries = [], currentLabMetrics = null }) => {
  const scopedSummaries = (Array.isArray(labSummaries) ? labSummaries : [])
    .filter((summary) => belongsToCurrentCycle(summary, pond, pondId));
  const planktonRecords = [];
  const labWaterRecords = [];

  scopedSummaries.forEach((summary) => {
    const metrics = summary.metrics && typeof summary.metrics === "object" ? summary.metrics : {};
    if (metrics.plankton) {
      planktonRecords.push({
        ...metrics.plankton,
        date: metrics.plankton.date || summary.sampleDate || null,
        sourceId: summary.labReportId || summary.id || null,
      });
    }
    if (metrics.waterQuality) {
      labWaterRecords.push({
        ...metrics.waterQuality,
        date: metrics.waterQuality.date || summary.sampleDate || null,
        sourceId: summary.labReportId || summary.id || null,
      });
    }
  });

  if (currentLabMetrics?.plankton) {
    planktonRecords.push({
      ...currentLabMetrics.plankton,
      sourceId: currentLabMetrics.sourceId || null,
    });
  }
  if (currentLabMetrics?.waterQuality) {
    labWaterRecords.push({
      ...currentLabMetrics.waterQuality,
      sourceId: currentLabMetrics.sourceId || null,
    });
  }

  const samplings = (Array.isArray(pond.samplings) ? pond.samplings : [])
    .filter((record) => belongsToCurrentCycle(record, pond, pondId));
  const waterQualityRecords = samplings
    .filter((record) => hasAnyValue(record, [
      "doMorning",
      "doEvening",
      "phMorning",
      "phEvening",
      "transparency",
      "temperature",
      "weatherEvent",
      "waterExchangePercent",
      "sludgeLoad",
      "surfaceScum",
      "shrimpBehaviour",
    ]))
    .map((record) => ({
      date: record.date || null,
      doMorning: record.doMorning,
      doEvening: record.doEvening,
      phMorning: record.phMorning,
      phEvening: record.phEvening,
      transparency: record.transparency,
      temperature: record.temperature,
      salinity: record.salinity,
      weatherEvent: record.weatherEvent,
      waterExchangePercent: record.waterExchangePercent,
      sludgeLoad: record.sludgeLoad,
      surfaceScum: record.surfaceScum,
      shrimpBehaviour: record.shrimpBehaviour,
      sourceId: record.id || null,
    }));
  const feedRecords = samplings
    .filter((record) => record.feedData && typeof record.feedData === "object")
    .map((record) => ({
      date: record.date || null,
      feedData: record.feedData,
      sourceId: record.id || null,
    }));

  const mortalityRecords = [
    ...samplings
      .filter((record) => toNumber(record.mortality) > 0)
      .map((record) => ({ date: record.date, count: toNumber(record.mortality) })),
    ...(Array.isArray(pond.mortalityRecords) ? pond.mortalityRecords : [])
      .filter((record) => belongsToCurrentCycle(record, pond, pondId))
      .map((record) => ({ date: record.date || record.recordedAt, count: toNumber(record.count) }))
      .filter((record) => record.count !== null && record.count > 0),
  ].sort((left, right) => toTimestamp(left.date) - toTimestamp(right.date));
  const latestMortality = mortalityRecords[mortalityRecords.length - 1]?.count ?? null;

  return {
    initialPopulation: pond.initialPopulation ?? pond.initialStock ?? null,
    latestMortality,
    planktonRecords: dedupeBySource(planktonRecords),
    waterQualityRecords: dedupeBySource([...waterQualityRecords, ...labWaterRecords]),
    feedRecords,
  };
};

const getOverwatchRiskSignature = (result) => {
  const signalIds = (Array.isArray(result?.signals) ? result.signals : [])
    .map((signal) => signal.id)
    .filter(Boolean)
    .sort();
  return `${result?.state || "insufficient"}:${signalIds.join("|")}`;
};

const evaluatePondPlanktonOverwatch = (options) => {
  const input = buildPlanktonOverwatchInput(options);
  if (input.planktonRecords.length === 0) return null;
  return evaluatePlanktonOverwatch(input);
};

const shouldNotifyPlanktonOverwatch = (previous, current) => {
  if (!current || !["watch", "high", "critical"].includes(current.state)) return false;
  const previousRank = STATE_RANK[previous?.state] || 0;
  const currentRank = STATE_RANK[current.state] || 0;
  const changedSignature = previous?.riskSignature !== current.riskSignature;
  if (current.state === "watch") return previousRank < STATE_RANK.watch;
  if (current.state === "high") return previousRank < STATE_RANK.high || changedSignature;
  return previousRank < STATE_RANK.critical || changedSignature;
};

const buildStoredOverwatch = ({ result, pond = {}, pondId, sourceType, sourceId, sourceDate }) => {
  if (!result) return null;
  return {
    ...result,
    pondId,
    pondName: pond.pondName || pond.name || "Unnamed pond",
    cycleId: pond.cycleId || null,
    cycleName: pond.cycleName || null,
    pondCycleId: getPondCycleId(pond, pondId),
    sourceType,
    sourceId,
    sourceDate: sourceDate || result.sourceDates?.plankton || result.sourceDates?.waterQuality || null,
    riskSignature: getOverwatchRiskSignature(result),
  };
};

const getOverwatchNotificationCopy = (snapshot) => {
  const pondName = snapshot?.pondName || "Pond";
  const titles = {
    watch: `${pondName} — Plankton Watch`,
    high: `${pondName} — High Plankton Risk`,
    critical: `${pondName} — Critical Oxygen Risk`,
  };
  return {
    title: titles[snapshot.state] || `${pondName} — Plankton Overwatch`,
    message: `${snapshot.message}${snapshot.recommendations?.[0] ? ` ${snapshot.recommendations[0]}` : ""}`,
    priority: snapshot.state === "critical" ? "high" : snapshot.state === "high" ? "high" : "medium",
  };
};

module.exports = {
  belongsToCurrentCycle,
  buildPlanktonOverwatchInput,
  buildStoredOverwatch,
  evaluatePondPlanktonOverwatch,
  extractLabMetrics,
  getOverwatchNotificationCopy,
  getOverwatchRiskSignature,
  shouldNotifyPlanktonOverwatch,
};
