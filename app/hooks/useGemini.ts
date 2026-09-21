import { useState, useRef, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { useAuth } from '../../context/AuthContext';
import { orsonIdentityKey, OrsonRequestSession, OrsonSessionChangedError } from '../../orson/session';
import { requireCompleteOrsonResponse, OrsonIncompleteResponseError, type OrsonResponse } from '../../orson/responseCompletion';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import app, { db } from '@/config/firebase';
import { buildOrsonAnalysis } from '../../orson/pipeline';
import {
  type OrsonAiFunction,
  isOrsonDailyLimitError,
} from '../../orson/aiUsage';
import {
  buildOrsonRequestPrompt,
  cleanOrsonResponse,
  inferOrsonConversationRoute,
  ORSON_CLIENT_TIMEOUT_MS,
  ORSON_FALLBACK_RESPONSE,
  ORSON_MODEL_TIMEOUT_MS,
  ORSON_RESPONSE_TIMEOUT_MS,
  withOrsonTimeout,
} from '../../orson/promptBuilder';
import { normalizeOrsonCalibration } from '../../orson/learning';
import { buildOrsonPredictionSnapshotRequest } from '../../orson/predictionSnapshot';
import type { OrsonCalibrationProfile, OrsonConversationMessage, OrsonHarvestProjection, OrsonMortalityDiagnosticContext } from '../../orson/types';
import { loadCachedOrsonCalibration } from '../../orson/calibrationCache';
import { consumeOrsonCallableStream, type OrsonTextStreamChunk } from '../../orson/callableStream';

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
  conversationHistory?: OrsonConversationMessage[];
  onPartialResponse?: (text: string) => void;
  projectionSnapshot?: {
    pond: Record<string, unknown>;
    projection: OrsonHarvestProjection;
  };
};

const CACHE_PREFIX = 'orson_cache_';
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
const PROGRESSIVE_TEXT_MAX_STEPS = 80;
const PROGRESSIVE_TEXT_DELAY_MS = 24;

const emitProgressiveText = async (
  text: string,
  onPartialResponse: ((text: string) => void) | undefined,
  assertCurrent: () => void,
) => {
  if (!onPartialResponse) return;
  const tokens = text.match(/\S+\s*/g) ?? [];
  if (tokens.length === 0) {
    assertCurrent();
    onPartialResponse(text);
    return;
  }

  const step = Math.max(1, Math.ceil(tokens.length / PROGRESSIVE_TEXT_MAX_STEPS));
  let visibleText = '';
  for (let index = 0; index < tokens.length; index += step) {
    visibleText += tokens.slice(index, index + step).join('');
    assertCurrent();
    onPartialResponse(visibleText);
    if (index + step < tokens.length) {
      await new Promise<void>((resolve) => setTimeout(resolve, PROGRESSIVE_TEXT_DELAY_MS));
    }
  }
};

const getCachedResponse = async (cacheKey: string | null): Promise<string | null> => {
  if (!cacheKey) return null;
  try {
    const cached = await AsyncStorage.getItem(`${CACHE_PREFIX}${cacheKey}`);
    if (!cached) return null;
    const parsed = JSON.parse(cached) as { timestamp?: unknown; text?: unknown };
    if (typeof parsed.timestamp !== 'number' || typeof parsed.text !== 'string') return null;
    return Date.now() - parsed.timestamp < CACHE_EXPIRY_MS ? parsed.text : null;
  } catch (error) {
    console.warn('Orson cache could not be read.', error);
    return null;
  }
};

const saveCachedResponse = async (cacheKey: string | null, text: string): Promise<void> => {
  if (!cacheKey) return;
  try {
    await AsyncStorage.setItem(`${CACHE_PREFIX}${cacheKey}`, JSON.stringify({ timestamp: Date.now(), text }));
  } catch (error) {
    console.warn('Orson cache could not be saved.', error);
  }
};

const formatMetric = (value: number | null | undefined, unit: string, decimals = 1) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return `${value.toFixed(decimals)}${unit}`;
};

const getRemoteOrsonLimit = (error: any): {
  aiFunction: OrsonAiFunction;
  quota: OrsonAiFunction | 'total' | 'monthly' | 'weekly-projection';
  limit: number;
  used: number;
} | null => {
  const code = typeof error?.code === 'string' ? error.code : '';
  const details = error?.details ?? error?.customData?.details;
  if (code !== 'functions/resource-exhausted' && code !== 'resource-exhausted') return null;
  if (!details || (details.aiFunction !== 'chat' && details.aiFunction !== 'projection')) return null;
  if (!Number.isFinite(details.limit) || !Number.isFinite(details.used)) return null;
  return {
    aiFunction: details.aiFunction,
    quota: details.quota === 'total' || details.quota === 'monthly' || details.quota === 'weekly-projection'
      ? details.quota
      : details.aiFunction,
    limit: Number(details.limit),
    used: Number(details.used),
  };
};

