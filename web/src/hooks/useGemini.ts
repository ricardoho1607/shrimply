import { useState, useRef } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '@/lib/firebase';
import { getErrorMessage, withTimeout } from '@/lib/asyncUtils';
import NotificationService from '@/lib/notificationService';
import { buildOrsonAnalysis } from '../../../orson/pipeline';
import {
  ORSON_GEMINI_MODEL,
  type OrsonAiFunction,
  isOrsonDailyLimitError,
  reserveOrsonRequest,
} from '../../../orson/aiUsage';
import {
  cleanOrsonResponse,
  ORSON_FALLBACK_RESPONSE,
  ORSON_MODEL_TIMEOUT_MS,
  ORSON_RESPONSE_TIMEOUT_MS,
} from '../../../orson/promptBuilder';

// Types for the chat history
interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
}

// Cache Configuration
const CACHE_PREFIX = 'orson_cache_';
const CACHE_EXPIRY = 1000 * 60 * 60 * 24 * 7; // 7 Days

export const useGemini = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  
  const chatSessionRef = useRef<any>(null);
  const latestRequestId = useRef(0);

  const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

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
    allPonds: any[],
    options: { companyId?: string; aiFunction?: OrsonAiFunction } = {},
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

      const analysis = buildOrsonAnalysis(allPonds, userMessage);
      void createRiskNotifications(options.companyId, analysis);

      const cachedText = getCachedResponse(analysis.promptPackage.cacheKey);
      if (cachedText) {
        setLoading(false);
        return cachedText;
      }

      await reserveOrsonRequest(db, options.companyId, options.aiFunction ?? 'chat');

      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({
        model: ORSON_GEMINI_MODEL,
        systemInstruction: analysis.promptPackage.systemInstruction,
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 512,
        },
      });

      const result: any = await withTimeout(
        model.generateContent(`${analysis.promptPackage.context}\n\nUSER QUESTION:\n${analysis.promptPackage.userMessage}`),
        ORSON_MODEL_TIMEOUT_MS,
        'Orson is taking too long to respond. Please try again.'
      );
      if (latestRequestId.current !== requestId) return 'A newer question is already being answered.';

      const response: any = await withTimeout(
        result.response,
        ORSON_RESPONSE_TIMEOUT_MS,
        'Orson received your question but the response took too long. Please try again.'
      );
      if (latestRequestId.current !== requestId) return 'A newer question is already being answered.';
      const text = cleanOrsonResponse(response.text());

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

    } catch (err: any) {
      console.error("Orson Error:", err);
      if (latestRequestId.current === requestId) {
        setLoading(false);
      }

      if (err.message?.includes("429")) {
        setError("Daily limit reached.");
        return "I've shared all my wisdom for today! My daily quota is full, but I'll be refreshed at midnight.";
      }

      if (isOrsonDailyLimitError(err)) {
        const label = err.aiFunction === 'projection' ? 'projection analysis' : 'chat';
        const limitMessage = `Today's Orson ${label} limit is full (${err.used}/${err.limit}). This keeps Shrimply inside the Gemini free tier while there are no paying customers yet. Please try again after the daily reset.`;
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
