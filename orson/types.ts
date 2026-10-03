export type OrsonNumber = number | null;

export interface OrsonNormalizedFeedData {
  totalDailyFeedKg: OrsonNumber;
  measuredAt?: string | null;
  inventoryFeedId: string | null;
  feedingResponse: 'strong' | 'normal' | 'weak' | null;
  feedType?: string | null;
  feedingFrequency?: OrsonNumber;
  isExplicitZero?: boolean;
  isDuplicateTotal?: boolean;
  source?: string | null;
}

export interface OrsonDiagnosticMeasurements {
  alkalinityMgL?: number;
  tanMgL?: number;
  nitriteMgL?: number;
  nitrogenBasis?: string;
  nitriteBasis?: string;
  waterDepthCm?: number;
  waterDepthCmMorning?: number;
  waterDepthCmEvening?: number;
  surfaceScum?: boolean;
  waterExchangePercent?: number;
  sludgeLoad?: string;
  shrimpBehaviour?: string;
  temperatureMorningC?: number;
  temperatureEveningC?: number;
  transparencyMorningCm?: number;
  transparencyEveningCm?: number;
  estimatedPopulation?: number;
  estimatedBiomassKg?: number;
  survivalPercent?: number;
  samplingMethod?: string;
  recordedFcr?: number;
  fcrBasis?: string;
  recordedFeedIndex?: number;
}

export interface OrsonDiagnosticObservation extends OrsonDiagnosticMeasurements {
  sourceId: string;
  farmDate: string;
  observedAt: string | null;
  feedType?: string;
  feedingFrequency?: number;
  inventoryFeedId?: string;
}

export type OrsonAnalysisMode = 'standard' | 'pond_diagnostic' | 'mortality_diagnostic';

export type OrsonLabStatusLevel = 'good' | 'info' | 'watch' | 'warning' | 'critical';

