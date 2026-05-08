import { calculatePondsMetrics } from './metrics';
import { normalizePondsData } from './normalizePondData';
import { build72HourOutlooks } from './outlook';
import { buildOrsonPromptPackage } from './promptBuilder';
import { analyzePondsRisks } from './riskEngine';

export const buildOrsonAnalysis = (ponds: Record<string, any>[], userMessage: string, now = new Date()) => {
  const normalizedPonds = normalizePondsData(ponds, { now });
  const metrics = calculatePondsMetrics(normalizedPonds);
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

