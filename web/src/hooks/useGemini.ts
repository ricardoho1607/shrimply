import { isExplicitFarmAction, type OrsonActivity, type OrsonOperation } from '../../../shared/orsonAgentContract';
import { useState, useRef, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { useAuth } from '@/contexts/AuthContext';
import { orsonIdentityKey, OrsonRequestSession, OrsonSessionChangedError } from '../../../orson/session';
import { requireCompleteOrsonResponse, OrsonIncompleteResponseError, type OrsonResponse } from '../../../orson/responseCompletion';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import { app, db } from '@/lib/firebase';
import { withTimeout } from '@/lib/asyncUtils';
import { friendlyOrsonRequestError } from '../../../orson/requestError';
import { buildOrsonAnalysis } from '../../../orson/pipeline';
import {
  type OrsonAiFunction,
  isOrsonDailyLimitError,
} from '@/lib/orsonAiUsage';
import {
  cleanOrsonResponse,
  buildOrsonRequestPrompt,
  ORSON_CLIENT_TIMEOUT_MS,
  ORSON_FALLBACK_RESPONSE,
  ORSON_MODEL_TIMEOUT_MS,
} from '../../../orson/promptBuilder';
import { normalizeOrsonCalibration } from '../../../orson/learning';
import { buildOrsonPredictionSnapshotRequest } from '../../../orson/predictionSnapshot';
import type {
  OrsonCalibrationProfile,
  OrsonConversationMessage,
  OrsonHarvestProjection,
  OrsonMortalityDiagnosticContext,
} from '../../../orson/types';
import { inferOrsonConversationRoute } from '../../../orson/promptBuilder';
import { consumeOrsonCallableStream, type OrsonTextStreamChunk } from '../../../orson/callableStream';
import { loadCachedOrsonCalibration } from '../../../orson/calibrationCache';
import { buildOrsonResponsePreview, type OrsonResponsePreview } from '../../../orson/responsePreview';

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
  conversationHistory?: OrsonConversationMessage[];
  onPartialResponse?: (text: string) => void;
  onPreview?: (preview: OrsonResponsePreview) => void;
  onActivity?: (activity: OrsonActivity) => void;
  onOperation?: (operation: OrsonOperation) => void;
  agentOperationIds?: string[];
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
  quota: OrsonAiFunction | 'total' | 'monthly' | 'weekly-projection';
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
    quota: details.quota === 'total' || details.quota === 'monthly' || details.quota === 'weekly-projection'
      ? details.quota
      : details.aiFunction,
    limit: Number(details.limit),
    used: Number(details.used),
  };
};

