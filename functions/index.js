const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

admin.initializeApp();

const DAY_MS = 1000 * 60 * 60 * 24;
const SEVERITY_RANK = { info: 0, watch: 1, warning: 2, critical: 3 };

const toNumber = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.replace(/,/g, "").replace(/%$/, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const round = (value, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const minKnown = (...values) => {
  const known = values.filter((value) => typeof value === "number" && Number.isFinite(value));
  return known.length > 0 ? Math.min(...known) : null;
};

const getFeedRatePercent = (mbw) => {
  if (!Number.isFinite(mbw) || mbw <= 0) return null;
  const table = [
    { mbw: 1.65, fr: 6.5 },
    { mbw: 3, fr: 6.5 },
    { mbw: 5, fr: 5.5 },
    { mbw: 7.5, fr: 4.2 },
    { mbw: 10.5, fr: 3.6 },
    { mbw: 14, fr: 3.3 },
    { mbw: 17.5, fr: 3.1 },
    { mbw: 21, fr: 2.9 },
    { mbw: 25, fr: 2.7 },
    { mbw: 29, fr: 2.5 },
    { mbw: 33, fr: 2.3 },
  ];
  if (mbw > 33) return 2.1;
  for (let index = 0; index < table.length - 1; index += 1) {
    const current = table[index];
    const next = table[index + 1];
    if (mbw <= current.mbw) return current.fr;
    if (mbw >= current.mbw && mbw <= next.mbw) {
      const ratio = (mbw - current.mbw) / (next.mbw - current.mbw);
      return current.fr + ratio * (next.fr - current.fr);
    }
  }
  return table[table.length - 1].fr;
};

const normalizeRecord = (record) => {
  const feedData = record.feedData && typeof record.feedData === "object" ? record.feedData : null;
  const trayValues = [];
  for (let index = 1; index <= 10; index += 1) {
    const value = toNumber(feedData?.[`anco${index}`]);
    if (value !== null) trayValues.push(value);
  }
  const trayClearance = trayValues.length > 0
    ? trayValues.reduce((sum, value) => sum + value, 0) / trayValues.length
    : toNumber(feedData?.ancoPercentage);

  return {
    id: record.id || null,
    date: record.date || null,
    mbwG: toNumber(record.mbw ?? record.abw),
    mortalityCount: toNumber(record.mortality ?? record.dead ?? record.deaths),
    feedKg: toNumber(feedData?.totalDailyFeed ?? record.feed),
    phMorning: toNumber(record.phMorning),
    phEvening: toNumber(record.phEvening),
    doMorning: toNumber(record.doMorning),
    doEvening: toNumber(record.doEvening),
    salinityPpt: toNumber(record.salinity),
    trayClearance,
  };
};

const classifyRecord = (record) => {
  const kinds = [];
  if ((record.mbwG || 0) > 0 || (record.mortalityCount || 0) > 0) kinds.push("sampling");
  if (record.phMorning !== null || record.phEvening !== null || record.doMorning !== null || record.doEvening !== null || record.salinityPpt !== null) kinds.push("water_quality");
  if (record.feedKg !== null || record.trayClearance !== null) kinds.push("feed");
  return kinds.length > 0 ? kinds : ["unknown"];
};

const calculateRiskReport = (pond, pondId) => {
  const records = Array.isArray(pond.samplings)
    ? pond.samplings.map(normalizeRecord).sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime())
    : [];
  const latest = records[records.length - 1] || {};
  const latestMbw = [...records].reverse().find((record) => (record.mbwG || 0) > 0)?.mbwG ?? null;
  const calculatedInitialPopulation = (toNumber(pond.pondArea) || 0) * (toNumber(pond.density) || 0);
  const initialPopulation = toNumber(pond.initialPopulation) ?? (calculatedInitialPopulation > 0 ? calculatedInitialPopulation : null);
  const mortality = records.reduce((sum, record) => sum + Math.max(0, record.mortalityCount || 0), 0);
  const currentPopulation = initialPopulation !== null ? Math.max(0, initialPopulation - mortality - (toNumber(pond.totalHarvestedPopulation) || 0)) : null;
  const biomassKg = currentPopulation !== null && latestMbw !== null ? (currentPopulation * latestMbw) / 1000 : null;
  const feedRate = latestMbw !== null ? getFeedRatePercent(latestMbw) : null;
  const expectedFeedKg = biomassKg !== null && feedRate !== null ? (biomassKg * feedRate) / 100 : null;
  const feedPressureRatio = latest.feedKg !== null && expectedFeedKg ? latest.feedKg / expectedFeedKg : null;
  const recent = records.slice(-3);
  const recentDo = recent.map((record) => minKnown(record.doMorning, record.doEvening)).filter((value) => value !== null);
  const latestDo = minKnown(latest.doMorning, latest.doEvening);
  const latestPhSwing = latest.phMorning !== null && latest.phEvening !== null ? Math.abs(latest.phEvening - latest.phMorning) : null;
  const findings = [];

  const pushFinding = (finding) => findings.push({
    confidence: 0.72,
    metricRefs: [],
    ...finding,
  });

  if (latestDo !== null && latestDo < 4) {
    pushFinding({
      id: "low_do",
      severity: latestDo < 3 ? "critical" : "warning",
      title: "Low dissolved oxygen risk",
      summary: `Latest DO minimum is ${round(latestDo, 2)} mg/L.`,
      evidence: [`Latest DO minimum is ${round(latestDo, 2)} mg/L.`],
      recommendation: "Increase aeration, check sludge load, and avoid aggressive feeding until DO stabilizes.",
      metricRefs: ["doMinimumLatest"],
    });
  }

  if ((latest.phMorning !== null && (latest.phMorning < 7.2 || latest.phMorning > 8.8)) || (latest.phEvening !== null && (latest.phEvening < 7.2 || latest.phEvening > 8.8))) {
    pushFinding({
      id: "unsafe_ph",
      severity: "warning",
      title: "Unsafe pH range",
      summary: "Latest pH is outside the preferred operating range.",
      evidence: [`pH morning ${latest.phMorning ?? "missing"}, evening ${latest.phEvening ?? "missing"}.`],
      recommendation: "Recheck pH, alkalinity, and water exchange/aeration plan before increasing feed.",
      metricRefs: ["phMorning", "phEvening"],
    });
  }

  if (latestPhSwing !== null && latestPhSwing > 0.7) {
    pushFinding({
      id: "ph_instability",
      severity: "watch",
      title: "Large pH swing",
      summary: `Latest pH swing is ${round(latestPhSwing, 2)}.`,
      evidence: [`Morning/evening pH swing is ${round(latestPhSwing, 2)}.`],
      recommendation: "Track plankton bloom and alkalinity because large daily swings can reduce appetite.",
      metricRefs: ["phSwingLatest"],
    });
  }

  if (recentDo.length >= 2 && recentDo[recentDo.length - 1] < recentDo[0] - 0.5) {
    pushFinding({
      id: "do_decline",
      severity: "watch",
      title: "DO trend is declining",
      summary: "Recent DO records are trending down.",
      evidence: [`DO minimum moved from ${round(recentDo[0], 2)} to ${round(recentDo[recentDo.length - 1], 2)} mg/L.`],
      recommendation: "Prepare aeration earlier than usual and keep the next feed conservative.",
      metricRefs: ["doMinimumTrend"],
    });
  }

  const appetite = recent.map((record) => record.trayClearance).filter((value) => value !== null);
  if (appetite.length >= 2 && appetite[appetite.length - 1] < appetite[0] - 15) {
    pushFinding({
      id: "appetite_drop",
      severity: "warning",
      title: "Appetite dropped",
      summary: "Recent tray clearance is falling.",
      evidence: [`Tray clearance moved from ${round(appetite[0], 1)}% to ${round(appetite[appetite.length - 1], 1)}%.`],
      recommendation: "Reduce feed pressure and check DO, pH, and molts before returning to normal feeding.",
      metricRefs: ["appetiteTrend"],
    });
  }

  if (feedPressureRatio !== null && feedPressureRatio > 1.25) {
    pushFinding({
      id: "feed_pressure_high",
      severity: feedPressureRatio > 1.6 ? "warning" : "watch",
      title: "Feed pressure is high",
      summary: "Logged feed is higher than expected for estimated biomass.",
      evidence: [`Feed pressure ratio is ${round(feedPressureRatio, 2)}.`],
      recommendation: "Use tray response and the next MBW sample before increasing feed further.",
      metricRefs: ["feedPressureRatio"],
    });
  }

  if ((latest.mortalityCount || 0) > Math.max(100, (initialPopulation || 0) * 0.002)) {
    pushFinding({
      id: "mortality_spike",
      severity: "warning",
      title: "Mortality spike",
      summary: `Latest mortality is ${latest.mortalityCount}.`,
      evidence: [`Latest mortality count is ${latest.mortalityCount}.`],
      recommendation: "Inspect pond edge, feed tray, and water quality; consider lab checks if mortality continues.",
      metricRefs: ["mortalityTrend"],
    });
  }

  const overallSeverity = findings.reduce((highest, finding) => (
    SEVERITY_RANK[finding.severity] > SEVERITY_RANK[highest] ? finding.severity : highest
  ), "info");

  return {
    pondId,
    pondName: pond.pondName || pond.name || "Unnamed pond",
    overallSeverity,
    findings,
    latestRecordKinds: classifyRecord(latest),
    generatedAt: new Date().toISOString(),
  };
};

const getRiskSignature = (report) => {
  const highFindings = report.findings
    .filter((finding) => SEVERITY_RANK[finding.severity] >= SEVERITY_RANK.warning)
    .map((finding) => `${finding.id}:${finding.severity}`)
    .sort();
  return `${report.pondId}:${highFindings.join("|")}`;
};

const shouldCreateNotification = async (companyId, riskSignature) => {
  if (!riskSignature || riskSignature.endsWith(":")) return false;
  const since = admin.firestore.Timestamp.fromMillis(Date.now() - DAY_MS);
  const snapshot = await admin.firestore()
    .collection("notifications")
    .where("companyId", "==", companyId)
    .where("type", "==", "orson_risk")
    .where("riskSignature", "==", riskSignature)
    .where("timestamp", ">=", since)
    .limit(1)
    .get();
  return snapshot.empty;
};

/**
 * Orson AI Proactive Consultant
 * Triggers when a pond document receives new sampling, water-quality, or feed/appetite records.
 */
exports.orsonProactiveConsultant = onDocumentUpdated("companies/{companyId}/ponds/{pondId}", async (event) => {
  const beforeData = event.data.before.data() || {};
  const afterData = event.data.after.data() || {};
  const { companyId, pondId } = event.params;

  const beforeSamplings = Array.isArray(beforeData.samplings) ? beforeData.samplings : [];
  const afterSamplings = Array.isArray(afterData.samplings) ? afterData.samplings : [];

  if (afterSamplings.length <= beforeSamplings.length) {
    return null;
  }

  const report = calculateRiskReport(afterData, pondId);
  const notifiableFindings = report.findings.filter((finding) => SEVERITY_RANK[finding.severity] >= SEVERITY_RANK.warning);
  if (notifiableFindings.length === 0) {
    console.log(`Orson checked ${pondId}; no warning/critical threshold crossed.`);
    return { success: true, notified: false, report };
  }

  const riskSignature = getRiskSignature(report);
  if (!(await shouldCreateNotification(companyId, riskSignature))) {
    console.log(`Orson skipped duplicate notification for ${riskSignature}.`);
    return { success: true, notified: false, duplicate: true, report };
  }

  const topFinding = notifiableFindings[0];
  await admin.firestore()
    .collection("notifications")
    .add({
      companyId,
      title: `Orson: ${report.pondName} ${topFinding.title}`,
      message: `${topFinding.summary} ${topFinding.recommendation}`,
      type: "orson_risk",
      priority: topFinding.severity === "critical" ? "high" : "medium",
      pondId,
      pondName: report.pondName,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
      isOrson: true,
      icon: "brain-circuit",
      riskSignature,
      orsonRiskReport: report,
      evidence: topFinding.evidence,
      confidence: topFinding.confidence,
      data: {
        isOrson: true,
        pondId,
        pondName: report.pondName,
        riskId: topFinding.id,
        severity: topFinding.severity,
        confidence: topFinding.confidence,
        recordKinds: report.latestRecordKinds,
      },
    });

  console.log(`Orson notification sent for pond ${pondId}.`);
  return { success: true, notified: true, report };
});
