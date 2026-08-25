export type OrsonTextStreamChunk = {
  type: 'text_delta';
  text: string;
};

type StreamingCallable<Request, Response> = {
  stream: (
    request: Request,
    options: { signal: AbortSignal },
  ) => Promise<{
    stream: AsyncIterable<OrsonTextStreamChunk>;
    data: Promise<Response>;
  }>;
};

export const consumeOrsonCallableStream = async <Request, Response extends { text?: string }>(params: {
  callable: StreamingCallable<Request, Response>;
  request: Request;
  timeoutMs: number;
  onPartialResponse?: (text: string) => void;
}): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), params.timeoutMs);
  let accumulated = '';

  try {
    const result = await params.callable.stream(params.request, { signal: controller.signal });
    for await (const chunk of result.stream) {
      if (chunk?.type !== 'text_delta' || typeof chunk.text !== 'string') continue;
      accumulated += chunk.text;
      params.onPartialResponse?.(accumulated);
    }
    const response = await result.data;
    if (response.text && response.text !== accumulated) params.onPartialResponse?.(response.text);
    return response;
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Orson is taking too long to respond. Please try again.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};
