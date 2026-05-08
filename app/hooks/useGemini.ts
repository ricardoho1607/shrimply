import { useState, useRef } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import NotificationService from '../services/notificationService';
import { buildOrsonAnalysis } from '../../orson/pipeline';
import {
  cleanOrsonResponse,
  ORSON_FALLBACK_RESPONSE,
  ORSON_MODEL_TIMEOUT_MS,
  ORSON_RESPONSE_TIMEOUT_MS,
  withOrsonTimeout,
} from '../../orson/promptBuilder';

// Types for the chat history
interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export const useGemini = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  
  const chatSessionRef = useRef<any>(null);

  const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

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

  const sendMessage = async (userMessage: string, allPonds: any[], options: { companyId?: string } = {}) => {
    setLoading(true);
    setError(null);

    try {
      if (!allPonds || allPonds.length === 0) {
        setLoading(false);
        return "I don't have pond records connected yet. Add pond, water-quality, feed, or sampling data so I can calculate a real Orson risk report.";
      }

      const analysis = buildOrsonAnalysis(allPonds, userMessage);
      void createRiskNotifications(options.companyId, analysis);

      const genAI = new GoogleGenerativeAI(API_KEY);

      const model = genAI.getGenerativeModel({
        model: "gemini-3.1-flash-lite-preview", 
        tools: [
          {
            googleSearch: {}, 
          } as any, 
        ],
        systemInstruction: analysis.promptPackage.systemInstruction,
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 512,
        },
      });

      const result = await withOrsonTimeout(
        model.generateContent(`${analysis.promptPackage.context}\n\nUSER QUESTION:\n${analysis.promptPackage.userMessage}`),
        ORSON_MODEL_TIMEOUT_MS,
      );
      const response = result.response;
      const text = cleanOrsonResponse(response.text());

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

      setError(ORSON_FALLBACK_RESPONSE);
      return ORSON_FALLBACK_RESPONSE;
    }
  };

  const clearChat = () => {
    setChatHistory([]);
    chatSessionRef.current = null;
  };

  return { sendMessage, clearChat, chatHistory, loading, error };
};
