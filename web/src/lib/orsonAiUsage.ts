import {
  doc,
  runTransaction,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore';
import { getFarmDateKey } from '../../../shared/farmDate';

export type OrsonAiFunction = 'chat' | 'projection';

export const ORSON_GEMINI_MODEL = 'gemini-2.5-flash-lite';

export const ORSON_DAILY_LIMITS: Record<OrsonAiFunction, number> = {
  chat: 20,
  projection: 5,
};

export class OrsonDailyLimitError extends Error {
  limit: number;
  used: number;
  aiFunction: OrsonAiFunction;

  constructor(aiFunction: OrsonAiFunction, limit: number, used: number) {
    super(`Orson ${aiFunction} daily limit reached (${used}/${limit}).`);
    this.name = 'OrsonDailyLimitError';
    this.limit = limit;
    this.used = used;
    this.aiFunction = aiFunction;
  }
}

const getLimit = (aiFunction: OrsonAiFunction) => ORSON_DAILY_LIMITS[aiFunction];

export const reserveOrsonRequest = async (
  db: Firestore,
  companyId: string | undefined,
  aiFunction: OrsonAiFunction,
  timeZone?: string,
) => {
  if (!companyId) {
    throw new Error('Orson needs an approved company before AI requests can be used.');
  }

  const dateKey = getFarmDateKey(new Date(), timeZone);
  const limit = getLimit(aiFunction);
  const usageRef = doc(db, 'companies', companyId, 'aiUsage', dateKey);

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(usageRef);
    const data = snapshot.exists() ? snapshot.data() : {};
    const functions = (data.functions ?? {}) as Partial<Record<OrsonAiFunction, number>>;
    const currentCount = typeof functions[aiFunction] === 'number' ? functions[aiFunction] : 0;

    if (currentCount >= limit) {
      throw new OrsonDailyLimitError(aiFunction, limit, currentCount);
    }

    const nextCount = currentCount + 1;
    transaction.set(usageRef, {
      dateKey,
      updatedAt: serverTimestamp(),
      functions: {
        ...functions,
        [aiFunction]: nextCount,
      },
    }, { merge: true });

    return {
      dateKey,
      limit,
      used: nextCount,
      remaining: Math.max(limit - nextCount, 0),
    };
  });
};

export const isOrsonDailyLimitError = (error: unknown): error is OrsonDailyLimitError => (
  error instanceof OrsonDailyLimitError
  || (
    !!error
    && typeof error === 'object'
    && (error as { name?: string }).name === 'OrsonDailyLimitError'
  )
);
