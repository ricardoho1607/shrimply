import { useState, useRef } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import { app, db } from '@/lib/firebase';
import { getErrorMessage, withTimeout } from '@/lib/asyncUtils';
import NotificationService from '@/lib/notificationService';
import { buildOrsonAnalysis } from '../../../orson/pipeline';
import {
  type OrsonAiFunction,
  isOrsonDailyLimitError,
} from '@/lib/orsonAiUsage';
import {
  cleanOrsonResponse,
  ORSON_FALLBACK_RESPONSE,
  ORSON_MODEL_TIMEOUT_MS,
} from '../../../orson/promptBuilder';
import { normalizeOrsonCalibration } from '../../../orson/learning';
import { buildOrsonPredictionSnapshotRequest } from '../../../orson/predictionSnapshot';
import type {
  OrsonCalibrationProfile,
  OrsonHarvestProjection,
  OrsonMortalityDiagnosticContext,
} from '../../../orson/types';

// Types for the chat history
interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
}

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

type RemoteOrsonError = {
  code?: unknown;
  details?: unknown;
  customData?: { details?: unknown };
};

type RemoteOrsonLimitDetails = {
  aiFunction?: unknown;
  quota?: unknown;
  limit?: unknown;
  used?: unknown;
};

// Cache Configuration
const CACHE_PREFIX = 'orson_cache_';
const CACHE_EXPIRY = 1000 * 60 * 60 * 24 * 7; // 7 Days

const getRemoteOrsonLimit = (error: unknown): {
  aiFunction: OrsonAiFunction;
  quota: OrsonAiFunction | 'total';
  limit: number;
  used: number;
} | null => {
  const candidate = (error && typeof error === 'object' ? error : {}) as RemoteOrsonError;
  const code = typeof candidate.code === 'string' ? candidate.code : '';
  const rawDetails = candidate.details ?? candidate.customData?.details;
  const details = (rawDetails && typeof rawDetails === 'object' ? rawDetails : {}) as RemoteOrsonLimitDetails;
  if (code !== 'functions/resource-exhausted' && code !== 'resource-exhausted') return null;
  if (details.aiFunction !== 'chat' && details.aiFunction !== 'projection') return null;
  if (!Number.isFinite(details.limit) || !Number.isFinite(details.used)) return null;
  return {
    aiFunction: details.aiFunction,
    quota: details.quota === 'total' ? 'total' : details.aiFunction,
    limit: Number(details.limit),
    used: Number(details.used),
  };
};

