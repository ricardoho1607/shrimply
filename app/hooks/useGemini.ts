// hooks/useGemini.ts
import { useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const useGemini = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

  if (!API_KEY) {
    console.warn('Gemini API key not found. Please add EXPO_PUBLIC_GEMINI_API_KEY to your .env file');
  }

  // Send a prompt to the AI
  const generateContent = async (prompt: string): Promise<string> => {
    setLoading(true);
    setError(null);

    try {
      if (!API_KEY) {
        throw new Error('Gemini API key not found. Please add EXPO_PUBLIC_GEMINI_API_KEY to your .env file');
      }

      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

      const result = await model.generateContent(prompt);
      const text = result.response.text();

      setLoading(false);
      return text;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Gemini API generateContent error:', err);
      setError(errorMessage);
      setLoading(false);
      throw new Error(errorMessage);
    }
  };

  // Pond-specific advice with Orson persona
  const generateAquacultureAdvice = async (pondData: {
    waterQuality?: string;
    feedingSchedule?: string;
    shrimpCount?: number;
    pondSize?: string;
    issues?: string;
  }): Promise<string> => {
    const prompt = `
You are **Orson**, a world-class shrimp aquaculture consultant for the investaShrimp app.  

Analyze this shrimp pond data:

Water Quality: ${pondData.waterQuality || 'Not specified'}
Feeding Schedule: ${pondData.feedingSchedule || 'Not specified'}
Shrimp Count: ${pondData.shrimpCount || 'Not specified'}
Pond Size: ${pondData.pondSize || 'Not specified'}
Current Issues: ${pondData.issues || 'None reported'}

Provide **clear, actionable recommendations** for:
1. Water quality optimization
2. Feeding improvements
3. Disease prevention
4. Growth optimization
5. Harvest timing

Use specific numbers when possible (e.g., DO > 5 mg/L, pH 7.8–8.2, salinity 15–25 ppt).  
Be structured, concise, and farmer-friendly.
`;

    return await generateContent(prompt);
  };

  const clearError = () => setError(null);

  return {
    generateContent,
    generateAquacultureAdvice,
    loading,
    error,
    clearError,
  };
};