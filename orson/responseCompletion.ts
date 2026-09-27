import type { OrsonOperation } from '../shared/orsonAgentContract';
export type OrsonResponse = { operations?: OrsonOperation[]; safeToCache?: boolean; text?: string; finishReason?: string | null };

export class OrsonIncompleteResponseError extends Error {
  readonly partialText: string;
  readonly finishReason: string;

  constructor(partialText: string, finishReason: string) {
    super('Response interrupted. Retry to get a complete answer.');
    this.partialText = partialText;
    this.finishReason = finishReason;
  }
}

export const requireCompleteOrsonResponse = (response: OrsonResponse): string => {
  const text = response.text || '';
  if (response.finishReason !== 'STOP' || !text.trim()) {
    throw new OrsonIncompleteResponseError(text, response.finishReason || 'UNKNOWN');
  }
  return text;
};