export interface OrsonLabMetrics {
  schemaVersion: 2;
  measurementSchemaVersion?: 1;
  measurementWarnings?: string[];
  measurementUnits?: Record<string, { unit: string; basis: string }>;
  waterQuality: {
    date: string | null;
    measuredAt?: string | null;
    salinityPpt: OrsonNumber;
    alkalinityMgL: OrsonNumber;
    tanMgL: OrsonNumber;
    nh3MgL: OrsonNumber;
    nh4MgL: OrsonNumber;
    nitriteMgL: OrsonNumber;
    phosphateMgL?: OrsonNumber;
    tomMgL: OrsonNumber;
    calciumHardnessMgLCaCO3?: OrsonNumber;
    magnesiumHardnessMgLCaCO3?: OrsonNumber;
    totalHardnessMgLCaCO3?: OrsonNumber;
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
  measuredAt?: string | null;
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
  cycleId: string | null;
  pondCycleId: string | null;
  source: string | null;
  date: string | null;
  observedAt: string | null;
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
  transparencyMorningCm?: OrsonNumber;
  transparencyEveningCm?: OrsonNumber;
  temperatureC: OrsonNumber;
  temperatureMorningC?: OrsonNumber;
  temperatureEveningC?: OrsonNumber;
  ammoniaMgL: OrsonNumber;
  alkalinityMgL?: OrsonNumber;
  nitriteMgL?: OrsonNumber;
  nitriteBasis?: string | null;
  waterDepthCm?: OrsonNumber;
  waterDepthCmMorning?: OrsonNumber;
  waterDepthCmEvening?: OrsonNumber;
  operationalNotes: string | null;
  weatherEvent: 'rain' | 'heavy_rain' | 'sudden_cloud' | null;
  waterExchangePercent: OrsonNumber;
  sludgeLoad: 'low' | 'moderate' | 'high' | null;
  surfaceScum: boolean | null;
  shrimpBehaviour: 'normal' | 'abnormal' | null;
  harvestType: 'partial' | 'final' | null;
  harvestBiomassKg: OrsonNumber;
  harvestPopulation: OrsonNumber;
  feedData: OrsonNormalizedFeedData | null;
  isBaselineEstimate: boolean;
  missingFields: string[];
  diagnosticMeasurements?: OrsonDiagnosticMeasurements;
  ageDays?: number | null;
  isFresh?: boolean;
  isStale?: boolean;
}

export interface OrsonNormalizedPond {
  id: string | null;
  pondName: string;
  species: string | null;
  asOfDate: string;
  asOfTimestamp?: string;
  timeZone: string;
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
  timeZone?: string;
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
  expectedDailyMortalityRatePercent: number;
  warnings: string[];
}

export interface OrsonGrowthEvidence {
  sampleCount: number;
  adgSource: 'unavailable' | 'stocking_comparison' | 'measured';
  weightSource: 'measured' | 'baseline' | 'fallback';
  source?: string | null;
  pondId?: string | null;
  cycleId?: string | null;
  latestDate?: string | null;
  ageDays?: number | null;
  isFresh?: boolean;
  isStale?: boolean;
  coverageRatio?: number;
}

export interface OrsonMetricEvidenceItem {
  metric: string;
  domain: 'water' | 'operations' | 'mbw' | 'dailyFeed' | 'lab';
  sourceId: string | null;
  pondId: string | null;
  cycleId: string | null;
  date: string | null;
  precision?: 'timestamp' | 'date-only';
  measuredAt?: string | null;
  ageDays: number | null;
  isFresh: boolean;
  isStale: boolean;
  coverage?: {
    windowDays: number;
    recordedDays: number;
    coverageRatio: number;
    missingDates: string[];
  };
}

export interface OrsonEvidenceSummary {
  asOfDate: string;
  asOfTimestamp?: string;
  timeZone: string;
  pondId: string | null;
  cycleId: string | null;
  water: OrsonMetricEvidenceItem;
  mbw: OrsonMetricEvidenceItem;
  dailyFeed: OrsonMetricEvidenceItem;
  mortality: OrsonMetricEvidenceItem;
  lab: OrsonMetricEvidenceItem;
  allMetrics: Record<string, OrsonMetricEvidenceItem>;
}

export interface OrsonPondMetrics {
  pondId: string | null;
  pondName: string;
  species: string | null;
  pondAreaM2: OrsonNumber;
  densityPerM2: OrsonNumber;
  initialPopulation: OrsonNumber;
  currentDoc: number | null;
  latestMbwG: OrsonNumber;
  latestMbwDate: string | null;
  adgGPerDay: OrsonNumber;
  smoothedAdgGPerDay: OrsonNumber;
  growthConfidence: 'low' | 'medium' | 'high';
  growthEvidence: OrsonGrowthEvidence;
  evidence?: OrsonEvidenceSummary;
  mbwOutlierDates: string[];
  totalFeedKg: number;
  totalHarvestedBiomassKg: OrsonNumber;
  totalHarvestedPopulation: OrsonNumber;
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
  recentHarvests: OrsonDiagnosticHarvestEvent[];
  historicalBenchmark: OrsonPromptHistoricalBenchmark | null;
  dataCompleteness: OrsonDataCompleteness;
  calibration: {
    versionId: string;
    scope: 'default' | 'company' | 'pond';
    sampleSize: number;
  };
  diagnosticContext: OrsonPondDiagnosticContext;
}

export type OrsonRiskSeverity = 'info' | 'watch' | 'warning' | 'critical';

export type OrsonRiskId =
  | 'low_do'
  | 'ammonia_elevated'
  | 'abnormal_shrimp_behaviour'
  | 'heavy_rain_low_do'
  | 'high_sludge_load'
  | 'surface_scum_observed'
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
  eventDate?: string;
  measurementEvidence?: OrsonMetricEvidenceItem[];
  supportingMetricKeys?: string[];
  requiresSameDateEvidence?: boolean;
  isHistorical?: boolean;
  status?: string;
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
  diagnosticMeasurements?: OrsonDiagnosticMeasurements;
  date: string;
  observedAt?: string[];
  measurementProvenance?: Record<string, {
    sourceId: string | null;
    sourceIds?: string[];
    date: string;
    measuredAt: string | null;
    precision: 'timestamp' | 'date-only';
  }>;
  doc: number | null;
  feedKg: OrsonNumber;
  feedSource?: 'daily_feed' | 'sampling_estimate' | 'mixed' | null;
  actualDailyFeedKg?: OrsonNumber;
  samplingFeedEstimateKg?: OrsonNumber;
  mbwG: OrsonNumber;
  mortalityCount: OrsonNumber;
  mortalityObservedCount?: OrsonNumber;
  mortalityObservationTypes?: ('estimated_total' | 'observed_recovered' | 'none_observed' | 'legacy_positive')[];
  doMorning: OrsonNumber;
  doEvening: OrsonNumber;
  doMinimumMgL: OrsonNumber;
  phMorning: OrsonNumber;
  phEvening: OrsonNumber;
  phSwing: OrsonNumber;
  salinityPpt: OrsonNumber;
  temperatureC?: OrsonNumber;
  ammoniaMgL?: OrsonNumber;
  operationalNotes?: string | null;
  transparencyCm?: OrsonNumber;
  feedingResponse?: 'strong' | 'normal' | 'weak' | null;
  weatherEvent?: 'rain' | 'heavy_rain' | 'sudden_cloud' | null;
  waterExchangePercent?: OrsonNumber;
  sludgeLoad?: 'low' | 'moderate' | 'high' | null;
  surfaceScum?: boolean | null;
  shrimpBehaviour?: 'normal' | 'abnormal' | null;
  sourceIds?: string[];
  sourceKinds?: OrsonRecordKind[];
  pondId?: string | null;
  cycleId?: string | null;
  ageDays?: number | null;
  isFresh?: boolean;
  isStale?: boolean;
  authoritativeSourceId?: string | null;
}

