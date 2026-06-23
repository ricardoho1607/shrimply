const { onDocumentCreated, onDocumentUpdated, onDocumentWritten } = require("firebase-functions/v2/firestore");
const { HttpsError, onCall } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");

admin.initializeApp();

const DAY_MS = 1000 * 60 * 60 * 24;
const SEVERITY_RANK = { info: 0, watch: 1, warning: 2, critical: 3 };
const STAFF_ROLES = new Set(["manager", "technician", "admin"]);
const BIOSECURITY_RISK_IDS = new Set(["low_do", "do_decline", "appetite_drop", "mortality_spike", "unsafe_ph"]);
const LAB_EXTRACTION_MODEL = "gemini-2.5-flash";
const LAB_INSIGHT_MODEL = "gemini-2.5-flash-lite";
const LAB_PDF_EXTRACTION_COOLDOWN_MS = 48 * 60 * 60 * 1000;
const LAB_PDF_EXTRACTION_PENDING_MS = 10 * 60 * 1000;
const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

exports.acceptCompanyInvite = onCall(async (request) => {
  const uid = request.auth?.uid;
  const authEmail = request.auth?.token?.email;
  const inviteToken = typeof request.data?.inviteToken === "string" ? request.data.inviteToken.trim() : "";

  if (!uid || !authEmail) {
    throw new HttpsError("unauthenticated", "You must be signed in to accept an invite.");
  }
  if (!inviteToken) {
    throw new HttpsError("invalid-argument", "Invite token is required.");
  }

  const db = admin.firestore();
  const companiesSnapshot = await db.collection("companies").get();
  let targetCompanyRef = null;
  let targetInvite = null;

  for (const companyDoc of companiesSnapshot.docs) {
    const companyData = companyDoc.data();
    const invite = Array.isArray(companyData.pendingInvites)
      ? companyData.pendingInvites.find((item) => item.inviteToken === inviteToken && item.status === "pending")
      : null;
    if (invite) {
      targetCompanyRef = companyDoc.ref;
      targetInvite = invite;
      break;
    }
  }

  if (!targetCompanyRef || !targetInvite) {
    throw new HttpsError("not-found", "Invalid or expired invitation.");
  }

  if (String(targetInvite.email || "").toLowerCase() !== String(authEmail).toLowerCase()) {
    throw new HttpsError("permission-denied", "This invitation is for a different email address.");
  }

  if (!STAFF_ROLES.has(targetInvite.role)) {
    throw new HttpsError("permission-denied", "This invitation role is not allowed.");
  }

  await db.runTransaction(async (transaction) => {
    const companySnap = await transaction.get(targetCompanyRef);
    if (!companySnap.exists) {
      throw new HttpsError("not-found", "Company not found.");
    }

    const companyData = companySnap.data();
    const pendingInvites = Array.isArray(companyData.pendingInvites) ? companyData.pendingInvites : [];
    const inviteIndex = pendingInvites.findIndex((item) => item.inviteToken === inviteToken && item.status === "pending");
    if (inviteIndex < 0) {
      throw new HttpsError("not-found", "Invalid or expired invitation.");
    }

    const invite = pendingInvites[inviteIndex];
    if (String(invite.email || "").toLowerCase() !== String(authEmail).toLowerCase() || !STAFF_ROLES.has(invite.role)) {
      throw new HttpsError("permission-denied", "This invitation cannot be accepted.");
    }

    const updatedInvites = pendingInvites.map((item, index) => (
      index === inviteIndex ? { ...item, status: "accepted", acceptedAt: admin.firestore.Timestamp.now() } : item
    ));

    transaction.update(targetCompanyRef, {
      teamMembers: admin.firestore.FieldValue.arrayUnion(uid),
      pendingInvites: updatedInvites,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    transaction.set(db.collection("users").doc(uid), {
      companyId: targetCompanyRef.id,
      role: invite.role,
      invitedBy: invite.invitedBy || null,
      hasCompletedSetup: true,
      lastActive: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  });

  return {
    companyId: targetCompanyRef.id,
    role: targetInvite.role,
  };
});

const toNumber = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.replace(/,/g, "").replace(/%$/, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const toOptionalText = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean).map(String).join(", ");
  if (typeof value === "string" && value.trim() !== "") return value.trim();
  return null;
};

const firstDefined = (...values) => values.find((value) => value !== undefined && value !== null && value !== "");

const toMillis = (value) => {
  if (!value) return null;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.getTime();
  if (typeof value === "string") {
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
};

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value.toDate === "function") {
    const parsed = value.toDate();
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value.seconds === "number") {
    return new Date(value.seconds * 1000);
  }
  return null;
};

const assertCompanyMemberForCallable = async (db, uid, companyId) => {
  if (!uid) {
    throw new HttpsError("unauthenticated", "You must be signed in.");
  }
  if (!companyId || typeof companyId !== "string") {
    throw new HttpsError("invalid-argument", "companyId is required.");
  }

  const companySnap = await db.collection("companies").doc(companyId).get();
  if (!companySnap.exists) {
    throw new HttpsError("not-found", "Company not found.");
  }
  const company = companySnap.data() || {};
  const teamMembers = Array.isArray(company.teamMembers) ? company.teamMembers : [];
  if (company.ownerId !== uid && !teamMembers.includes(uid)) {
    throw new HttpsError("permission-denied", "You do not have access to this company.");
  }
  return company;
};

const getGeminiApiKey = () => {
  try {
    return geminiApiKeySecret.value() || process.env.GEMINI_API_KEY || "";
  } catch (error) {
    return process.env.GEMINI_API_KEY || "";
  }
};

exports.generateOrsonResponse = onCall({ timeoutSeconds: 60, secrets: [geminiApiKeySecret] }, async (request) => {
  const uid = request.auth?.uid;
  const companyId = typeof request.data?.companyId === "string" ? request.data.companyId : "";
  const systemInstruction = typeof request.data?.systemInstruction === "string" ? request.data.systemInstruction : "";
  const prompt = typeof request.data?.prompt === "string" ? request.data.prompt : "";

  const db = admin.firestore();
  await assertCompanyMemberForCallable(db, uid, companyId);

  if (!systemInstruction.trim() || !prompt.trim()) {
    throw new HttpsError("invalid-argument", "Orson prompt data is required.");
  }

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new HttpsError("failed-precondition", "GEMINI_API_KEY is not configured for Orson.");
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: LAB_INSIGHT_MODEL,
      systemInstruction,
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 512,
      },
    });
    const result = await model.generateContent(prompt);
    return { text: result.response.text() };
  } catch (error) {
    console.error("Orson response generation failed:", error);
    throw new HttpsError("internal", "Orson could not generate a response right now.");
  }
});

const parseJsonFromModelText = (text) => {
  const trimmed = String(text || "").trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  const jsonText = firstBrace >= 0 && lastBrace >= firstBrace ? candidate.slice(firstBrace, lastBrace + 1) : candidate;
  return JSON.parse(jsonText);
};

const getLabUsageTypeKey = (reportType) => (reportType === "plankton" ? "plankton" : "water_quality");

