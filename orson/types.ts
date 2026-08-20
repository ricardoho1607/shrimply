export type OrsonNumber = number | null;

export interface OrsonNormalizedFeedData {
  totalDailyFeedKg: OrsonNumber;
  inventoryFeedId: string | null;
  feedingResponse: 'strong' | 'normal' | 'weak' | null;
}

export type OrsonAnalysisMode = 'standard' | 'mortality_diagnostic';

export type OrsonLabStatusLevel = 'good' | 'info' | 'watch' | 'warning' | 'critical';

export interface OrsonLabMetrics {
  schemaVersion: 2;
  waterQuality: {
    date: string | null;
    salinityPpt: OrsonNumber;
    alkalinityMgL: OrsonNumber;
    tanMgL: OrsonNumber;
    nh3MgL: OrsonNumber;
    nh4MgL: OrsonNumber;
    nitriteMgL: OrsonNumber;
    tomMgL: OrsonNumber;
  } | null;
  microbiology: {
    date: string | null;
    vibrioYellow: OrsonNumber;
    vibrioGreen: OrsonNumber;
    vibrioTotal: OrsonNumber;
    tbc: OrsonNumber;
  } | null;
  plankton: {
    date: string | null;
    totalCellPerMl: OrsonNumber;
    beneficialCellPerMl: OrsonNumber;
    harmfulCellPerMl: OrsonNumber;
    greenAlgaeCellPerMl: OrsonNumber;
    greenAlgaePercent: OrsonNumber;
    cyanobacteriaCellPerMl: OrsonNumber;
    cyanobacteriaPercent: OrsonNumber;
    diatomCellPerMl: OrsonNumber;
    diatomPercent: OrsonNumber;
    dinoflagellataCellPerMl: OrsonNumber;
    dinoflagellataPercent: OrsonNumber;
  } | null;
}

export interface OrsonLabStatusSummary {
  labReportId: string | null;
  reportType: string | null;
  sampleDate: string | null;
  status: OrsonLabStatusLevel | null;
  mainIssue: string | null;
  keyRisks: string[];
  recommendations: string[];
  cycleId?: string | null;
  pondCycleId?: string | null;
  metrics?: OrsonLabMetrics | null;
}

export interface OrsonLabContext {
  latest: OrsonLabStatusSummary | null;
  byType: OrsonLabStatusSummary[];
  unresolvedRisks: string[];
  recommendations: string[];
  worstStatus: OrsonLabStatusLevel | null;
}

export interface OrsonPlanktonOverwatchContext {
  state: 'insufficient' | 'stable' | 'watch' | 'high' | 'critical';
  message: string;
  signals: { id: string; evidence: string; recommendation: string }[];
  recommendations: string[];
  missingData: string[];
  sourceDate: string | null;
  metrics: {
    totalPlanktonCellPerMl: OrsonNumber;
    cyanobacteriaPercent: OrsonNumber;
    cyanobacteriaCellPerMl: OrsonNumber;
    planktonChangePercent: OrsonNumber;
    dawnDo: OrsonNumber;
    phSwing: OrsonNumber;
    feedingResponse: 'strong' | 'normal' | 'weak' | null;
  };
}

export type OrsonRecordKind = 'sampling' | 'mortality' | 'water_quality' | 'feed' | 'harvest' | 'unknown';

export interface OrsonNormalizedRecord {
  id: string | null;
  date: string | null;
  timestampMs: number | null;
  doc: number | null;
  kinds: OrsonRecordKind[];
  mbwG: OrsonNumber;
  mortalityCount: OrsonNumber;
  mortalityObservedCount: OrsonNumber;
  mortalityObservationType: 'estimated_total' | 'observed_recovered' | 'none_observed' | null;
  mortalityNotes: string | null;
  feedKg: OrsonNumber;
  phMorning: OrsonNumber;
  phEvening: OrsonNumber;
  doMorning: OrsonNumber;
  doEvening: OrsonNumber;
  salinityPpt: OrsonNumber;
  transparencyCm: OrsonNumber;
  temperatureC: OrsonNumber;
  weatherEvent: 'rain' | 'heavy_rain' | 'sudden_cloud' | null;
  waterExchangePercent: OrsonNumber;
  sludgeLoad: 'low' | 'moderate' | 'high' | null;
  surfaceScum: boolean | null;
  shrimpBehaviour: 'normal' | 'abnormal' | null;
  feedData: OrsonNormalizedFeedData | null;
  isBaselineEstimate: boolean;
  missingFields: string[];
}

