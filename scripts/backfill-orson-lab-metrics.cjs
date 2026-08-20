#!/usr/bin/env node

const admin = require("../functions/firebaseAdmin");

const SCHEMA_VERSION = 2;
const READ_LIMIT_PER_POND = 100;
const WRITE_BATCH_LIMIT = 400;

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toDateKey = (value) => {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : value.slice(0, 10);
};

const stableStringify = (value) => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
};

const hasMetric = (record) => Object.entries(record).some(([key, value]) => key !== "date" && value !== null);

const normalizeMetrics = (value, sampleDate) => {
  if (!value || typeof value !== "object") return null;
  const water = value.waterQuality && typeof value.waterQuality === "object" ? value.waterQuality : {};
  const microbiology = value.microbiology && typeof value.microbiology === "object" ? value.microbiology : {};
  const plankton = value.plankton && typeof value.plankton === "object" ? value.plankton : {};
  const isVersionTwo = toNumber(value.schemaVersion) === SCHEMA_VERSION;
  const waterQuality = {
    date: toDateKey(water.date) || sampleDate,
    salinityPpt: toNumber(water.salinityPpt),
    alkalinityMgL: toNumber(water.alkalinityMgL ?? water.alkalinityTotal),
    tanMgL: isVersionTwo ? toNumber(water.tanMgL ?? water.tan) : toNumber(water.tan),
    nh3MgL: toNumber(water.nh3MgL ?? water.nh3),
    nh4MgL: toNumber(water.nh4MgL ?? water.nh4 ?? (isVersionTwo ? null : water.tanMgL)),
    nitriteMgL: toNumber(water.nitriteMgL ?? water.nitrite ?? water.no2),
    tomMgL: toNumber(water.tomMgL ?? water.tom),
  };
  const micro = {
    date: toDateKey(microbiology.date) || sampleDate,
    vibrioYellow: toNumber(microbiology.vibrioYellow),
    vibrioGreen: toNumber(microbiology.vibrioGreen),
    vibrioTotal: toNumber(microbiology.vibrioTotal),
    tbc: toNumber(microbiology.tbc),
  };
  const planktonMetrics = {
    date: toDateKey(plankton.date) || sampleDate,
    totalCellPerMl: toNumber(plankton.totalCellPerMl),
    beneficialCellPerMl: toNumber(plankton.beneficialCellPerMl),
    harmfulCellPerMl: toNumber(plankton.harmfulCellPerMl),
    greenAlgaeCellPerMl: toNumber(plankton.greenAlgaeCellPerMl),
    greenAlgaePercent: toNumber(plankton.greenAlgaePercent),
    cyanobacteriaCellPerMl: toNumber(plankton.cyanobacteriaCellPerMl),
    cyanobacteriaPercent: toNumber(plankton.cyanobacteriaPercent),
    diatomCellPerMl: toNumber(plankton.diatomCellPerMl),
    diatomPercent: toNumber(plankton.diatomPercent),
    dinoflagellataCellPerMl: toNumber(plankton.dinoflagellataCellPerMl),
    dinoflagellataPercent: toNumber(plankton.dinoflagellataPercent),
  };
  const normalized = {
    schemaVersion: SCHEMA_VERSION,
    waterQuality: hasMetric(waterQuality) ? waterQuality : null,
    microbiology: hasMetric(micro) ? micro : null,
    plankton: hasMetric(planktonMetrics) ? planktonMetrics : null,
  };
  return normalized.waterQuality || normalized.microbiology || normalized.plankton ? normalized : null;
};

const belongsToCurrentCycle = (summary, pond, pondId) => {
  const pondCycleId = pond.pondCycleId || pondId;
  if (summary.pondCycleId && pondCycleId) return summary.pondCycleId === pondCycleId;
  if (summary.cycleId && pond.cycleId) return summary.cycleId === pond.cycleId;
  const cycleStart = toDateKey(pond.cycleStartedAt || pond.docStart);
  const sampleDate = toDateKey(summary.sampleDate);
  return !cycleStart || !sampleDate || sampleDate >= cycleStart;
};