const buildLocalOrsonFallback = (analysis: OrsonAnalysis | null): string => {
  if (!analysis || analysis.metrics.length === 0) return ORSON_FALLBACK_RESPONSE;

  const focus = analysis.promptPackage.questionFocus;
  if (focus.route !== 'farm_analysis') throw new OrsonIncompleteResponseError('', 'UNAVAILABLE');
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
    `The AI summary is unavailable right now, but Orson's calculated report is available.`,
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
  const { user, company, loading: authLoading } = useAuth();
  const identity = !authLoading && user?.companyId === company?.id ? orsonIdentityKey(user?.uid, company?.id) : null;
  const requestSessionRef = useRef<OrsonRequestSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [sessionIdentity, setSessionIdentity] = useState(identity);
  if (sessionIdentity !== identity) {
    setSessionIdentity(identity);
    setChatHistory([]); setLoading(false); setError(null);
  }
  useEffect(() => () => requestSessionRef.current?.cancel(), [identity]);
  
  const chatSessionRef = useRef<any>(null);

  const sendMessage = async (
    userMessage: string,
    allPonds: any[],
    options: SendMessageOptions = {},
  ) => {
    requestSessionRef.current?.cancel();
    const session = new OrsonRequestSession(identity);
    requestSessionRef.current = session;
    const assertCurrent = () => {
      session.assertCurrent();
      if (getAuth(app).currentUser?.uid !== user?.uid || options.companyId !== company?.id) throw new OrsonSessionChangedError();
    };
    assertCurrent();
    const requestStartedAt = Date.now();
    setLoading(true);
    setError(null);
    let analysis: OrsonAnalysis | null = null;
    const conversationHistory = options.conversationHistory ?? chatHistory.map((message) => ({
      role: message.role,
      text: message.parts.map((part) => part.text).join('\n'),
    }));

    try {
      if ((!allPonds || allPonds.length === 0) && inferOrsonConversationRoute(userMessage, conversationHistory) === 'farm_analysis') {
        setLoading(false);
        return "I don't have pond records connected yet. Add pond, water-quality, feed, or sampling data so I can calculate a real Orson risk report.";
      }

      let calibration = options.calibration;
      let calibrationMs = 0;
      if (calibration === undefined && options.companyId) {
        const calibrationStartedAt = Date.now();
        try {
          calibration = await loadCachedOrsonCalibration(options.companyId, async () => {
            const calibrationSnap = await getDoc(doc(db, 'companies', options.companyId!, 'orsonCalibration', 'current'));
            return normalizeOrsonCalibration(calibrationSnap.exists() ? calibrationSnap.data() : null);
          });
        } catch (calibrationError) {
          console.warn('Orson calibration could not be loaded; using safe defaults.', calibrationError);
          calibration = null;
        }
        calibrationMs = Date.now() - calibrationStartedAt;
      }

      const analysisStartedAt = Date.now();
      assertCurrent();
      analysis = buildOrsonAnalysis(allPonds, userMessage, new Date(), calibration, undefined, options.timeZone, conversationHistory);
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
          analysis = buildOrsonAnalysis(allPonds, userMessage, new Date(), calibration, contextResult.data, options.timeZone, conversationHistory);
        } catch (contextError) {
          console.warn('Orson mortality context could not be loaded; using pond records only.', contextError);
          analysis = buildOrsonAnalysis(allPonds, userMessage, new Date(), calibration, {
            pondId: diagnosticPondId,
            labHistory: [],
            treatments: [],
            harvests: [],
            unavailableSources: ['lab history', 'treatment history', 'harvest history'],
          }, options.timeZone, conversationHistory);
        }
      }
      assertCurrent();
      const analysisMs = Date.now() - analysisStartedAt;

      if (analysis.promptPackage.exactRecordAnswer) {
        const exactText = analysis.promptPackage.exactRecordAnswer;
        await emitProgressiveText(exactText, options.onPartialResponse, assertCurrent);
        setChatHistory((previous) => [
          ...previous,
          { role: 'user', parts: [{ text: userMessage }] },
          { role: 'model', parts: [{ text: exactText }] },
        ]);
        setLoading(false);
        return exactText;
      }

      const cachedText = await getCachedResponse(analysis.promptPackage.cacheKey ? session.storageKey('cache', analysis.promptPackage.cacheKey) : null);
      assertCurrent();
      if (cachedText) {
        await emitProgressiveText(cachedText, options.onPartialResponse, assertCurrent);
        setChatHistory((previous) => [
          ...previous,
          { role: 'user', parts: [{ text: userMessage }] },
          { role: 'model', parts: [{ text: cachedText }] },
        ]);
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
      assertCurrent();
      const generateOrsonResponse = httpsCallable<
        { companyId?: string; systemInstruction: string; prompt: string; userMessage: string; questionRoute: string; mode: 'standard' | 'pond_diagnostic' | 'mortality_diagnostic'; aiFunction: OrsonAiFunction },
        OrsonResponse,
        OrsonTextStreamChunk
      >(functions, 'generateOrsonResponse', { timeout: ORSON_MODEL_TIMEOUT_MS });

      const requestPayload = {
          companyId: options.companyId,
          // Retained until older deployed Functions no longer require this field.
          // The hardened Function ignores it and builds its own server instruction.
          systemInstruction: analysis.promptPackage.systemInstruction,
          prompt: buildOrsonRequestPrompt(analysis.promptPackage.context, analysis.promptPackage.userMessage),
          userMessage: analysis.promptPackage.userMessage,
          questionRoute: analysis.promptPackage.questionFocus.route,
          mode: analysis.promptPackage.questionFocus.analysisMode,
          aiFunction: options.aiFunction ?? 'chat',
      };
      const callableSupportsStreaming = typeof (generateOrsonResponse as unknown as { stream?: unknown }).stream === 'function';
      let resultData: OrsonResponse;
      if (callableSupportsStreaming) {
        resultData = await consumeOrsonCallableStream({
          callable: generateOrsonResponse,
          request: requestPayload,
          timeoutMs: ORSON_CLIENT_TIMEOUT_MS,
          signal: session.signal,
          onPartialResponse: (partialText) => {
            assertCurrent();
            options.onPartialResponse?.(cleanOrsonResponse(partialText));
          },
        });
      } else {
        const result = await withOrsonTimeout(
          generateOrsonResponse(requestPayload),
          ORSON_CLIENT_TIMEOUT_MS,
          'Orson is taking too long to respond. Please try again.',
        );
        resultData = result.data;
        const fallbackText = cleanOrsonResponse(requireCompleteOrsonResponse(resultData));
        await emitProgressiveText(fallbackText, options.onPartialResponse, assertCurrent);
      }
      assertCurrent();
      const text = cleanOrsonResponse(requireCompleteOrsonResponse(resultData));
      if (resultData.safeToCache === true) void saveCachedResponse(analysis.promptPackage.cacheKey ? session.storageKey('cache', analysis.promptPackage.cacheKey) : null, text);
      console.info('orson_client_latency', {
        route: analysis.promptPackage.questionFocus.route,
        promptChars: requestPayload.prompt.length,
        calibrationMs,
        analysisMs,
        totalMs: Date.now() - requestStartedAt,
      });

      setChatHistory(prev => [
        ...prev,
        { role: 'user', parts: [{ text: userMessage }] },
        { role: 'model', parts: [{ text: text }] }
      ]);

      setLoading(false);
      return text;

    } catch (err: any) {
      assertCurrent();
      if (err instanceof OrsonIncompleteResponseError) {
        setLoading(false);
        throw err;
      }
      console.error("Orson Error:", err);
      setLoading(false);

      // Handle Rate Limiting (Free Tier 429)
      if (err.message?.includes("429")) {
        setError("Daily limit reached.");
        return "I've shared all my wisdom for today! My daily quota is full, but I'll be refreshed at 3:00 AM farm time.";
      }

      const remoteLimit = getRemoteOrsonLimit(err);
      if (remoteLimit) {
        if (remoteLimit.quota === 'monthly') {
          setError("Monthly limit reached.");
          return `This company's monthly Orson limit is full (${remoteLimit.used}/${remoteLimit.limit}). Upgrade the plan or try again next month.`;
        }
        if (remoteLimit.quota === 'weekly-projection') {
          setError("Weekly limit reached.");
          return `This company's weekly projection limit is full (${remoteLimit.used}/${remoteLimit.limit}). Please try again next week.`;
        }
        const label = remoteLimit.quota === 'total'
          ? 'request'
          : remoteLimit.aiFunction === 'projection' ? 'projection analysis' : 'chat';
        setError("Daily limit reached.");
        return `Today's Orson ${label} limit is full (${remoteLimit.used}/${remoteLimit.limit}). Please try again after 3:00 AM farm time.`;
      }

      // Keep support for the legacy local error shape during rollout.
      if (isOrsonDailyLimitError(err)) {
        const label = err.aiFunction === 'projection' ? 'projection analysis' : 'chat';
        setError("Daily limit reached.");
        return `Today's Orson ${label} limit is full (${err.used}/${err.limit}). Please try again after 3:00 AM farm time.`;
      }

      const localFallback = buildLocalOrsonFallback(analysis);
      setError(localFallback);
      return localFallback;
    }
  };

  const clearChat = () => {
    requestSessionRef.current?.cancel();
    setLoading(false);
    setError(null);
    setChatHistory([]);
    chatSessionRef.current = null;
  };

  return { sendMessage, clearChat, chatHistory, loading, error };
};