export interface OrsonNormalizedPond {
  id: string | null;
  pondName: string;
  docStartDate: string | null;
  docStartTimestampMs: number | null;
  currentDoc: number | null;
  pondAreaM2: OrsonNumber;
  densityPerM2: OrsonNumber;
  initialPopulation: OrsonNumber;
  initialWeightG: OrsonNumber;
  totalHarvestedBiomassKg: OrsonNumber;
  totalHarvestedPopulation: OrsonNumber;
  totalHarvestedFeedKg: OrsonNumber;
  partialHarvestCount: OrsonNumber;
  postHarvestBaselineDate: string | null;
  postHarvestRemainingBiomassKg: OrsonNumber;
  postHarvestRemainingPopulation: OrsonNumber;
  postHarvestReferenceSamplingId: string | null;
  postHarvestReferenceSamplingDate: string | null;
  postHarvestReferenceMbwG: OrsonNumber;
  cycleStartMode: 'new' | 'midcycle';
  baselineDate: string | null;
  baselineDoc: OrsonNumber;
  baselineMbwG: OrsonNumber;
  baselineEstimatedPopulation: OrsonNumber;
  baselineSurvivalRate: OrsonNumber;
  baselineCumulativeFeedKg: OrsonNumber;
  baselineSource: string | null;
  supplier: string | null;
  cycleId: string | null;
  pondCycleId: string | null;
  cycleStatus: 'active' | 'ended';
  labContext: OrsonLabContext;
  planktonOverwatch: OrsonPlanktonOverwatchContext | null;
  treatments: OrsonPromptTreatmentEvent[];
  historicalBenchmark: OrsonPromptHistoricalBenchmark | null;
  records: OrsonNormalizedRecord[];
  missingFields: string[];
}

export interface OrsonNormalizeOptions {
  now?: Date;
}

export interface OrsonTrendResult {
  first: OrsonNumber;
  last: OrsonNumber;
  delta: OrsonNumber;
  slopePerDay: OrsonNumber;
  direction: 'up' | 'down' | 'flat' | 'unknown';
  points: number;
}

export interface OrsonDataCompleteness {
  score: number;
  presentFields: string[];
  missingFields: string[];
}

export interface OrsonRangeEstimate {
  low: OrsonNumber;
  expected: OrsonNumber;
  high: OrsonNumber;
}

export interface OrsonSurvivalAssumption {
  lowPercent: OrsonNumber;
  expectedPercent: OrsonNumber;
  highPercent: OrsonNumber;
  confidence: 'low' | 'medium' | 'high';
  reason: string;
}

export interface OrsonCalibrationAdjustment {
  adgMultiplier: number;
  survivalOffsetPercentagePoints: number;
  biomassMultiplier: number;
  sampleSize: number;
}

export interface OrsonPondCalibrationAdjustment extends OrsonCalibrationAdjustment {
  pondName: string;
  pondNameKey: string;
}

export interface OrsonCalibrationProfile {
  schemaVersion: 1;
  versionNumber: number;
  versionId: string;
  status: 'default' | 'active';
  companyAdjustment: OrsonCalibrationAdjustment;
  pondAdjustments: OrsonPondCalibrationAdjustment[];
  eligibleOutcomeCount: number;
  trainingOutcomeCount: number;
  validationOutcomeCount: number;
  previousScore: number | null;
  validationScore: number | null;
  updatedAt?: unknown;
}

