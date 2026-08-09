import { useState, useRef } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import app, { db } from '@/config/firebase';
import NotificationService from '../services/notificationService';
import { buildOrsonAnalysis } from '../../orson/pipeline';
import {
  type OrsonAiFunction,
  isOrsonDailyLimitError,
  reserveOrsonRequest,
} from '../../orson/aiUsage';
import {
  cleanOrsonResponse,
  ORSON_FALLBACK_RESPONSE,
  ORSON_MODEL_TIMEOUT_MS,
  ORSON_RESPONSE_TIMEOUT_MS,
  withOrsonTimeout,
} from '../../orson/promptBuilder';
import { normalizeOrsonCalibration } from '../../orson/learning';
import { buildOrsonPredictionSnapshotRequest } from '../../orson/predictionSnapshot';
import type { OrsonCalibrationProfile, OrsonHarvestProjection, OrsonMortalityDiagnosticContext } from '../../orson/types';

// Types for the chat history
interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
}

type OrsonAnalysis = ReturnType<typeof buildOrsonAnalysis>;

type SendMessageOptions = {
  companyId?: string;
  timeZone?: string;
  aiFunction?: OrsonAiFunction;
  calibration?: OrsonCalibrationProfile | null;
  projectionSnapshot?: {
    pond: Record<string, unknown>;
    projection: OrsonHarvestProjection;
  };
};

const formatMetric = (value: number | null | undefined, unit: string, decimals = 1) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return `${value.toFixed(decimals)}${unit}`;
};

const buildLocalOrsonFallback = (analysis: OrsonAnalysis | null): string => {
  if (!analysis || analysis.metrics.length === 0) return ORSON_FALLBACK_RESPONSE;

  const focus = analysis.promptPackage.questionFocus;
  const focusedReport = focus.focusedPondId
    ? analysis.reports.find((report) => report.pondId === focus.focusedPondId)
    : focus.focusedPondName
      ? analysis.reports.find((report) => report.pondName === focus.focusedPondName)
      : null;
  const report = focusedReport ?? [...analysis.reports]
    .sort((a, b) => {
      const rank = { info: 0, watch: 1, warning: 2, critical: 3 };
      return rank[b.overallSeverity] - rank[a.overallSeverity];
    })[0];

  if (!report) return ORSON_FALLBACK_RESPONSE;

  const metrics = analysis.metrics.find((item) => item.pondId === report.pondId || item.pondName === report.pondName);
  const outlook = analysis.outlooks.find((item) => item.pondId === report.pondId || item.pondName === report.pondName);
  const topFindings = report.findings.slice(0, 2);
  const metricLine = [
    formatMetric(metrics?.latestMbwG, 'g MBW'),
    formatMetric(metrics?.estimatedBiomassKg, 'kg biomass', 0),
    formatMetric(metrics?.estimatedSurvivalPercent, '% SR', 0),
    formatMetric(metrics?.fcr, ' FCR', 2),
  ].filter(Boolean).join(', ');

  const lines = [
    `Gemini summary is unavailable right now, but Orson's calculated report is available.`,
    `${report.pondName}: ${report.overallSeverity.toUpperCase()}${outlook ? `, 72-hour outlook ${outlook.direction}` : ''}.`,
  ];

  if (metricLine) lines.push(`Current estimate: ${metricLine}.`);

  if (topFindings.length > 0) {
    lines.push(...topFindings.map((finding) => `- ${finding.summary} ${finding.recommendation}`));
  } else {
    lines.push('- No warning or critical pattern was detected from the connected records.');
  }

  return lines.join('\n');
};

