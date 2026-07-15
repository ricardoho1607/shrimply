import { calculatePondsMetrics } from './metrics';
import { normalizePondsData } from './normalizePondData';
import { build72HourOutlooks } from './outlook';
import { buildOrsonPromptPackage } from './promptBuilder';
import { analyzePondsRisks } from './riskEngine';
import type { OrsonCalibrationProfile } from './types';

export const buildOrsonAnalysis = (
  ponds: Record<string, any>[],
  userMessage: string,
  now = new Date(),
  calibration?: OrsonCalibrationProfile | null,
) => {
  const normalizedPonds = normalizePondsData(ponds, { now }).filter((pond) => pond.cycleStatus !== 'ended');
  const metrics = calculatePondsMetrics(normalizedPonds, calibration);
  const reports = analyzePondsRisks(metrics, now);
  const outlooks = build72HourOutlooks(reports, now);
  const promptPackage = buildOrsonPromptPackage({
    userMessage,
    metrics,
    reports,
    outlooks,
  });

  return {
    normalizedPonds,
    metrics,
    reports,
    outlooks,
    promptPackage,
  };
};