export const useGemini = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  
  const chatSessionRef = useRef<unknown>(null);
  const latestRequestId = useRef(0);

  const getCachedResponse = (cacheKey: string | null) => {
    try {
      if (typeof window === 'undefined' || !cacheKey) return null;
      const cached = localStorage.getItem(`${CACHE_PREFIX}${cacheKey}`);
      if (cached) {
        const { timestamp, text } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_EXPIRY) return text;
      }
    } catch (e) { console.error("Cache Read Error", e); }
    return null;
  };

  const saveToCache = (cacheKey: string | null, text: string) => {
    try {
      if (typeof window === 'undefined' || !cacheKey) return;
      const data = JSON.stringify({ timestamp: Date.now(), text });
      localStorage.setItem(`${CACHE_PREFIX}${cacheKey}`, data);
    } catch (e) { console.error("Cache Write Error", e); }
  };

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
    allPonds: object[],
    options: SendMessageOptions = {},
  ) => {
    const requestId = latestRequestId.current + 1;
    latestRequestId.current = requestId;
    setLoading(true);
    setError(null);

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

      let analysis = buildOrsonAnalysis(
        allPonds as Parameters<typeof buildOrsonAnalysis>[0],
        userMessage,
        new Date(),
        calibration,
        undefined,
        options.timeZone,
      );
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
          const contextResult = await withTimeout(
            getMortalityContext({
              companyId: options.companyId,
              pondId: diagnosticPondId,
              windowEnd: analysis.promptPackage.mortalityTrace?.windowEnd,
            }),
            8000,
            'Orson diagnostic context timed out.',
          );
          analysis = buildOrsonAnalysis(
            allPonds as Parameters<typeof buildOrsonAnalysis>[0],
            userMessage,
            new Date(),
            calibration,
            contextResult.data,
            options.timeZone,
          );
        } catch (contextError) {
          console.warn('Orson mortality context could not be loaded; using pond records only.', contextError);
          analysis = buildOrsonAnalysis(
            allPonds as Parameters<typeof buildOrsonAnalysis>[0],
            userMessage,
            new Date(),
            calibration,
            {
              pondId: diagnosticPondId,
              labHistory: [],
              treatments: [],
              harvests: [],
              unavailableSources: ['lab history', 'treatment history', 'harvest history'],
            },
            options.timeZone,
          );
        }
      }
      void createRiskNotifications(options.companyId, analysis);

      const cachedText = getCachedResponse(analysis.promptPackage.cacheKey);
      if (cachedText) {
        setLoading(false);
        return cachedText;
      }

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
      const generateOrsonResponse = httpsCallable<
        { companyId?: string; systemInstruction: string; prompt: string; mode: 'standard' | 'mortality_diagnostic'; aiFunction: OrsonAiFunction },
        { text?: string }
      >(functions, 'generateOrsonResponse');

      const result = await withTimeout(
        generateOrsonResponse({
          companyId: options.companyId,
          // Retained until older deployed Functions no longer require this field.
          // The hardened Function ignores it and builds its own server instruction.
          systemInstruction: analysis.promptPackage.systemInstruction,
          prompt: `${analysis.promptPackage.context}\n\nUSER QUESTION:\n${analysis.promptPackage.userMessage}`,
          mode: analysis.promptPackage.questionFocus.analysisMode,
          aiFunction: options.aiFunction ?? 'chat',
        }),
        ORSON_MODEL_TIMEOUT_MS,
        'Orson is taking too long to respond. Please try again.'
      );
      if (latestRequestId.current !== requestId) return 'A newer question is already being answered.';

      const text = cleanOrsonResponse(result.data.text || '');

      saveToCache(analysis.promptPackage.cacheKey, text);

      setChatHistory(prev => {
        if (latestRequestId.current !== requestId) return prev;
        return [
          ...prev,
          { role: 'user', parts: [{ text: userMessage }] },
          { role: 'model', parts: [{ text: text }] }
        ];
      });

      if (latestRequestId.current === requestId) {
        setLoading(false);
      }
      return text;

    } catch (err: unknown) {
      console.error("Orson Error:", err);
      if (latestRequestId.current === requestId) {
        setLoading(false);
      }

      const errorMessage = err instanceof Error ? err.message : '';

      if (errorMessage.includes("429")) {
        setError("Daily limit reached.");
        return "I've shared all my wisdom for today! My daily quota is full, but I'll be refreshed at midnight.";
      }

      const remoteLimit = getRemoteOrsonLimit(err);
      if (remoteLimit) {
        const label = remoteLimit.quota === 'total'
          ? 'request'
          : remoteLimit.aiFunction === 'projection' ? 'projection analysis' : 'chat';
        const limitMessage = `Today's Orson ${label} limit is full (${remoteLimit.used}/${remoteLimit.limit}). Please try again after the daily reset.`;
        if (latestRequestId.current === requestId) {
          setError("Daily limit reached.");
        }
        return limitMessage;
      }

      // Keep support for the legacy local error shape during rollout.
      if (isOrsonDailyLimitError(err)) {
        const label = err.aiFunction === 'projection' ? 'projection analysis' : 'chat';
        const limitMessage = `Today's Orson ${label} limit is full (${err.used}/${err.limit}). Please try again after the daily reset.`;
        if (latestRequestId.current === requestId) {
          setError("Daily limit reached.");
        }
        return limitMessage;
      }

      const message = getErrorMessage(err, ORSON_FALLBACK_RESPONSE);
      if (latestRequestId.current === requestId) {
        setError(message);
      }
      return message;
    }
  };

  const clearChat = () => {
    setChatHistory([]);
    chatSessionRef.current = null;
  };

  return { sendMessage, clearChat, chatHistory, loading, error };
};