export const useGemini = () => {
  const { user, company, loading: authLoading } = useAuth();
  const identity = !authLoading && user?.companyId === company?.id ? orsonIdentityKey(user?.uid, company?.id) : null;
  const requestSessionRef = useRef<OrsonRequestSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset the conversation at the external auth boundary.
    setChatHistory([]);
    setLoading(false);
    setError(null);
    return () => requestSessionRef.current?.cancel();
  }, [identity]);
  
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

  const sendMessage = async (
    userMessage: string,
    allPonds: object[],
    options: SendMessageOptions = {},
  ) => {
    const requestId = latestRequestId.current + 1;
    requestSessionRef.current?.cancel();
    const session = new OrsonRequestSession(identity);
    requestSessionRef.current = session;
    const assertCurrent = () => {
      session.assertCurrent();
      if (getAuth(app).currentUser?.uid !== user?.uid || options.companyId !== company?.id) throw new OrsonSessionChangedError();
    };
    assertCurrent();
    const farmAction = isExplicitFarmAction(userMessage);
    const explicitAction = Boolean(options.onOperation) && farmAction;
    const requestStartedAt = Date.now();
    latestRequestId.current = requestId;
    setLoading(true);
    setError(null);
    const conversationHistory = options.conversationHistory ?? chatHistory.map((message) => ({
      role: message.role,
      text: message.parts.map((part) => part.text).join('\n'),
    }));

    try {
      if (!explicitAction && (!allPonds || allPonds.length === 0) && inferOrsonConversationRoute(userMessage, conversationHistory) === 'farm_analysis') {
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
      let analysis = buildOrsonAnalysis(
        allPonds as Parameters<typeof buildOrsonAnalysis>[0],
        userMessage,
        new Date(),
        calibration,
        undefined,
        options.timeZone,
        conversationHistory,
      );
      if (!explicitAction && analysis.diagnosticRequest.requested && analysis.diagnosticRequest.status !== 'selected') {
        setLoading(false);
        return analysis.diagnosticRequest.status === 'ambiguous'
          ? 'More than one pond has recent mortality. Name the pond so I can trace its previous 14 days without mixing pond histories.'
          : 'I could not find a recent mortality record to investigate. Name the pond and record the mortality observation first.';
      }

      let previewCache: { key: string | null; text: string | null } | undefined;
      if (options.onPreview && !farmAction) {
        const preview = buildOrsonResponsePreview(analysis);
        if (preview) {
          const key = analysis.promptPackage.cacheKey;
          const text = getCachedResponse(key ? session.storageKey('cache', key) : null);
          previewCache = { key, text };
          assertCurrent();
          if (!text) options.onPreview(preview);
        }
      }

      if (!explicitAction && analysis.diagnosticRequest.requested && analysis.diagnosticRequest.pondId && options.companyId) {
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
            conversationHistory,
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
            conversationHistory,
          );
        }
      }
      assertCurrent();
      const analysisMs = Date.now() - analysisStartedAt;

      if (!explicitAction && analysis.promptPackage.exactRecordAnswer) {
        const exactText = analysis.promptPackage.exactRecordAnswer;
        options.onPartialResponse?.(exactText);
        setChatHistory((previous) => [
          ...previous,
          { role: 'user', parts: [{ text: userMessage }] },
          { role: 'model', parts: [{ text: exactText }] },
        ]);
        setLoading(false);
        return exactText;
      }

      const cacheKey = analysis.promptPackage.cacheKey;
      const cachedText = previewCache && previewCache.key === cacheKey ? previewCache.text
        : getCachedResponse(cacheKey ? session.storageKey('cache', cacheKey) : null);
      assertCurrent();
      if (!explicitAction && cachedText) {
        setChatHistory(prev => [
          ...prev,
          { role: 'user', parts: [{ text: userMessage }] },
          { role: 'model', parts: [{ text: cachedText }] },
        ]);
        options.onPartialResponse?.(cachedText);
        setLoading(false);
        return cachedText;
      }

      const functions = getFunctions(app);
      if (options.companyId && options.projectionSnapshot) {
        assertCurrent();
        try {
          const snapshotRequest = buildOrsonPredictionSnapshotRequest(
            options.companyId,
            options.projectionSnapshot.pond,
            options.projectionSnapshot.projection,
          );
          const recordPrediction = httpsCallable(functions, 'recordOrsonPrediction');
          recordPrediction(snapshotRequest).catch((predictionError) => {
            console.warn('Orson prediction snapshot could not be recorded.', predictionError);
          });
        } catch (predictionError) {
          console.warn('Orson prediction snapshot could not be recorded.', predictionError);
        }
      }
      assertCurrent();
      const generateOrsonResponse = httpsCallable<
        { agentOperationIds?: string[]; agentVersion?: number; companyId?: string; systemInstruction: string; prompt: string; userMessage: string; questionRoute: string; mode: 'standard' | 'pond_diagnostic' | 'mortality_diagnostic'; aiFunction: OrsonAiFunction },
        OrsonResponse,
        OrsonTextStreamChunk
      >(functions, 'generateOrsonResponse', { timeout: ORSON_MODEL_TIMEOUT_MS });

      const requestPayload = {
          companyId: options.companyId,
          agentVersion: options.onOperation ? 1 : undefined,
          agentOperationIds: options.onOperation ? options.agentOperationIds?.slice(-10) : undefined,
          // Retained until older deployed Functions no longer require this field.
          // The hardened Function ignores it and builds its own server instruction.
          systemInstruction: analysis.promptPackage.systemInstruction,
          prompt: buildOrsonRequestPrompt(analysis.promptPackage.context, analysis.promptPackage.userMessage),
          userMessage: analysis.promptPackage.userMessage,
          questionRoute: analysis.promptPackage.questionFocus.route,
          mode: analysis.promptPackage.questionFocus.analysisMode,
          aiFunction: options.aiFunction ?? 'chat',
      };
      let firstChunkMs: number | null = null;
      const resultData = await consumeOrsonCallableStream({
        callable: generateOrsonResponse,
        request: requestPayload,
        timeoutMs: ORSON_CLIENT_TIMEOUT_MS,
        signal: session.signal,
          onActivity: activity => { assertCurrent(); options.onActivity?.(activity); },
          onOperation: operation => { assertCurrent(); options.onOperation?.(operation); },
        onPartialResponse: (partialText) => {
          assertCurrent();
          if (firstChunkMs === null) firstChunkMs = Date.now() - requestStartedAt;
          options.onPartialResponse?.(cleanOrsonResponse(partialText));
        },
      });
      if (latestRequestId.current !== requestId) return 'A newer question is already being answered.';

      assertCurrent();
      resultData.operations?.forEach(operation => options.onOperation?.(operation));
      const text = cleanOrsonResponse(requireCompleteOrsonResponse(resultData));
      console.info('orson_client_latency', {
        route: analysis.promptPackage.questionFocus.route,
        promptChars: requestPayload.prompt.length,
        calibrationMs,
        analysisMs,
        firstChunkMs,
        totalMs: Date.now() - requestStartedAt,
      });

      if (resultData.safeToCache === true) saveToCache(analysis.promptPackage.cacheKey ? session.storageKey('cache', analysis.promptPackage.cacheKey) : null, text);

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
      assertCurrent();
      if (err instanceof OrsonIncompleteResponseError) {
        setLoading(false);
        throw err;
      }
      console.warn("Orson request failed:", err);
      if (latestRequestId.current === requestId) {
        setLoading(false);
      }

      const errorMessage = err instanceof Error ? err.message : '';

      if (errorMessage.includes("429")) {
        setError("Daily limit reached.");
        return "I've shared all my wisdom for today! My daily quota is full, but I'll be refreshed at 3:00 AM farm time.";
      }

      const remoteLimit = getRemoteOrsonLimit(err);
      if (remoteLimit) {
        if (remoteLimit.quota === 'monthly') {
          if (latestRequestId.current === requestId) setError("Monthly limit reached.");
          return `This company's monthly Orson limit is full (${remoteLimit.used}/${remoteLimit.limit}). Upgrade the plan or try again next month.`;
        }
        if (remoteLimit.quota === 'weekly-projection') {
          if (latestRequestId.current === requestId) setError("Weekly limit reached.");
          return `This company's weekly projection limit is full (${remoteLimit.used}/${remoteLimit.limit}). Please try again next week.`;
        }
        const label = remoteLimit.quota === 'total'
          ? 'request'
          : remoteLimit.aiFunction === 'projection' ? 'projection analysis' : 'chat';
        const limitMessage = `Today's Orson ${label} limit is full (${remoteLimit.used}/${remoteLimit.limit}). Please try again after 3:00 AM farm time.`;
        if (latestRequestId.current === requestId) {
          setError("Daily limit reached.");
        }
        return limitMessage;
      }

      // Keep support for the legacy local error shape during rollout.
      if (isOrsonDailyLimitError(err)) {
        const label = err.aiFunction === 'projection' ? 'projection analysis' : 'chat';
        const limitMessage = `Today's Orson ${label} limit is full (${err.used}/${err.limit}). Please try again after 3:00 AM farm time.`;
        if (latestRequestId.current === requestId) {
          setError("Daily limit reached.");
        }
        return limitMessage;
      }

      const message = explicitAction
        ? 'Orson could not prepare your entry. No save was confirmed. Please retry, or enter the values in the pond or Lab Reports form.'
        : friendlyOrsonRequestError(err, ORSON_FALLBACK_RESPONSE, userMessage);
      if (latestRequestId.current === requestId) {
        setError(message);
      }
      return message;
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