export interface OrsonFeedBiomassModel {
  feedRatePercent: OrsonNumber;
  expectedFeedKg: OrsonNumber;
  actualFeedKg: OrsonNumber;
  feedPressureRatio: OrsonNumber;
  feedBasedPopulation: OrsonNumber;
  feedBasedBiomassKg: OrsonNumber;
  populationRange: OrsonRangeEstimate;
  biomassRangeKg: OrsonRangeEstimate;
  survivalAssumption: OrsonSurvivalAssumption;
  warnings: string[];
}

export interface OrsonPondMetrics {
  pondId: string | null;
  pondName: string;
  currentDoc: number | null;
  latestMbwG: OrsonNumber;
  latestMbwDate: string | null;
  adgGPerDay: OrsonNumber;
  smoothedAdgGPerDay: OrsonNumber;
  growthConfidence: 'low' | 'medium' | 'high';
  mbwOutlierDates: string[];
  totalFeedKg: number;
  baselineFeedKg: number;
  operationalFeedKg: number;
  hasMidcycleBaseline: boolean;
  baselineDate: string | null;
  dataAssumptions: string[];
  totalMortalityCount: number;
  estimatedCurrentPopulation: OrsonNumber;
  estimatedSurvivalPercent: OrsonNumber;
  estimatedBiomassKg: OrsonNumber;
  feedBiomassModel: OrsonFeedBiomassModel;
  biomassGainKg: OrsonNumber;
  fcr: OrsonNumber;
  latestPhMorning: OrsonNumber;
  latestPhEvening: OrsonNumber;
  phSwingLatest: OrsonNumber;
  phSwingTrend: OrsonTrendResult;
  doMinimumLatest: OrsonNumber;
  doMinimumTrend: OrsonTrendResult;
  latestTemperatureC: OrsonNumber;
  latestTransparencyCm: OrsonNumber;
  salinityTrend: OrsonTrendResult;
  feedAllocationTrend: OrsonTrendResult;
  mortalityTrend: OrsonTrendResult;
  latestMortalityCount: OrsonNumber;
  latestMortalityDate: string | null;
  latestMortalityPercent: OrsonNumber;
  labContext: OrsonLabContext;
  planktonOverwatch: OrsonPlanktonOverwatchContext | null;
  dailyRecords14d: OrsonPromptDailyRecord[];
  recentLabReports: OrsonPromptLabReport[];
  recentTreatments: OrsonPromptTreatmentEvent[];
  historicalBenchmark: OrsonPromptHistoricalBenchmark | null;
  dataCompleteness: OrsonDataCompleteness;
  calibration: {
    versionId: string;
    scope: 'default' | 'company' | 'pond';
    sampleSize: number;
  };
}

export type OrsonRiskSeverity = 'info' | 'watch' | 'warning' | 'critical';

export type OrsonRiskId =
  | 'low_do'
  | 'unsafe_ph'
  | 'ph_instability'
  | 'do_decline'
  | 'feed_allocation_drop'
  | 'slow_growth'
  | 'high_fcr'
  | 'feed_pressure_high'
  | 'feed_pressure_low'
  | 'biomass_model_disagreement'
  | 'mortality_spike'
  | 'mbw_outlier'
  | 'low_do_high_temperature'
  | 'high_ph_high_tan'
  | 'low_do_high_tan'
  | 'nh3_elevated'
  | 'high_nitrite_low_do'
  | 'low_alkalinity_high_ph_swing'
  | 'plankton_transparency_instability'
  | 'salinity_shock'
  | 'lab_report_risk'
  | 'cross_parameter_risk'
  | 'missing_data';

export interface OrsonRiskFinding {
  id: OrsonRiskId;
  severity: OrsonRiskSeverity;
  confidence: number;
  title: string;
  summary: string;
  evidence: string[];
  recommendation: string;
  metricRefs: string[];
}