const reserveLabPdfExtraction = async (db, companyId, reportType, labReportId, uid) => {
  const typeKey = getLabUsageTypeKey(reportType);
  const usageRef = db.collection("companies").doc(companyId).collection("labUsage").doc("pdfExtraction");
  const nowMs = Date.now();
  const nowTimestamp = admin.firestore.Timestamp.fromMillis(nowMs);

  await db.runTransaction(async (transaction) => {
    const usageSnap = await transaction.get(usageRef);
    const usage = usageSnap.exists ? usageSnap.data() || {} : {};
    const typeUsage = usage[typeKey] || {};
    const resetAtMs = toMillis(typeUsage.resetAt);
    if (resetAtMs && resetAtMs > nowMs) {
      throw new HttpsError("resource-exhausted", "PDF extraction cooldown is still active.", {
        reportType: typeKey,
        resetAt: new Date(resetAtMs).toISOString(),
        remainingMs: resetAtMs - nowMs,
      });
    }

    const pendingStartedAtMs = toMillis(typeUsage.startedAt);
    const pendingIsFresh = typeUsage.status === "pending"
      && typeUsage.pendingLabReportId
      && typeUsage.pendingLabReportId !== labReportId
      && pendingStartedAtMs
      && pendingStartedAtMs > nowMs - LAB_PDF_EXTRACTION_PENDING_MS;
    if (pendingIsFresh) {
      throw new HttpsError("resource-exhausted", "Another PDF extraction is already running for this report type.", {
        reportType: typeKey,
        pendingLabReportId: typeUsage.pendingLabReportId,
        resetAt: new Date(pendingStartedAtMs + LAB_PDF_EXTRACTION_PENDING_MS).toISOString(),
        remainingMs: (pendingStartedAtMs + LAB_PDF_EXTRACTION_PENDING_MS) - nowMs,
      });
    }

    transaction.set(usageRef, {
      [typeKey]: {
        status: "pending",
        pendingLabReportId: labReportId,
        startedAt: nowTimestamp,
        usedBy: uid || null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  });

  return { typeKey, usageRef };
};

const completeLabPdfExtractionUsage = async (usageRef, typeKey, labReportId, uid) => {
  const nowMs = Date.now();
  const resetAtMs = nowMs + LAB_PDF_EXTRACTION_COOLDOWN_MS;
  await usageRef.set({
    [typeKey]: {
      status: "cooldown",
      usedAt: admin.firestore.Timestamp.fromMillis(nowMs),
      resetAt: admin.firestore.Timestamp.fromMillis(resetAtMs),
      lastLabReportId: labReportId,
      usedBy: uid || null,
      pendingLabReportId: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  return { resetAt: new Date(resetAtMs).toISOString() };
};

const clearLabPdfExtractionPending = async (usageRef, typeKey, labReportId) => {
  if (!usageRef || !typeKey) return;
  const snap = await usageRef.get();
  const current = snap.exists ? snap.data()?.[typeKey] : null;
  if (current?.status !== "pending" || current?.pendingLabReportId !== labReportId) return;
  await usageRef.set({
    [typeKey]: {
      status: "idle",
      pendingLabReportId: null,
      resetAt: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
};

const dayKey = (date = new Date()) => date.toISOString().slice(0, 10);

const isValidLocation = (location) => (
  location
  && typeof location === "object"
  && typeof location.latitude === "number"
  && Number.isFinite(location.latitude)
  && typeof location.longitude === "number"
  && Number.isFinite(location.longitude)
);

const distanceKm = (point1, point2) => {
  const radiusKm = 6371;
  const deg2rad = (deg) => deg * (Math.PI / 180);
  const dLat = deg2rad(point2.latitude - point1.latitude);
  const dLon = deg2rad(point2.longitude - point1.longitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(point1.latitude)) * Math.cos(deg2rad(point2.latitude)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return Math.round((radiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))) * 100) / 100;
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

const stableStringify = (value) => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
};

const hashString = (value) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
};

const getLabReportSourceHash = (report) => hashString(stableStringify({
  status: report.status,
  sampleDate: report.sampleDate || null,
  pondResults: Array.isArray(report.pondResults) ? report.pondResults : [],
}));

const highestSeverity = (findings) => findings.reduce((highest, finding) => (
  SEVERITY_RANK[finding.severity] > SEVERITY_RANK[highest] ? finding.severity : highest
), "info");

const labFinding = (finding) => ({
  confidence: 0.78,
  evidence: [],
  ...finding,
});

const analyzeLabPondResult = (result, sampleDate) => {
  const water = result.waterQuality || {};
  const micro = result.microbiology || {};
  const plankton = result.plankton || {};
  const findings = [];
  const push = (finding) => findings.push(labFinding(finding));

  const no2 = toNumber(water.no2);
  if (no2 !== null && no2 >= 0.5) {
    push({
      id: "lab_no2_high",
      severity: no2 >= 1.5 ? "critical" : "warning",
      title: "Nitrite is high",
      summary: `Lab nitrite is ${round(no2, 3)} ppm.`,
      evidence: [`NO2 ${round(no2, 3)} ppm.`],
      recommendation: "Reduce feed pressure, strengthen aeration, and monitor appetite/mortality until nitrite falls.",
    });
  }

  const nh4 = toNumber(water.nh4);
  if (nh4 !== null && nh4 >= 0.5) {
    push({
      id: "lab_nh4_high",
      severity: nh4 >= 1 ? "critical" : "warning",
      title: "Ammonium is elevated",
      summary: `Lab NH4 is ${round(nh4, 3)} ppm.`,
      evidence: [`NH4 ${round(nh4, 3)} ppm.`],
      recommendation: "Check organic load, feed waste, and biofilter/water exchange conditions before increasing feed.",
    });
  }

  const tom = toNumber(water.tom);
  if (tom !== null && tom > 80) {
    push({
      id: "lab_tom_high",
      severity: tom > 100 ? "warning" : "watch",
      title: "Organic load is high",
      summary: `TOM is ${round(tom, 1)} ppm.`,
      evidence: [`TOM ${round(tom, 1)} ppm.`],
      recommendation: "Inspect sludge, feed waste, and siphoning schedule because high organic matter can support bacterial pressure.",
    });
  }

  const alkalinity = toNumber(water.alkalinityTotal);
  if (alkalinity !== null && alkalinity < 100) {
    push({
      id: "lab_alkalinity_low",
      severity: "watch",
      title: "Alkalinity buffer is low",
      summary: `Total alkalinity is ${round(alkalinity, 1)} ppm.`,
      evidence: [`Alkalinity ${round(alkalinity, 1)} ppm.`],
      recommendation: "Monitor pH swing and consider buffering support if pH becomes unstable.",
    });
  }

  const vibrioTotal = toNumber(micro.vibrioTotal);
  const vibrioGreen = toNumber(micro.vibrioGreen);
  if ((vibrioTotal !== null && vibrioTotal > 250) || (vibrioGreen !== null && vibrioGreen > 0)) {
    const severity = (vibrioTotal !== null && vibrioTotal > 1000) || (vibrioGreen !== null && vibrioGreen > 100) ? "critical" : "warning";
    push({
      id: "lab_vibrio_pressure",
      severity,
      title: "Vibrio pressure is elevated",
      summary: `Vibrio result is above the preferred range${vibrioTotal !== null ? `, total ${round(vibrioTotal, 0)}` : ""}.`,
      evidence: [`Vibrio total ${vibrioTotal ?? "missing"}, green ${vibrioGreen ?? "missing"}.`],
      recommendation: "Reduce organic load, watch appetite and mortality closely, and retest if symptoms or poor feeding appear.",
    });
  }

  const cyano = toNumber(plankton.cyanophytaPercent);
  if (cyano !== null && cyano > 10) {
    push({
      id: "lab_cyanophyta_high",
      severity: cyano > 20 ? "warning" : "watch",
      title: "Blue-green algae is high",
      summary: `Cyanophyta is ${round(cyano, 1)}% of plankton.`,
      evidence: [`Cyanophyta ${round(cyano, 1)}%.`],
      recommendation: "Track pH swing, water color, and appetite because blue-green algae dominance can destabilize the pond.",
    });
  }

  const dino = toNumber(plankton.dinoflagellataPercent);
  if (dino !== null && dino > 5) {
    push({
      id: "lab_dinoflagellata_high",
      severity: "watch",
      title: "Dinoflagellata is elevated",
      summary: `Dinoflagellata is ${round(dino, 1)}% of plankton.`,
      evidence: [`Dinoflagellata ${round(dino, 1)}%.`],
      recommendation: "Watch pond color and shrimp appetite; avoid aggressive feed increases while plankton balance is unstable.",
    });
  }

  const harmfulPlankton = toNumber(plankton.harmfulCellPerMl);
  const beneficialPlankton = toNumber(plankton.beneficialCellPerMl);
  const totalPlankton = toNumber(plankton.totalCellPerMl);
  const harmfulShare = harmfulPlankton !== null && totalPlankton !== null && totalPlankton > 0
    ? (harmfulPlankton / totalPlankton) * 100
    : null;
  if ((harmfulShare !== null && harmfulShare > 30) || (harmfulPlankton !== null && beneficialPlankton !== null && harmfulPlankton > beneficialPlankton)) {
    push({
      id: "lab_harmful_plankton_pressure",
      severity: harmfulShare !== null && harmfulShare > 50 ? "warning" : "watch",
      title: "Harmful plankton pressure is elevated",
      summary: harmfulShare !== null
        ? `Harmful plankton is ${round(harmfulShare, 1)}% of total plankton.`
        : "Harmful plankton is higher than beneficial plankton.",
      evidence: [`Beneficial plankton ${beneficialPlankton ?? "missing"}, harmful plankton ${harmfulPlankton ?? "missing"}.`],
      recommendation: "Track water color, pH swing, and appetite; avoid sudden feed increases while plankton balance is unfavorable.",
    });
  }

  const combinedRisk = findings.some((finding) => finding.id === "lab_tom_high")
    && findings.some((finding) => finding.id === "lab_vibrio_pressure");
  if (combinedRisk) {
    push({
      id: "lab_organic_bacteria_combined",
      severity: "critical",
      title: "Organic load may be feeding bacterial pressure",
      summary: "TOM and Vibrio are both elevated, which increases biological stress risk.",
      evidence: ["High organic matter and elevated Vibrio were detected in the same lab result."],
      recommendation: "Prioritize sludge control, conservative feeding, aeration, and short-interval monitoring for this pond.",
    });
  }

  const overallSeverity = highestSeverity(findings);
  const topFinding = findings
    .filter((finding) => SEVERITY_RANK[finding.severity] >= SEVERITY_RANK.watch)
    .sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity])[0];

  return {
    pondId: result.pondId || null,
    pondCode: result.pondCode || "Unnamed pond",
    sampleDate: sampleDate || null,
    overallSeverity,
    mainIssue: topFinding?.title || "Lab result reviewed",
    keyRisks: findings.map((finding) => finding.title).slice(0, 4),
    recommendations: findings.map((finding) => finding.recommendation).filter(Boolean).slice(0, 4),
    findings,
  };
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

const shouldCreateProactiveNotification = async (db, companyId, type, dedupeKey, lookbackMs = DAY_MS) => {
  const sinceMs = Date.now() - lookbackMs;
  const snapshot = await db.collection("notifications")
    .where("companyId", "==", companyId)
    .get();
  return !snapshot.docs.some((doc) => {
    const notification = doc.data() || {};
    const notificationDate = toDate(notification.timestamp);
    return notification.type === type
      && notification.dedupeKey === dedupeKey
      && notificationDate
      && notificationDate.getTime() >= sinceMs;
  });
};

const createProactiveNotification = async (db, notification, lookbackMs = DAY_MS) => {
  const shouldCreate = await shouldCreateProactiveNotification(
    db,
    notification.companyId,
    notification.type,
    notification.dedupeKey,
    lookbackMs,
  );
  if (!shouldCreate) return false;

  await db.collection("notifications").add({
    ...notification,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    read: false,
    isOrson: true,
    icon: "brain-circuit",
    data: {
      isOrson: true,
      ...(notification.data || {}),
    },
  });
  return true;
};

const normalizePondCode = (value) => String(value || "")
  .toLowerCase()
  .replace(/^pond\s+/i, "")
  .replace(/\s+/g, "")
  .replace(/[^a-z0-9]/g, "");

const buildLabExtractionPrompt = (pondNames, requestedReportType = "water_quality") => {
  const knownPonds = pondNames.join(", ") || "unknown";
  if (requestedReportType === "plankton") {
    return `
You are extracting a shrimp pond PLANKTON laboratory report for Shrimply.
Return only valid compact JSON. Do not include markdown.

Known pond names/codes in this farm: ${knownPonds}.

Use this exact compact JSON shape. Do not include waterQuality, microbiology, doc, or transparency fields for plankton reports:
{
  "reportType": "plankton",
  "labName": string | null,
  "farmName": string | null,
  "sampleDate": "YYYY-MM-DD" | null,
  "confidence": number,
  "warnings": string[],
  "pondResults": [
    {
      "p": string,
      "t": number | null,
      "good": number | null,
      "bad": number | null,
      "chlC": number | null,
      "chlP": number | null,
      "chlS": string | null,
      "cyaC": number | null,
      "cyaP": number | null,
      "cyaS": string | null,
      "diaC": number | null,
      "diaP": number | null,
      "diaS": string | null,
      "chrC": number | null,
      "chrP": number | null,
      "chrS": string | null,
      "dinC": number | null,
      "dinP": number | null,
      "dinS": string | null,
      "proC": number | null,
      "proP": number | null,
      "proS": string | null
    }
  ]
}

Rules:
- Keep missing numeric values as null, never 0.
- Preserve pond codes exactly as shown in the PDF.
- Extract one row per pond.
- Return minified JSON with compact keys exactly as shown.
- p = pond code.
- t = Total Plankton/Jumlah Plankton (Total).
- good = Plankton Menguntungkan.
- bad = Plankton Merugikan.
- chl = Chlorophyta/green algae, cya = Cyanophyta/blue-green algae, dia = diatoms, chr = Chrysophyta/golden-green algae, din = Dinoflagellata, pro = Protozoa.
- C suffix means raw cell count, P suffix means percentage, S suffix means species names.
- Green algae = Chlorophyta, blue-green algae = Cyanophyta, diatoms = Diatom/Bacillariophyta, golden-green algae = Chrysophyta/Chrysophyceae, dinoflagellates = Dinoflagellata.
- Golden-green aliases include Chrysophyta, Chrysophyceae, Chrysophytes, golden algae, golden-brown algae, ganggang keemasan, and ganggang coklat keemasan.
- For each group, extract the group total/count into CellPerMl, group percentage into Percent, and species/sub-plankton names into Species.
- Species examples include Chlorella, Pandorina, Tetraselmis, Microcystis, Oscillatoria, Melosira, Nitzschia, Dinobryon, Mallomonas, Gymnodinium.
- Species fields must be a short comma-separated string, not an array.
`;
  }

  return `
You are extracting shrimp pond laboratory reports for Shrimply.
Return only valid JSON. Do not include markdown.

This upload was marked as reportType "${requestedReportType}".
Treat the PDF as one report type only:
- water_quality means mineral water-quality and microbiology values such as salinity, NH4, NO2, alkalinity, TOM, hardness, Vibrio, and TBC.
- plankton means plankton count, plankton group totals, and the species listed under each plankton group.
Extract one row per pond.
Known pond names/codes in this farm: ${pondNames.join(", ") || "unknown"}.

Use this exact JSON shape:
{
  "reportType": "water_quality" | "plankton" | "combined",
  "labName": string | null,
  "farmName": string | null,
  "sampleDate": "YYYY-MM-DD" | null,
  "confidence": number,
  "warnings": string[],
  "pondResults": [
    {
      "pondCode": string,
      "doc": number | null,
      "transparencyCm": number | null,
      "waterQuality": {
        "phCustomer": number | null,
        "phLab": number | null,
        "salinityCustomer": number | null,
        "salinityLab": number | null,
        "nh4": number | null,
        "no2": number | null,
        "alkalinityTotal": number | null,
        "tom": number | null,
        "hardnessCa": number | null,
        "hardnessMg": number | null,
        "hardnessTotal": number | null
      },
      "microbiology": {
        "vibrioYellow": number | null,
        "vibrioGreen": number | null,
        "vibrioTotal": number | null,
        "tbc": number | null,
        "tvcTbcRatioPercent": number | null
      },
      "plankton": {
        "totalCellPerMl": number | null,
        "beneficialCellPerMl": number | null,
        "harmfulCellPerMl": number | null,
        "chlorophytaCellPerMl": number | null,
        "chlorophytaPercent": number | null,
        "chlorophytaSpecies": string | null,
        "cyanophytaCellPerMl": number | null,
        "cyanophytaPercent": number | null,
        "cyanophytaSpecies": string | null,
        "diatomCellPerMl": number | null,
        "diatomPercent": number | null,
        "diatomSpecies": string | null,
        "chrysophytaCellPerMl": number | null,
        "chrysophytaPercent": number | null,
        "chrysophytaSpecies": string | null,
        "dinoflagellataCellPerMl": number | null,
        "dinoflagellataPercent": number | null,
        "dinoflagellataSpecies": string | null,
        "protozoaCellPerMl": number | null,
        "protozoaPercent": number | null,
        "protozoaSpecies": string | null
      }
    }
  ]
}

Rules:
- Keep missing values as null, never 0.
- Preserve pond codes exactly as shown in the PDF.
- Return reportType as "${requestedReportType}" unless the PDF clearly cannot match that type.
- Do not extract pH for lab sampling. Set phCustomer and phLab to null even if the PDF contains pH, because Shrimply tracks pH in the daily water quality log.
- If reportType is water_quality, extract mineral quality and microbiology fields only; set plankton fields to null.
- If reportType is plankton, extract plankton fields only; set doc, waterQuality, and microbiology fields to null.
- For Indonesian headers: Kecerahan = transparencyCm, NH4+ = nh4, NO2 = no2, TOM = tom, Total Plankton/Jumlah Plankton (Total) = totalCellPerMl, Plankton Menguntungkan = beneficialCellPerMl, Plankton Merugikan = harmfulCellPerMl, TBC = tbc.
- For salinity, Cust/Customer = salinityCustomer, Lab = salinityLab.
- For hardness, Ca = hardnessCa, Mg = hardnessMg, Total = hardnessTotal.
- Vibrio Y means yellow, G means green.
- For plankton group names: green algae = Chlorophyta, blue-green algae = Cyanophyta, diatoms = Diatom/Bacillariophyta, golden-green algae = Chrysophyta/Chrysophyceae, dinoflagellates = Dinoflagellata.
- Golden-green aliases include Chrysophyta, Chrysophyceae, Chrysophytes, golden algae, golden-brown algae, ganggang keemasan, and ganggang coklat keemasan.
- For each plankton group, extract the group total/count into the matching CellPerMl field, the group percentage into the matching Percent field, and species/sub-plankton names such as Chlorella, Pandorina, Tetraselmis into the matching Species text field.
`;
};

const buildDeterministicLabInsights = (summaries) => {
  const critical = summaries.filter((summary) => summary.overallSeverity === "critical");
  const warning = summaries.filter((summary) => summary.overallSeverity === "warning");
  const watch = summaries.filter((summary) => summary.overallSeverity === "watch");
  const affected = [...critical, ...warning, ...watch];

  return {
    ownerSummary: affected.length > 0
      ? `${affected.length} pond${affected.length === 1 ? "" : "s"} need attention from the latest lab report. Focus first on ${affected.slice(0, 3).map((summary) => summary.pondCode).join(", ")}.`
      : "The confirmed lab report did not cross Shrimply warning thresholds. Continue routine monitoring and compare against the next lab result.",
    pondSummaries: summaries.map((summary) => ({
      pondId: summary.pondId,
      pondCode: summary.pondCode,
      status: summary.overallSeverity === "info" ? "good" : summary.overallSeverity,
      summary: summary.mainIssue,
      whyItMatters: summary.findings.length > 0
        ? summary.findings[0].summary
        : "No warning-level lab issue was detected from the available values.",
      nextAction: summary.recommendations[0] || "Keep routine water quality and appetite monitoring.",
    })),
  };
};

const buildLabInsightPrompt = (summaries) => `
You are Orson, Shrimply's aquaculture intelligence assistant.
Explain this confirmed lab report to a shrimp farm owner in plain operational language.
Return only valid JSON:
{
  "ownerSummary": string,
  "pondSummaries": [
    {
      "pondId": string,
      "pondCode": string,
      "status": "good" | "watch" | "warning" | "critical",
      "summary": string,
      "whyItMatters": string,
      "nextAction": string
    }
  ]
}

Rules:
- Do not invent missing data.
- Do not claim disease certainty.
- Explain cause and effect simply.
- Keep each pond nextAction practical and concise.

Confirmed deterministic findings:
${JSON.stringify(summaries)}
`;

const generateLabInsights = async (summaries) => {
  const fallback = buildDeterministicLabInsights(summaries);
  const apiKey = getGeminiApiKey();
  if (!apiKey || summaries.length === 0) {
    return {
      ...fallback,
      model: "deterministic",
      generatedBy: "deterministic_fallback",
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: LAB_INSIGHT_MODEL,
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
      },
    });
    const result = await model.generateContent(buildLabInsightPrompt(summaries));
    const parsed = parseJsonFromModelText(result.response.text());
    return {
      ownerSummary: parsed.ownerSummary || fallback.ownerSummary,
      pondSummaries: Array.isArray(parsed.pondSummaries) ? parsed.pondSummaries : fallback.pondSummaries,
      model: LAB_INSIGHT_MODEL,
      generatedBy: "gemini",
    };
  } catch (error) {
    return {
      ...fallback,
      model: "deterministic",
      generatedBy: "deterministic_fallback",
      error: error.message || String(error),
    };
  }
};

exports.extractLabReportFromPdf = onCall({ timeoutSeconds: 120, memory: "1GiB", secrets: [geminiApiKeySecret] }, async (request) => {
  const uid = request.auth?.uid;
  const companyId = request.data?.companyId;
  const labReportId = request.data?.labReportId;
  if (!labReportId || typeof labReportId !== "string") {
    throw new HttpsError("invalid-argument", "labReportId is required.");
  }

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new HttpsError("failed-precondition", "Gemini API key is not configured for functions.");
  }

  const db = admin.firestore();
  try {
    await assertCompanyMemberForCallable(db, uid, companyId);
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    console.error("Lab report extraction permission check failed", {
      companyId,
      labReportId,
      uid,
      message: error.message || String(error),
      code: error.code || null,
    });
    throw new HttpsError("permission-denied", "The lab extraction service cannot access this company yet. Please try again in a minute or two.");
  }

  const reportRef = db.collection("companies").doc(companyId).collection("labReports").doc(labReportId);
  let reportSnap;
  try {
    reportSnap = await reportRef.get();
  } catch (error) {
    console.error("Lab report draft read failed", {
      companyId,
      labReportId,
      uid,
      message: error.message || String(error),
      code: error.code || null,
    });
    throw new HttpsError("permission-denied", "The lab extraction service cannot read the uploaded draft yet. Please try again in a minute or two.");
  }
  if (!reportSnap.exists) {
    throw new HttpsError("not-found", "Lab report draft not found.");
  }

  const report = reportSnap.data() || {};
  if (report.entryMode !== "pdf_upload") {
    throw new HttpsError("failed-precondition", "This lab report was not created from a PDF upload.");
  }
  if (!report.sourcePdfPath || typeof report.sourcePdfPath !== "string") {
    throw new HttpsError("failed-precondition", "The uploaded PDF path is missing.");
  }
  const expectedPdfPath = `companies/${companyId}/labReports/${labReportId}/source.pdf`;
  if (report.sourcePdfPath !== expectedPdfPath) {
    throw new HttpsError("permission-denied", "The uploaded PDF path does not match this lab report.");
  }

  const sourceHash = report.sourceFileHash || getLabReportSourceHash(report);
  if (report.extraction?.status === "complete" && report.extraction?.sourceHash === sourceHash && Array.isArray(report.pondResults)) {
    return { pondResults: report.pondResults, cached: true };
  }

  const requestedReportType = report.reportType === "plankton" ? "plankton" : "water_quality";
  const { typeKey: labUsageTypeKey, usageRef: labUsageRef } = await reserveLabPdfExtraction(db, companyId, requestedReportType, labReportId, uid);

  await reportRef.set({
    extraction: {
      status: "pending",
      model: LAB_EXTRACTION_MODEL,
      sourceHash,
      startedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  try {
    const pondsSnap = await db.collection("companies").doc(companyId).collection("ponds").get();
    const pondOptions = pondsSnap.docs.map((docSnap) => {
      const pond = docSnap.data() || {};
      return {
        pondId: docSnap.id,
        pondName: pond.pondName || pond.name || docSnap.id,
        normalized: normalizePondCode(pond.pondName || pond.name || docSnap.id),
      };
    });

    const [pdfBuffer] = await admin.storage().bucket().file(report.sourcePdfPath).download();
    if (pdfBuffer.length > 10 * 1024 * 1024) {
      throw new Error("PDF is larger than the supported 10 MB limit.");
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: LAB_EXTRACTION_MODEL,
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 16384,
        responseMimeType: "application/json",
      },
    });

    console.log("Lab report extraction started", {
      companyId,
      labReportId,
      pdfBytes: pdfBuffer.length,
      pondCount: pondOptions.length,
    });

    const result = await model.generateContent([
      { text: buildLabExtractionPrompt(pondOptions.map((pond) => pond.pondName), requestedReportType) },
      {
        inlineData: {
          mimeType: "application/pdf",
          data: pdfBuffer.toString("base64"),
        },
      },
    ]);
    const rawModelText = result.response.text();
    const finishReason = result.response.candidates?.[0]?.finishReason || null;
    let parsed;
    try {
      parsed = parseJsonFromModelText(rawModelText);
    } catch (error) {
      console.error("Lab report model JSON parse failed", {
        companyId,
        labReportId,
        message: error.message || String(error),
        rawLength: rawModelText.length,
        finishReason,
        rawStart: rawModelText.slice(0, 400),
        rawEnd: rawModelText.slice(-400),
      });
      throw new Error("Gemini returned an incomplete lab extraction. Please retry the upload.");
    }
    const warnings = Array.isArray(parsed.warnings) ? parsed.warnings.filter(Boolean).map(String) : [];

    const pondResults = (Array.isArray(parsed.pondResults) ? parsed.pondResults : []).map((row) => {
      const planktonRow = row.plankton || row;
      const extractedPondCode = row.pondCode || row.p;
      const normalizedCode = normalizePondCode(extractedPondCode);
      const matchedPond = pondOptions.find((pond) => pond.normalized === normalizedCode)
        || pondOptions.find((pond) => normalizedCode && (pond.normalized.includes(normalizedCode) || normalizedCode.includes(pond.normalized)));
      if (!matchedPond) {
        warnings.push(`Could not match extracted pond code "${row.pondCode || "unknown"}" to an existing pond.`);
      }

      return {
        pondId: matchedPond?.pondId || "",
        pondCode: extractedPondCode || matchedPond?.pondName || "Unmatched pond",
        doc: requestedReportType === "plankton" ? null : toNumber(row.doc),
        transparencyCm: toNumber(row.transparencyCm),
        waterQuality: {
          phCustomer: null,
          phLab: null,
          salinityCustomer: requestedReportType === "plankton" ? null : toNumber(row.waterQuality?.salinityCustomer),
          salinityLab: requestedReportType === "plankton" ? null : toNumber(row.waterQuality?.salinityLab),
          nh4: requestedReportType === "plankton" ? null : toNumber(row.waterQuality?.nh4),
          no2: requestedReportType === "plankton" ? null : toNumber(row.waterQuality?.no2),
          alkalinityTotal: requestedReportType === "plankton" ? null : toNumber(row.waterQuality?.alkalinityTotal),
          tom: requestedReportType === "plankton" ? null : toNumber(row.waterQuality?.tom),
          hardnessCa: requestedReportType === "plankton" ? null : toNumber(row.waterQuality?.hardnessCa),
          hardnessMg: requestedReportType === "plankton" ? null : toNumber(row.waterQuality?.hardnessMg),
          hardnessTotal: requestedReportType === "plankton" ? null : toNumber(row.waterQuality?.hardnessTotal),
        },
        microbiology: {
          vibrioYellow: requestedReportType === "plankton" ? null : toNumber(row.microbiology?.vibrioYellow),
          vibrioGreen: requestedReportType === "plankton" ? null : toNumber(row.microbiology?.vibrioGreen),
          vibrioTotal: requestedReportType === "plankton" ? null : toNumber(row.microbiology?.vibrioTotal),
          tbc: requestedReportType === "plankton" ? null : toNumber(row.microbiology?.tbc),
          tvcTbcRatioPercent: requestedReportType === "plankton" ? null : toNumber(row.microbiology?.tvcTbcRatioPercent),
        },
        plankton: {
          totalCellPerMl: requestedReportType === "water_quality" ? null : toNumber(firstDefined(planktonRow.totalCellPerMl, planktonRow.t)),
          beneficialCellPerMl: requestedReportType === "water_quality" ? null : toNumber(firstDefined(planktonRow.beneficialCellPerMl, planktonRow.good)),
          harmfulCellPerMl: requestedReportType === "water_quality" ? null : toNumber(firstDefined(planktonRow.harmfulCellPerMl, planktonRow.bad)),
          chlorophytaCellPerMl: requestedReportType === "water_quality" ? null : toNumber(firstDefined(planktonRow.chlorophytaCellPerMl, planktonRow.chlC)),
          chlorophytaPercent: requestedReportType === "water_quality" ? null : toNumber(firstDefined(planktonRow.chlorophytaPercent, planktonRow.chlP)),
          chlorophytaSpecies: requestedReportType === "water_quality" ? null : toOptionalText(firstDefined(planktonRow.chlorophytaSpecies, planktonRow.chlS)),
          cyanophytaCellPerMl: requestedReportType === "water_quality" ? null : toNumber(firstDefined(planktonRow.cyanophytaCellPerMl, planktonRow.cyaC)),
          cyanophytaPercent: requestedReportType === "water_quality" ? null : toNumber(firstDefined(planktonRow.cyanophytaPercent, planktonRow.cyaP)),
          cyanophytaSpecies: requestedReportType === "water_quality" ? null : toOptionalText(firstDefined(planktonRow.cyanophytaSpecies, planktonRow.cyaS)),
          diatomCellPerMl: requestedReportType === "water_quality" ? null : toNumber(firstDefined(planktonRow.diatomCellPerMl, planktonRow.diaC)),
          diatomPercent: requestedReportType === "water_quality" ? null : toNumber(firstDefined(planktonRow.diatomPercent, planktonRow.diaP)),
          diatomSpecies: requestedReportType === "water_quality" ? null : toOptionalText(firstDefined(planktonRow.diatomSpecies, planktonRow.diaS)),
          chrysophytaCellPerMl: requestedReportType === "water_quality" ? null : toNumber(firstDefined(
            planktonRow.chrysophytaCellPerMl,
            planktonRow.chrysophyceaeCellPerMl,
            planktonRow.goldenAlgaeCellPerMl,
            planktonRow.goldenGreenAlgaeCellPerMl,
            planktonRow.chrC,
          )),
          chrysophytaPercent: requestedReportType === "water_quality" ? null : toNumber(firstDefined(
            planktonRow.chrysophytaPercent,
            planktonRow.chrysophyceaePercent,
            planktonRow.goldenAlgaePercent,
            planktonRow.goldenGreenAlgaePercent,
            planktonRow.chrP,
          )),
          chrysophytaSpecies: requestedReportType === "water_quality" ? null : toOptionalText(firstDefined(
            planktonRow.chrysophytaSpecies,
            planktonRow.chrysophyceaeSpecies,
            planktonRow.goldenAlgaeSpecies,
            planktonRow.goldenGreenAlgaeSpecies,
            planktonRow.chrS,
          )),
          dinoflagellataCellPerMl: requestedReportType === "water_quality" ? null : toNumber(firstDefined(planktonRow.dinoflagellataCellPerMl, planktonRow.dinC)),
          dinoflagellataPercent: requestedReportType === "water_quality" ? null : toNumber(firstDefined(planktonRow.dinoflagellataPercent, planktonRow.dinP)),
          dinoflagellataSpecies: requestedReportType === "water_quality" ? null : toOptionalText(firstDefined(planktonRow.dinoflagellataSpecies, planktonRow.dinS)),
          protozoaCellPerMl: requestedReportType === "water_quality" ? null : toNumber(firstDefined(planktonRow.protozoaCellPerMl, planktonRow.proC)),
          protozoaPercent: requestedReportType === "water_quality" ? null : toNumber(firstDefined(planktonRow.protozoaPercent, planktonRow.proP)),
          protozoaSpecies: requestedReportType === "water_quality" ? null : toOptionalText(firstDefined(planktonRow.protozoaSpecies, planktonRow.proS)),
        },
      };
    });

    await reportRef.set({
      reportType: requestedReportType,
      labName: parsed.labName || report.labName || "Uploaded lab report",
      farmName: parsed.farmName || report.farmName || "",
      sampleDate: parsed.sampleDate || report.sampleDate || null,
      status: "extracted",
      pondResults,
      extraction: {
        status: "complete",
        model: LAB_EXTRACTION_MODEL,
        sourceHash,
        confidence: toNumber(parsed.confidence) ?? 0.7,
        warnings,
        extractedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    let cooldown = null;
    try {
      cooldown = await completeLabPdfExtractionUsage(labUsageRef, labUsageTypeKey, labReportId, uid);
    } catch (usageError) {
      console.error("Lab PDF extraction cooldown update failed", {
        companyId,
        labReportId,
        reportType: labUsageTypeKey,
        message: usageError.message || String(usageError),
      });
    }

    return { pondResults, warnings, cached: false, cooldown };
  } catch (error) {
    console.error("Lab report extraction failed", {
      companyId,
      labReportId,
      uid,
      sourcePdfPath: report.sourcePdfPath || null,
      message: error.message || String(error),
      code: error.code || null,
      stack: error.stack || null,
    });
    await clearLabPdfExtractionPending(labUsageRef, labUsageTypeKey, labReportId);
    await reportRef.set({
      status: "failed",
      extraction: {
        status: "failed",
        model: LAB_EXTRACTION_MODEL,
        sourceHash,
        error: error.message || String(error),
        failedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    throw new HttpsError("internal", "Failed to extract the lab report PDF.", { message: error.message || String(error) });
  }
});

exports.processConfirmedLabReport = onDocumentWritten({
  document: "companies/{companyId}/labReports/{labReportId}",
  secrets: [geminiApiKeySecret],
}, async (event) => {
  const afterSnap = event.data?.after;
  if (!afterSnap || !afterSnap.exists) return null;

  const report = afterSnap.data() || {};
  if (report.status !== "confirmed") return null;

  const { companyId, labReportId } = event.params;
  const sourceHash = getLabReportSourceHash(report);
  if (report.processing?.status === "complete" && report.processing?.sourceHash === sourceHash) {
    return { success: true, skipped: true };
  }

  const db = admin.firestore();
  const pondResults = Array.isArray(report.pondResults) ? report.pondResults : [];
  const summaries = pondResults
    .filter((result) => result && result.pondId)
    .map((result) => analyzeLabPondResult(result, report.sampleDate));
  const insights = await generateLabInsights(summaries);

  const batch = db.batch();
  const criticalCount = summaries.filter((summary) => summary.overallSeverity === "critical").length;
  const warningCount = summaries.filter((summary) => summary.overallSeverity === "warning").length;
  const overallStatus = summaries.reduce((highest, summary) => (
    SEVERITY_RANK[summary.overallSeverity] > SEVERITY_RANK[highest] ? summary.overallSeverity : highest
  ), "info");
  const reportType = report.reportType === "plankton" ? "plankton" : "water_quality";

  summaries.forEach((summary) => {
    const pondRef = db.collection("companies").doc(companyId).collection("ponds").doc(summary.pondId);
    const labSummaryRef = pondRef.collection("labSummaries").doc(labReportId);
    const displayStatus = summary.overallSeverity === "info" ? "good" : summary.overallSeverity;
    const payload = {
      companyId,
      labReportId,
      sampleDate: report.sampleDate || null,
      pondId: summary.pondId,
      pondCode: summary.pondCode,
      reportType,
      status: displayStatus,
      mainIssue: summary.mainIssue,
      keyRisks: summary.keyRisks,
      recommendations: summary.recommendations,
      findings: summary.findings,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const latestTypeStatus = {
      labReportId,
      reportType,
      sampleDate: report.sampleDate || null,
      status: displayStatus,
      mainIssue: summary.mainIssue,
      keyRisks: summary.keyRisks,
      recommendations: summary.recommendations,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    batch.set(labSummaryRef, payload, { merge: true });
    batch.set(pondRef, {
      latestLabStatus: {
        labReportId,
        reportType,
        sampleDate: report.sampleDate || null,
        status: displayStatus,
        mainIssue: summary.mainIssue,
        keyRisks: summary.keyRisks,
        recommendations: summary.recommendations,
        byType: {
          [reportType]: latestTypeStatus,
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  });

  batch.set(afterSnap.ref, {
    processing: {
      status: "complete",
      sourceHash,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    summary: {
      overallStatus: overallStatus === "info" ? "good" : overallStatus,
      warningCount,
      criticalCount,
      pondCount: summaries.length,
    },
    insights: {
      status: "complete",
      sourceHash,
      model: insights.model,
      generatedBy: insights.generatedBy,
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      ownerSummary: insights.ownerSummary,
      pondSummaries: insights.pondSummaries,
      error: insights.error || null,
    },
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  await batch.commit();

  const notifiableSummaries = summaries.filter((summary) => SEVERITY_RANK[summary.overallSeverity] >= SEVERITY_RANK.warning);
  await Promise.all(notifiableSummaries.map(async (summary) => {
    const topFinding = summary.findings
      .filter((finding) => SEVERITY_RANK[finding.severity] >= SEVERITY_RANK.warning)
      .sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity])[0];
    if (!topFinding) return false;

    return createProactiveNotification(db, {
      companyId,
      type: "orson_lab_risk",
      dedupeKey: `lab_${labReportId}_${summary.pondId}_${topFinding.id}`,
      title: `Orson Lab: ${summary.pondCode} ${topFinding.title}`,
      message: `${topFinding.summary} ${topFinding.recommendation}`,
      priority: topFinding.severity === "critical" ? "high" : "medium",
      data: {
        pondId: summary.pondId,
        pondName: summary.pondCode,
        labReportId,
        riskId: topFinding.id,
        severity: topFinding.severity,
        confidence: topFinding.confidence,
      },
    }, 30 * DAY_MS);
  }));

  return {
    success: true,
    pondCount: summaries.length,
    warningCount,
    criticalCount,
  };
});

const getRecentUsageForecast = (item, type) => {
  const usageHistory = Array.isArray(item.usageHistory) ? item.usageHistory : [];
  const sinceMs = Date.now() - (7 * DAY_MS);
  const recentUsage = usageHistory.reduce((sum, usage) => {
    const usageDate = toDate(usage.date || usage.createdAt);
    const quantity = toNumber(usage.quantity);
    if (!usageDate || usageDate.getTime() < sinceMs || quantity === null || quantity <= 0) return sum;
    return sum + quantity;
  }, 0);
  const avgDailyUsage = recentUsage / 7;
  const totalStock = toNumber(item.totalStock);
  if (totalStock === null || totalStock <= 0 || avgDailyUsage <= 0) return null;
  const daysLeft = totalStock / avgDailyUsage;
  if (!Number.isFinite(daysLeft) || daysLeft > 7) return null;

  return {
    itemId: item.id || null,
    itemName: type === "feed" ? (item.feedName || "Unnamed feed") : (item.additiveName || "Unnamed additive"),
    itemType: type,
    currentStock: round(totalStock, 2),
    avgDailyUsage: round(avgDailyUsage, 2),
    daysLeft: round(daysLeft, 1),
    unit: item.unit || "kg",
  };
};

const getCompanyInventoryForecasts = async (companyDoc) => {
  const [feedsSnapshot, additivesSnapshot] = await Promise.all([
    companyDoc.ref.collection("feeds").get().catch(() => ({ docs: [] })),
    companyDoc.ref.collection("additives").get().catch(() => ({ docs: [] })),
  ]);

  const forecasts = [];
  feedsSnapshot.docs.forEach((doc) => {
    const forecast = getRecentUsageForecast({ id: doc.id, ...(doc.data() || {}) }, "feed");
    if (forecast) forecasts.push(forecast);
  });
  additivesSnapshot.docs.forEach((doc) => {
    const forecast = getRecentUsageForecast({ id: doc.id, ...(doc.data() || {}) }, "additive");
    if (forecast) forecasts.push(forecast);
  });
  return forecasts.sort((a, b) => a.daysLeft - b.daysLeft);
};

const getNearbyActiveDiseaseReports = async (db, companyId, companyLocation) => {
  if (!isValidLocation(companyLocation)) return [];
  const sinceMs = Date.now() - (14 * DAY_MS);
  const snapshot = await db.collection("diseaseReports")
    .where("status", "==", "active")
    .get()
    .catch(() => ({ docs: [] }));

  const nearby = [];
  snapshot.docs.forEach((doc) => {
    const report = doc.data() || {};
    if (report.companyId === companyId || !isValidLocation(report.location)) return;
    const reportDate = toDate(report.reportDate || report.createdAt);
    if (!reportDate || reportDate.getTime() < sinceMs) return;
    const radiusKm = toNumber(report.notificationRadius) || 50;
    const distance = distanceKm(companyLocation, report.location);
    if (distance <= radiusKm) {
      nearby.push({
        id: doc.id,
        diseaseName: report.diseaseName || "Disease report",
        diseaseType: report.diseaseType || "unknown",
        severity: report.severity || "medium",
        reporterCompany: report.companyName || "Nearby farm",
        distanceKm: distance,
      });
    }
  });
  return nearby.sort((a, b) => a.distanceKm - b.distanceKm);
};

const diseaseAlertTitle = (diseaseName, distance) => {
  const roundedDistance = Math.round(distance * 10) / 10;
  return `Disease Alert: ${diseaseName || "Nearby outbreak"} (${roundedDistance} km away)`;
};

const diseaseAlertMessage = (report, distance) => {
  const roundedDistance = Math.round(distance * 10) / 10;
  const diseaseName = report.diseaseName || "A disease outbreak";
  const reporterCompany = report.companyName || "A nearby farm";
  const locationName = report.location?.address || "a nearby area";
  return `${diseaseName} was reported by ${reporterCompany} near ${locationName}, about ${roundedDistance} km from your farm. Review biosecurity and monitor ponds closely.`;
};

const diseaseAlertPriority = (distance, severity) => {
  if (severity === "critical" || distance <= 10) return "high";
  if (severity === "high" || severity === "warning" || distance <= 25) return "medium";
  return "low";
};

/**
 * Sends immediate nearby farm notifications after a disease report is created.
 * This must run server-side because clients should not read all company locations
 * or write notifications into other companies.
 */
exports.notifyNearbyFarmsOnDiseaseReport = onDocumentCreated("diseaseReports/{reportId}", async (event) => {
  const report = event.data?.data() || {};
  const { reportId } = event.params;

  if (!report.companyId || !isValidLocation(report.location)) {
    console.log(`Disease report ${reportId} skipped notification fan-out: missing companyId or location.`);
    return { success: true, notificationsCreated: 0, skipped: true };
  }

  const db = admin.firestore();
  const radiusKm = toNumber(report.notificationRadius) || 50;
  const companiesSnapshot = await db.collection("companies").get();
  let batch = db.batch();
  let batchWrites = 0;
  let notificationsCreated = 0;

  const commitBatch = async () => {
    if (batchWrites === 0) return;
    await batch.commit();
    batch = db.batch();
    batchWrites = 0;
  };

  for (const companyDoc of companiesSnapshot.docs) {
    const companyId = companyDoc.id;
    const company = companyDoc.data() || {};
    if (companyId === report.companyId || !isValidLocation(company.primaryLocation)) continue;

    const distance = distanceKm(report.location, company.primaryLocation);
    if (distance > radiusKm) continue;

    const notificationRef = db.collection("notifications").doc();
    const roundedDistance = Math.round(distance * 10) / 10;
    batch.set(notificationRef, {
      companyId,
      type: "disease_alert",
      title: diseaseAlertTitle(report.diseaseName, distance),
      message: diseaseAlertMessage(report, distance),
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
      priority: diseaseAlertPriority(distance, report.severity),
      dedupeKey: `disease_alert:${reportId}`,
      data: {
        reportId,
        diseaseType: report.diseaseType || "unknown",
        diseaseName: report.diseaseName || "Disease report",
        distance: roundedDistance,
        severity: report.severity || "medium",
        location: report.location.address || "",
        reporterCompany: report.companyName || "Nearby farm",
      },
    });
    batchWrites += 1;
    notificationsCreated += 1;

    if (batchWrites >= 450) {
      await commitBatch();
    }
  }

  await commitBatch();

  console.log(`Disease report ${reportId} created ${notificationsCreated} nearby farm notifications.`);
  return { success: true, notificationsCreated };
});

const summarizePondRisks = (pondsSnapshot) => {
  const reports = [];
  pondsSnapshot.docs.forEach((doc) => {
    const pond = doc.data() || {};
    if (pond.cycleStatus === "ended") return;
    const report = calculateRiskReport(pond, doc.id);
    reports.push(report);
  });

  const findings = reports.flatMap((report) => report.findings.map((finding) => ({
    pondId: report.pondId,
    pondName: report.pondName,
    ...finding,
  })));

  return {
    reports,
    warningFindings: findings.filter((finding) => SEVERITY_RANK[finding.severity] >= SEVERITY_RANK.warning),
    watchFindings: findings.filter((finding) => finding.severity === "watch"),
    biosecurityFindings: findings.filter((finding) => BIOSECURITY_RISK_IDS.has(finding.id) && SEVERITY_RANK[finding.severity] >= SEVERITY_RANK.watch),
  };
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

/**
 * Orson Daily Supervisor
 * Runs without the app open and turns Shrimply data into actionable notifications.
 */
exports.orsonDailySupervisor = onSchedule({
  schedule: "0 6 * * *",
  timeZone: "Asia/Jakarta",
  region: "us-central1",
}, async () => {
  const db = admin.firestore();
  const companiesSnapshot = await db.collection("companies").get();
  const todayKey = dayKey();
  let notificationsCreated = 0;

  for (const companyDoc of companiesSnapshot.docs) {
    const companyId = companyDoc.id;
    const company = companyDoc.data() || {};
    const companyLocation = company.primaryLocation;

    const [pondsSnapshot, inventoryForecasts, nearbyDiseaseReports] = await Promise.all([
      companyDoc.ref.collection("ponds").get().catch(() => ({ docs: [] })),
      getCompanyInventoryForecasts(companyDoc),
      getNearbyActiveDiseaseReports(db, companyId, companyLocation),
    ]);

    const riskSummary = summarizePondRisks(pondsSnapshot);
    const topRisk = riskSummary.warningFindings[0] || riskSummary.watchFindings[0] || null;
    const criticalInventory = inventoryForecasts.filter((item) => item.daysLeft <= 3);

    for (const item of inventoryForecasts) {
      const created = await createProactiveNotification(db, {
        companyId,
        type: "inventory_forecast",
        priority: item.daysLeft <= 3 ? "high" : "medium",
        title: `Orson: ${item.itemName} may run out in ${item.daysLeft} days`,
        message: `${item.itemName} has ${item.currentStock} ${item.unit} left. Recent usage averages ${item.avgDailyUsage} ${item.unit}/day, so stock may run out in about ${item.daysLeft} days.`,
        dedupeKey: `inventory_forecast:${item.itemType}:${item.itemId}:${todayKey}`,
        data: {
          itemId: item.itemId,
          itemName: item.itemName,
          itemType: item.itemType,
          currentStock: item.currentStock,
          avgDailyUsage: item.avgDailyUsage,
          daysLeft: item.daysLeft,
          unit: item.unit,
        },
      });
      if (created) notificationsCreated += 1;
    }

    if (nearbyDiseaseReports.length > 0 && riskSummary.biosecurityFindings.length > 0) {
      const disease = nearbyDiseaseReports[0];
      const finding = riskSummary.biosecurityFindings[0];
      const created = await createProactiveNotification(db, {
        companyId,
        type: "orson_biosecurity",
        priority: SEVERITY_RANK[finding.severity] >= SEVERITY_RANK.warning || disease.severity === "critical" ? "high" : "medium",
        title: `Orson: Biosecurity risk near ${finding.pondName}`,
        message: `${disease.diseaseName} was reported ${disease.distanceKm} km away, while ${finding.pondName} shows ${finding.title.toLowerCase()}. Tighten biosecurity and monitor appetite, mortality, and water quality today.`,
        dedupeKey: `orson_biosecurity:${disease.id}:${finding.pondId}:${finding.id}:${todayKey}`,
        data: {
          reportId: disease.id,
          diseaseName: disease.diseaseName,
          diseaseType: disease.diseaseType,
          distanceKm: disease.distanceKm,
          pondId: finding.pondId,
          pondName: finding.pondName,
          riskId: finding.id,
          severity: finding.severity,
        },
      });
      if (created) notificationsCreated += 1;
    }

    if (topRisk || criticalInventory.length > 0 || nearbyDiseaseReports.length > 0) {
      const briefParts = [];
      if (topRisk) {
        briefParts.push(`${topRisk.pondName}: ${topRisk.summary}`);
      }
      if (criticalInventory.length > 0) {
        briefParts.push(`${criticalInventory.length} inventory item${criticalInventory.length === 1 ? "" : "s"} may run out within 3 days.`);
      } else if (inventoryForecasts.length > 0) {
        briefParts.push(`${inventoryForecasts.length} inventory item${inventoryForecasts.length === 1 ? "" : "s"} may run out within 7 days.`);
      }
      if (nearbyDiseaseReports.length > 0) {
        briefParts.push(`${nearbyDiseaseReports.length} active disease report${nearbyDiseaseReports.length === 1 ? "" : "s"} nearby.`);
      }

      const created = await createProactiveNotification(db, {
        companyId,
        type: "orson_daily_brief",
        priority: riskSummary.warningFindings.length > 0 || criticalInventory.length > 0 ? "high" : "medium",
        title: "Orson Daily Brief",
        message: briefParts.join(" "),
        dedupeKey: `orson_daily_brief:${todayKey}`,
        data: {
          dateKey: todayKey,
          warningRiskCount: riskSummary.warningFindings.length,
          watchRiskCount: riskSummary.watchFindings.length,
          inventoryForecastCount: inventoryForecasts.length,
          criticalInventoryCount: criticalInventory.length,
          nearbyDiseaseReportCount: nearbyDiseaseReports.length,
          topPondRisk: topRisk ? {
            pondId: topRisk.pondId,
            pondName: topRisk.pondName,
            riskId: topRisk.id,
            severity: topRisk.severity,
          } : null,
        },
      }, 25 * 60 * 60 * 1000);
      if (created) notificationsCreated += 1;
    }
  }

  console.log(`Orson Daily Supervisor created ${notificationsCreated} notifications.`);
  return { success: true, notificationsCreated };
});

Object.assign(exports, require("./adminMetrics"));
