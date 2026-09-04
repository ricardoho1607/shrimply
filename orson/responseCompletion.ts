export type OrsonResponse = { text?: string; finishReason?: string | null };

export class OrsonIncompleteResponseError extends Error {
  constructor(readonly partialText: string, readonly finishReason: string) {
    super('Response interrupted. Retry to get a complete answer.');
  }
}

export const requireCompleteOrsonResponse = (response: OrsonResponse): string => {
  const text = response.text || '';
  if (response.finishReason !== 'STOP' || !text.trim()) {
    throw new OrsonIncompleteResponseError(text, response.finishReason || 'UNKNOWN');
  }
  return text;
};