export interface OrsonRiskReport {
  pondId: string | null;
  pondName: string;
  overallSeverity: OrsonRiskSeverity;
  findings: OrsonRiskFinding[];
  generatedAt: string;
}

export type OrsonOutlookDirection = 'improving' | 'stable' | 'watch' | 'deteriorating' | 'critical';

export interface Orson72HourOutlook {
  pondId: string | null;
  pondName: string;
  direction: OrsonOutlookDirection;
  level: OrsonRiskSeverity;
  confidence: number;
  summary: string;
  topReason: string;
  nextAction: string;
  supportingFindings: OrsonRiskId[];
  generatedAt: string;
}

export interface OrsonPromptDailyRecord {
  date: string;
  doc: number | null;
  feedKg: OrsonNumber;
  mbwG: OrsonNumber;
  mortalityCount: OrsonNumber;
  doMorning: OrsonNumber;
  doEvening: OrsonNumber;
  doMinimumMgL: OrsonNumber;
  phMorning: OrsonNumber;
  phEvening: OrsonNumber;
  phSwing: OrsonNumber;
  salinityPpt: OrsonNumber;
  temperatureC?: OrsonNumber;
  transparencyCm?: OrsonNumber;
  feedingResponse?: 'strong' | 'normal' | 'weak' | null;
  weatherEvent?: 'rain' | 'heavy_rain' | 'sudden_cloud' | null;
  waterExchangePercent?: OrsonNumber;
  sludgeLoad?: 'low' | 'moderate' | 'high' | null;
  surfaceScum?: boolean | null;
  shrimpBehaviour?: 'normal' | 'abnormal' | null;
}

export interface OrsonPromptLabReport {
  sampleDate: string | null;
  reportType: string | null;
  status: OrsonLabStatusLevel | null;
  mainIssue: string | null;
  keyRisks: string[];
  recommendations: string[];
}

export interface OrsonPromptTreatmentEvent {
  id: string;
  date: string;
  additiveName: string;
  category: string | null;
  quantity: OrsonNumber;
  unit: string | null;
  ppm: OrsonNumber;
  pondVolumeLiters: OrsonNumber;
  notes: string | null;
}

export interface OrsonPromptHistoricalBenchmark {
  completedCycleCount: number;
  averageFinalMbwG: OrsonNumber;
  averageAdgGPerDay: OrsonNumber;
  averageFcr: OrsonNumber;
  averageSurvivalPercent: OrsonNumber;
}

export interface OrsonComparativePondMetric {
  pondName: string;
  currentDoc: number | null;
  mbwG: OrsonNumber;
  adgGPerDay: OrsonNumber;
  biomassKg: OrsonNumber;
  survivalPercent: OrsonNumber;
  fcr: OrsonNumber;
  doMinimumLatest: OrsonNumber;
  feedPressureRatio: OrsonNumber;
  feedAllocationTrend: string;
  overallSeverity: OrsonRiskSeverity;
}

