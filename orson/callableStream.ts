import { acceptOrsonActivity, type OrsonActivity, type OrsonOperation } from '../shared/orsonAgentContract.ts';
import { OrsonIncompleteResponseError } from './responseCompletion.ts';
import { OrsonSessionChangedError } from './session.ts';

export type OrsonTextStreamChunk = { type: 'text_delta'; text: string } | OrsonActivity | { type: 'agent_operation'; operation: OrsonOperation };

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
  signal?: AbortSignal;
  onPartialResponse?: (text: string) => void;
  onActivity?: (activity: OrsonActivity) => void;
  onOperation?: (operation: OrsonOperation) => void;
}): Promise<Response> => {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (params.signal?.aborted) throw new OrsonSessionChangedError();
  params.signal?.addEventListener('abort', cancel, { once: true });
  let accumulated = '';
  let activity: OrsonActivity | null = null;
  let timeout: ReturnType<typeof setTimeout>;

  const consume = async (): Promise<Response> => {
    const result = await params.callable.stream(params.request, { signal: controller.signal });
    for await (const chunk of result.stream) {
      if (controller.signal.aborted) throw new Error('Stream interrupted');
      if (chunk?.type === 'status_step') {
        const next = acceptOrsonActivity(activity, chunk);
        if (next && next !== activity) { activity = next; params.onActivity?.(next); }
        continue;
      }
      if (chunk?.type === 'agent_operation') { params.onOperation?.(chunk.operation); continue; }
      if (chunk?.type !== 'text_delta' || typeof chunk.text !== 'string') continue;
      accumulated += chunk.text;
      params.onPartialResponse?.(accumulated);
    }
    const response = await result.data;
    if (controller.signal.aborted) throw new Error('Stream interrupted');
    if (response.text && response.text !== accumulated) params.onPartialResponse?.(response.text);
    return response;
  };

  const timedOut = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new OrsonIncompleteResponseError(accumulated, 'TIMEOUT'));
    }, params.timeoutMs);
  });

  try {
    return await Promise.race([consume(), timedOut]);
  } catch (error) {
    if (params.signal?.aborted) throw new OrsonSessionChangedError();
    if (error instanceof OrsonIncompleteResponseError) throw error;
    if (accumulated || controller.signal.aborted) throw new OrsonIncompleteResponseError(accumulated, controller.signal.aborted ? 'TIMEOUT' : 'INTERRUPTED');
    throw error;
  } finally {
    clearTimeout(timeout!);
    params.signal?.removeEventListener('abort', cancel);
  }
};
