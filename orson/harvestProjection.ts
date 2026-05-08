import { calculatePondMetrics } from './metrics';
import { normalizePondData } from './normalizePondData';
import type {
  OrsonHarvestProjection,
  OrsonHarvestProjectionInput,
  OrsonHarvestProjectionRisk,
  OrsonNumber,
  OrsonRiskSeverity,
} from './types';

const round = (value: number, decimals = 2): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const isNumber = (value: OrsonNumber): value is number => value !== null && Number.isFinite(value);

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const severityRank: Record<OrsonRiskSeverity, number> = {
  info: 0,
  watch: 1,
  warning: 2,
  critical: 3,
};

const buildRisk = (
  id: string,
  severity: OrsonRiskSeverity,
  confidence: number,
  summary: string,
  evidence: string[],
  recommendation: string,
): OrsonHarvestProjectionRisk => ({
  id,
  severity,
  confidence: round(clamp(confidence, 0, 1), 2),
  summary,
  evidence,
  recommendation,
});

const chooseDefaultAdg = (historicalAdg: OrsonNumber, latestMbwG: OrsonNumber): number => {
  if (isNumber(historicalAdg) && historicalAdg > 0) return historicalAdg;
  if (isNumber(latestMbwG) && latestMbwG < 3) return 0.12;
  if (isNumber(latestMbwG) && latestMbwG < 10) return 0.18;
  return 0.2;
};

const inferMarketSizeRisk = (projectedMbwG: OrsonNumber, targetMarketSizeG: OrsonNumber): OrsonHarvestProjection['marketSizeRisk'] => {
  if (!isNumber(projectedMbwG) || !isNumber(targetMarketSizeG) || targetMarketSizeG <= 0) return 'unknown';
  if (projectedMbwG < targetMarketSizeG * 0.92) return 'undersize';
  if (projectedMbwG > targetMarketSizeG * 1.2) return 'oversize';
  return 'target';
};

