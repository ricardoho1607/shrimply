const OVERWATCH_STATES = ["insufficient", "stable", "watch", "high", "critical"];

const STATE_RANK = {
  insufficient: 0,
  stable: 1,
  watch: 2,
  high: 3,
  critical: 4,
};

const CATEGORY_LIMITS = {
  oxygen: 30,
  planktonShift: 20,
  cyanobacteria: 15,
  ph: 10,
  nutrients: 10,
  organicLoad: 10,
  shrimpResponse: 15,
  mortality: 20,
};

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const round = (value, digits = 2) => {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const timestamp = (value) => {
  const parsed = new Date(value || 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const byDateAscending = (left, right) => timestamp(left.date) - timestamp(right.date);

const median = (values) => {
  const sorted = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const midpoint = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[midpoint - 1] + sorted[midpoint]) / 2
    : sorted[midpoint];
};

const percentChange = (current, previous) => (
  Number.isFinite(current) && Number.isFinite(previous) && previous > 0
    ? ((current - previous) / previous) * 100
    : null
);

const normalizePlanktonRecord = (record = {}) => {
  const totalCellPerMl = toNumber(record.totalCellPerMl ?? record.totalPlanktonCells);
  const cyanobacteriaPercent = toNumber(record.cyanobacteriaPercent ?? record.cyanophytaPercent);
  const suppliedCyanoCells = toNumber(record.cyanobacteriaCellPerMl ?? record.cyanophytaCellPerMl);
  const calculatedCyanoCells = totalCellPerMl !== null && cyanobacteriaPercent !== null
    ? totalCellPerMl * (cyanobacteriaPercent / 100)
    : null;

  return {
    date: record.date || record.sampleDate || null,
    totalCellPerMl,
    cyanobacteriaPercent,
    cyanobacteriaCellPerMl: suppliedCyanoCells ?? calculatedCyanoCells,
    greenAlgaePercent: toNumber(record.greenAlgaePercent ?? record.chlorophytaPercent),
    diatomPercent: toNumber(record.diatomPercent),
    dinoflagellataPercent: toNumber(record.dinoflagellataPercent),
    surfaceScum: record.surfaceScum === true,
  };
};

const normalizeWaterRecord = (record = {}) => ({
  date: record.date || record.sampleDate || null,
  dawnDo: toNumber(record.dawnDo ?? record.doMorning),
  eveningDo: toNumber(record.eveningDo ?? record.doEvening),
  morningPh: toNumber(record.morningPh ?? record.phMorning),
  afternoonPh: toNumber(record.afternoonPh ?? record.phEvening),
  secchiCm: toNumber(record.secchiCm ?? record.transparencyCm ?? record.transparency),
  temperatureC: toNumber(record.temperatureC ?? record.temperature),
  salinityPpt: toNumber(record.salinityPpt ?? record.salinity),
  alkalinityMgL: toNumber(record.alkalinityMgL ?? record.alkalinityTotal),
  tanMgL: toNumber(record.tanMgL ?? record.tan),
  nh3MgL: toNumber(record.nh3MgL ?? record.nh3),
  nh4MgL: toNumber(record.nh4MgL ?? record.nh4),
  nitriteMgL: toNumber(record.nitriteMgL ?? record.nitrite ?? record.no2),
  tomMgL: toNumber(record.tomMgL ?? record.tom),
  weatherEvent: typeof record.weatherEvent === "string" ? record.weatherEvent : null,
  waterExchangePercent: toNumber(record.waterExchangePercent),
  sludgeLoad: ["low", "moderate", "high"].includes(record.sludgeLoad) ? record.sludgeLoad : null,
  surfaceScum: record.surfaceScum === true,
  shrimpBehaviour: record.shrimpBehaviour === "abnormal" ? "abnormal" : record.shrimpBehaviour === "normal" ? "normal" : null,
});

const normalizeFeedRecord = (record = {}) => {
  const feedData = record.feedData && typeof record.feedData === "object" ? record.feedData : record;
  const response = ["strong", "normal", "weak"].includes(feedData.feedingResponse)
    ? feedData.feedingResponse
    : null;
  return {
    date: record.date || feedData.date || null,
    totalDailyFeed: toNumber(feedData.totalDailyFeed),
    feedingResponse: response,
  };
};

const increasingAcross = (values, minimumNetChange = 0) => (
  values.length >= 3
  && values.every(Number.isFinite)
  && values.slice(1).every((value, index) => value > values[index])
  && values[values.length - 1] - values[0] >= minimumNetChange
);

const decreasingAcross = (values, minimumNetChange = 0) => (
  values.length >= 3
  && values.every(Number.isFinite)
  && values.slice(1).every((value, index) => value < values[index])
  && values[0] - values[values.length - 1] >= minimumNetChange
);

const unique = (items) => [...new Set(items.filter(Boolean))];

const evaluatePlanktonOverwatch = (input = {}) => {
  const planktonRecords = (Array.isArray(input.planktonRecords) ? input.planktonRecords : [])
    .map(normalizePlanktonRecord)
    .filter((record) => record.date || record.totalCellPerMl !== null || record.cyanobacteriaPercent !== null)
    .sort(byDateAscending)
    .slice(-7);
  const waterQualityRecords = (Array.isArray(input.waterQualityRecords) ? input.waterQualityRecords : [])
    .map(normalizeWaterRecord)
    .filter((record) => record.date || record.dawnDo !== null || record.morningPh !== null)
    .sort(byDateAscending)
    .slice(-7);
  const feedRecords = (Array.isArray(input.feedRecords) ? input.feedRecords : [])
    .map(normalizeFeedRecord)
    .filter((record) => record.date || record.totalDailyFeed !== null || record.feedingResponse !== null)
    .sort(byDateAscending)
    .slice(-5);

  const currentPlankton = planktonRecords[planktonRecords.length - 1] || null;
  const previousPlankton = planktonRecords[planktonRecords.length - 2] || null;
  const currentWater = [...waterQualityRecords].reverse().find((record) => (
    record.dawnDo !== null
    || record.eveningDo !== null
    || record.morningPh !== null
    || record.afternoonPh !== null
    || record.secchiCm !== null
    || record.weatherEvent !== null
    || record.sludgeLoad !== null
    || record.surfaceScum
    || record.shrimpBehaviour !== null
  )) || waterQualityRecords[waterQualityRecords.length - 1] || null;
  const currentChemistry = [...waterQualityRecords].reverse().find((record) => (
    record.alkalinityMgL !== null
    || record.tanMgL !== null
    || record.nitriteMgL !== null
    || record.tomMgL !== null
  )) || null;
  const recentPlankton = planktonRecords.slice(-3);
  const recentWater = waterQualityRecords.slice(-3);
  const currentFeed = [...feedRecords].reverse().find((record) => record.feedingResponse !== null)
    || feedRecords[feedRecords.length - 1]
    || null;

  const previousTotals = planktonRecords.slice(0, -1).slice(-5).map((record) => record.totalCellPerMl);
  const pondBaselineTotal = median(previousTotals);
  const planktonChangePercent = currentPlankton && previousPlankton
    ? percentChange(currentPlankton.totalCellPerMl, previousPlankton.totalCellPerMl)
    : null;
  const baselineChangePercent = currentPlankton
    ? percentChange(currentPlankton.totalCellPerMl, pondBaselineTotal)
    : null;
  const cyanoChangePercentagePoints = currentPlankton && previousPlankton
    && currentPlankton.cyanobacteriaPercent !== null
    && previousPlankton.cyanobacteriaPercent !== null
    ? currentPlankton.cyanobacteriaPercent - previousPlankton.cyanobacteriaPercent
    : null;
  const phSwing = currentWater && currentWater.morningPh !== null && currentWater.afternoonPh !== null
    ? currentWater.afternoonPh - currentWater.morningPh
    : null;
  const overnightDoDrop = currentWater && currentWater.eveningDo !== null && currentWater.dawnDo !== null
    ? currentWater.eveningDo - currentWater.dawnDo
    : null;

  const cyanoTrend = recentPlankton.map((record) => record.cyanobacteriaPercent);
  const greenTrend = recentPlankton.map((record) => record.greenAlgaePercent);
  const diatomTrend = recentPlankton.map((record) => record.diatomPercent);
  const dawnDoTrend = recentWater.map((record) => record.dawnDo).filter((value) => value !== null);
  const secchiTrend = recentWater.map((record) => record.secchiCm).filter((value) => value !== null);
  const cyanoIncreasing = increasingAcross(cyanoTrend, 5);
  const greenDecreasing = decreasingAcross(greenTrend, 5);
  const diatomDecreasing = decreasingAcross(diatomTrend, 5);
  const communityShift = cyanoIncreasing && (greenDecreasing || diatomDecreasing);
  const dawnDoDeclining = dawnDoTrend.length >= 2
    && dawnDoTrend[dawnDoTrend.length - 1] <= dawnDoTrend[0] - 0.3;
  const secchiFalling = secchiTrend.length >= 2
    && secchiTrend[secchiTrend.length - 1] <= secchiTrend[0] - Math.max(5, secchiTrend[0] * 0.2);
  const rapidPlanktonRise = planktonChangePercent !== null && planktonChangePercent >= 50;
  const rapidPlanktonDecline = planktonChangePercent !== null && planktonChangePercent <= -35;

  const nutrientContext = input.nutrients && typeof input.nutrients === "object" ? input.nutrients : {};
  const dinMolar = toNumber(nutrientContext.dinMolar);
  const dipMolar = toNumber(nutrientContext.dipMolar);
  const nToPRatioMethod = nutrientContext.ratioMethod === "molar_din_to_dip"
    ? "molar_din_to_dip"
    : null;
  const nToPRatio = nToPRatioMethod && dinMolar !== null && dipMolar !== null && dipMolar > 0
    ? dinMolar / dipMolar
    : null;

  const categories = Object.fromEntries(Object.keys(CATEGORY_LIMITS).map((key) => [key, 0]));
  const signals = [];
  const addSignal = ({ id, category, points, severity = "watch", title, evidence, recommendation }) => {
    if (!CATEGORY_LIMITS[category] || points <= 0) return;
    categories[category] = Math.min(CATEGORY_LIMITS[category], categories[category] + points);
    signals.push({ id, category, points, severity, title, evidence, recommendation });
  };

  const dawnDo = currentWater?.dawnDo ?? null;
  if (dawnDo !== null && dawnDo < 4) {
    addSignal({
      id: "dawn_do_below_4",
      category: "oxygen",
      points: dawnDo < 3 ? 30 : 24,
      severity: dawnDoDeclining || dawnDo < 3 ? "critical" : "high",
      title: "Dawn dissolved oxygen is low",
      evidence: `Dawn DO is ${round(dawnDo, 2)} mg/L${dawnDoDeclining ? " and the recent trend is declining" : ""}.`,
      recommendation: "Protect oxygen supply immediately and monitor DO repeatedly before dawn.",
    });
  } else if (dawnDo !== null && dawnDo < 5) {
    addSignal({
      id: "dawn_do_watch",
      category: "oxygen",
      points: 15,
      title: "Dawn dissolved oxygen needs attention",
      evidence: `Dawn DO is ${round(dawnDo, 2)} mg/L.`,
      recommendation: "Recheck dawn DO and review overnight aeration coverage.",
    });
  }
  if (dawnDoDeclining) {
    addSignal({
      id: "dawn_do_declining",
      category: "oxygen",
      points: 8,
      severity: dawnDo !== null && dawnDo < 4 ? "critical" : "watch",
      title: "Dawn oxygen is trending downward",
      evidence: `Recent dawn DO moved from ${round(dawnDoTrend[0], 2)} to ${round(dawnDoTrend[dawnDoTrend.length - 1], 2)} mg/L.`,
      recommendation: "Prepare aeration earlier and repeat the pre-dawn check.",
    });
  }
  if (overnightDoDrop !== null && overnightDoDrop > 1) {
    addSignal({
      id: "overnight_do_drop",
      category: "oxygen",
      points: overnightDoDrop > 2 ? 8 : 4,
      title: "Overnight oxygen decline is elevated",
      evidence: `Evening-to-dawn DO fell by ${round(overnightDoDrop, 2)} mg/L.`,
      recommendation: "Review overnight aeration timing and organic oxygen demand.",
    });
  }

  if (rapidPlanktonRise || rapidPlanktonDecline) {
    addSignal({
      id: rapidPlanktonRise ? "rapid_plankton_rise" : "rapid_plankton_decline",
      category: "planktonShift",
      points: rapidPlanktonDecline ? 12 : 10,
      severity: rapidPlanktonDecline && dawnDoDeclining ? "critical" : "watch",
      title: rapidPlanktonRise ? "Plankton density rose rapidly" : "Plankton density fell rapidly",
      evidence: `Total plankton changed by ${round(planktonChangePercent, 1)}% from the previous result.`,
      recommendation: rapidPlanktonDecline
        ? "Watch oxygen closely and avoid actions that could kill the remaining bloom suddenly."
        : "Recheck Secchi depth, dawn DO, and plankton composition against this pond's baseline.",
    });
  }
  if (baselineChangePercent !== null && Math.abs(baselineChangePercent) >= 50) {
    addSignal({
      id: "plankton_outside_pond_baseline",
      category: "planktonShift",
      points: 8,
      title: "Plankton is outside this pond's recent baseline",
      evidence: `Current density is ${round(Math.abs(baselineChangePercent), 1)}% ${baselineChangePercent > 0 ? "above" : "below"} the recent pond median.`,
      recommendation: "Compare the next result with this pond's own recent range rather than a universal cell-count threshold.",
    });
  }
  if (communityShift) {
    addSignal({
      id: "community_shift_to_cyanobacteria",
      category: "planktonShift",
      points: 12,
      severity: "high",
      title: "Community shift toward cyanobacteria detected",
      evidence: "Cyanobacteria increased across three results while green algae and/or diatoms declined.",
      recommendation: "Review dawn DO, pH swing, Secchi depth, and organic loading for the same period.",
    });
  }
  if (secchiFalling) {
    addSignal({
      id: "secchi_falling",
      category: "planktonShift",
      points: 5,
      title: "Secchi depth is falling",
      evidence: `Secchi depth moved from ${round(secchiTrend[0], 1)} to ${round(secchiTrend[secchiTrend.length - 1], 1)} cm.`,
      recommendation: "Recheck bloom density and water colour while monitoring dawn oxygen.",
    });
  }

  if (cyanoIncreasing) {
    addSignal({
      id: "cyanobacteria_increasing",
      category: "cyanobacteria",
      points: 10,
      severity: "high",
      title: "Cyanobacteria are increasing repeatedly",
      evidence: `Cyanobacteria moved from ${round(cyanoTrend[0], 1)}% to ${round(cyanoTrend[cyanoTrend.length - 1], 1)}% across three results.`,
      recommendation: "Track both cyanobacteria percentage and absolute cell load with dawn DO.",
    });
  }
  if (currentPlankton && currentPlankton.cyanobacteriaPercent !== null && currentPlankton.cyanobacteriaPercent >= 20) {
    addSignal({
      id: "cyanobacteria_share_elevated",
      category: "cyanobacteria",
      points: 5,
      title: "Cyanobacteria share is elevated",
      evidence: `Cyanobacteria are ${round(currentPlankton.cyanobacteriaPercent, 1)}% (${round(currentPlankton.cyanobacteriaCellPerMl, 0) ?? "unknown"} cells/mL).`,
      recommendation: "Use this as supporting evidence only; confirm the trend and other water-quality signals.",
    });
  }

  if (phSwing !== null && phSwing > 0.5) {
    addSignal({
      id: "ph_swing_high",
      category: "ph",
      points: phSwing > 0.8 ? 8 : 5,
      title: "Daily pH swing is widening",
      evidence: `Morning-to-afternoon pH increased by ${round(phSwing, 2)}.`,
      recommendation: "Recheck morning and afternoon pH and review alkalinity and bloom stability.",
    });
  }
  if (currentWater && currentWater.afternoonPh !== null && currentWater.afternoonPh > 8.8) {
    addSignal({
      id: "afternoon_ph_high",
      category: "ph",
      points: 4,
      title: "Afternoon pH is high",
      evidence: `Afternoon pH is ${round(currentWater.afternoonPh, 2)}.`,
      recommendation: "Check TAN because ammonia risk increases as pH rises.",
    });
  }

  if (currentChemistry && currentChemistry.tanMgL !== null && currentChemistry.tanMgL >= 0.5) {
    addSignal({
      id: "tan_elevated",
      category: "nutrients",
      points: currentWater?.afternoonPh !== null && currentWater?.afternoonPh !== undefined && currentWater.afternoonPh > 8.8 ? 8 : 5,
      severity: currentWater?.afternoonPh !== null && currentWater?.afternoonPh !== undefined && currentWater.afternoonPh > 8.8 ? "high" : "watch",
      title: "TAN is elevated",
      evidence: `TAN result is ${round(currentChemistry.tanMgL, 3)} mg/L${currentWater?.afternoonPh > 8.8 ? " with high afternoon pH" : ""}.`,
      recommendation: "Review feed waste and organic load, and interpret ammonia risk with pH and temperature.",
    });
  }
  if (currentChemistry && currentChemistry.nh4MgL !== null && currentChemistry.nh4MgL >= 0.5) {
    addSignal({
      id: "nh4_elevated",
      category: "nutrients",
      points: currentChemistry.nh4MgL >= 1 ? 6 : 4,
      title: "Ammonium is elevated",
      evidence: `NH4 result is ${round(currentChemistry.nh4MgL, 3)} mg/L.`,
      recommendation: "Review feed waste and organic load, and do not interpret NH4 as TAN or toxic NH3 without the matching lab values.",
    });
  }
  if (currentChemistry && currentChemistry.nitriteMgL !== null && currentChemistry.nitriteMgL >= 0.5) {
    addSignal({
      id: "nitrite_elevated",
      category: "nutrients",
      points: 6,
      title: "Nitrite is elevated",
      evidence: `Nitrite result is ${round(currentChemistry.nitriteMgL, 3)} mg/L.`,
      recommendation: "Strengthen monitoring, aeration, and organic-load control before increasing feed.",
    });
  }
  if (nToPRatio !== null && (nToPRatio < 10 || nToPRatio > 25)) {
    addSignal({
      id: "np_ratio_signal",
      category: "nutrients",
      points: 3,
      title: "Molar DIN:DIP ratio is outside the ecological reference range",
      evidence: `Molar DIN:DIP is ${round(nToPRatio, 1)}:1.`,
      recommendation: "Treat N:P as supporting context only; do not diagnose a bloom or add nutrients from this ratio alone.",
    });
  }

  const sludgeLoad = currentWater?.sludgeLoad ?? input.sludgeLoad ?? null;
  const tomMgL = currentChemistry?.tomMgL ?? toNumber(input.tomMgL);
  if (sludgeLoad === "high") {
    addSignal({
      id: "sludge_load_high",
      category: "organicLoad",
      points: 6,
      title: "Sludge load is high",
      evidence: "The latest pond observation records heavy sludge accumulation.",
      recommendation: "Remove accumulated sludge where pond design and farm practice allow.",
    });
  }
  if (tomMgL !== null && tomMgL > 80) {
    addSignal({
      id: "organic_matter_high",
      category: "organicLoad",
      points: tomMgL > 100 ? 6 : 4,
      title: "Organic matter is elevated",
      evidence: `Total organic matter is ${round(tomMgL, 1)} mg/L.`,
      recommendation: "Inspect feed waste, sludge, and decomposition pressure while protecting oxygen.",
    });
  }

  const feedingResponse = currentFeed?.feedingResponse ?? null;
  const shrimpBehaviour = currentWater?.shrimpBehaviour ?? input.shrimpBehaviour ?? null;
  if (feedingResponse === "weak") {
    addSignal({
      id: "feeding_response_weak",
      category: "shrimpResponse",
      points: 10,
      severity: dawnDo !== null && dawnDo < 4.5 ? "high" : "watch",
      title: "Feeding response is weak",
      evidence: "The latest direct tray or pond observation records weak feeding response.",
      recommendation: "Reassess the next ration from direct response, biomass, and water quality; do not apply an automatic fixed reduction.",
    });
  }
  if (shrimpBehaviour === "abnormal") {
    addSignal({
      id: "shrimp_behaviour_abnormal",
      category: "shrimpResponse",
      points: 15,
      severity: "high",
      title: "Abnormal shrimp behaviour was observed",
      evidence: "The latest pond observation records abnormal shrimp behaviour.",
      recommendation: "Inspect shrimp immediately and cross-check oxygen, mortality, and water-quality conditions.",
    });
  }

  const initialPopulation = toNumber(input.initialPopulation);
  const latestMortality = toNumber(input.latestMortality);
  const mortalityEscalation = input.mortalityEscalation === true
    || (latestMortality !== null && latestMortality > Math.max(100, (initialPopulation || 0) * 0.002));
  if (mortalityEscalation) {
    addSignal({
      id: "mortality_escalation",
      category: "mortality",
      points: dawnDo !== null && dawnDo < 4 ? 20 : 15,
      severity: dawnDo !== null && dawnDo < 4 ? "critical" : "high",
      title: "Mortality is escalating",
      evidence: latestMortality !== null ? `Latest mortality is ${round(latestMortality, 0)} shrimp.` : "Mortality escalation was recorded.",
      recommendation: "Escalate pond inspection and protect oxygen while checking disease and water-quality causes.",
    });
  }

  const surfaceScum = currentPlankton?.surfaceScum === true || currentWater?.surfaceScum === true || input.surfaceScum === true;
  if (surfaceScum) {
    addSignal({
      id: "surface_scum_observed",
      category: "cyanobacteria",
      points: 7,
      severity: feedingResponse === "weak" || shrimpBehaviour === "abnormal" ? "critical" : "high",
      title: "Surface scum was observed",
      evidence: "A plankton or surface-scum event was recorded for the pond.",
      recommendation: "Protect oxygen and verify plankton composition; avoid sudden chemical bloom-kill actions.",
    });
  }

  const score = Object.values(categories).reduce((sum, value) => sum + value, 0);
  const activeCategories = Object.values(categories).filter((value) => value > 0).length;
  const criticalOverride = (dawnDo !== null && dawnDo < 4 && dawnDoDeclining)
    || (rapidPlanktonDecline && dawnDoDeclining)
    || (surfaceScum && (feedingResponse === "weak" || shrimpBehaviour === "abnormal"))
    || (mortalityEscalation && dawnDo !== null && dawnDo < 4);

  let state = score <= 20 ? "stable" : score <= 40 ? "watch" : score <= 65 ? "high" : "critical";
  if (state === "high" && activeCategories < 2) state = "watch";
  if (state === "critical" && activeCategories < 2) state = "high";
  if (criticalOverride) state = "critical";

  const dataChecks = {
    hasPlanktonDensity: currentPlankton?.totalCellPerMl !== null && currentPlankton?.totalCellPerMl !== undefined,
    hasPlanktonComposition: currentPlankton?.cyanobacteriaPercent !== null && currentPlankton?.cyanobacteriaPercent !== undefined,
    hasDawnDo: dawnDo !== null,
    hasDailyPhPair: currentWater?.morningPh !== null && currentWater?.morningPh !== undefined
      && currentWater?.afternoonPh !== null && currentWater?.afternoonPh !== undefined,
    hasTrendHistory: planktonRecords.length >= 3 && waterQualityRecords.length >= 2,
    hasDirectFeedingResponse: feedingResponse !== null,
  };
  const minimumStableData = dataChecks.hasPlanktonDensity
    && dataChecks.hasPlanktonComposition
    && dataChecks.hasDawnDo
    && dataChecks.hasDailyPhPair;
  if (state === "stable" && !minimumStableData) state = "insufficient";

  const missing = [];
  if (!dataChecks.hasPlanktonDensity) missing.push("total plankton density");
  if (!dataChecks.hasPlanktonComposition) missing.push("plankton composition");
  if (!dataChecks.hasDawnDo) missing.push("dawn dissolved oxygen");
  if (!dataChecks.hasDailyPhPair) missing.push("morning and afternoon pH");
  if (!dataChecks.hasTrendHistory) missing.push("enough trend history");

  const defaultActions = {
    insufficient: [
      "Record dawn DO and paired morning/afternoon pH.",
      "Add a plankton result with total density and composition.",
    ],
    stable: [
      "Continue normal monitoring.",
      "Keep recording dawn DO, pH, Secchi depth, and feeding response.",
    ],
    watch: [
      "Recheck dawn DO and paired morning/afternoon pH.",
      "Review plankton composition, Secchi depth, feeding response, TAN, and nitrite.",
    ],
    high: [
      "Increase or optimise aeration, especially overnight.",
      "Reassess feed using direct feeding response and estimated biomass.",
      "Inspect sludge and stop unnecessary nutrient additions.",
      "Consider controlled water exchange only when replacement water is suitable and biosecure.",
    ],
    critical: [
      "Protect oxygen supply immediately and monitor DO repeatedly.",
      "Avoid sudden chemical bloom-kill actions.",
      "Reassess feeding and reduce unnecessary organic loading.",
      "Inspect shrimp behaviour and mortality, and check TAN and nitrite.",
    ],
  };
  const recommendations = unique([
    ...defaultActions[state],
    ...signals
      .slice()
      .sort((left, right) => right.points - left.points)
      .map((signal) => signal.recommendation),
  ]).slice(0, 6);

  const stateMessages = {
    insufficient: "Not enough data is available to judge plankton stability safely.",
    stable: "Plankton and water-quality conditions are currently stable.",
    watch: "Plankton conditions are becoming unstable and need closer monitoring.",
    high: "Plankton instability risk is high, with signs of bloom stress or increasing nighttime oxygen demand.",
    critical: "Possible bloom instability or oxygen depletion. Protect shrimp oxygen supply immediately.",
  };

  return {
    version: 1,
    state,
    stateRank: STATE_RANK[state],
    score,
    categories,
    message: stateMessages[state],
    signals: signals.sort((left, right) => right.points - left.points),
    recommendations,
    metrics: {
      totalPlanktonCellPerMl: currentPlankton?.totalCellPerMl ?? null,
      cyanobacteriaPercent: currentPlankton?.cyanobacteriaPercent ?? null,
      cyanobacteriaCellPerMl: currentPlankton?.cyanobacteriaCellPerMl ?? null,
      planktonChangePercent: round(planktonChangePercent, 1),
      pondBaselineTotalCellPerMl: round(pondBaselineTotal, 0),
      baselineChangePercent: round(baselineChangePercent, 1),
      cyanoChangePercentagePoints: round(cyanoChangePercentagePoints, 1),
      dawnDo: round(dawnDo, 2),
      overnightDoDrop: round(overnightDoDrop, 2),
      morningPh: round(currentWater?.morningPh ?? null, 2),
      afternoonPh: round(currentWater?.afternoonPh ?? null, 2),
      phSwing: round(phSwing, 2),
      secchiCm: round(currentWater?.secchiCm ?? null, 1),
      feedingResponse,
      nToPRatio: round(nToPRatio, 1),
      nToPRatioMethod,
    },
    trends: {
      cyanoIncreasing,
      communityShift,
      dawnDoDeclining,
      secchiFalling,
      rapidPlanktonRise,
      rapidPlanktonDecline,
    },
    dataQuality: {
      status: minimumStableData ? (dataChecks.hasTrendHistory ? "good" : "limited") : "insufficient",
      checks: dataChecks,
      missing,
    },
    sourceDates: {
      plankton: currentPlankton?.date ?? null,
      waterQuality: currentWater?.date ?? null,
      chemistry: currentChemistry?.date ?? null,
      feedingResponse: currentFeed?.date ?? null,
    },
  };
};

module.exports = {
  CATEGORY_LIMITS,
  OVERWATCH_STATES,
  STATE_RANK,
  evaluatePlanktonOverwatch,
  normalizeFeedRecord,
  normalizePlanktonRecord,
  normalizeWaterRecord,
};
