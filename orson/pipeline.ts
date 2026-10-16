import { calculatePondsMetrics, extractDailyRecords14d } from './metrics';
import { normalizePondsData } from './normalizePondData';
import { build72HourOutlooks } from './outlook';
import { buildOrsonPromptPackage } from './promptBuilder';
import { buildMortalityTrace, selectMortalityDiagnosticPond } from './mortalityDiagnostic';
import { analyzePondsRisks } from './riskEngine';
import type { OrsonCalibrationProfile, OrsonConversationMessage, OrsonMortalityDiagnosticContext } from './types';

export const buildOrsonAnalysis = (
  ponds: Record<string, any>[],
  userMessage: string,
  now = new Date(),
  calibration?: OrsonCalibrationProfile | null,
  mortalityContext?: OrsonMortalityDiagnosticContext | null,
  timeZone?: string,
  conversationHistory: OrsonConversationMessage[] = [],
) => {
  const normalizedPonds = normalizePondsData(ponds, { now, timeZone }).filter((pond) => pond.cycleStatus !== 'ended');
  const metrics = calculatePondsMetrics(normalizedPonds, calibration);
  const extendedDays = /\b(?:last|past|previous)\s+(2[1-9]|30)\s+days\b/i.exec(userMessage)?.[1];
  const extendedWeeks = /\b(?:last|past|previous)\s+([34])\s+weeks\b/i.exec(userMessage)?.[1];
  const historyDays = extendedDays ? Number(extendedDays) : extendedWeeks ? Number(extendedWeeks) * 7 : null;
  if (historyDays) metrics.forEach((metric, index) => {
    metric.diagnosticContext.history.extendedDaily = extractDailyRecords14d(normalizedPonds[index], normalizedPonds[index].asOfDate, historyDays);
  });
  const reports = analyzePondsRisks(metrics, now);
  const outlooks = build72HourOutlooks(reports, now);
  const promptParams = {
    userMessage,
    metrics,
    reports,
    outlooks,
    conversationHistory,
    lookupRecords: (pondId: string | null, pondName: string) => {
      const pond = normalizedPonds.find(item => pondId ? item.id === pondId : item.pondName === pondName);
      return pond ? extractDailyRecords14d(pond, pond.asOfDate, 14, true) : [];
    },
  };
  const initialPromptPackage = buildOrsonPromptPackage(promptParams);
  const diagnosticRequested = initialPromptPackage.questionFocus.analysisMode === 'mortality_diagnostic';
  const diagnosticSelection = diagnosticRequested
    ? selectMortalityDiagnosticPond(normalizedPonds, initialPromptPackage.questionFocus.focusedPondId)
    : { pond: null, status: 'missing' as const };
  const selectedMetric = diagnosticSelection.pond
    ? metrics.find((item) => item.pondId === diagnosticSelection.pond?.id) ?? null
    : null;
  const mortalityTrace = diagnosticSelection.pond && selectedMetric
    ? buildMortalityTrace(
        diagnosticSelection.pond,
        selectedMetric,
        now,
        mortalityContext?.pondId === diagnosticSelection.pond.id ? mortalityContext : null,
      )
    : null;
  const promptPackage = mortalityTrace
    ? buildOrsonPromptPackage({ ...promptParams, mortalityTrace })
    : initialPromptPackage;

  return {
    normalizedPonds,
    metrics,
    reports,
    outlooks,
    promptPackage,
    diagnosticRequest: {
      requested: diagnosticRequested,
      pondId: diagnosticSelection.pond?.id ?? null,
      status: diagnosticRequested ? diagnosticSelection.status : 'not_requested' as const,
    },
  };
};