export const useGemini = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  
  const chatSessionRef = useRef<any>(null);

  const createRiskNotifications = async (companyId: string | undefined, analysis: ReturnType<typeof buildOrsonAnalysis>) => {
    if (!companyId) return;

    await Promise.all(
      analysis.reports.flatMap((report) => {
        return report.findings
          .filter((finding) => finding.severity === 'warning' || finding.severity === 'critical')
          .slice(0, 2)
          .map((finding) => NotificationService.createOrsonRiskNotification(companyId, {
            pondId: report.pondId,
            pondName: report.pondName,
            riskId: finding.id,
            severity: finding.severity,
            title: finding.title,
            message: `${finding.summary} ${finding.recommendation}`,
            confidence: finding.confidence,
          }));
      })
    );
  };

  const sendMessage = async (
    userMessage: string,
    allPonds: any[],
    options: SendMessageOptions = {},
  ) => {
    setLoading(true);
    setError(null);
    let analysis: OrsonAnalysis | null = null;

    try {
      if (!allPonds || allPonds.length === 0) {
        setLoading(false);
        return "I don't have pond records connected yet. Add pond, water-quality, feed, or sampling data so I can calculate a real Orson risk report.";
      }

      let calibration = options.calibration;
      if (calibration === undefined && options.companyId) {
        try {
          const calibrationSnap = await getDoc(doc(db, 'companies', options.companyId, 'orsonCalibration', 'current'));
          calibration = normalizeOrsonCalibration(calibrationSnap.exists() ? calibrationSnap.data() : null);
        } catch (calibrationError) {
          console.warn('Orson calibration could not be loaded; using safe defaults.', calibrationError);
          calibration = null;
        }
      }

      analysis = buildOrsonAnalysis(allPonds, userMessage, new Date(), calibration);
      if (analysis.diagnosticRequest.requested && analysis.diagnosticRequest.status !== 'selected') {
        setLoading(false);
        return analysis.diagnosticRequest.status === 'ambiguous'
          ? 'More than one pond has recent mortality. Name the pond so I can trace its previous 14 days without mixing pond histories.'
          : 'I could not find a recent mortality record to investigate. Name the pond and record the mortality observation first.';
      }

      if (analysis.diagnosticRequest.requested && analysis.diagnosticRequest.pondId && options.companyId) {
        const diagnosticPondId = analysis.diagnosticRequest.pondId;
        try {
          const functions = getFunctions(app);
          const getMortalityContext = httpsCallable<
            { companyId: string; pondId: string; windowEnd?: string },
            OrsonMortalityDiagnosticContext
          >(functions, 'getOrsonMortalityContext');
          const contextResult = await withOrsonTimeout(
            getMortalityContext({
              companyId: options.companyId,
              pondId: diagnosticPondId,
              windowEnd: analysis.promptPackage.mortalityTrace?.windowEnd,
            }),
            ORSON_RESPONSE_TIMEOUT_MS,
            'Orson diagnostic context timed out.',
          );
          analysis = buildOrsonAnalysis(allPonds, userMessage, new Date(), calibration, contextResult.data);
        } catch (contextError) {
          console.warn('Orson mortality context could not be loaded; using pond records only.', contextError);
          analysis = buildOrsonAnalysis(allPonds, userMessage, new Date(), calibration, {
            pondId: diagnosticPondId,
            labHistory: [],
            treatments: [],
            harvests: [],
            unavailableSources: ['lab history', 'treatment history', 'harvest history'],
          });
        }
      }
      void createRiskNotifications(options.companyId, analysis);

      const functions = getFunctions(app);
      if (options.companyId && options.projectionSnapshot) {
        try {
          const snapshotRequest = buildOrsonPredictionSnapshotRequest(
            options.companyId,
            options.projectionSnapshot.pond,
            options.projectionSnapshot.projection,
          );
          const recordPrediction = httpsCallable(functions, 'recordOrsonPrediction');
          await recordPrediction(snapshotRequest);
        } catch (predictionError) {
          console.warn('Orson prediction snapshot could not be recorded.', predictionError);
        }
      }
      await reserveOrsonRequest(db, options.companyId, options.aiFunction ?? 'chat', options.timeZone);

      const generateOrsonResponse = httpsCallable<
        { companyId?: string; systemInstruction: string; prompt: string; mode: 'standard' | 'mortality_diagnostic' },
        { text?: string }
      >(functions, 'generateOrsonResponse');

      const result = await withOrsonTimeout(
        generateOrsonResponse({
          companyId: options.companyId,
          systemInstruction: analysis.promptPackage.systemInstruction,
          prompt: `${analysis.promptPackage.context}\n\nUSER QUESTION:\n${analysis.promptPackage.userMessage}`,
          mode: analysis.promptPackage.questionFocus.analysisMode,
        }),
        ORSON_MODEL_TIMEOUT_MS,
      );
      const text = cleanOrsonResponse(result.data.text || '');

      setChatHistory(prev => [
        ...prev,
        { role: 'user', parts: [{ text: userMessage }] },
        { role: 'model', parts: [{ text: text }] }
      ]);

      setLoading(false);
      return text;

    } catch (err: any) {
      console.error("Orson Error:", err);
      setLoading(false);

      // Handle Rate Limiting (Free Tier 429)
      if (err.message?.includes("429")) {
        setError("Daily limit reached.");
        return "I've shared all my wisdom for today! My daily quota is full, but I'll be refreshed at midnight.";
      }

      if (isOrsonDailyLimitError(err)) {
        const label = err.aiFunction === 'projection' ? 'projection analysis' : 'chat';
        setError("Daily limit reached.");
        return `Today's Orson ${label} limit is full (${err.used}/${err.limit}). This keeps Shrimply inside the Gemini free tier while there are no paying customers yet. Please try again after the daily reset.`;
      }

      const localFallback = buildLocalOrsonFallback(analysis);
      setError(localFallback);
      return localFallback;
    }
  };

  const clearChat = () => {
    setChatHistory([]);
    chatSessionRef.current = null;
  };

  return { sendMessage, clearChat, chatHistory, loading, error };
};