export interface OrsonPromptLabReport {
  labReportId?: string | null;
  sampleDate: string | null;
  reportType: string | null;
  status: OrsonLabStatusLevel | null;
  mainIssue: string | null;
  keyRisks: string[];
  recommendations: string[];
  metrics?: OrsonLabMetrics | null;
  measurementWarnings?: string[];
}

export interface OrsonPromptSamplingRecord {
  sourceId: string | null;
  farmDate: string;
  observedAt: string | null;
  doc: number | null;
  mbwG: number;
  sourceType: 'sampling';
  estimatedPopulation?: OrsonNumber;
  estimatedBiomassKg?: OrsonNumber;
  survivalPercent?: OrsonNumber;
  samplingMethod?: string | null;
  biomassBasis?: string | null;
}

export interface OrsonDatedValue {
  value: number;
  farmDate: string;
  sourceIds: string[];
}

export interface OrsonMetricComparison {
  unit: string;
  previous: OrsonDatedValue;
  current: OrsonDatedValue;
  absoluteChange: number;
  percentChange: number | null;
  sampleCount: number;
  method: string;
  limitations: string[];
}

export interface OrsonAdgInterval {
  startDate: string;
  endDate: string;
  startMbwG: number;
  endMbwG: number;
  days: number;
  adgGPerDay: number;
  sourceIds: string[];
}

export interface OrsonDiagnosticSignal {
  type: string;
  direction: 'increase' | 'decrease';
  unit: string;
  absoluteChange: number;
  percentChange: number | null;
  previousDate: string;
  currentDate: string;
  sourceIds: string[];
  interpretation: 'descriptive_change_only';
}

export interface OrsonIntervalSeriesSummary {
  unit: string;
  recordedDays: number;
  first: number;
  firstDate: string;
  last: number;
  lastDate: string;
  minimum: number;
  maximum: number;
  average: number;
  sourceIds: string[];
}

export interface OrsonGrowthIntervalContext {
  startDate: string;
  endDate: string;
  includedStartDate: string;
  days: number;
  adgGPerDay: number;
  actualDailyFeedKg: OrsonIntervalSeriesSummary | null;
  morningDoMgL: OrsonIntervalSeriesSummary | null;
  minimumRecordedDoMgL: OrsonIntervalSeriesSummary | null;
  phSwing: OrsonIntervalSeriesSummary | null;
  salinityPpt: OrsonIntervalSeriesSummary | null;
  mortality: {
    estimatedTotal: number | null;
    observedRecovered: number | null;
    observationDays: number;
  };
  directFeedingResponses: { farmDate: string; response: 'strong' | 'normal' | 'weak'; sourceIds: string[] }[];
  events: { farmDate: string; type: string; value: string | number | boolean; sourceIds: string[] }[];
  limitations: string[];
}

export interface OrsonHistoryCoverage {
  windowStart: string;
  windowEnd: string;
  includedStart: string | null;
  includedEnd: string | null;
  recordedDays: number;
  missingDates: string[];
  omittedOlderRecords: number;
  excludedFutureRecords: number;
}