export interface OrsonPromptPondPayload {
  pondId: string | null;
  pondName: string;
  currentDoc: number | null;
  latestMbwG: OrsonNumber;
  adgGPerDay: OrsonNumber;
  smoothedAdgGPerDay: OrsonNumber;
  growthConfidence: 'low' | 'medium' | 'high';
  fcr: OrsonNumber;
  mbwOutlierDates: string[];
  biomassKg: OrsonNumber;
  biomassRangeKg: OrsonRangeEstimate;
  survivalPercent: OrsonNumber;
  survivalConfidence: OrsonSurvivalAssumption['confidence'];
  feedPressureRatio: OrsonNumber;
  expectedFeedKg: OrsonNumber;
  actualFeedKg: OrsonNumber;
  feedAllocationTrend: OrsonTrendResult;
  baselineFeedKg: number;
  operationalFeedKg: number;
  dataAssumptions: string[];
  dataCompletenessScore: number;
  calibration: OrsonPondMetrics['calibration'];
  phSwingLatest: OrsonNumber;
  phMorningLatest: OrsonNumber;
  phEveningLatest: OrsonNumber;
  doMinimumLatest: OrsonNumber;
  temperatureLatestC: OrsonNumber;
  transparencyLatestCm: OrsonNumber;
  mortalityLatestCount: OrsonNumber;
  mortalityLatestPercent: OrsonNumber;
  mortalityLatestDate: string | null;
  salinityTrend: OrsonTrendResult;
  labContext: OrsonLabContext;
  planktonOverwatch: OrsonPlanktonOverwatchContext | null;
  dailyRecords14d: OrsonPromptDailyRecord[];
  recentLabReports: OrsonPromptLabReport[];
  recentTreatments: OrsonPromptTreatmentEvent[];
  historicalBenchmark: OrsonPromptHistoricalBenchmark | null;
  outlook: Pick<Orson72HourOutlook, 'direction' | 'level' | 'confidence' | 'summary' | 'topReason' | 'nextAction'>;
  findings: Pick<OrsonRiskFinding, 'id' | 'severity' | 'confidence' | 'summary' | 'evidence' | 'recommendation'>[];
}

export type OrsonQuestionIntent =
  | 'parameter_control'
  | 'comparison'
  | 'feed'
  | 'growth'
  | 'water_quality'
  | 'lab'
  | 'harvest'
  | 'biomass'
  | 'survival'
  | 'risk'
  | 'summary'
  | 'general';

export interface OrsonQuestionFocus {
  analysisMode: OrsonAnalysisMode;
  intent: OrsonQuestionIntent;
  focusedPondName: string | null;
  focusedPondId: string | null;
  requestedParameter: string | null;
  requestedDirection: 'increase' | 'decrease' | 'stabilize' | null;
  isPondSpecific: boolean;
  isComparison?: boolean;
  comparedPondNames?: string[];
  shouldSummarize: boolean;
}

export interface OrsonDiagnosticLabRecord {
  labReportId: string;
  sampleDate: string | null;
  reportType: string | null;
  status: OrsonLabStatusLevel | null;
  mainIssue: string | null;
  keyRisks: string[];
  recommendations: string[];
  findings: {
    severity: OrsonRiskSeverity;
    title: string;
    summary: string;
    evidence: string[];
  }[];
}

export interface OrsonDiagnosticTreatmentEvent {
  id: string;
  date: string;
  additiveId: string;
  additiveName: string;
  category: string | null;
  quantity: OrsonNumber;
  unit: string | null;
  ppm: OrsonNumber;
  pondVolumeLiters: OrsonNumber;
  notes: string | null;
}

export interface OrsonDiagnosticHarvestEvent {
  id: string;
  date: string;
  harvestType: 'partial' | 'final' | null;
  biomassKg: number;
  population: number;
}

export interface OrsonMortalityDiagnosticContext {
  pondId: string;
  labHistory: OrsonDiagnosticLabRecord[];
  treatments: OrsonDiagnosticTreatmentEvent[];
  harvests: OrsonDiagnosticHarvestEvent[];
  unavailableSources: string[];
}

export interface OrsonMortalityBaseline {
  observationCount: number;
  medianRatePer100k: OrsonNumber;
  madRatePer100k: OrsonNumber;
  latestRatePer100k: OrsonNumber;
  increaseRatio: OrsonNumber;
  robustZScore: OrsonNumber;
  isSpike: boolean;
  confidence: 'low' | 'medium' | 'high';
  reason: string;
}

export interface OrsonAppetiteProxy {
  status: 'possible_decline' | 'explained_by_harvest' | 'no_signal' | 'insufficient_data';
  confidence: 'low';
  feedChangePercent: OrsonNumber;
  feedPressureChangePercent: OrsonNumber;
  evidence: string[];
}