const buildStatus = (summary, pond, pondId) => {
  const sampleDate = toDateKey(summary.sampleDate);
  const metrics = normalizeMetrics(summary.metrics, sampleDate);
  if (!metrics) return null;
  return {
    labReportId: summary.labReportId || summary.id || null,
    reportType: summary.reportType || null,
    sampleDate,
    status: ["good", "info", "watch", "warning", "critical"].includes(summary.status) ? summary.status : null,
    mainIssue: typeof summary.mainIssue === "string" ? summary.mainIssue.slice(0, 300) : null,
    keyRisks: Array.isArray(summary.keyRisks) ? summary.keyRisks.filter(Boolean).map(String).slice(0, 4) : [],
    recommendations: Array.isArray(summary.recommendations) ? summary.recommendations.filter(Boolean).map(String).slice(0, 3) : [],
    cycleId: summary.cycleId || pond.cycleId || null,
    pondCycleId: summary.pondCycleId || pond.pondCycleId || pondId,
    metrics,
  };
};

const comparableStatus = (value) => {
  if (!value || typeof value !== "object") return null;
  const { updatedAt: _updatedAt, byType, ...rest } = value;
  return {
    ...rest,
    byType: byType && typeof byType === "object"
      ? Object.fromEntries(Object.entries(byType).map(([key, status]) => [key, comparableStatus(status)]))
      : {},
  };
};

async function main() {
  const apply = process.argv.includes("--apply");
  const companyArg = process.argv.find((value) => value.startsWith("--company="));
  const companyFilter = companyArg ? companyArg.slice("--company=".length).trim() : null;
  admin.initializeApp();
  const db = admin.firestore();
  const companyDocs = companyFilter
    ? await db.collection("companies").doc(companyFilter).get().then((document) => document.exists ? [document] : [])
    : await db.collection("companies").get().then((snapshot) => snapshot.docs);
  const pendingWrites = [];
  const summary = {
    mode: apply ? "apply" : "dry-run",
    schemaVersion: SCHEMA_VERSION,
    companiesScanned: 0,
    companiesToUpdate: 0,
    pondsScanned: 0,
    labDocumentsScanned: 0,
    pondsWithLabMetrics: 0,
    pondsAlreadyCurrent: 0,
    pondsToUpdate: 0,
    pondDocumentsToUpdate: 0,
    truncatedPondHistories: 0,
  };

  for (const companyDoc of companyDocs) {
    summary.companiesScanned += 1;
    let companyNeedsUpdate = false;
    const pondsSnapshot = await companyDoc.ref.collection("ponds").get();
    for (const pondDoc of pondsSnapshot.docs) {
      summary.pondsScanned += 1;
      const pond = pondDoc.data() || {};
      const labSnapshot = await pondDoc.ref.collection("labSummaries")
        .orderBy("sampleDate", "desc")
        .limit(READ_LIMIT_PER_POND)
        .get();
      summary.labDocumentsScanned += labSnapshot.size;
      if (labSnapshot.size === READ_LIMIT_PER_POND) summary.truncatedPondHistories += 1;
      const statuses = labSnapshot.docs
        .map((document) => ({ id: document.id, ...(document.data() || {}) }))
        .filter((record) => belongsToCurrentCycle(record, pond, pondDoc.id))
        .map((record) => buildStatus(record, pond, pondDoc.id))
        .filter(Boolean)
        .sort((a, b) => String(b.sampleDate || "").localeCompare(String(a.sampleDate || "")));
      if (statuses.length === 0) continue;
      summary.pondsWithLabMetrics += 1;
      const byType = {};
      for (const status of statuses) {
        const key = status.reportType || "unknown";
        if (!byType[key]) byType[key] = status;
      }
      const desired = { ...statuses[0], byType, metricsSchemaVersion: SCHEMA_VERSION };
      if (stableStringify(comparableStatus(pond.latestLabStatus)) === stableStringify(comparableStatus(desired))) {
        summary.pondsAlreadyCurrent += 1;
        continue;
      }
      summary.pondsToUpdate += 1;
      summary.pondDocumentsToUpdate += 1;
      companyNeedsUpdate = true;
      pendingWrites.push({ ref: pondDoc.ref, latestLabStatus: desired });
    }
    if (companyNeedsUpdate) summary.companiesToUpdate += 1;
  }

  if (apply) {
    for (let index = 0; index < pendingWrites.length; index += WRITE_BATCH_LIMIT) {
      const batch = db.batch();
      pendingWrites.slice(index, index + WRITE_BATCH_LIMIT).forEach(({ ref, latestLabStatus }) => {
        batch.set(ref, {
          latestLabStatus: {
            ...latestLabStatus,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      });
      await batch.commit();
    }
  }

  console.log(JSON.stringify(summary, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : error);
    process.exitCode = 1;
  });
}

module.exports = {
  SCHEMA_VERSION,
  belongsToCurrentCycle,
  buildStatus,
  comparableStatus,
  normalizeMetrics,
};