export interface OrsonPondDiagnosticContext {
  schemaVersion: 1;
  feedIndex?: {
    value: number;
    farmDate: string;
    actualDailyFeedKg: number;
    doc: number;
    estimatedPopulation: number;
    sourceIds: string[];
    method: string;
    limitation: string;
  } | null;
  asOfDate: string;
  timeZone: string;
  currentEvidenceDates: Record<string, string | null>;
  history: {
    sampling: OrsonPromptSamplingRecord[];
    coverage: OrsonHistoryCoverage;
    observations?: OrsonDiagnosticObservation[];
    extendedDaily?: OrsonPromptDailyRecord[];
  };
  comparisons: {
    adgIntervals: OrsonAdgInterval[];
    adgIntervalChange: OrsonMetricComparison | null;
    dailyFeed: OrsonMetricComparison | null;
    morningDo: OrsonMetricComparison | null;
    phSwing: OrsonMetricComparison | null;
    salinity: OrsonMetricComparison | null;
    alkalinity?: OrsonMetricComparison | null;
    recordedFcr?: OrsonMetricComparison | null;
    estimatedBiomass?: OrsonMetricComparison | null;
  };
  signals: OrsonDiagnosticSignal[];
  latestGrowthInterval: OrsonGrowthIntervalContext | null;
  dataQuality: {
    missing: string[];
    stale: string[];
    conflicts: string[];
    assumptions: string[];
  };
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
  species: string | null;
  pondAreaM2: OrsonNumber;
  densityPerM2: OrsonNumber;
  initialPopulation: OrsonNumber;
  currentDoc: number | null;
  latestMbwG: OrsonNumber;
  adgGPerDay: OrsonNumber;
  smoothedAdgGPerDay: OrsonNumber;
  growthConfidence: 'low' | 'medium' | 'high';
  growthEvidence: OrsonGrowthEvidence;
  evidence?: OrsonEvidenceSummary;
  fcr: OrsonNumber;
  totalFeedKg: number;
  biomassGainKg: OrsonNumber;
  totalHarvestedBiomassKg: OrsonNumber;
  totalHarvestedPopulation: OrsonNumber;
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
  recentHarvests: OrsonDiagnosticHarvestEvent[];
  historicalBenchmark: OrsonPromptHistoricalBenchmark | null;
  outlook: Pick<Orson72HourOutlook, 'direction' | 'level' | 'confidence' | 'summary' | 'topReason' | 'nextAction'>;
  findings: Pick<OrsonRiskFinding, 'id' | 'severity' | 'confidence' | 'summary' | 'evidence' | 'recommendation'>[];
  diagnosticContext: OrsonPondDiagnosticContext;
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

export type OrsonConversationRoute =
  | 'farm_analysis'
  | 'aquaculture_knowledge'
  | 'inventory_product'
  | 'out_of_scope';

export interface OrsonConversationMessage {
  role: 'user' | 'model';
  text: string;
}

export interface OrsonAnswerContract {
  primaryTopic: OrsonQuestionIntent | 'aquaculture_general' | 'farm_general' | 'conversation';
  routeConfidence: 'high' | 'fallback';
  responseGoal: 'answer_topic_directly' | 'answer_as_general_aquaculture_practice_or_clarify' | 'analyze_saved_farm_evidence' | 'answer_product_or_inventory_request' | 'respond_conversationally' | 'state_scope';
  requiredAspects: string[];
  needsFarmData: boolean;
  excludedWorkflows: string[];
}

export interface OrsonQuestionFocus {
  analysisMode: OrsonAnalysisMode;
  route: OrsonConversationRoute;
  intent: OrsonQuestionIntent;
  focusedPondName: string | null;
  focusedPondId: string | null;
  requestedParameter: string | null;
  requestedDirection: 'increase' | 'decrease' | 'stabilize' | null;
  requestedDates: string[];
  requestedFields: string[];
  requestedRecordCount: number | null;
  suppressAdvice: boolean;
  suppressTreatmentAdvice: boolean;
  suppressPondAnalysis: boolean;
  isPondSpecific: boolean;
  isComparison?: boolean;
  comparedPondNames?: string[];
  requiresDetailedHistory: boolean;
  usesConversationHistory: boolean;
  shouldSummarize: boolean;
  containsUserReportedMeasurements: boolean;
  answerContract: OrsonAnswerContract;
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
  conversationHistory: OrsonConversationMessage[];
  mortalityTrace: OrsonMortalityTrace | null;
  exactRecordAnswer: string | null;
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