export interface OrsonMortalityTimelineDay {
  date: string;
  mortalityCount: OrsonNumber;
  mortalityRatePer100k: OrsonNumber;
  estimatedPopulation: OrsonNumber;
  feedKg: OrsonNumber;
  feedPressureRatio: OrsonNumber;
  mbwG: OrsonNumber;
  doMinimumMgL: OrsonNumber;
  phSwing: OrsonNumber;
  salinityPpt: OrsonNumber;
  transparencyCm: OrsonNumber;
  temperatureC: OrsonNumber;
  events: string[];
}

export interface OrsonDiagnosticHypothesis {
  id: string;
  category: 'environmental' | 'operational' | 'biological';
  title: string;
  severity: OrsonRiskSeverity;
  confidence: 'low' | 'medium' | 'high';
  supportingEvidence: string[];
  opposingEvidence: string[];
  confirmationNeeded: string[];
  recommendation: string;
}

export interface OrsonMortalityTrace {
  pondId: string | null;
  pondName: string;
  windowStart: string;
  windowEnd: string;
  eventDate: string | null;
  latestMortalityCount: OrsonNumber;
  baseline: OrsonMortalityBaseline;
  appetiteProxy: OrsonAppetiteProxy;
  timeline: OrsonMortalityTimelineDay[];
  hypotheses: OrsonDiagnosticHypothesis[];
  missingData: string[];
  unavailableSources: string[];
}

export interface OrsonPromptPackage {
  systemInstruction: string;
  context: string;
  userMessage: string;
  cacheKey: string | null;
  isFarmSpecific: boolean;
  questionFocus: OrsonQuestionFocus;
  mortalityTrace: OrsonMortalityTrace | null;
}

export interface OrsonHarvestProjectionInput {
  pond: Record<string, any>;
  daysToHarvest: number;
  expectedPricePerKg: number;
  dailyFeedCost: number;
  targetAdgGPerDay?: number | null;
  assumedSurvivalPercent?: number | null;
  targetMarketSizeG?: number | null;
  calibration?: OrsonCalibrationProfile | null;
  now?: Date;
  timeZone?: string;
}

export interface OrsonProjectionLearningContext {
  currentMbwG: OrsonNumber;
  baseAssumedAdgGPerDay: OrsonNumber;
  baseProjectedMbwG: OrsonNumber;
  baseAssumedSurvivalPercent: OrsonNumber;
  baseProjectedBiomassKg: OrsonNumber;
  initialPopulation: OrsonNumber;
  mortalityCountAtPrediction: number;
  harvestedPopulationAtPrediction: number;
  manualAdgOverride: boolean;
  manualSurvivalOverride: boolean;
}

export interface OrsonHarvestProjectionRisk {
  id: string;
  severity: OrsonRiskSeverity;
  confidence: number;
  summary: string;
  evidence: string[];
  recommendation: string;
}

export interface OrsonHarvestProjection {
  pondId: string | null;
  pondName: string;
  currentDoc: number | null;
  futureDoc: number | null;
  generatedAt: string;
  targetDate: string;
  daysToHarvest: number;
  currentMbwG: OrsonNumber;
  historicalAdgGPerDay: OrsonNumber;
  assumedAdgGPerDay: OrsonNumber;
  projectedMbwG: OrsonNumber;
  currentPopulation: OrsonNumber;
  assumedSurvivalPercent: OrsonNumber;
  survivalConfidence: OrsonSurvivalAssumption['confidence'];
  projectedBiomassKg: OrsonNumber;
  expectedPricePerKg: number;
  projectedRevenue: number;
  futureFeedCost: number;
  projectedProfit: number;
  projectedFcr: OrsonNumber;
  feedCostRiskRatio: OrsonNumber;
  marketSizeRisk: 'undersize' | 'target' | 'oversize' | 'unknown';
  confidenceScore: number;
  confidenceReasons: string[];
  risks: OrsonHarvestProjectionRisk[];
  calibrationVersionId: string;
  calibrationScope: 'default' | 'company' | 'pond';
  calibrationSampleSize: number;
  learningContext: OrsonProjectionLearningContext;
}
