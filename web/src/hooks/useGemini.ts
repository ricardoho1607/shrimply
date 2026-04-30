import { useState, useRef } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

  const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

  const getCachedResponse = (question: string) => {
    try {
      if (typeof window === 'undefined') return null;
      const key = `${CACHE_PREFIX}${question.toLowerCase().trim().replace(/\s+/g, '_')}`;
      const cached = localStorage.getItem(key);
      if (cached) {
        const { timestamp, text } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_EXPIRY) return text;
      }
    } catch (e) { console.error("Cache Read Error", e); }
    return null;
  };

  const saveToCache = (question: string, text: string) => {
    try {
      if (typeof window === 'undefined') return;
      const key = `${CACHE_PREFIX}${question.toLowerCase().trim().replace(/\s+/g, '_')}`;
      const data = JSON.stringify({ timestamp: Date.now(), text });
      localStorage.setItem(key, data);
    } catch (e) { console.error("Cache Write Error", e); }
  };

  const formatPondContext = (ponds: any[]) => {
    if (!ponds || ponds.length === 0) return "No pond data available yet.";

    return ponds.map(p => {
      const allSamples = p.samplings || [];
      // Get the last 3 samples for trend analysis
      const recentSamples = allSamples.slice(-3);
      const latest = recentSamples[recentSamples.length - 1] || {};
      
      const doc = p.docStart 
        ? Math.floor((new Date().getTime() - new Date(p.docStart).getTime()) / (1000 * 60 * 60 * 24)) 
        : 0;

      const samplingHistory = recentSamples.map((s: any, idx: number) => {
        // Calculate average appetite from 4 trays if available
        let appetiteStatus = 'N/A';
        if (s.feedData) {
          const trays = [s.feedData.anco1, s.feedData.anco2, s.feedData.anco3, s.feedData.anco4]
            .map(v => parseFloat(v || ''))
            .filter(v => !isNaN(v));
          
          if (trays.length > 0) {
            const avg = trays.reduce((a, b) => a + b, 0) / trays.length;
            if (avg >= 90) appetiteStatus = 'Excellent';
            else if (avg >= 70) appetiteStatus = 'Good';
            else if (avg >= 50) appetiteStatus = 'Fair';
            else appetiteStatus = 'POOR (Leftovers)';
          }
        }

        return `[T-${recentSamples.length - 1 - idx}]: pH ${s.phMorning || '?'}/${s.phEvening || '?'} | DO ${s.doMorning || '?'}/${s.doEvening || '?'} | Appetite: ${appetiteStatus} | MBW ${s.mbw || '?'}g`;
      }).join('\n  ');

      return `
POND: ${p.pondName}
• STATUS: DOC ${doc} | MBW ${latest.mbw || 'N/A'}g | Density ${p.density || 'N/A'}
• 3-RECORD TREND:
  ${samplingHistory}
---`;
    }).join('\n');
  };

  const sendMessage = async (userMessage: string, allPonds: any[]) => {
    setLoading(true);
    setError(null);

    try {
      const isGeneral = userMessage.length < 120 && !userMessage.toLowerCase().includes("my pond");
      if (isGeneral) {
        const cachedText = getCachedResponse(userMessage);
        if (cachedText) {
          setLoading(false);
          return cachedText;
        }
      }

      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({
        model: "gemini-3.1-flash-lite-preview", 
        tools: [
          {
            googleSearch: {}, 
          } as any, 
        ],
      });

      const pondDataSummary = formatPondContext(allPonds);

      if (!chatSessionRef.current) {
        chatSessionRef.current = model.startChat({
          history: chatHistory,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 512,
          },
          systemInstruction: {
            role: "system",
            parts: [{ text: `
            IDENTITY: You are Orson, the Lead Biological Consultant at Shrimply. You are a highly proactive, expert system specialized in Litopenaeus vannamei aquaculture.
            
            GOAL: Analyze farm data to identify biological trends, predict risks, and provide actionable prescriptions.
            
            [FARM DATA]:
            ${pondDataSummary}

            ANALYSIS RULES:
            1. TRENDS OVER NUMBERS: Look at the 3-record history [T-0 to T-2]. If a parameter (pH, DO) is trending down, warn the user even if it is still in the "safe" range.
            2. BIOLOGICAL CORRELATION: Connect different variables. (e.g., "The combination of high temperature and dropping pH suggests an algae crash risk").
            3. NOISY DATA HANDLING: Acknowledge that manual sampling (MBW) can be inaccurate. Focus on the 7-day trajectory, not just one single data point. If a point looks like an outlier, mention it might be a sampling error.
            4. ALERT LEVEL: Start with "⚠️ URGENT" only if current data shows immediate mortality risk.
            5. FORECAST: Always try to provide a "72-HOUR BIOLOGICAL OUTLOOK" based on current trends.

            TONE: Expert, clinical yet supportive, and concise. Max 5 sentences per response. Use plain text with bullet points (-). No bold or markdown headings.
            ` }]
          },
        });
      }

      const result = await chatSessionRef.current.sendMessage(userMessage);
      const response = await result.response;
      let text = response.text();

      text = text
        .replace(/\*\*/g, '')
        .replace(/#/g, '')
        .trim();

      if (isGeneral) {
        saveToCache(userMessage, text);
      }

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

      if (err.message?.includes("429")) {
        setError("Daily limit reached.");
        return "I've shared all my wisdom for today! My daily quota is full, but I'll be refreshed at midnight.";
      }

      setError("Orson is having trouble connecting. Please check your internet.");
      return "I apologize, but I am having trouble accessing the analysis server right now.";
    }
  };

  const clearChat = () => {
    setChatHistory([]);
    chatSessionRef.current = null;
  };

  return { sendMessage, clearChat, chatHistory, loading, error };
};