export const calculateOrsonHarvestProjection = (
  input: OrsonHarvestProjectionInput,
): OrsonHarvestProjection => {
  const now = input.now ?? new Date();
  const normalized = normalizePondData(input.pond, { now });
  const metrics = calculatePondMetrics(normalized);
  const daysToHarvest = Math.max(0, Math.floor(input.daysToHarvest || 0));
  const currentMbwG = metrics.latestMbwG ?? normalized.initialWeightG;
  const defaultAdg = chooseDefaultAdg(metrics.smoothedAdgGPerDay ?? metrics.adgGPerDay, currentMbwG);
  const assumedAdgGPerDay = input.targetAdgGPerDay && input.targetAdgGPerDay > 0
    ? input.targetAdgGPerDay
    : defaultAdg;

  const modelSurvival = metrics.feedBiomassModel.survivalAssumption;
  const assumedSurvivalPercent = input.assumedSurvivalPercent && input.assumedSurvivalPercent > 0
    ? clamp(input.assumedSurvivalPercent, 1, 100)
    : modelSurvival.expectedPercent;

  const initialPopulation = normalized.initialPopulation;
  const currentPopulation = isNumber(initialPopulation) && isNumber(assumedSurvivalPercent)
    ? round((initialPopulation * assumedSurvivalPercent) / 100, 0) - metrics.totalMortalityCount - (normalized.totalHarvestedPopulation ?? 0)
    : metrics.estimatedCurrentPopulation;
  const boundedPopulation = isNumber(currentPopulation) ? Math.max(0, currentPopulation) : null;

  const projectedMbwG = isNumber(currentMbwG)
    ? round(currentMbwG + assumedAdgGPerDay * daysToHarvest, 2)
    : null;
  const projectedBiomassKg = isNumber(boundedPopulation) && isNumber(projectedMbwG)
    ? round((boundedPopulation * projectedMbwG) / 1000, 2)
    : null;
  const projectedRevenue = isNumber(projectedBiomassKg)
    ? round(projectedBiomassKg * input.expectedPricePerKg, 2)
    : 0;
  const futureFeedCost = round(Math.max(0, input.dailyFeedCost || 0) * daysToHarvest, 2);
  const projectedProfit = round(projectedRevenue - futureFeedCost, 2);
  const expectedFeedKg = metrics.feedBiomassModel.expectedFeedKg;
  const projectedFcr = isNumber(expectedFeedKg) && isNumber(projectedBiomassKg) && isNumber(metrics.estimatedBiomassKg)
    ? round((expectedFeedKg * daysToHarvest) / Math.max(1, projectedBiomassKg - metrics.estimatedBiomassKg), 3)
    : metrics.fcr;
  const feedCostRiskRatio = projectedRevenue > 0 ? round(futureFeedCost / projectedRevenue, 3) : null;
  const marketSizeRisk = inferMarketSizeRisk(projectedMbwG, input.targetMarketSizeG ?? 20);

  const confidenceReasons: string[] = [];
  let confidenceScore = metrics.dataCompleteness.score;
  if (!isNumber(metrics.smoothedAdgGPerDay) && !isNumber(metrics.adgGPerDay)) {
    confidenceScore -= 0.18;
    confidenceReasons.push('No historical ADG is available, so growth uses a biological default.');
  } else {
    confidenceReasons.push('Historical growth trend is available.');
  }
  if (modelSurvival.confidence === 'low') {
    confidenceScore -= 0.15;
    confidenceReasons.push('Survival is low-confidence because real mortality and feed response are incomplete.');
  } else {
    confidenceReasons.push(`Survival estimate confidence is ${modelSurvival.confidence}.`);
  }
  if (!isNumber(projectedBiomassKg)) {
    confidenceScore -= 0.2;
    confidenceReasons.push('Projected biomass is missing because current MBW or population is unavailable.');
  }
  confidenceScore = round(clamp(confidenceScore, 0, 1), 2);

  const risks: OrsonHarvestProjectionRisk[] = [];
  if (isNumber(projectedFcr) && projectedFcr > 2) {
    risks.push(buildRisk(
      'projection_high_fcr',
      projectedFcr > 2.5 ? 'warning' : 'watch',
      0.72,
      'Projected FCR is high for the harvest window.',
      [`Projected FCR is ${projectedFcr}.`],
      'Check feed response and avoid increasing feed only because projected biomass looks attractive.',
    ));
  }
  if (isNumber(feedCostRiskRatio) && feedCostRiskRatio > 0.35) {
    risks.push(buildRisk(
      'projection_feed_cost_pressure',
      feedCostRiskRatio > 0.5 ? 'warning' : 'watch',
      0.74,
      'Future feed cost is eating a large share of projected revenue.',
      [`Future feed cost is ${(feedCostRiskRatio * 100).toFixed(1)}% of projected revenue.`],
      'Compare expected price uplift from waiting against the extra feed bill.',
    ));
  }
  if (marketSizeRisk === 'undersize') {
    risks.push(buildRisk(
      'projection_undersize_market',
      'watch',
      0.68,
      'Projected shrimp size may still be below the target market size.',
      [`Projected MBW is ${projectedMbwG ?? 'unknown'}g against a target of ${input.targetMarketSizeG ?? 20}g.`],
      'Consider extending the window only if feed response and water quality remain stable.',
    ));
  }
  if (modelSurvival.confidence === 'low') {
    risks.push(buildRisk(
      'projection_survival_uncertainty',
      'watch',
      0.78,
      'Biomass projection depends heavily on uncertain survival.',
      [modelSurvival.reason],
      'Use the survival control as a scenario slider, not as a confirmed pond count.',
    ));
  }
  if (metrics.feedBiomassModel.warnings.length > 0) {
    risks.push(buildRisk(
      'projection_biomass_disagreement',
      severityRank.warning > severityRank.watch ? 'warning' : 'watch',
      0.76,
      'Feed-based biomass and population assumptions may disagree.',
      metrics.feedBiomassModel.warnings.slice(0, 2),
      'Use tray response, latest MBW, and feed pressure together before committing to a harvest date.',
    ));
  }

  return {
    pondId: normalized.id,
    pondName: normalized.pondName,
    currentDoc: metrics.currentDoc,
    futureDoc: metrics.currentDoc !== null ? metrics.currentDoc + daysToHarvest : null,
    currentMbwG,
    historicalAdgGPerDay: metrics.smoothedAdgGPerDay ?? metrics.adgGPerDay,
    assumedAdgGPerDay: round(assumedAdgGPerDay, 3),
    projectedMbwG,
    currentPopulation: boundedPopulation,
    assumedSurvivalPercent: isNumber(assumedSurvivalPercent) ? round(assumedSurvivalPercent, 1) : null,
    survivalConfidence: modelSurvival.confidence,
    projectedBiomassKg,
    expectedPricePerKg: input.expectedPricePerKg,
    projectedRevenue,
    futureFeedCost,
    projectedProfit,
    projectedFcr,
    feedCostRiskRatio,
    marketSizeRisk,
    confidenceScore,
    confidenceReasons,
    risks,
  };
};
