export type OrsonNumber = number | null;

export interface OrsonNormalizedFeedData {
  totalDailyFeedKg: OrsonNumber;
  ancoPercentage: OrsonNumber;
  trayClearancePercent: OrsonNumber;
  trayValuesPercent: number[];
  feedAmountsKg: number[];
  inventoryFeedId: string | null;
}

export type OrsonLabStatusLevel = 'good' | 'info' | 'watch' | 'warning' | 'critical';

export interface OrsonLabStatusSummary {
  labReportId: string | null;
  reportType: string | null;
  sampleDate: string | null;
  status: OrsonLabStatusLevel | null;
  mainIssue: string | null;
  keyRisks: string[];
  recommendations: string[];
}

export interface OrsonLabContext {
  latest: OrsonLabStatusSummary | null;
  byType: OrsonLabStatusSummary[];
  unresolvedRisks: string[];
  recommendations: string[];
  worstStatus: OrsonLabStatusLevel | null;
}

export type OrsonRecordKind = 'sampling' | 'water_quality' | 'feed' | 'harvest' | 'unknown';

export interface OrsonNormalizedRecord {
  id: string | null;
  date: string | null;
  timestampMs: number | null;
  doc: number | null;
  kinds: OrsonRecordKind[];
  mbwG: OrsonNumber;
  mortalityCount: OrsonNumber;
  feedKg: OrsonNumber;
  phMorning: OrsonNumber;
  phEvening: OrsonNumber;
  doMorning: OrsonNumber;
  doEvening: OrsonNumber;
  salinityPpt: OrsonNumber;
  transparencyCm: OrsonNumber;
  temperatureC: OrsonNumber;
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
  cycleStartMode: 'new' | 'midcycle';
  baselineDate: string | null;
  baselineDoc: OrsonNumber;
  baselineMbwG: OrsonNumber;
  baselineEstimatedPopulation: OrsonNumber;
  baselineSurvivalRate: OrsonNumber;
  baselineCumulativeFeedKg: OrsonNumber;
  baselineSource: string | null;
  supplier: string | null;
  cycleStatus: 'active' | 'ended';
  labContext: OrsonLabContext;
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
  phSwingLatest: OrsonNumber;
  phSwingTrend: OrsonTrendResult;
  doMinimumLatest: OrsonNumber;
  doMinimumTrend: OrsonTrendResult;
  salinityTrend: OrsonTrendResult;
  appetiteTrend: OrsonTrendResult;
  mortalityTrend: OrsonTrendResult;
  labContext: OrsonLabContext;
  dataCompleteness: OrsonDataCompleteness;
}

export type OrsonRiskSeverity = 'info' | 'watch' | 'warning' | 'critical';

export type OrsonRiskId =
  | 'low_do'
  | 'unsafe_ph'
  | 'ph_instability'
  | 'do_decline'
  | 'appetite_drop'
  | 'slow_growth'
  | 'high_fcr'
  | 'feed_pressure_high'
  | 'feed_pressure_low'
  | 'biomass_model_disagreement'
  | 'mortality_spike'
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

export interface OrsonPromptPondPayload {
  pondId: string | null;
  pondName: string;
  currentDoc: number | null;
  latestMbwG: OrsonNumber;
  biomassKg: OrsonNumber;
  biomassRangeKg: OrsonRangeEstimate;
  survivalPercent: OrsonNumber;
  survivalConfidence: OrsonSurvivalAssumption['confidence'];
  feedPressureRatio: OrsonNumber;
  expectedFeedKg: OrsonNumber;
  actualFeedKg: OrsonNumber;
  baselineFeedKg: number;
  operationalFeedKg: number;
  dataAssumptions: string[];
  dataCompletenessScore: number;
  phSwingLatest: OrsonNumber;
  doMinimumLatest: OrsonNumber;
  salinityTrend: OrsonTrendResult;
  labContext: OrsonLabContext;
  outlook: Pick<Orson72HourOutlook, 'direction' | 'level' | 'confidence' | 'summary' | 'topReason' | 'nextAction'>;
  findings: Pick<OrsonRiskFinding, 'id' | 'severity' | 'confidence' | 'summary' | 'evidence' | 'recommendation'>[];
}

export type OrsonQuestionIntent =
  | 'parameter_control'
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
  intent: OrsonQuestionIntent;
  focusedPondName: string | null;
  focusedPondId: string | null;
  requestedParameter: string | null;
  requestedDirection: 'increase' | 'decrease' | 'stabilize' | null;
  isPondSpecific: boolean;
  shouldSummarize: boolean;
}

export interface OrsonPromptPackage {
  systemInstruction: string;
  context: string;
  userMessage: string;
  cacheKey: string | null;
  isFarmSpecific: boolean;
  questionFocus: OrsonQuestionFocus;
}

export interface OrsonHarvestProjectionInput {
  pond: Record<string, any>;
  daysToHarvest: number;
  expectedPricePerKg: number;
  dailyFeedCost: number;
  targetAdgGPerDay?: number | null;
  assumedSurvivalPercent?: number | null;
  targetMarketSizeG?: number | null;
  now?: Date;
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
}
